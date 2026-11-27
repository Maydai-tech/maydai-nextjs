'use client'

import { Loader2 } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'

import { useAuth } from '@/lib/auth'
import { parseApiJson } from '@/lib/utils'
import type { BenchSourceSlug } from '@/types/bench-sources.zod'

import { CompariaReconcileSection, CompariaSyncDialog } from '../../CompariaSyncPanel'
import { EcologitsReconcilePanel } from '../../EcologitsReconcilePanel'
import { SheetGuidanceDrawerOrCard, type SheetGuidance } from '../../SheetGuidanceDrawerOrCard'

const SOURCES: Array<{ slug: BenchSourceSlug; label: string }> = [
  { slug: 'llm-stats', label: 'LLM Stats' },
  { slug: 'ecologits', label: 'EcoLogits' },
  { slug: 'comparia', label: 'Compar:IA' },
  { slug: 'compl-ai', label: 'COMPL-AI' },
  { slug: 'system-card', label: 'System Card' },
]

type HeaderStat = {
  catalogInServiceTotal: number
  activeInCatalog: number
  deprecatedInCatalog: number
  inServiceInCatalog: number
  totalInCatalog: number
  inServiceCompletionPercent: number
  lastRun: { status: string | null; modelsSynced: number | null; startedAt: string | null } | null
  actionableCount: number
  actionableLabel: string
}

type MaydaiOption = { id: string; slug: string | null; model_name: string; model_provider: string | null; role: string | null; lifecycle_status: string | null }
type Unqualified = { id: string; slug: string | null; model_name: string; model_provider: string | null; role: string | null; lifecycle_status: string | null; guidance: SheetGuidance }

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

interface ComplAiRunLog {
  sync_date?: string | null
  status?: string | null
  models_synced?: number | null
  evaluations_synced?: number | null
  error_message?: string | null
}

function readComplAiRunLog(value: Record<string, unknown>): ComplAiRunLog {
  return {
    sync_date: typeof value.sync_date === 'string' ? value.sync_date : null,
    status: typeof value.status === 'string' ? value.status : null,
    models_synced: typeof value.models_synced === 'number' ? value.models_synced : null,
    evaluations_synced: typeof value.evaluations_synced === 'number' ? value.evaluations_synced : null,
    error_message: typeof value.error_message === 'string' ? value.error_message : null,
  }
}

function isComplAiSuccessStatus(status: string | null | undefined): boolean {
  return (status || '').toLowerCase() === 'success'
}

function getLabel(key: string | null | undefined): string {
  return key || 'Inconnu'
}

