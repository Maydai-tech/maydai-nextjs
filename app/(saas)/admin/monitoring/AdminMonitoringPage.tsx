'use client'

import { useEffect, useState } from 'react'
import { AlertTriangle, Bell, HardDrive, RefreshCw, ShieldCheck } from 'lucide-react'
import { formatGo, nextPurgeFr, parseUsePercent, usageBarClass } from './utils/format'

interface DiskUsage {
  total: string | number
  used: string | number
  usePercent: string
  updatedAt: string
  free?: string | number
  available?: string | number
  server?: string
  source?: string
  /** Présent lorsque l’API a recalculé total / % pour cohérence */
  coherenceNote?: string
}

interface EmailStatus {
  active: boolean
  recipient: string
  lastSentAt: string
}

interface DockerPurge {
  ranAt: string
  systemPruneReclaimedBytes: number
  builderPruneReclaimedBytes: number
  totalReclaimedBytes: number
  diskFreeBeforeBytes: number
  diskFreeAfterBytes: number
  exitCode: number
  errorMessage: string | null
}

export default function AdminMonitoringPage() {
  const [diskUsage, setDiskUsage] = useState<DiskUsage | null>(null)
  const [diskError, setDiskError] = useState<string | null>(null)
  const [emailStatus, setEmailStatus] = useState<EmailStatus | null>(null)
  const [loadingDiskUsage, setLoadingDiskUsage] = useState(true)
  const [purges, setPurges] = useState<DockerPurge[]>([])
  const [purgesError, setPurgesError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function loadDiskUsage() {
      try {
        const response = await fetch('/api/admin/monitoring?action=disk', {
          cache: 'no-store',
        })
        const data = await response.json()
        if (!cancelled) {
          setDiskError(typeof data?.diskError === 'string' ? data.diskError : null)
        }
        if (!cancelled && data?.disk) {
          setDiskUsage(data.disk as DiskUsage)
        }
        if (!cancelled && data?.email) {
          setEmailStatus(data.email as EmailStatus)
        }
        if (!cancelled && Array.isArray(data?.purges)) {
          setPurges(data.purges as DockerPurge[])
        }
        if (!cancelled) {
          setPurgesError(typeof data?.purgesError === 'string' ? data.purgesError : null)
        }
      } catch (error) {
        console.error('Erreur chargement occupation disque:', error)
        if (!cancelled) {
          setDiskError('Impossible de joindre l’API de monitoring.')
        }
      } finally {
        if (!cancelled) {
          setLoadingDiskUsage(false)
        }
      }
    }

    void loadDiskUsage()
    return () => {
      cancelled = true
    }
  }, [])

  const checks = [
    {
      title: 'Alerte disque',
      value: 'Active',
      details: 'Seuil d’alerte configuré à 85% d’occupation sur la partition racine (/).',
      icon: AlertTriangle,
      color: 'text-amber-600',
    },
    {
      title: 'Canal email',
      value: emailStatus?.active ? 'Actif' : 'À finaliser',
      details: emailStatus?.lastSentAt
        ? `Envoi vers ${emailStatus.recipient || 'thomas@mayday-consulting.ai'} · Dernier envoi: ${new Date(emailStatus.lastSentAt).toLocaleString('fr-FR')}`
        : 'Envoi prévu vers thomas@mayday-consulting.ai après configuration SMTP.',
      icon: Bell,
      color: emailStatus?.active ? 'text-emerald-600' : 'text-[#0080A3]',
    },
    {
      title: 'Rotation des logs',
      value: 'Active',
      details: 'Rotation quotidienne des logs système pour limiter la croissance disque.',
      icon: RefreshCw,
      color: 'text-emerald-600',
    },
    {
      title: 'Nettoyage Docker',
      value: 'Hebdomadaire',
      details: 'Purge automatique des images/cache inutilisés pour éviter la saturation.',
      icon: HardDrive,
      color: 'text-indigo-600',
    },
  ]

  const usePercentNumber = parseUsePercent(diskUsage?.usePercent)
  const usageColorClass =
    usePercentNumber >= 85 ? 'text-red-700' : usePercentNumber >= 70 ? 'text-orange-700' : 'text-emerald-700'

  const usageRingClass =
    usePercentNumber >= 85 ? 'stroke-red-600' : usePercentNumber >= 70 ? 'stroke-orange-600' : 'stroke-emerald-600'

  const usageSegmentClass = usageBarClass(usePercentNumber)
  const freePercent = Math.max(0, 100 - usePercentNumber)

  const sanitizeToNumber = (value: unknown) => {
    if (typeof value === 'number') return value
    if (value === null || value === undefined) return 0
    return Number.parseFloat(value.toString().replace(/[^\d.]/g, ''))
  }

  // Les valeurs reçues sont en Go (numériques) ou en string suffixée ("50G").
  // On convertit toujours en bytes via 10^9 pour formatGo.
  const totalGo = sanitizeToNumber(diskUsage?.total)
  const usedGo = sanitizeToNumber(diskUsage?.used)
  const freeGo = sanitizeToNumber(diskUsage?.free ?? diskUsage?.available)
  const totalBytes = totalGo * 1_000_000_000
  const usedBytes = usedGo * 1_000_000_000
  const freeBytes = freeGo * 1_000_000_000

  const formatUpdatedAtFr = (iso: string) => {
    const date = new Date(iso)
    if (Number.isNaN(date.getTime())) return iso

    const datePart = date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
    const timePart = date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }).replace(':', 'h')
    return `${datePart} à ${timePart}`
  }

  const sortedPurges = [...purges].sort((a, b) => b.ranAt.localeCompare(a.ranAt))
  const totalReclaimedBytes = sortedPurges.reduce((sum, p) => sum + p.totalReclaimedBytes, 0)
  const nextPurgeLabel = nextPurgeFr()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <ShieldCheck className="h-7 w-7 text-[#0080A3]" />
          Monitoring
        </h1>
        <p className="mt-2 text-sm text-gray-600">
          Vue de supervision opérationnelle pour anticiper les incidents d&apos;espace disque et
          suivre l&apos;état des protections serveur.
        </p>
      </div>

      <section className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <h2 className="text-lg font-semibold text-gray-900">Occupation disque serveur prod (57.130.47.254)</h2>
          {!loadingDiskUsage && diskUsage?.updatedAt && (
            <p className="text-xs text-gray-400 whitespace-nowrap">
              Dernière mise à jour : {formatUpdatedAtFr(diskUsage.updatedAt)}
            </p>
          )}
        </div>
        {loadingDiskUsage && <p className="mt-2 text-sm text-gray-600">Chargement...</p>}
        {!loadingDiskUsage && !diskUsage && (
          <div className="mt-2 space-y-2">
            <p className="text-sm text-gray-600">Information indisponible pour le moment.</p>
            {diskError && (
              <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
                {diskError}
              </p>
            )}
          </div>
        )}
        {!loadingDiskUsage && diskUsage?.coherenceNote && (
          <p className="mt-3 text-xs text-gray-500 border-l-2 border-[#0080A3] pl-3">
            {diskUsage.coherenceNote}
          </p>
        )}
        {!loadingDiskUsage && diskUsage && (
          <div className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="flex items-center justify-center">
              <div className="relative h-44 w-44">
                <svg viewBox="0 0 120 120" className="h-44 w-44 -rotate-90">
                  <circle cx="60" cy="60" r="50" className="stroke-gray-200 fill-none" strokeWidth="10" />
                  <circle
                    cx="60"
                    cy="60"
                    r="50"
                    className={`${usageRingClass} fill-none transition-all duration-500`}
                    strokeWidth="10"
                    strokeLinecap="round"
                    strokeDasharray={314}
                    strokeDashoffset={314 - (Math.min(Math.max(usePercentNumber, 0), 100) / 100) * 314}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className={`text-4xl font-bold ${usageColorClass}`}>{diskUsage.usePercent}</span>
                  <span className="text-xs text-gray-500 mt-1">utilisation</span>
                </div>
              </div>
            </div>

            <div className="lg:col-span-2 flex flex-col justify-center gap-4">
              <div className="flex items-baseline justify-between">
                <span className="text-base font-semibold text-gray-900">Total : {formatGo(totalBytes)}</span>
              </div>

              <div className="h-3 w-full rounded-full bg-gray-100 overflow-hidden flex">
                <div
                  className={`${usageSegmentClass} h-3 transition-all duration-500`}
                  style={{ width: `${usePercentNumber}%` }}
                />
                <div
                  className="bg-gray-200 h-3 transition-all duration-500"
                  style={{ width: `${freePercent}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className={`inline-block w-2 h-2 rounded-full ${usageSegmentClass}`} aria-hidden="true" />
                  <span className="text-gray-700">
                    Utilisé <span className="font-medium text-gray-900">{formatGo(usedBytes)}</span>{' '}
                    <span className="text-gray-500">({usePercentNumber}%)</span>
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-block w-2 h-2 rounded-full bg-gray-200" aria-hidden="true" />
                  <span className="text-gray-700">
                    Libre <span className="font-medium text-gray-900">{formatGo(freeBytes)}</span>{' '}
                    <span className="text-gray-500">({freePercent}%)</span>
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {checks.map((check) => {
          const Icon = check.icon
          return (
            <article key={check.title} className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm text-gray-500">{check.title}</p>
                  <p className="text-xl font-semibold text-gray-900 mt-1">{check.value}</p>
                </div>
                <Icon className={`h-6 w-6 ${check.color}`} />
              </div>
              <p className="text-sm text-gray-600 mt-4">{check.details}</p>
            </article>
          )
        })}
      </div>

      <section className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <h2 className="text-lg font-semibold text-gray-900">Historique des purges Docker</h2>
          <p className="text-xs text-gray-400 whitespace-nowrap">
            Prochaine purge : {nextPurgeLabel}
          </p>
        </div>

        {loadingDiskUsage ? (
          <p className="mt-4 text-sm text-gray-500">Chargement...</p>
        ) : purgesError ? (
          <p className="mt-3 text-sm text-amber-700">{purgesError}</p>
        ) : sortedPurges.length === 0 ? (
          <p className="mt-4 text-sm text-gray-500">
            Pas encore d&apos;historique. Prochaine purge : {nextPurgeLabel}.
          </p>
        ) : (
          <>
            <p className="mt-2 text-sm text-gray-600">
              <span className="font-semibold text-gray-900">{formatGo(totalReclaimedBytes)}</span>{' '}
              libérés au total · {sortedPurges.length} purge{sortedPurges.length > 1 ? 's' : ''} enregistrée{sortedPurges.length > 1 ? 's' : ''}
            </p>

            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase text-gray-500">
                    <th scope="col" className="py-2 pr-4">Date</th>
                    <th scope="col" className="py-2 px-4 text-right">Récupéré</th>
                    <th scope="col" className="py-2 px-4 text-right hidden md:table-cell">Détail</th>
                    <th scope="col" className="py-2 pl-4 text-right hidden lg:table-cell">Avant → après (libre)</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedPurges.map((p) => (
                    <tr key={p.ranAt} className="border-t border-gray-100">
                      <td className="py-2 pr-4 text-gray-700">{formatUpdatedAtFr(p.ranAt)}</td>
                      <td className="py-2 px-4 text-right font-medium text-gray-900">
                        {formatGo(p.totalReclaimedBytes)}
                        {p.exitCode !== 0 && <span className="ml-2 text-xs text-amber-700">(échec)</span>}
                      </td>
                      <td className="py-2 px-4 text-right text-gray-500 hidden md:table-cell">
                        system : {formatGo(p.systemPruneReclaimedBytes)} · builder :{' '}
                        {formatGo(p.builderPruneReclaimedBytes)}
                      </td>
                      <td className="py-2 pl-4 text-right text-gray-500 hidden lg:table-cell">
                        {formatGo(p.diskFreeBeforeBytes)} → {formatGo(p.diskFreeAfterBytes)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>

    </div>
  )
}
