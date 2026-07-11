'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Loader2,
  PlayCircle,
  RefreshCw,
} from 'lucide-react'

import { useAuth } from '@/lib/auth'

type SyncModelChange = {
  id?: string
  model_name: string
  model_provider: string
  changedFields?: string[]
}

type LlmStatsSyncRun = {
  id: string
  started_at: string
  finished_at: string
  status: 'success' | 'partial' | 'error'
  models_fetched: number
  models_created: number
  models_updated: number
  models_unchanged: number
  created_models: SyncModelChange[]
  updated_models: SyncModelChange[]
  errors: string[]
  email_sent: boolean
  failure_email_sent: boolean
  execution_time_ms: number | null
  created_at: string
}

type ApiResponse = {
  runs: LlmStatsSyncRun[]
  error?: string
}

type RunNowResponse = {
  success: boolean
  error?: string
  modelsFetched?: number
  modelsCreated?: number
  modelsUpdated?: number
  modelsUnchanged?: number
  emailSent?: boolean
  failureEmailSent?: boolean
}

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Europe/Paris',
  }).format(new Date(value))
}

function formatDuration(ms: number | null): string {
  if (ms == null || !Number.isFinite(ms)) return '—'
  if (ms < 1000) return `${Math.round(ms)} ms`
  const seconds = Math.round(ms / 1000)
  if (seconds < 60) return `${seconds} s`
  const minutes = Math.floor(seconds / 60)
  const rest = seconds % 60
  return `${minutes} min ${rest} s`
}

function statusLabel(status: LlmStatsSyncRun['status']): string {
  if (status === 'success') return 'Succès'
  if (status === 'partial') return 'Partiel'
  return 'Échec'
}

function statusClassName(status: LlmStatsSyncRun['status']): string {
  if (status === 'success') return 'bg-emerald-50 text-emerald-700 ring-emerald-200'
  if (status === 'partial') return 'bg-amber-50 text-amber-700 ring-amber-200'
  return 'bg-red-50 text-red-700 ring-red-200'
}

function statusIcon(status: LlmStatsSyncRun['status']) {
  if (status === 'success') return <CheckCircle2 className="h-4 w-4" />
  if (status === 'partial') return <AlertTriangle className="h-4 w-4" />
  return <AlertTriangle className="h-4 w-4" />
}