function readFiniteNumber(record: Record<string, unknown>, key: string): number | null {
  const value = record[key]
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function readHeader(value: unknown): HeaderStat | null {
  if (!isRecord(value) || typeof value.actionableLabel !== 'string') return null
  const catalogInServiceTotal = readFiniteNumber(value, 'catalogInServiceTotal')
  const activeInCatalog = readFiniteNumber(value, 'activeInCatalog')
  const deprecatedInCatalog = readFiniteNumber(value, 'deprecatedInCatalog')
  const inServiceInCatalog = readFiniteNumber(value, 'inServiceInCatalog')
  const totalInCatalog = readFiniteNumber(value, 'totalInCatalog')
  const inServiceCompletionPercent = readFiniteNumber(value, 'inServiceCompletionPercent')
  const actionableCount = readFiniteNumber(value, 'actionableCount')
  if (catalogInServiceTotal == null || activeInCatalog == null || deprecatedInCatalog == null || inServiceInCatalog == null || totalInCatalog == null || inServiceCompletionPercent == null || actionableCount == null) return null
  const last = isRecord(value.lastRun) ? value.lastRun : null
  return {
    catalogInServiceTotal,
    activeInCatalog,
    deprecatedInCatalog,
    inServiceInCatalog,
    totalInCatalog,
    inServiceCompletionPercent,
    actionableCount,
    actionableLabel: value.actionableLabel,
    lastRun: last ? {
      status: typeof last.status === 'string' ? last.status : null,
      modelsSynced: typeof last.modelsSynced === 'number' ? last.modelsSynced : null,
      startedAt: typeof last.startedAt === 'string' ? last.startedAt : null,
    } : null,
  }
}

function readGuidance(value: unknown): SheetGuidance | null {
  if (!isRecord(value) || !Array.isArray(value.columns_to_qualify) || !Array.isArray(value.columns_to_merge)) return null
  const column = (item: unknown) => isRecord(item) && typeof item.column_letter === 'string' && typeof item.header === 'string' && typeof item.expected_hint === 'string'
    ? { column_letter: item.column_letter, header: item.header, expected_hint: item.expected_hint }
    : null
  return {
    sheet_url: typeof value.sheet_url === 'string' ? value.sheet_url : null,
    row_number: typeof value.row_number === 'number' ? value.row_number : null,
    in_sheet: value.in_sheet === true,
    sheet_status: typeof value.sheet_status === 'string' ? value.sheet_status : null,
    columns_to_qualify: value.columns_to_qualify.flatMap((item) => { const parsed = column(item); return parsed ? [parsed] : [] }),
    columns_to_merge: value.columns_to_merge.flatMap((item) => { const parsed = column(item); return parsed ? [parsed] : [] }),
  }
}

function readUnqualified(value: unknown): Unqualified[] {
  if (!Array.isArray(value)) return []
  return value.flatMap((item) => {
    if (!isRecord(item) || typeof item.id !== 'string' || typeof item.model_name !== 'string') return []
    const guidance = readGuidance(item.guidance)
    if (!guidance) return []
    return [{
      id: item.id,
      slug: typeof item.slug === 'string' ? item.slug : null,
      model_name: item.model_name,
      model_provider: typeof item.model_provider === 'string' ? item.model_provider : null,
      role: typeof item.role === 'string' ? item.role : null,
      lifecycle_status: typeof item.lifecycle_status === 'string' ? item.lifecycle_status : null,
      guidance,
    }]
  })
}

function readOptions(value: unknown): MaydaiOption[] {
  if (!Array.isArray(value)) return []
  return value.flatMap((item) => {
    if (!isRecord(item) || typeof item.id !== 'string' || typeof item.model_name !== 'string') return []
    return [{
      id: item.id,
      slug: typeof item.slug === 'string' ? item.slug : null,
      model_name: item.model_name,
      model_provider: typeof item.model_provider === 'string' ? item.model_provider : null,
      role: typeof item.role === 'string' ? item.role : null,
      lifecycle_status: typeof item.lifecycle_status === 'string' ? item.lifecycle_status : null,
    }]
  })
}

export default function BenchSourceDetailClient({ source }: { source: BenchSourceSlug }) {
  const router = useRouter()
  const { getAccessToken } = useAuth()
  const [includeSheetMap, setIncludeSheetMap] = useState(false)
  const [payload, setPayload] = useState<Record<string, unknown> | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [roleFilter, setRoleFilter] = useState<'a_classer' | 'all'>('all')
  const [search, setSearch] = useState('')
  const [cardTab, setCardTab] = useState<'missing' | 'error_no_system_card' | 'generated'>('missing')
  const [llmTab, setLlmTab] = useState<'unqualified' | 'errors'>('unqualified')
  const [complTab, setComplTab] = useState<'unqualified' | 'logs'>('unqualified')
  const [compariaOpen, setCompariaOpen] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)

  const load = useCallback(async () => {
    const token = getAccessToken()
    if (!token) return
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(`/api/admin/bench-llms/sources/${source}?includeSheetMap=${includeSheetMap ? 'true' : 'false'}`, {
        cache: 'no-store',
        headers: { Authorization: `Bearer ${token}` },
      })
      const body = await parseApiJson<Record<string, unknown> & { error?: string }>(response)
      if (!response.ok) throw new Error(body.error || 'Chargement de la source impossible')
      setPayload(body)
    } catch (loadError) {
      console.error('[BenchSourceDetail]', loadError)
      setError(loadError instanceof Error ? loadError.message : 'Chargement impossible')
    } finally {
      setLoading(false)
    }
  }, [getAccessToken, includeSheetMap, source])

  useEffect(() => { void load() }, [load])

  function reload() {
    router.refresh()
    void load()
  }

  const header = readHeader(payload?.header)
  const options = readOptions(payload?.maydaiOptions)
  const unqualified = readUnqualified(payload?.unqualified_models)
  const visibleUnqualified = unqualified.filter((model) => {
    if (roleFilter === 'a_classer' && model.role !== 'a_classer') return false
    const haystack = `${model.model_provider ?? ''} ${model.model_name} ${model.slug ?? ''}`.toLowerCase()
    return haystack.includes(search.trim().toLowerCase())
  })
  const lastRunErrors = Array.isArray(payload?.lastRunErrors) ? payload.lastRunErrors.filter((item): item is string => typeof item === 'string') : []
  const buckets = Array.isArray(payload?.buckets) ? payload.buckets.filter(isRecord) : []
  const activeBucket = buckets.find((bucket) => bucket.system_card_status === cardTab)
  const cardModels = readUnqualified(activeBucket?.models).filter((model) => `${model.model_provider ?? ''} ${model.model_name}`.toLowerCase().includes(search.trim().toLowerCase()))

  async function syncLlmStats() {
    const token = getAccessToken()
    if (!token) return
    setBusy('Sync LLM Stats')
    try {
      const response = await fetch('/api/admin/llm-stats-sync-runs', { method: 'POST', cache: 'no-store', headers: { Authorization: `Bearer ${token}` } })
      const body = await parseApiJson<{ error?: string }>(response)
      if (!response.ok) throw new Error(body.error || 'Sync LLM Stats impossible')
      reload()
    } catch (syncError) {
      console.error('[BenchSourceDetail]', syncError)
      setError(syncError instanceof Error ? syncError.message : 'Sync impossible')
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Link href="/admin/bench-llms" className="text-sm font-medium text-[#0080A3] hover:underline">← Retour au registre LLM (/admin/bench-llms)</Link>
        <button type="button" onClick={() => setIncludeSheetMap(true)} className="rounded-md border px-3 py-2 text-sm">Localiser les lignes dans le Sheet</button>
      </div>
      <nav className="flex flex-wrap gap-2" aria-label="Sources">
        {SOURCES.map((item) => (
          <Link key={item.slug} href={`/admin/bench-llms/sources/${item.slug}`} className={`rounded-full border px-3 py-1 text-sm ${item.slug === source ? 'border-[#0080A3] bg-sky-50 font-medium text-[#0080A3]' : 'border-gray-200'}`}>{item.label}</Link>
        ))}
      </nav>
      {error ? <p className="rounded-md bg-red-50 p-3 text-sm text-red-800">{error}</p> : null}
      {loading || !header ? <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-[#0080A3]" /></div> : (
        <section className="rounded-lg border border-gray-200 bg-white p-4">
          <h1 className="text-xl font-semibold text-gray-900">{getLabel(SOURCES.find((item) => item.slug === source)?.label)}</h1>
          <p className="mt-2 text-sm text-gray-700">Actif + Déprécié : {header.inServiceInCatalog}/{header.catalogInServiceTotal}</p>
          <p className="text-sm text-gray-700">Consolidés : {header.totalInCatalog} modèles ({header.activeInCatalog} actif(s), {header.deprecatedInCatalog} déprécié(s))</p>
          <p className="text-sm text-gray-700">Dernier run : {getLabel(header.lastRun?.status)} · {header.lastRun?.modelsSynced ?? '—'} modèle(s)</p>
          <p className="mt-2 inline-flex rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-900">{header.actionableLabel}</p>
        </section>
      )}
      {source === 'ecologits' ? <EcologitsReconcilePanel getAccessToken={getAccessToken} lastRunErrors={lastRunErrors} onChanged={reload} /> : null}
      {source === 'comparia' ? (
        <>
          <button type="button" onClick={() => setCompariaOpen(true)} className="rounded-md bg-violet-700 px-3 py-2 text-sm font-medium text-white">Importer un CSV Compar:IA</button>
          {isRecord(payload?.lastRun) && Array.isArray(payload.lastRun.errors) ? (
            <ul className="space-y-2">{payload.lastRun.errors.filter((item): item is string => typeof item === 'string').map((message) => <li key={message} className="rounded-md bg-red-50 p-3 text-sm text-red-900">{message}</li>)}</ul>
          ) : null}
          <CompariaReconcileSection getAccessToken={getAccessToken} refreshToken={0} disabled={busy != null} onUnmatchedCount={() => undefined} onChanged={reload} />
          <CompariaSyncDialog open={compariaOpen} busy={busy != null} getAccessToken={getAccessToken} onClose={() => setCompariaOpen(false)} onBusy={setBusy} onImported={reload} />
        </>
      ) : null}
      {source === 'llm-stats' || source === 'compl-ai' ? (
        <>
          <SheetGuidanceDrawerOrCard showWorkflow maydaiOptions={options} getAccessToken={getAccessToken} onReload={reload} />
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => source === 'llm-stats' ? setLlmTab('unqualified') : setComplTab('unqualified')} className="rounded-full border px-3 py-1 text-sm">Fiches non qualifiées</button>
            <button type="button" onClick={() => source === 'llm-stats' ? setLlmTab('errors') : setComplTab('logs')} className="rounded-full border px-3 py-1 text-sm">{source === 'llm-stats' ? 'Rejets et erreurs du dernier run' : 'Journaux et erreurs des runs'}</button>
            {source === 'llm-stats' ? <button type="button" disabled={busy != null} onClick={() => void syncLlmStats()} className="rounded-md bg-sky-700 px-3 py-2 text-sm font-medium text-white">Sync LLM Stats</button> : null}
          </div>
          {(source === 'llm-stats' ? llmTab : complTab) === 'unqualified' ? (
            <div className="space-y-3">
              <div className="flex flex-col gap-2 sm:flex-row">
                <button type="button" onClick={() => setRoleFilter('a_classer')} className="rounded-md border px-3 py-2 text-sm">a_classer uniquement</button>
                <button type="button" onClick={() => setRoleFilter('all')} className="rounded-md border px-3 py-2 text-sm">Toutes sans rôle</button>
                <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Rechercher" className="w-full rounded-md border px-3 py-2 text-sm sm:max-w-xs" />
              </div>
              {visibleUnqualified.map((model) => (
                <SheetGuidanceDrawerOrCard key={model.id} fiche={{ id: model.id, slug: model.slug, role: model.role, model_name: model.model_name, guidance: model.guidance }} maydaiOptions={options} getAccessToken={getAccessToken} onReload={reload} />
              ))}
            </div>
          ) : source === 'llm-stats' && isRecord(payload?.last_run_issues) ? (
            <section className="space-y-3 rounded-lg border bg-white p-4">
              <p className="text-sm">Statut : {getLabel(typeof payload.last_run_issues.status === 'string' ? payload.last_run_issues.status : null)}</p>
              <h2 className="font-semibold">Créations du run</h2>
              <ul className="space-y-2 text-sm">{Array.isArray(payload.last_run_issues.created_models) ? payload.last_run_issues.created_models.filter(isRecord).map((model) => <li key={String(model.model_name)}>{getLabel(typeof model.model_provider === 'string' ? model.model_provider : null)} / {getLabel(typeof model.model_name === 'string' ? model.model_name : null)}</li>) : null}</ul>
              <h2 className="font-semibold">Erreurs</h2>
              <ul className="space-y-2">{Array.isArray(payload.last_run_issues.errors) ? payload.last_run_issues.errors.filter(isRecord).map((issue) => <li key={String(issue.message)} className="rounded-md bg-red-50 p-3 text-sm text-red-900">{typeof issue.message === 'string' ? issue.message : 'Erreur illisible'}{typeof issue.conflict === 'string' ? ` · conflit ${issue.conflict}` : ''}</li>) : null}</ul>
            </section>
          ) : (
            <ul className="space-y-2">{Array.isArray(payload?.last_run_issues) ? payload.last_run_issues.filter(isRecord).map((raw) => {
              const log = readComplAiRunLog(raw)
              const success = isComplAiSuccessStatus(log.status)
              return (
              <li key={`${log.sync_date ?? ''}-${log.status ?? ''}-${log.models_synced ?? ''}`} className="rounded-md border bg-white p-3 text-sm">
                <span className={success ? 'rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-800' : 'rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-800'}>{log.status || 'statut inconnu'}</span>
                <span className="text-gray-700"> · {log.sync_date || 'date inconnue'} · {log.models_synced ?? '—'} modèles · {log.evaluations_synced ?? '—'} évaluations</span>
                {log.error_message ? <p className={success ? 'mt-2 text-gray-700' : 'mt-2 text-red-800'}>{log.error_message}</p> : null}
              </li>
              )
            }) : null}</ul>
          )}
        </>
      ) : null}
      {source === 'system-card' ? (
        <>
          <SheetGuidanceDrawerOrCard showWorkflow maydaiOptions={options} getAccessToken={getAccessToken} onReload={reload} />
          <div className="flex flex-col gap-2 sm:flex-row">
            <button type="button" onClick={() => setCardTab('missing')} className="rounded-full border px-3 py-1 text-sm">Manquantes (missing)</button>
            <button type="button" onClick={() => setCardTab('error_no_system_card')} className="rounded-full border px-3 py-1 text-sm">En erreur (error_no_system_card)</button>
            <button type="button" onClick={() => setCardTab('generated')} className="rounded-full border px-3 py-1 text-sm">Générées (generated)</button>
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Rechercher" className="w-full rounded-md border px-3 py-2 text-sm sm:max-w-xs" />
          </div>
          <ul className="space-y-3">
            {cardModels.map((model) => (
              <li key={model.id} className="space-y-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-gray-700">{getLabel(model.model_provider)} · rôle {model.role ?? '(vide)'} · {getLabel(model.lifecycle_status)}</p>
                  <Link href={`/admin/bench-llms/${model.id}`} className="text-sm text-[#0080A3] underline">Ouvrir la fiche</Link>
                </div>
                <SheetGuidanceDrawerOrCard fiche={{ id: model.id, slug: model.slug, role: model.role, model_name: model.model_name, guidance: model.guidance }} maydaiOptions={options} getAccessToken={getAccessToken} onReload={reload} />
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </div>
  )
}
