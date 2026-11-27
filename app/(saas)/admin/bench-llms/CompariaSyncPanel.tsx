'use client'

import { Loader2, Upload, X } from 'lucide-react'
import { useEffect, useId, useMemo, useRef, useState } from 'react'

import { parseApiJson } from '@/lib/utils'

type Preview = {
  fileName: string
  rankingDate: string
  rowsValid: number
  matchedCount: number
  ignoredCount: number
  unmatchedCount: number
}

type CompariaRow = {
  source_id: string
  rank: number
  organisation: string | null
  bradley_terry_score: number | null
  license: string | null
  size: string | null
  release_date: string | null
  link_status: 'matched' | 'unmatched' | 'ignored' | null
  maydai_model_id: string | null
  suggestionId?: string | null
  is_active: boolean
}

type MaydaiModelOption = {
  id: string
  slug: string | null
  model_name: string
  model_provider: string | null
}

type StatusFilter = 'unmatched' | 'ignored' | 'matched'
type ActivityFilter = 'all' | 'active' | 'archived'

type QueueResponse = {
  counts?: { unmatched: number; ignored: number; matched: number }
  rows?: CompariaRow[]
  models?: MaydaiModelOption[]
  error?: string
}

const FILTERS: Array<{ key: StatusFilter; label: string }> = [
  { key: 'unmatched', label: 'À rapprocher' },
  { key: 'ignored', label: 'Ignorés' },
  { key: 'matched', label: 'Associés' },
]

const ACTIVITY_FILTERS: Array<{ key: ActivityFilter; label: string }> = [
  { key: 'all', label: 'Tous' },
  { key: 'active', label: 'Actif CSV' },
  { key: 'archived', label: 'Archive CSV' },
]

function formatRankingDate(iso: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso)
  if (!match) return iso
  return `${match[3]}/${match[2]}/${match[1]}`
}

function authHeaders(token: string, json = false): HeadersInit {
  return {
    Authorization: `Bearer ${token}`,
    ...(json ? { 'Content-Type': 'application/json' } : {}),
  }
}