function ModelChangeList({
  title,
  rows,
}: {
  title: string
  rows: SyncModelChange[]
}) {
  if (rows.length === 0) return null

  return (
    <details className="mt-3 rounded border border-gray-200 bg-white">
      <summary className="cursor-pointer px-3 py-2 text-sm font-medium text-gray-900">
        {title} ({rows.length})
      </summary>
      <div className="max-h-72 overflow-auto border-t border-gray-100">
        <ul className="divide-y divide-gray-100 text-sm">
          {rows.map((row, index) => (
            <li key={`${row.model_provider}-${row.model_name}-${index}`} className="px-3 py-2">
              <div className="font-medium text-gray-900">
                {row.model_provider} / {row.model_name}
              </div>
              {row.changedFields && row.changedFields.length > 0 ? (
                <div className="mt-1 text-xs text-gray-500">
                  Champs: {row.changedFields.join(', ')}
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      </div>
    </details>
  )
}

function RunCard({ run }: { run: LlmStatsSyncRun }) {
  return (
    <article className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${statusClassName(
                run.status,
              )}`}
            >
              {statusIcon(run.status)}
              {statusLabel(run.status)}
            </span>
            <span className="inline-flex items-center gap-1 text-sm text-gray-500">
              <Clock className="h-4 w-4" />
              {formatDuration(run.execution_time_ms)}
            </span>
          </div>
          <h2 className="mt-2 text-base font-semibold text-gray-900">
            Exécution du {formatDateTime(run.started_at)}
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Fin: {formatDateTime(run.finished_at)}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-5 md:min-w-[32rem]">
          <div className="rounded border border-gray-100 bg-gray-50 px-3 py-2">
            <div className="text-xs text-gray-500">Récupérés</div>
            <div className="font-semibold text-gray-900">{run.models_fetched}</div>
          </div>
          <div className="rounded border border-gray-100 bg-gray-50 px-3 py-2">
            <div className="text-xs text-gray-500">Créés</div>
            <div className="font-semibold text-gray-900">{run.models_created}</div>
          </div>
          <div className="rounded border border-gray-100 bg-gray-50 px-3 py-2">
            <div className="text-xs text-gray-500">Mis à jour</div>
            <div className="font-semibold text-gray-900">{run.models_updated}</div>
          </div>
          <div className="rounded border border-gray-100 bg-gray-50 px-3 py-2">
            <div className="text-xs text-gray-500">Inchangés</div>
            <div className="font-semibold text-gray-900">{run.models_unchanged}</div>
          </div>
          <div className="rounded border border-gray-100 bg-gray-50 px-3 py-2">
            <div className="text-xs text-gray-500">Email</div>
            <div className="font-semibold text-gray-900">
              {run.email_sent || run.failure_email_sent ? 'Envoyé' : 'Non'}
            </div>
          </div>
        </div>
      </div>

      {run.errors.length > 0 ? (
        <details className="mt-4 rounded border border-red-100 bg-red-50">
          <summary className="cursor-pointer px-3 py-2 text-sm font-medium text-red-800">
            Erreurs ({run.errors.length})
          </summary>
          <ul className="space-y-1 border-t border-red-100 px-3 py-2 text-sm text-red-800">
            {run.errors.map((error, index) => (
              <li key={`${error}-${index}`}>{error}</li>
            ))}
          </ul>
        </details>
      ) : null}

      <ModelChangeList title="Modèles créés" rows={run.created_models || []} />
      <ModelChangeList title="Modèles mis à jour" rows={run.updated_models || []} />
    </article>
  )
}

export default function LlmStatsSyncRunsAdminPage() {
  const { getAccessToken } = useAuth()
  const [runs, setRuns] = useState<LlmStatsSyncRun[]>([])
  const [loading, setLoading] = useState(true)
  const [running, setRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [runMessage, setRunMessage] = useState<string | null>(null)
  const [runError, setRunError] = useState<string | null>(null)

  const latestRun = useMemo(() => runs[0] || null, [runs])

  const fetchRuns = useCallback(async () => {
    const token = getAccessToken()
    if (!token) {
      setError('Session admin introuvable.')
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/admin/llm-stats-sync-runs?limit=50', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      const payload = (await response.json()) as ApiResponse
      if (!response.ok) {
        throw new Error(payload.error || "Impossible de charger l'historique.")
      }
      setRuns(payload.runs || [])
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : 'Erreur inconnue')
    } finally {
      setLoading(false)
    }
  }, [getAccessToken])

  useEffect(() => {
    fetchRuns()
  }, [fetchRuns])

  const runSyncNow = useCallback(async () => {
    const token = getAccessToken()
    if (!token) {
      setRunError('Session admin introuvable.')
      return
    }

    setRunning(true)
    setRunMessage(null)
    setRunError(null)

    try {
      const response = await fetch('/api/admin/llm-stats-sync-runs', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      const payload = (await response.json()) as RunNowResponse
      if (!response.ok) {
        throw new Error(payload.error || "Impossible d'exécuter le cron LLM Stats.")
      }

      setRunMessage(
        `Exécution terminée : ${payload.modelsFetched ?? 0} modèles récupérés, ${
          payload.modelsCreated ?? 0
        } créés, ${payload.modelsUpdated ?? 0} mis à jour.`,
      )
      await fetchRuns()
    } catch (syncError) {
      setRunError(syncError instanceof Error ? syncError.message : 'Erreur inconnue')
    } finally {
      setRunning(false)
    }
  }, [fetchRuns, getAccessToken])

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link
            href="/admin"
            className="inline-flex items-center gap-2 text-sm font-medium text-[#0080A3] hover:text-[#006280]"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour admin
          </Link>
          <h1 className="mt-3 text-2xl font-bold text-gray-900">Historique cron LLM Stats</h1>
          <p className="mt-2 text-gray-600">
            Synchronisations quotidiennes des données Bench LLM depuis LLM Stats.
          </p>
          {latestRun ? (
            <p className="mt-2 text-sm text-gray-500">
              Dernière exécution: {formatDateTime(latestRun.started_at)} ·{' '}
              {statusLabel(latestRun.status)}
            </p>
          ) : null}
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={runSyncNow}
            disabled={running}
            className="inline-flex items-center justify-center gap-2 rounded-md bg-[#0080A3] px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-[#006280] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {running ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <PlayCircle className="h-4 w-4" />
            )}
            {running ? 'Exécution...' : 'Exécuter maintenant'}
          </button>

          <button
            type="button"
            onClick={fetchRuns}
            disabled={loading || running}
            className="inline-flex items-center justify-center gap-2 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Actualiser
          </button>
        </div>
      </div>

      {runMessage ? (
        <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {runMessage}
        </div>
      ) : null}

      {runError ? (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {runError}
        </div>
      ) : null}

      {error ? (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-[#0080A3]" />
        </div>
      ) : error ? null : runs.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white p-8 text-center text-gray-500">
          Aucune exécution enregistrée pour le moment.
        </div>
      ) : (
        <div className="space-y-4">
          {runs.map((run) => (
            <RunCard key={run.id} run={run} />
          ))}
        </div>
      )}
    </div>
  )
}
