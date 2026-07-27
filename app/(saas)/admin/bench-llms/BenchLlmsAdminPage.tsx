'use client'

import {
  AlertTriangle,
  Check,
  ChevronLeft,
  ChevronRight,
  Database,
  Download,
  Leaf,
  Loader2,
  Plus,
  RefreshCw,
  Trash2,
  Upload,
  X,
} from 'lucide-react'
import dynamic from 'next/dynamic'
import { useCallback, useDeferredValue, useEffect, useRef, useState } from 'react'

import { useAuth } from '@/lib/auth'
import type { BenchSourceKey, UnifiedBenchModel } from '@/lib/bench-llm/admin-unified'

const BenchLlmDetailContent = dynamic(
  () => import('./[id]/BenchLlmDetailPage').then((module) => module.BenchLlmDetailContent),
  {
    loading: () => (
      <div className="flex min-h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#0080A3]" />
      </div>
    ),
  },
)

const SOURCES: Array<{ key: BenchSourceKey; label: string }> = [
  { key: 'maydai', label: 'MaydAI' },
  { key: 'compl_ai', label: 'COMPL-AI' },
  { key: 'comparia', label: 'Compar:IA' },
  { key: 'llm_stats', label: 'LLM Stats' },
  { key: 'ecologits', label: 'EcoLogits' },
]

type ApiResponse = {
  models: UnifiedBenchModel[]
  total: number
  page: number
  pageSize: number
  providers: string[]
  histories: Record<string, unknown[]>
  role: 'admin' | 'super_admin'
  error?: string
}

type HistoryRow = {
  id?: string
  status?: string
  started_at?: string
  created_at?: string
  models_fetched?: number
  errors?: unknown
}

function Presence({ available }: { available: boolean }) {
  return available ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700">
      <Check className="h-3.5 w-3.5" /> Oui
    </span>
  ) : (
    <span className="inline-flex rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-500">Non</span>
  )
}

function parseCsv(text: string): Record<string, string>[] {
  const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/).filter((line) => line.trim())
  if (lines.length < 2) return []
  const separator = lines[0]!.includes(';') ? ';' : ','
  const headers = lines[0]!.split(separator).map((value) => value.trim().replace(/^"|"$/g, ''))
  return lines.slice(1).map((line) => {
    const values = line.split(separator).map((value) => value.trim().replace(/^"|"$/g, ''))
    return Object.fromEntries(headers.map((header, index) => [header, values[index] ?? '']))
  })
}

function formatHistoryDate(row: HistoryRow): string {
  const value = row.started_at ?? row.created_at
  if (!value) return 'Date indisponible'
  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value))
}

function FullScreenModelModal({
  entityId,
  onClose,
  onDeleted,
}: {
  entityId: string
  onClose: () => void
  onDeleted: () => void
}) {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', closeOnEscape)

    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-[100] flex justify-center bg-gray-950/50 p-3 sm:p-6"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Détails du modèle"
        className="h-full w-full max-w-7xl overflow-y-auto rounded-xl bg-gray-50 shadow-2xl"
      >
        <div className="sticky top-0 z-10 flex justify-end border-b border-gray-200 bg-white/95 px-4 py-3 backdrop-blur sm:px-6">
          <button
            type="button"
            onClick={onClose}
            autoFocus
            className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0080A3]"
          >
            <X className="h-4 w-4" />
            Fermer
          </button>
        </div>
        <div className="px-4 py-6 sm:px-6 lg:px-8">
          <BenchLlmDetailContent
            id={entityId}
            modal
            onClose={onClose}
            onDeleted={onDeleted}
          />
        </div>
      </div>
    </div>
  )
}