export function CompariaSyncDialog({
  open,
  busy,
  getAccessToken,
  onClose,
  onBusy,
  onImported,
}: {
  open: boolean
  busy: boolean
  getAccessToken: () => string | null
  onClose: () => void
  onBusy: (label: string | null) => void
  onImported: () => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<Preview | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!open) {
      setDragging(false)
      setFile(null)
      setPreview(null)
      setError(null)
      setMessage(null)
    }
  }, [open])

  async function analyze(nextFile: File) {
    const token = getAccessToken()
    if (!token) return
    setFile(nextFile)
    setPreview(null)
    setMessage(null)
    setError(null)
    onBusy('Analyse Compar:IA')
    try {
      const body = new FormData()
      body.append('file', nextFile)
      const response = await fetch('/api/admin/comparia/preview', {
        method: 'POST',
        headers: authHeaders(token),
        body,
      })
      const payload = await parseApiJson<Preview & { error?: string; success?: boolean }>(response)
      if (!response.ok || payload.success === false) {
        throw new Error(payload.error || 'Analyse du CSV impossible')
      }
      setPreview({
        fileName: payload.fileName,
        rankingDate: payload.rankingDate,
        rowsValid: payload.rowsValid,
        matchedCount: payload.matchedCount,
        ignoredCount: payload.ignoredCount,
        unmatchedCount: payload.unmatchedCount,
      })
    } catch (analyzeError) {
      setError(analyzeError instanceof Error ? analyzeError.message : 'Analyse impossible')
    } finally {
      onBusy(null)
    }
  }

  function takeFile(nextFile: File | undefined) {
    if (!nextFile) return
    if (!nextFile.name.toLowerCase().endsWith('.csv')) {
      setError('Déposez un fichier .csv Etalab 2.0.')
      setPreview(null)
      return
    }
    void analyze(nextFile)
  }

  async function importFile() {
    const token = getAccessToken()
    if (!token || !file) return
    setError(null)
    setMessage(null)
    onBusy('Import Compar:IA')
    try {
      const body = new FormData()
      body.append('file', file)
      const response = await fetch('/api/admin/comparia/import', {
        method: 'POST',
        headers: authHeaders(token),
        body,
      })
      const payload = await parseApiJson<{ error?: string; success?: boolean; message?: string }>(response)
      if (!response.ok || payload.success === false) {
        throw new Error(payload.error || 'Import impossible')
      }
      setMessage(payload.message || 'Import Compar:IA terminé.')
      onImported()
    } catch (importError) {
      setError(importError instanceof Error ? importError.message : 'Import impossible')
    } finally {
      onBusy(null)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center" onMouseDown={() => { if (!busy) onClose() }}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="comparia-sync-title"
        className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-xl bg-white p-5 shadow-xl"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id="comparia-sync-title" className="text-lg font-semibold text-gray-900">Sync Compar:IA</h2>
            <p className="mt-1 text-sm text-gray-600">
              Déposez l’export officiel <span className="font-medium">comparia_model-ranking-JJ_MM_AAAA-license_Etalab_2_0.csv</span>. Aucun modèle MaydAI n’est créé automatiquement.
            </p>
          </div>
          <button type="button" onClick={onClose} disabled={busy} className="rounded-md p-1 text-gray-500 hover:bg-gray-100 disabled:opacity-50" aria-label="Fermer">
            <X className="h-5 w-5" />
          </button>
        </div>

        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(event) => { event.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => {
            event.preventDefault()
            setDragging(false)
            takeFile(event.dataTransfer.files?.[0])
          }}
          className={`mt-4 flex w-full flex-col items-center gap-2 rounded-lg border-2 border-dashed px-4 py-8 text-sm ${dragging ? 'border-violet-600 bg-violet-50' : 'border-violet-200 bg-violet-50/40'}`}
        >
          <Upload className="h-6 w-6 text-violet-700" />
          <span className="font-medium text-violet-900">Glisser le CSV ici, ou cliquer pour le choisir</span>
          <span className="text-xs text-gray-500">Séparateur virgule, UTF-8, 17 colonnes</span>
        </button>
        <input
          ref={inputRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={(event) => {
            takeFile(event.target.files?.[0])
            event.target.value = ''
          }}
        />

        {preview ? (
          <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div className="col-span-2 rounded-md bg-gray-50 p-3">
              <dt className="text-gray-500">Fichier</dt>
              <dd className="font-medium text-gray-900 break-all">{preview.fileName}</dd>
            </div>
            <Stat label="Date du classement" value={formatRankingDate(preview.rankingDate)} />
            <Stat label="Lignes valides" value={String(preview.rowsValid)} />
            <Stat label="Déjà liés ou rapprochés" value={String(preview.matchedCount)} />
            <Stat label="Déjà ignorés" value={String(preview.ignoredCount)} />
            <div className="col-span-2">
              <Stat label="Inconnus à rapprocher" value={String(preview.unmatchedCount)} />
            </div>
          </dl>
        ) : null}

        {error ? <p className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-800">{error}</p> : null}
        {message ? <p className="mt-4 rounded-md bg-emerald-50 p-3 text-sm text-emerald-800">{message}</p> : null}

        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} disabled={busy} className="rounded-md border border-gray-300 px-3 py-2 text-sm font-medium disabled:opacity-50">Fermer</button>
          <button
            type="button"
            onClick={() => void importFile()}
            disabled={busy || !preview}
            className="inline-flex items-center justify-center gap-2 rounded-md bg-violet-700 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Importer et synchroniser
          </button>
        </div>
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-gray-50 p-3">
      <dt className="text-gray-500">{label}</dt>
      <dd className="text-lg font-semibold text-gray-900">{value}</dd>
    </div>
  )
}

export function CompariaReconcileSection({
  getAccessToken,
  refreshToken,
  disabled,
  onUnmatchedCount,
  onChanged,
}: {
  getAccessToken: () => string | null
  refreshToken: number
  disabled: boolean
  onUnmatchedCount: (count: number) => void
  onChanged: () => void
}) {
  const [status, setStatus] = useState<StatusFilter>('unmatched')
  const [activity, setActivity] = useState<ActivityFilter>('all')
  const [rows, setRows] = useState<CompariaRow[]>([])
  const [models, setModels] = useState<MaydaiModelOption[]>([])
  const [counts, setCounts] = useState({ unmatched: 0, ignored: 0, matched: 0 })
  const [selection, setSelection] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [savingBulk, setSavingBulk] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const token = getAccessToken()
    if (!token) return
    let cancelled = false
    setLoading(true)
    setError(null)
    void fetch(`/api/admin/comparia/reconcile?status=${status}&activity=${activity}`, {
      headers: authHeaders(token),
      cache: 'no-store',
    })
      .then(async (response) => {
        const payload = await parseApiJson<QueueResponse>(response)
        if (cancelled) return
        if (!response.ok) {
          setError(payload.error || 'Chargement Compar:IA impossible')
          return
        }
        const nextCounts = payload.counts ?? { unmatched: 0, ignored: 0, matched: 0 }
        const nextRows = Array.isArray(payload.rows) ? payload.rows : []
        setCounts(nextCounts)
        setRows(nextRows)
        setModels(Array.isArray(payload.models) ? payload.models : [])
        setSelection(Object.fromEntries(nextRows.map((row) => [
          row.source_id,
          row.maydai_model_id || row.suggestionId || '',
        ])))
        onUnmatchedCount(nextCounts.unmatched)
      })
      .catch((loadError: unknown) => {
        if (!cancelled) setError(loadError instanceof Error ? loadError.message : 'Chargement impossible')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [activity, getAccessToken, onUnmatchedCount, refreshToken, status])

  async function act(sourceId: string, action: 'match' | 'ignore' | 'unignore') {
    const token = getAccessToken()
    if (!token) return
    setSavingId(sourceId)
    setError(null)
    try {
      const response = await fetch('/api/admin/comparia/reconcile', {
        method: 'POST',
        headers: authHeaders(token, true),
        body: JSON.stringify({
          sourceId,
          action,
          maydaiModelId: action === 'match' ? selection[sourceId] : undefined,
        }),
      })
      const payload = await parseApiJson<{ error?: string; success?: boolean }>(response)
      if (!response.ok || payload.success === false) {
        setError(payload.error || 'Enregistrement impossible')
        return
      }
      onChanged()
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'Enregistrement impossible')
    } finally {
      setSavingId(null)
    }
  }

  async function actMany(action: 'match-many' | 'ignore-many') {
    const token = getAccessToken()
    if (!token) return
    const links = rows.flatMap((row) => {
      const maydaiModelId = selection[row.source_id]
      return maydaiModelId ? [{ sourceId: row.source_id, maydaiModelId }] : []
    })
    const sourceIds = rows.map((row) => row.source_id)
    if (action === 'match-many' && links.length === 0) return
    if (action === 'ignore-many' && sourceIds.length === 0) return
    setSavingBulk(true)
    setError(null)
    try {
      const response = await fetch('/api/admin/comparia/reconcile', {
        method: 'POST',
        headers: authHeaders(token, true),
        body: JSON.stringify(action === 'match-many' ? { action, links } : { action, sourceIds }),
      })
      const payload = await parseApiJson<{ error?: string; success?: boolean; updated?: number; failed?: number; errors?: string[] }>(response)
      if (!response.ok || payload.success === false) {
        setError(payload.error || 'Enregistrement groupé impossible')
        return
      }
      if ((payload.failed ?? 0) > 0) {
        setError(`${payload.updated ?? 0} ligne(s) enregistrée(s), ${payload.failed} en échec. ${payload.errors?.[0] ?? ''}`)
      }
      onChanged()
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'Enregistrement groupé impossible')
    } finally {
      setSavingBulk(false)
    }
  }

  const selectedCount = rows.filter((row) => selection[row.source_id]).length
  const busy = disabled || savingId != null || savingBulk

  return (
    <section className="mt-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
          Modèles Compar:IA à rapprocher
          {counts.unmatched > 0 ? (
            <span className="rounded-full bg-violet-700 px-2 py-0.5 text-xs font-medium text-white">{counts.unmatched}</span>
          ) : null}
        </h2>
        <div className="flex flex-wrap items-center gap-2">
          {FILTERS.map((filter) => (
            <button
              key={filter.key}
              type="button"
              onClick={() => setStatus(filter.key)}
              className={`rounded-full px-3 py-1 text-sm font-medium ${status === filter.key ? 'bg-violet-700 text-white' : 'border border-gray-300 bg-white text-gray-700'}`}
            >
              {filter.label} ({counts[filter.key]})
            </button>
          ))}
          <span className="mx-1 hidden h-5 w-px bg-gray-200 sm:inline-block" aria-hidden="true" />
          {ACTIVITY_FILTERS.map((filter) => (
            <button
              key={filter.key}
              type="button"
              onClick={() => setActivity(filter.key)}
              className={`rounded-full px-2.5 py-1 text-xs font-medium ${activity === filter.key ? 'bg-gray-900 text-white' : 'border border-gray-200 bg-white text-gray-600'}`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>
      <p className="mt-2 text-sm text-gray-600">
        Les suggestions pré-remplissent le sélecteur. Rien n’est écrit tant que vous n’avez pas cliqué sur Associer. Les modèles ignorés restent en base, sans alerte aux prochains imports.
      </p>
      {status === 'unmatched' && rows.length > 0 ? (
        <div className="mt-3 flex flex-col gap-2 rounded-lg border border-violet-200 bg-violet-50 p-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-violet-950">
            {selectedCount} sélectionné(s) sur {rows.length}, dont les suggestions proposées.
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy || selectedCount === 0}
              onClick={() => void actMany('match-many')}
              className="rounded-md bg-violet-700 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              Associer la sélection ({selectedCount})
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void actMany('ignore-many')}
              className="rounded-md border border-violet-300 bg-white px-3 py-2 text-sm font-medium text-violet-900 disabled:opacity-50"
            >
              Ignorer tout ({rows.length})
            </button>
          </div>
        </div>
      ) : null}
      {error ? <p className="mt-3 rounded-md bg-red-50 p-3 text-sm text-red-800">{error}</p> : null}
      {loading ? (
        <div className="mt-4 flex items-center gap-2 text-sm text-gray-600"><Loader2 className="h-4 w-4 animate-spin" /> Chargement…</div>
      ) : rows.length === 0 ? (
        <p className="mt-4 rounded-lg border border-dashed border-gray-300 bg-white p-4 text-sm text-gray-600">
          {activity !== 'all'
            ? 'Aucune ligne pour ce filtre CSV.'
            : status === 'unmatched'
              ? 'Aucun modèle Compar:IA en attente. Déposez un CSV avec Sync Compar:IA.'
              : 'Aucune ligne dans ce filtre.'}
        </p>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-lg border border-gray-200 bg-white">
          <table className="min-w-[920px] w-full text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-3 py-2">Rank</th>
                <th className="px-3 py-2">id</th>
                <th className="px-3 py-2">Organisation</th>
                <th className="px-3 py-2">Bradley-Terry</th>
                <th className="px-3 py-2">License</th>
                <th className="px-3 py-2">Size</th>
                <th className="px-3 py-2">Release</th>
                <th className="px-3 py-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.source_id} className="border-t border-gray-100 align-top">
                  <td className="px-3 py-3 font-medium">{row.rank}</td>
                  <td className="px-3 py-3 font-mono text-xs">
                    <div>{row.source_id}</div>
                    <span className={`mt-1 inline-flex rounded-full px-2 py-0.5 font-sans text-[11px] font-medium ${row.is_active ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-100 text-amber-950'}`}>
                      {row.is_active ? 'Actif CSV' : 'Archive CSV'}
                    </span>
                  </td>
                  <td className="px-3 py-3">{row.organisation ?? '—'}</td>
                  <td className="px-3 py-3">{row.bradley_terry_score ?? '—'}</td>
                  <td className="px-3 py-3">{row.license ?? '—'}</td>
                  <td className="px-3 py-3">{row.size ?? '—'}</td>
                  <td className="px-3 py-3">{row.release_date ? formatRankingDate(row.release_date) : '—'}</td>
                  <td className="px-3 py-3">
                    <div className="flex min-w-64 flex-col gap-2">
                      <ModelCombobox
                        models={models}
                        organisation={row.organisation}
                        value={selection[row.source_id] ?? ''}
                        onChange={(modelId) => setSelection((current) => ({ ...current, [row.source_id]: modelId }))}
                      />
                      {row.suggestionId && selection[row.source_id] === row.suggestionId ? (
                        <p className="text-xs text-violet-700">
                          Suggestion pré-remplie, à valider
                          <button
                            type="button"
                            className="ml-2 underline"
                            onClick={() => setSelection((current) => ({ ...current, [row.source_id]: '' }))}
                          >
                            Retirer
                          </button>
                        </p>
                      ) : null}
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          disabled={busy || !(selection[row.source_id] ?? '')}
                          onClick={() => void act(row.source_id, 'match')}
                          className="rounded-md bg-[#0080A3] px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
                        >
                          Associer
                        </button>
                        {row.link_status === 'ignored' ? (
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => void act(row.source_id, 'unignore')}
                            className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium disabled:opacity-50"
                          >
                            Ne plus ignorer
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => void act(row.source_id, 'ignore')}
                            className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium disabled:opacity-50"
                          >
                            Ignorer
                          </button>
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

function ModelCombobox({
  models,
  organisation,
  value,
  onChange,
}: {
  models: MaydaiModelOption[]
  organisation: string | null
  value: string
  onChange: (modelId: string) => void
}) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const listId = useId()
  const containerRef = useRef<HTMLDivElement>(null)
  const selected = models.find((model) => model.id === value) ?? null

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    return () => document.removeEventListener('mousedown', onPointerDown)
  }, [])

  const options = useMemo(() => {
    const needle = query.trim().toLowerCase()
    const org = (organisation ?? '').trim().toLowerCase()
    return models
      .filter((model) => {
        if (!needle) return true
        const hay = `${model.model_provider ?? ''} ${model.model_name} ${model.slug ?? ''}`.toLowerCase()
        return hay.includes(needle)
      })
      .sort((left, right) => {
        const leftOrg = (left.model_provider ?? '').toLowerCase()
        const rightOrg = (right.model_provider ?? '').toLowerCase()
        const leftBoost = org && leftOrg && (leftOrg.includes(org) || org.includes(leftOrg)) ? 0 : 1
        const rightBoost = org && rightOrg && (rightOrg.includes(org) || org.includes(rightOrg)) ? 0 : 1
        if (leftBoost !== rightBoost) return leftBoost - rightBoost
        return left.model_name.localeCompare(right.model_name, 'fr')
      })
      .slice(0, 40)
  }, [models, organisation, query])

  return (
    <div ref={containerRef} className="relative">
      <input
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-label="Modèle MaydAI"
        value={open ? query : selected ? `${selected.model_provider ?? '—'} — ${selected.model_name}` : ''}
        placeholder="Rechercher un modèle MaydAI"
        onFocus={() => { setOpen(true); setQuery('') }}
        onChange={(event) => { setQuery(event.target.value); setOpen(true) }}
        className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
      />
      {open ? (
        <ul id={listId} role="listbox" className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-md border border-gray-200 bg-white shadow-lg">
          {options.length === 0 ? <li className="px-3 py-2 text-sm text-gray-500">Aucun modèle</li> : null}
          {options.map((model) => (
            <li key={model.id}>
              <button
                type="button"
                className="block w-full px-3 py-2 text-left text-sm hover:bg-gray-50"
                onClick={() => {
                  onChange(model.id)
                  setOpen(false)
                  setQuery('')
                }}
              >
                <span className="font-medium">{model.model_name}</span>
                <span className="mt-0.5 block text-xs text-gray-500">{model.model_provider ?? 'Fournisseur inconnu'} · {model.slug}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
