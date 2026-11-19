'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Loader2, ShieldCheck } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import {
  AdminGovernancePayloadSchema,
  getAdminAlertStatusLabel,
  getGovernanceQuadrantLabel,
  getLifecycleStatusLabel,
  getProfileTypeLabel,
  type AdminGovernancePatchBody,
  type AdminGovernancePayload,
  type GovernanceQuadrant,
} from '@/lib/validations/governance-scores'

const QUADRANTS: Array<{ key: GovernanceQuadrant; hint: string }> = [
  { key: 'hot_pql', hint: 'Trust ≥ 65 et intégrité ≥ 60' },
  { key: 'rushed_curious', hint: 'Trust ≥ 65 et intégrité < 60' },
  { key: 'ghost_consultant', hint: 'Trust < 65 et intégrité ≥ 60' },
  { key: 'bot_or_abuse', hint: 'Trust < 65 et intégrité < 60' },
]

function scoreText(value: number | null): string {
  if (value == null) return 'Historique non scoré'
  return `${Math.round(value)}/100`
}

export default function GovernanceAdminPage() {
  const { session } = useAuth()
  const [payload, setPayload] = useState<AdminGovernancePayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [profileType, setProfileType] = useState('all')
  const [collisionsOnly, setCollisionsOnly] = useState(false)
  const [purgeOnly, setPurgeOnly] = useState(false)
  const [quadrant, setQuadrant] = useState<GovernanceQuadrant | null>(null)
  const [pendingId, setPendingId] = useState<string | null>(null)

  const load = useCallback(async () => {
    const token = session?.access_token
    if (!token) return
    setLoading(true)
    setError('')
    try {
      const response = await fetch('/api/admin/governance', {
        headers: { Authorization: `Bearer ${token}` },
      })
      const body = await response.json()
      if (!response.ok) {
        throw new Error(typeof body?.error === 'string' ? body.error : 'Erreur de chargement')
      }
      const parsed = AdminGovernancePayloadSchema.safeParse(body)
      if (!parsed.success) {
        console.error('[GovernanceAdminPage]', parsed.error)
        throw new Error('Réponse admin invalide')
      }
      setPayload(parsed.data)
    } catch (loadError) {
      console.error('[GovernanceAdminPage]', loadError)
      setError(loadError instanceof Error ? loadError.message : 'Erreur de chargement')
    } finally {
      setLoading(false)
    }
  }, [session?.access_token])

  useEffect(() => {
    void load()
  }, [load])

  const act = async (body: AdminGovernancePatchBody, pendingKey: string) => {
    const token = session?.access_token
    if (!token) return
    setPendingId(pendingKey)
    setError('')
    try {
      const response = await fetch('/api/admin/governance', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      })
      const json = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(typeof json?.error === 'string' ? json.error : 'Action refusée')
      }
      await load()
    } catch (actionError) {
      console.error('[GovernanceAdminPage]', actionError)
      setError(actionError instanceof Error ? actionError.message : 'Action refusée')
    } finally {
      setPendingId(null)
    }
  }

  const users = useMemo(() => {
    const query = search.trim().toLowerCase()
    return (payload?.users ?? []).filter((user) => {
      if (quadrant && user.quadrant !== quadrant) return false
      if (profileType !== 'all' && user.profile_type !== profileType) return false
      if (collisionsOnly && !user.siren_collision_flag && !user.collision_alert_id) return false
      if (purgeOnly && user.purging_entities_count <= 0) return false
      if (!query) return true
      const haystack = [
        user.first_name,
        user.last_name,
        user.email,
        user.company_name,
        user.academic_institution,
        user.siren,
      ]
        .filter((part): part is string => typeof part === 'string')
        .join(' ')
        .toLowerCase()
      return haystack.includes(query)
    })
  }, [collisionsOnly, payload?.users, profileType, purgeOnly, quadrant, search])

  if (loading && !payload) {
    return (
      <div className="flex min-h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#0080A3]" />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Gouvernance, scores et collisions SIREN</h1>
        <p className="mt-2 text-sm text-gray-600">
          Miroir des profils, abonnements, registres et alertes. Les libellés inconnus restent la clé d&apos;origine.
        </p>
      </div>

      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      ) : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {QUADRANTS.map((item) => {
          const selected = quadrant === item.key
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => setQuadrant(selected ? null : item.key)}
              className={`rounded-xl border p-4 text-left shadow-sm transition ${
                selected ? 'border-[#0080A3] bg-[#0080A3]/5' : 'border-gray-200 bg-white hover:border-[#0080A3]'
              }`}
            >
              <p className="text-sm font-semibold text-gray-900">{getGovernanceQuadrantLabel(item.key)}</p>
              <p className="mt-2 text-3xl font-bold text-[#0080A3]">{payload?.quadrants[item.key] ?? 0}</p>
              <p className="mt-1 text-xs text-gray-500">{item.hint}</p>
            </button>
          )
        })}
      </div>

      <div className="grid grid-cols-1 gap-3 rounded-xl border border-gray-200 bg-white p-4 md:grid-cols-2 xl:grid-cols-4">
        <label className="block text-sm text-gray-700">
          Recherche
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Nom, email, entreprise, SIREN"
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
          />
        </label>
        <label className="block text-sm text-gray-700">
          Type de profil
          <select
            value={profileType}
            onChange={(event) => setProfileType(event.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
          >
            <option value="all">Tous</option>
            <option value="company">Entreprise</option>
            <option value="advisor">Conseil</option>
            <option value="academic">Académique</option>
          </select>
        </label>
        <label className="flex items-center gap-2 self-end text-sm text-gray-700">
          <input
            type="checkbox"
            checked={collisionsOnly}
            onChange={(event) => setCollisionsOnly(event.target.checked)}
          />
          Collisions SIREN uniquement
        </label>
        <label className="flex items-center gap-2 self-end text-sm text-gray-700">
          <input type="checkbox" checked={purgeOnly} onChange={(event) => setPurgeOnly(event.target.checked)} />
          En purge 24h / Soft Delete
        </label>
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="min-w-[1100px] w-full text-left text-sm">
          <thead className="bg-gray-50 text-xs uppercase text-gray-500">
            <tr>
              <th className="px-3 py-3">Identité</th>
              <th className="px-3 py-3">Entreprise et typologie</th>
              <th className="px-3 py-3">Statut et quotas</th>
              <th className="px-3 py-3">Scores et quadrant</th>
              <th className="px-3 py-3">Collision SIREN</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="border-t border-gray-100 align-top">
                <td className="px-3 py-3">
                  <p className="font-medium text-gray-900">
                    {[user.first_name, user.last_name].filter(Boolean).join(' ') || '—'}
                  </p>
                  <p className="text-gray-600">{user.email || '—'}</p>
                </td>
                <td className="px-3 py-3">
                  <p className="font-medium text-gray-900">
                    {user.profile_type === 'academic'
                      ? user.academic_institution || user.company_name || '—'
                      : user.company_name || '—'}
                  </p>
                  <p>{getProfileTypeLabel(user.profile_type)}</p>
                  <p className="text-gray-600">SIREN {user.siren || '—'}</p>
                  <p className="text-gray-600">NAF {user.naf_code || '—'}</p>
                  {user.siren_verified_pappers ? (
                    <span className="mt-1 inline-flex rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                      Vérifié Pappers
                    </span>
                  ) : null}
                </td>
                <td className="px-3 py-3">
                  <p>{user.is_freemium ? 'Freemium' : 'Payant'} · {user.plan_name}</p>
                  <p>Registres actifs : {user.active_registries_count}</p>
                  <p>Cas d&apos;usage actifs : {user.active_usecases_count}</p>
                  <p>Resets mensuels : {user.monthly_reset_count} / 1</p>
                </td>
                <td className="px-3 py-3">
                  <p>Fiabilité : {user.entity_trust_score}/100</p>
                  <p>Engagement : {user.engagement_score}/100</p>
                  <p>
                    Intégrité : {scoreText(user.latest_audit_integrity_score)} 
                    {user.avg_audit_integrity_score != null
                      ? ` (moy. ${Math.round(user.avg_audit_integrity_score)})`
                      : ''}
                  </p>
                  <span className="mt-1 inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-800">
                    {getGovernanceQuadrantLabel(user.quadrant)}
                  </span>
                </td>
                <td className="px-3 py-3">
                  <p>{user.siren_collision_flag ? 'Collision signalée' : 'Pas de flag'}</p>
                  <p className="text-gray-600">
                    Compte lié : {user.collision_with_name || '—'} {user.collision_with_email ? `(${user.collision_with_email})` : ''}
                  </p>
                  <p>Alerte : {getAdminAlertStatusLabel(user.collision_alert_status)}</p>
                  <div className="mt-2 flex flex-col gap-2">
                    {user.collision_alert_id ? (
                      <>
                        <button
                          type="button"
                          disabled={pendingId === user.id}
                          onClick={() =>
                            void act(
                              {
                                action: 'update_alert_status',
                                alertId: user.collision_alert_id as string,
                                status: 'acknowledged',
                                clearSecondaryCollisionFlag: false,
                              },
                              user.id
                            )
                          }
                          className="rounded-lg border border-gray-300 px-2 py-1 text-xs font-medium hover:bg-gray-50 disabled:opacity-50"
                        >
                          Prendre en compte
                        </button>
                        <button
                          type="button"
                          disabled={pendingId === user.id}
                          onClick={() =>
                            void act(
                              {
                                action: 'update_alert_status',
                                alertId: user.collision_alert_id as string,
                                status: 'resolved',
                                clearSecondaryCollisionFlag: true,
                              },
                              user.id
                            )
                          }
                          className="rounded-lg bg-[#0080A3] px-2 py-1 text-xs font-medium text-white hover:bg-[#006280] disabled:opacity-50"
                        >
                          Résoudre & Lever le flag PDF
                        </button>
                      </>
                    ) : null}
                    <button
                      type="button"
                      disabled={pendingId === user.id}
                      onClick={() =>
                        void act({ action: 'recalculate_user_scores', userId: user.id }, user.id)
                      }
                      className="rounded-lg border border-[#0080A3] px-2 py-1 text-xs font-medium text-[#0080A3] hover:bg-[#0080A3]/5 disabled:opacity-50"
                    >
                      Recalculer les scores
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <section className="rounded-xl border border-gray-200 bg-white p-4">
        <div className="mb-3 flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-[#0080A3]" />
          <h2 className="text-lg font-semibold text-gray-900">Sas de purge 24h et soft delete</h2>
        </div>
        {(payload?.purging_entities.length ?? 0) === 0 ? (
          <p className="text-sm text-gray-600">Aucune entité hors statut actif.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {payload?.purging_entities.map((entity) => (
              <li key={`${entity.entity_type}-${entity.id}`} className="rounded-lg bg-gray-50 px-3 py-2">
                <span className="font-medium">{entity.name || entity.id}</span>
                {' · '}
                {entity.entity_type === 'company' ? 'Registre' : 'Cas d’usage'}
                {' · '}
                {getLifecycleStatusLabel(entity.lifecycle_status)}
                {entity.workflow_status ? ` · workflow ${entity.workflow_status}` : ''}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
