'use client'

import { useEffect, useState } from 'react'
import { AlertTriangle, Bell, HardDrive, RefreshCw, ShieldCheck } from 'lucide-react'

interface DiskUsage {
  total: string
  used: string
  available: string
  usePercent: string
  server?: string
  source?: string
  updatedAt?: string
}

interface EmailStatus {
  active: boolean
  recipient: string
  lastSentAt: string
}

export default function AdminMonitoringPage() {
  const [diskUsage, setDiskUsage] = useState<DiskUsage | null>(null)
  const [emailStatus, setEmailStatus] = useState<EmailStatus | null>(null)
  const [loadingDiskUsage, setLoadingDiskUsage] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function loadDiskUsage() {
      try {
        const response = await fetch('/api/admin/monitoring?action=disk')
        const data = await response.json()
        if (!cancelled && data?.disk) {
          setDiskUsage(data.disk as DiskUsage)
        }
        if (!cancelled && data?.email) {
          setEmailStatus(data.email as EmailStatus)
        }
      } catch (error) {
        console.error('Erreur chargement occupation disque:', error)
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

  const usePercentNumber = diskUsage ? parseInt(diskUsage.usePercent.replace('%', ''), 10) : 0
  const usageColorClass =
    usePercentNumber >= 95
      ? 'text-red-700'
      : usePercentNumber >= 90
        ? 'text-orange-700'
        : usePercentNumber >= 80
          ? 'text-amber-700'
          : 'text-emerald-700'

  const usageRingClass =
    usePercentNumber >= 95
      ? 'stroke-red-600'
      : usePercentNumber >= 90
        ? 'stroke-orange-600'
        : usePercentNumber >= 80
          ? 'stroke-amber-600'
          : 'stroke-emerald-600'

  const totalValue = diskUsage ? Number.parseFloat(diskUsage.total.replace(/[^\d.]/g, '')) : 0
  const usedValue = diskUsage ? Number.parseFloat(diskUsage.used.replace(/[^\d.]/g, '')) : 0
  const availableValue = diskUsage ? Number.parseFloat(diskUsage.available.replace(/[^\d.]/g, '')) : 0
  const maxBarValue = Math.max(totalValue, usedValue, availableValue, 1)

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
        <h2 className="text-lg font-semibold text-gray-900">Occupation disque serveur prod (57.130.47.254)</h2>
        {loadingDiskUsage && <p className="mt-2 text-sm text-gray-600">Chargement...</p>}
        {!loadingDiskUsage && !diskUsage && (
          <p className="mt-2 text-sm text-gray-600">Information indisponible pour le moment.</p>
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

            <div className="lg:col-span-2 space-y-4">
              {[
                { label: 'Total', value: diskUsage.total, numeric: totalValue, color: 'bg-[#0080A3]' },
                { label: 'Utilise', value: diskUsage.used, numeric: usedValue, color: 'bg-orange-500' },
                { label: 'Libre', value: diskUsage.available, numeric: availableValue, color: 'bg-emerald-500' },
              ].map((item) => (
                <div key={item.label}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-gray-700 font-medium">{item.label}</span>
                    <span className="text-gray-900">{item.value}</span>
                  </div>
                  <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-3 rounded-full ${item.color} transition-all duration-500`}
                      style={{ width: `${Math.max(6, (item.numeric / maxBarValue) * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        {!loadingDiskUsage && diskUsage?.updatedAt && (
          <p className="mt-2 text-xs text-gray-500">
            Derniere mise a jour: {new Date(diskUsage.updatedAt).toLocaleString('fr-FR')}
            {diskUsage.source === 'local' ? ' (fallback local)' : ''}
          </p>
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

    </div>
  )
}