export default function BenchLlmsAdminPage() {
  const { getAccessToken } = useAuth()
  const importInput = useRef<HTMLInputElement>(null)
  const compariaImportInput = useRef<HTMLInputElement>(null)
  const [models, setModels] = useState<UnifiedBenchModel[]>([])
  const [providers, setProviders] = useState<string[]>([])
  const [total, setTotal] = useState(0)
  const [histories, setHistories] = useState<Record<string, HistoryRow[]>>({})
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const deferredSearch = useDeferredValue(search)
  const [provider, setProvider] = useState('')
  const [active, setActive] = useState('all')
  const [source, setSource] = useState('')
  const [availability, setAvailability] = useState('all')
  const [loading, setLoading] = useState(true)
  const [action, setAction] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null)
  const [importMode, setImportMode] = useState<'create' | 'update'>('update')
  const [createForm, setCreateForm] = useState({ model_name: '', model_provider: '', model_type: 'large-language-model', version: '' })
  const pageSize = 25

  const fetchModels = useCallback(async () => {
    const token = getAccessToken()
    if (!token) return
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
        search: deferredSearch,
        provider,
        active,
        source,
        availability,
      })
      const response = await fetch(`/api/admin/bench-llms?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const payload = (await response.json()) as ApiResponse
      if (!response.ok) throw new Error(payload.error || 'Chargement impossible')
      setModels(payload.models)
      setProviders(payload.providers)
      setTotal(payload.total)
      setHistories(payload.histories as Record<string, HistoryRow[]>)
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : 'Erreur inconnue')
    } finally {
      setLoading(false)
    }
  }, [active, availability, deferredSearch, getAccessToken, page, provider, source])

  useEffect(() => void fetchModels(), [fetchModels])
  useEffect(() => setPage(1), [active, availability, deferredSearch, provider, source])

  const callAction = useCallback(async (name: string, url: string, options?: RequestInit) => {
    const token = getAccessToken()
    if (!token) return
    setAction(name)
    setError(null)
    setMessage(null)
    try {
      const response = await fetch(url, {
        method: 'POST',
        ...options,
        headers: {
          Authorization: `Bearer ${token}`,
          ...(options?.headers ?? {}),
        },
      })
      const payload = await response.json()
      if (!response.ok && response.status !== 207) throw new Error(payload.error || payload.message || `${name} impossible`)
      setMessage(`${name} terminé avec succès.`)
      await fetchModels()
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'Erreur inconnue')
    } finally {
      setAction(null)
    }
  }, [fetchModels, getAccessToken])

  const createModel = useCallback(async () => {
    await callAction('Création du modèle', '/api/admin/compl-ai/models', {
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(createForm),
    })
    setShowCreate(false)
  }, [callAction, createForm])

  const importCsv = useCallback(async (file: File) => {
    const csvData = parseCsv(await file.text())
    await callAction('Import COMPL-AI', '/api/admin/compl-ai/import-csv', {
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ csvData, updateMode: importMode === 'update' }),
    })
  }, [callAction, importMode])

  const importCompariaCsv = useCallback(async (file: File) => {
    const token = getAccessToken()
    if (!token) return
    setAction('Import Compar:IA')
    setError(null)
    setMessage(null)
    try {
      const formData = new FormData()
      formData.set('file', file)
      const response = await fetch('/api/admin/comparia/import', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'Import Compar:IA impossible')
      setMessage(
        `Compar:IA : ${payload.rowsImported} modèle(s) importé(s), ` +
        `${payload.exactLinksCreated} nouvelle(s) liaison(s) exacte(s), ` +
        `${payload.modelsDeactivated} modèle(s) désactivé(s).`,
      )
      await fetchModels()
    } catch (importError) {
      setError(importError instanceof Error ? importError.message : 'Erreur inconnue')
    } finally {
      setAction(null)
    }
  }, [fetchModels, getAccessToken])

  const exportCsv = useCallback(async () => {
    const token = getAccessToken()
    if (!token) return
    setAction('Export COMPL-AI')
    try {
      const response = await fetch('/api/admin/compl-ai/export-csv', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!response.ok) throw new Error('Export impossible')
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `compl-ai-${new Date().toISOString().slice(0, 10)}.csv`
      anchor.click()
      URL.revokeObjectURL(url)
    } catch (exportError) {
      setError(exportError instanceof Error ? exportError.message : 'Erreur inconnue')
    } finally {
      setAction(null)
    }
  }, [getAccessToken])

  const downloadTemplate = useCallback(async () => {
    const token = getAccessToken()
    if (!token) return
    setAction('Modèle CSV')
    try {
      const response = await fetch('/api/admin/compl-ai/import-csv', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!response.ok) throw new Error('Téléchargement du modèle impossible')
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = 'compl-ai-import-template.csv'
      anchor.click()
      URL.revokeObjectURL(url)
    } catch (downloadError) {
      setError(downloadError instanceof Error ? downloadError.message : 'Erreur inconnue')
    } finally {
      setAction(null)
    }
  }, [getAccessToken])

  const pages = Math.max(1, Math.ceil(total / pageSize))

  return (
    <div className="pb-12">
      <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <Database className="h-8 w-8 text-[#0080A3]" />
            <h1 className="text-2xl font-bold text-gray-900">Bench LLMs</h1>
          </div>
          <p className="mt-2 text-gray-600">Registre unifié des modèles et de leurs données de benchmark.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setShowCreate(true)} className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium"><Plus className="h-4 w-4" /> Modèle</button>
          <button onClick={() => callAction('Synchronisation LLM Stats', '/api/admin/llm-stats-sync-runs')} disabled={action != null} className="rounded-md bg-sky-700 px-3 py-2 text-sm font-medium text-white">Sync LLM Stats</button>
          <button onClick={() => callAction('Synchronisation EcoLogits', '/api/admin/ecologits/sync')} disabled={action != null} className="inline-flex items-center gap-2 rounded-md bg-emerald-700 px-3 py-2 text-sm font-medium text-white"><Leaf className="h-4 w-4" /> Sync EcoLogits</button>
          <button onClick={() => compariaImportInput.current?.click()} disabled={action != null} className="rounded-md bg-violet-700 px-3 py-2 text-sm font-medium text-white">Import Compar:IA</button>
          <input ref={compariaImportInput} type="file" accept=".csv,text/csv" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file) void importCompariaCsv(file); event.target.value = '' }} />
          <button onClick={() => callAction('Synchronisation COMPL-AI', '/api/admin/compl-ai/sync')} disabled={action != null} className="rounded-md bg-indigo-700 px-3 py-2 text-sm font-medium text-white">Sync COMPL-AI</button>
          <button onClick={() => callAction('Recalcul MaydAI', '/api/admin/compl-ai/recalculate-maydai-scores')} disabled={action != null} className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium">Recalcul MaydAI</button>
          <button onClick={exportCsv} disabled={action != null} className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium"><Download className="h-4 w-4" /> CSV</button>
          <button onClick={downloadTemplate} disabled={action != null} className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium">Modèle CSV</button>
          <select value={importMode} onChange={(event) => setImportMode(event.target.value as 'create' | 'update')} className="rounded-md border border-gray-300 bg-white px-2 py-2 text-sm"><option value="update">Import : mettre à jour</option><option value="create">Import : créer</option></select>
          <button onClick={() => importInput.current?.click()} disabled={action != null} className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium"><Upload className="h-4 w-4" /> Import</button>
          <button onClick={() => { if (confirm('Supprimer toutes les données COMPL-AI ? Cette action est irréversible.')) void callAction('Suppression COMPL-AI', '/api/admin/compl-ai/clear') }} disabled={action != null} className="inline-flex items-center gap-2 rounded-md border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-700"><Trash2 className="h-4 w-4" /> Vider COMPL-AI</button>
          <input ref={importInput} type="file" accept=".csv,text/csv" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file) void importCsv(file); event.target.value = '' }} />
          <button onClick={() => fetchModels()} className="rounded-md border border-gray-300 bg-white p-2" aria-label="Actualiser"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /></button>
        </div>
      </div>

      <section className="mt-7">
        <h2 className="text-lg font-semibold text-gray-900">Synchronisations récentes</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            ['LLM Stats', histories.llmStats ?? []],
            ['EcoLogits', histories.ecologits ?? []],
            ['Compar:IA', histories.comparia ?? []],
            ['COMPL-AI', histories.complAi ?? []],
          ].map(([label, rows]) => {
            const latest = (rows as HistoryRow[])[0]
            return <div key={String(label)} className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
              <div className="font-medium text-gray-900">{String(label)}</div>
              {latest ? <div className="mt-2 text-sm text-gray-600"><div>Statut : {latest.status ?? 'terminé'}</div><div>{latest.models_fetched ?? '—'} modèle(s)</div><div className="mt-1 text-xs text-gray-500">{formatHistoryDate(latest)}</div></div> : <div className="mt-2 text-sm text-gray-500">Aucun historique.</div>}
            </div>
          })}
        </div>
      </section>

      {action ? <div className="mb-4 flex items-center gap-2 rounded-md bg-sky-50 p-3 text-sm text-sky-800"><Loader2 className="h-4 w-4 animate-spin" /> {action}…</div> : null}
      {error ? <div className="mb-4 flex items-start gap-2 rounded-md bg-red-50 p-3 text-sm text-red-800"><AlertTriangle className="mt-0.5 h-4 w-4" /> {error}</div> : null}
      {message ? <div className="mb-4 rounded-md bg-emerald-50 p-3 text-sm text-emerald-800">{message}</div> : null}

      <div className="mb-4 grid gap-3 rounded-lg border border-gray-200 bg-white p-4 sm:grid-cols-2 xl:grid-cols-5">
        <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Rechercher…" className="rounded-md border border-gray-300 px-3 py-2 text-sm" />
        <select value={provider} onChange={(event) => setProvider(event.target.value)} className="rounded-md border border-gray-300 px-3 py-2 text-sm"><option value="">Tous les fournisseurs</option>{providers.map((item) => <option key={item}>{item}</option>)}</select>
        <select value={active} onChange={(event) => setActive(event.target.value)} className="rounded-md border border-gray-300 px-3 py-2 text-sm"><option value="all">Tous les statuts</option><option value="active">Actifs</option><option value="inactive">Inactifs</option></select>
        <select value={source} onChange={(event) => setSource(event.target.value)} className="rounded-md border border-gray-300 px-3 py-2 text-sm"><option value="">Toutes les sources</option>{SOURCES.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}</select>
        <select value={availability} onChange={(event) => setAvailability(event.target.value)} disabled={!source} className="rounded-md border border-gray-300 px-3 py-2 text-sm disabled:bg-gray-100"><option value="all">Disponible ou non</option><option value="present">Données présentes</option><option value="missing">Données absentes</option></select>
      </div>

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <tr><th className="px-4 py-3">Modèle</th>{SOURCES.map((item) => <th key={item.key} className="px-4 py-3 text-center">{item.label}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {models.map((model) => (
                <tr
                  key={model.entityId}
                  role="link"
                  tabIndex={0}
                  onClick={() => setSelectedModelId(model.entityId)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      setSelectedModelId(model.entityId)
                    }
                  }}
                  className="cursor-pointer hover:bg-sky-50/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#0080A3]"
                >
                  <td className="px-4 py-3"><div className="font-medium text-gray-900">{model.name}</div><div className="text-xs text-gray-500">{model.provider}{model.active ? '' : ' · inactif'}</div></td>
                  {SOURCES.map((item) => <td key={item.key} className="px-4 py-3 text-center"><Presence available={model.sources[item.key]} /></td>)}
                </tr>
              ))}
              {!loading && models.length === 0 ? <tr><td colSpan={6} className="px-4 py-10 text-center text-gray-500">Aucun modèle.</td></tr> : null}
            </tbody>
          </table>
        </div>
        {loading ? <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-[#0080A3]" /></div> : null}
        <div className="flex items-center justify-between border-t border-gray-200 px-4 py-3">
          <span className="text-sm text-gray-500">{total} modèle(s) · page {page}/{pages}</span>
          <div className="flex gap-2"><button disabled={page <= 1} onClick={() => setPage((value) => value - 1)} className="rounded border p-2 disabled:opacity-40"><ChevronLeft className="h-4 w-4" /></button><button disabled={page >= pages} onClick={() => setPage((value) => value + 1)} className="rounded border p-2 disabled:opacity-40"><ChevronRight className="h-4 w-4" /></button></div>
        </div>
      </div>

      {showCreate ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/40 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between"><h2 className="text-lg font-semibold">Créer un modèle</h2><button onClick={() => setShowCreate(false)}><X className="h-5 w-5" /></button></div>
            <div className="mt-5 grid gap-3">
              <input value={createForm.model_name} onChange={(event) => setCreateForm((value) => ({ ...value, model_name: event.target.value }))} placeholder="Nom" className="rounded-md border px-3 py-2" />
              <input value={createForm.model_provider} onChange={(event) => setCreateForm((value) => ({ ...value, model_provider: event.target.value }))} placeholder="Fournisseur" className="rounded-md border px-3 py-2" />
              <input value={createForm.version} onChange={(event) => setCreateForm((value) => ({ ...value, version: event.target.value }))} placeholder="Version" className="rounded-md border px-3 py-2" />
              <button disabled={!createForm.model_name || !createForm.model_provider || action != null} onClick={createModel} className="rounded-md bg-[#0080A3] px-4 py-2 font-medium text-white disabled:opacity-50">Créer</button>
            </div>
          </div>
        </div>
      ) : null}

      {selectedModelId ? (
        <FullScreenModelModal
          entityId={selectedModelId}
          onClose={() => setSelectedModelId(null)}
          onDeleted={() => void fetchModels()}
        />
      ) : null}
    </div>
  )
}
