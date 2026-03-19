'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '@/lib/auth'
import { CalendarRange, LineChart, Loader2 } from 'lucide-react'

type Granularity = 'day' | 'week' | 'month' | 'quarter'

interface SeriesPoint {
  key: string
  label: string
  count: number
  cumulative: number
}

interface AnalyticsResponse {
  meta: {
    from: string
    to: string
    granularity: Granularity
    timezone: string
    totalProfilesFiltered: number
    totalUsecasesFiltered: number
  }
  accounts: {
    totalInPeriod: number
    series: SeriesPoint[]
    description: string
  }
  users: {
    totalInPeriod: number
    series: SeriesPoint[]
    description: string
  }
  usecases: {
    totalInPeriod: number
    series: SeriesPoint[]
  }
}

interface PlanOption {
  plan_id: string
  display_name: string
}

function formatInputDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d)
  x.setDate(x.getDate() + n)
  return x
}

function BarChartBlock({
  title,
  series,
  mode,
}: {
  title: string
  series: SeriesPoint[]
  mode: 'count' | 'cumulative'
}) {
  const values = series.map((s) => (mode === 'count' ? s.count : s.cumulative))
  const max = Math.max(1, ...values)

  if (series.length === 0) {
    return (
      <p className="text-sm text-gray-500 py-8 text-center">Aucune donnée sur cette période.</p>
    )
  }

  return (
    <div className="mt-4">
      <p className="text-xs text-gray-500 mb-2">
        {mode === 'count' ? 'Créations par période' : 'Cumul sur la plage sélectionnée'}
      </p>
      <div
        className="flex items-end gap-0.5 sm:gap-1 h-48 border-b border-gray-200 pb-1 overflow-x-auto"
        role="img"
        aria-label={title}
      >
        {series.map((s) => {
          const v = mode === 'count' ? s.count : s.cumulative
          const h = Math.round((v / max) * 100)
          return (
            <div
              key={s.key}
              className="flex flex-col items-center min-w-[1.25rem] sm:min-w-8 flex-1"
              title={`${s.label}: ${v}`}
            >
              <div className="w-full flex flex-col justify-end h-40">
                <div
                  className="w-full rounded-t bg-[#0080A3]/85 hover:bg-[#006280] transition-colors min-h-[2px]"
                  style={{ height: `${h}%` }}
                />
              </div>
              <span className="text-[10px] sm:text-xs text-gray-500 mt-1 truncate max-w-full text-center leading-tight">
                {s.label}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function AdminAnalyticsPage() {
  const { session, loading: authLoading } = useAuth()
  const [from, setFrom] = useState(() => formatInputDate(addDays(new Date(), -30)))
  const [to, setTo] = useState(() => formatInputDate(new Date()))
  const [granularity, setGranularity] = useState<Granularity>('week')
  const [role, setRole] = useState<string>('all')
  const [plan, setPlan] = useState<string>('all')
  const [subscriptionStatus, setSubscriptionStatus] = useState<string>('all')
  const [usecaseStatus, setUsecaseStatus] = useState<string>('all')
  const [chartMode, setChartMode] = useState<'count' | 'cumulative'>('count')

  const [plans, setPlans] = useState<PlanOption[]>([])
  const [data, setData] = useState<AnalyticsResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch('/api/plans')
        if (!res.ok) return
        const raw = await res.json()
        if (cancelled || !Array.isArray(raw)) return
        setPlans(
          raw.map((p: { plan_id: string; display_name: string }) => ({
            plan_id: p.plan_id,
            display_name: p.display_name,
          }))
        )
      } catch {
        /* ignore */
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const load = useCallback(async () => {
    if (!session?.access_token) return
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({
        from,
        to,
        granularity,
        role,
        plan,
        subscription_status: subscriptionStatus,
        usecase_status: usecaseStatus,
      })
      const res = await fetch(`/api/admin/analytics?${params}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      const json = await res.json()
      if (!res.ok) {
        throw new Error(json.error || `Erreur ${res.status}`)
      }
      setData(json as AnalyticsResponse)
    } catch (e) {
      setData(null)
      setError(e instanceof Error ? e.message : 'Erreur inconnue')
    } finally {
      setLoading(false)
    }
  }, [
    session?.access_token,
    from,
    to,
    granularity,
    role,
    plan,
    subscriptionStatus,
    usecaseStatus,
  ])

  useEffect(() => {
    if (!authLoading && session) {
      void load()
    }
  }, [authLoading, session, load])

  const presets = useMemo(
    () => [
      { label: '7 jours', days: 7 },
      { label: '30 jours', days: 30 },
      { label: '90 jours', days: 90 },
    ],
    []
  )

  if (authLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-[#0080A3]" />
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <LineChart className="h-8 w-8 text-[#0080A3]" />
            Analytics
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Inscriptions et cas d’usage — agrégation{' '}
            <strong>Europe/Paris</strong>, semaines ISO, trimestres calendaires.
          </p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow border border-gray-100 p-4 sm:p-6 mb-6">
        <div className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-4">
          <CalendarRange className="h-5 w-5 text-[#0080A3]" />
          Plage et filtres
        </div>

        <div className="flex flex-wrap gap-2 mb-4">
          {presets.map((p) => (
            <button
              key={p.label}
              type="button"
              onClick={() => {
                const end = new Date()
                const start = addDays(end, -p.days)
                setFrom(formatInputDate(start))
                setTo(formatInputDate(end))
              }}
              className="px-3 py-1.5 text-sm rounded-md border border-gray-200 hover:border-[#0080A3] hover:text-[#0080A3] transition-colors"
            >
              {p.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Du</label>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Au</label>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Agrégation
            </label>
            <select
              value={granularity}
              onChange={(e) => setGranularity(e.target.value as Granularity)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              <option value="day">Jour</option>
              <option value="week">Semaine (ISO)</option>
              <option value="month">Mois</option>
              <option value="quarter">Trimestre</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Type de compte (rôle)
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              <option value="all">Tous</option>
              <option value="user">Utilisateur</option>
              <option value="admin">Admin</option>
              <option value="super_admin">Super admin</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Plan (état actuel)
            </label>
            <select
              value={plan}
              onChange={(e) => setPlan(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              <option value="all">Tous</option>
              <option value="freemium">Freemium (sans abonnement actif)</option>
              {plans.map((p) => (
                <option key={p.plan_id} value={p.plan_id}>
                  {p.display_name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Statut abonnement
            </label>
            <select
              value={subscriptionStatus}
              onChange={(e) => setSubscriptionStatus(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              <option value="all">Tous</option>
              <option value="active">Actif</option>
              <option value="trialing">Essai (trialing)</option>
              <option value="inactive">Inactif / aucun actif</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Statut cas d’usage
            </label>
            <select
              value={usecaseStatus}
              onChange={(e) => setUsecaseStatus(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              <option value="all">Tous</option>
              <option value="draft">Brouillon</option>
              <option value="in_progress">En cours</option>
              <option value="completed">Complété</option>
              <option value="approved">Approuvé</option>
            </select>
          </div>
          <div className="flex items-end">
            <button
              type="button"
              onClick={() => void load()}
              disabled={loading}
              className="w-full px-4 py-2 bg-[#0080A3] text-white text-sm font-medium rounded-md hover:bg-[#006280] disabled:opacity-50"
            >
              {loading ? 'Chargement…' : 'Actualiser'}
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-sm">
          <span className="text-gray-600">Graphiques :</span>
          <label className="inline-flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="chartMode"
              checked={chartMode === 'count'}
              onChange={() => setChartMode('count')}
            />
            Par période
          </label>
          <label className="inline-flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="chartMode"
              checked={chartMode === 'cumulative'}
              onChange={() => setChartMode('cumulative')}
            />
            Cumul
          </label>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
          {error}
        </div>
      )}

      {loading && !data && (
        <div className="flex justify-center py-12">
          <Loader2 className="h-10 w-10 animate-spin text-[#0080A3]" />
        </div>
      )}

      {data && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow border border-gray-100 p-4 sm:p-6">
            <h2 className="text-lg font-semibold text-gray-900">
              Comptes &amp; utilisateurs
            </h2>
            <p className="text-sm text-gray-500 mt-1">{data.accounts.description}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
              <div className="rounded-lg bg-gray-50 p-4 border border-gray-100">
                <p className="text-sm font-medium text-gray-600">Comptes créés (profils)</p>
                <p className="text-3xl font-bold text-[#0080A3] mt-1">
                  {data.accounts.totalInPeriod}
                </p>
              </div>
              <div className="rounded-lg bg-gray-50 p-4 border border-gray-100">
                <p className="text-sm font-medium text-gray-600">Utilisateurs (même base)</p>
                <p className="text-3xl font-bold text-[#0080A3] mt-1">
                  {data.users.totalInPeriod}
                </p>
                <p className="text-xs text-gray-400 mt-2">{data.users.description}</p>
              </div>
            </div>
            <BarChartBlock
              title="Évolution des inscriptions"
              series={data.accounts.series}
              mode={chartMode}
            />
          </div>

          <div className="bg-white rounded-lg shadow border border-gray-100 p-4 sm:p-6">
            <h2 className="text-lg font-semibold text-gray-900">Cas d’usage créés</h2>
            <p className="text-sm text-gray-500 mt-1">
              Filtre plan / abonnement basé sur le{' '}
              <strong>propriétaire du registre</strong> (owner du company).
            </p>
            <p className="text-3xl font-bold text-purple-700 mt-3">
              {data.usecases.totalInPeriod}
            </p>
            <BarChartBlock
              title="Cas d’usage créés"
              series={data.usecases.series}
              mode={chartMode}
            />
          </div>

          <p className="text-xs text-gray-400 text-center">
            Fuseau : {data.meta.timezone} · {data.meta.from} → {data.meta.to} ·{' '}
            {data.meta.granularity}
          </p>
        </div>
      )}
    </div>
  )
}
