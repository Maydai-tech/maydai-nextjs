'use client'

import { Leaf, Loader2, Search } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'

import { parseApiJson } from '@/lib/utils'

type LinkedModel = {
  id: string
  slug: string | null
  model_name: string
  model_provider: string | null
}

type EstimateSummary = {
  status: 'complete' | 'empty_metrics' | 'no_estimate'
  filled_impacts_count: number
  output_token_count: number | null
  electricity_mix_zone: string | null
  energy_wh_min: number | null
  energy_wh_max: number | null
  gwp_gco2_min: number | null
  gwp_gco2_max: number | null
}

type QualityFilter = 'all' | 'complete' | 'empty'

type ExistingLink = {
  ecologits_model_id: string
  provider: string
  name: string
  architecture_label: string
  estimate_summary: EstimateSummary
}

type EcoRow = {
  id: string
  provider: string
  name: string
  link_status: 'unmatched' | 'ignored' | 'matched'
  architecture: unknown
  architecture_label: string
  estimate_summary: EstimateSummary | null
  warnings: unknown[]
  linked_model: LinkedModel | null
}

type MaydaiOption = {
  id: string
  slug: string | null
  model_name: string
  model_provider: string | null
  existing_ecologits_links: ExistingLink[]
}

type QueuePayload = {
  counts?: { unmatched?: number; ignored?: number; matched?: number }
  rows?: EcoRow[]
  maydaiOptions?: MaydaiOption[]
  error?: string
}

type StatusFilter = 'unmatched' | 'ignored' | 'matched' | 'errors'

const TABS: Array<{ key: StatusFilter; label: string }> = [
  { key: 'unmatched', label: 'À rapprocher' },
  { key: 'ignored', label: 'Ignorés' },
  { key: 'matched', label: 'Associés' },
  { key: 'errors', label: 'Erreurs dernier run' },
]

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function getLabel(key: string | null | undefined): string {
  return key || 'Inconnu'
}

function readLinked(value: unknown): LinkedModel | null {
  if (!isRecord(value) || typeof value.id !== 'string' || typeof value.model_name !== 'string') return null
  return {
    id: value.id,
    slug: typeof value.slug === 'string' ? value.slug : null,
    model_name: value.model_name,
    model_provider: typeof value.model_provider === 'string' ? value.model_provider : null,
  }
}

function readEstimate(value: unknown): EstimateSummary | null {
  if (!isRecord(value)) return null
  if (value.status !== 'complete' && value.status !== 'empty_metrics' && value.status !== 'no_estimate') return null
  const tokens = typeof value.output_token_count === 'number' ? value.output_token_count : null
  return {
    status: value.status,
    filled_impacts_count: typeof value.filled_impacts_count === 'number' ? value.filled_impacts_count : 0,
    output_token_count: tokens,
    electricity_mix_zone: typeof value.electricity_mix_zone === 'string' ? value.electricity_mix_zone : null,
    energy_wh_min: typeof value.energy_wh_min === 'number' ? value.energy_wh_min : null,
    energy_wh_max: typeof value.energy_wh_max === 'number' ? value.energy_wh_max : null,
    gwp_gco2_min: typeof value.gwp_gco2_min === 'number' ? value.gwp_gco2_min : null,
    gwp_gco2_max: typeof value.gwp_gco2_max === 'number' ? value.gwp_gco2_max : null,
  }
}

function readExistingLink(value: unknown): ExistingLink | null {
  if (!isRecord(value) || typeof value.ecologits_model_id !== 'string' || typeof value.provider !== 'string' || typeof value.name !== 'string') return null
  const estimate = readEstimate(value.estimate_summary)
  if (!estimate) return null
  return {
    ecologits_model_id: value.ecologits_model_id,
    provider: value.provider,
    name: value.name,
    architecture_label: typeof value.architecture_label === 'string' ? value.architecture_label : 'Non renseignée',
    estimate_summary: estimate,
  }
}

function readRow(value: unknown): EcoRow | null {
  if (!isRecord(value) || typeof value.id !== 'string' || typeof value.provider !== 'string' || typeof value.name !== 'string') return null
  if (value.link_status !== 'unmatched' && value.link_status !== 'ignored' && value.link_status !== 'matched') return null
  return {
    id: value.id,
    provider: value.provider,
    name: value.name,
    link_status: value.link_status,
    architecture: value.architecture ?? null,
    architecture_label: typeof value.architecture_label === 'string' ? value.architecture_label : architectureSummary(value.architecture),
    estimate_summary: readEstimate(value.estimate_summary),
    warnings: Array.isArray(value.warnings) ? value.warnings : [],
    linked_model: readLinked(value.linked_model),
  }
}

function formatMeasure(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return '—'
  return new Intl.NumberFormat('fr-FR', { maximumSignificantDigits: 4 }).format(value)
}

function scenarioHint(summary: EstimateSummary): string {
  const tokens = summary.output_token_count === 1000
    ? '1 000 tok'
    : summary.output_token_count != null
      ? `${new Intl.NumberFormat('fr-FR').format(summary.output_token_count)} tok`
      : 'tok. non renseignés'
  return `${tokens} · ${summary.electricity_mix_zone ?? 'zone non renseignée'}`
}

function linkQuality(summary: EstimateSummary): string {
  if (summary.status === 'complete') {
    return `5/5 · ${formatMeasure(summary.energy_wh_min)}–${formatMeasure(summary.energy_wh_max)} Wh`
  }
  if (summary.status === 'empty_metrics') return '0/5 métriques vides'
  return '0/5 aucune estimation'
}

function targetOptionLabel(option: MaydaiOption): string {
  const base = `${getLabel(option.model_provider)} / ${option.model_name}`
  const links = option.existing_ecologits_links
  if (links.length === 0) return base
  const richest = links.reduce((best, link) => Math.max(best, link.estimate_summary.status === 'complete' ? 5 : link.estimate_summary.filled_impacts_count), 0)
  const quality = richest > 0 ? `${richest}/5 impacts` : 'vide'
  return `${base} (${links.length} lien(s) — ${quality})`
}

function matchesQuality(row: EcoRow, filter: QualityFilter): boolean {
  if (filter === 'all') return true
  const status = row.estimate_summary?.status ?? 'no_estimate'
  if (filter === 'complete') return status === 'complete'
  return status === 'empty_metrics' || status === 'no_estimate'
}

function architectureSummary(value: unknown): string {
  if (value == null) return 'Aucune architecture'
  if (typeof value === 'string') return value
  if (!isRecord(value)) return 'Architecture illisible'
  const keys = Object.keys(value)
  return keys.length > 0 ? keys.join(', ') : 'Aucune architecture'
}

function warningSummary(warnings: unknown[]): string {
  if (warnings.length === 0) return 'Aucun avertissement'
  return warnings.map((warning) => {
    if (typeof warning === 'string') return warning
    if (isRecord(warning)) return [warning.code, warning.message].filter((part) => typeof part === 'string').join(' — ')
    return 'Avertissement illisible'
  }).join(' · ')
}

export function EcologitsReconcilePanel({
  getAccessToken,
  lastRunErrors,
  onChanged,
}: {
  getAccessToken: () => string | null
  lastRunErrors: string[]
  onChanged: () => void
}) {
  const [status, setStatus] = useState<StatusFilter>('unmatched')
  const [search, setSearch] = useState('')
  const [rows, setRows] = useState<EcoRow[]>([])
  const [options, setOptions] = useState<MaydaiOption[]>([])
  const [counts, setCounts] = useState({ unmatched: 0, ignored: 0, matched: 0 })
  const [targets, setTargets] = useState<Record<string, string>>({})
  const [optionQuery, setOptionQuery] = useState<Record<string, string>>({})
  const [checked, setChecked] = useState<Record<string, boolean>>({})
  const [qualityFilter, setQualityFilter] = useState<QualityFilter>('all')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [bulkError, setBulkError] = useState<string | null>(null)
  const [errorByRowId, setErrorByRowId] = useState<Record<string, string>>({})

  useEffect(() => {
    const token = getAccessToken()
    if (!token || status === 'errors') return
    const controller = new AbortController()
    setLoading(true)
    setError(null)
    const params = new URLSearchParams({ status, search, page: '1', pageSize: '200' })
    void fetch(`/api/admin/ecologits/reconcile?${params}`, {
      cache: 'no-store',
      headers: { Authorization: `Bearer ${token}` },
      signal: controller.signal,
    })
      .then(async (response) => {
        const payload = await parseApiJson<QueuePayload>(response)
        if (!response.ok) throw new Error(payload.error || 'File EcoLogits indisponible')
        setRows(Array.isArray(payload.rows) ? payload.rows.flatMap((row) => { const parsed = readRow(row); return parsed ? [parsed] : [] }) : [])
        setOptions(Array.isArray(payload.maydaiOptions) ? payload.maydaiOptions.flatMap((option) => (
          isRecord(option) && typeof option.id === 'string' && typeof option.model_name === 'string'
            ? [{
              id: option.id,
              slug: typeof option.slug === 'string' ? option.slug : null,
              model_name: option.model_name,
              model_provider: typeof option.model_provider === 'string' ? option.model_provider : null,
              existing_ecologits_links: Array.isArray(option.existing_ecologits_links)
                ? option.existing_ecologits_links.flatMap((link) => {
                  const parsed = readExistingLink(link)
                  return parsed ? [parsed] : []
                })
                : [],
            }]
            : []
        )) : [])
        setCounts({
          unmatched: payload.counts?.unmatched ?? 0,
          ignored: payload.counts?.ignored ?? 0,
          matched: payload.counts?.matched ?? 0,
        })
      })
      .catch((loadError: unknown) => {
        if (loadError instanceof DOMException && loadError.name === 'AbortError') return
        setError(loadError instanceof Error ? loadError.message : 'Chargement impossible')
      })
      .finally(() => setLoading(false))
    return () => controller.abort()
  }, [getAccessToken, search, status])

  const selectedIds = useMemo(() => Object.entries(checked).filter(([, on]) => on).map(([id]) => id), [checked])

  function dismissRowError(rowId: string) {
    setErrorByRowId((current) => {
      if (!current[rowId]) return current
      const next = { ...current }
      delete next[rowId]
      return next
    })
  }

  async function run(label: string, body: unknown, rowId: string | null) {
    const token = getAccessToken()
    if (!token) return
    setBusy(label)
    if (rowId) dismissRowError(rowId)
    else setBulkError(null)
    try {
      const response = await fetch('/api/admin/ecologits/reconcile', {
        method: 'POST',
        cache: 'no-store',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const payload = await parseApiJson<{ error?: string }>(response)
      if (!response.ok) {
        const message = payload.error || 'Action impossible'
        if (rowId) setErrorByRowId((current) => ({ ...current, [rowId]: message }))
        else setBulkError(message)
        return
      }
      if (rowId) dismissRowError(rowId)
      setBulkError(null)
      setChecked({})
      onChanged()
    } catch (actionError) {
      const message = actionError instanceof Error ? actionError.message : 'Action impossible'
      if (rowId) setErrorByRowId((current) => ({ ...current, [rowId]: message }))
      else setBulkError(message)
    } finally {
      setBusy(null)
    }
  }

  async function syncCatalog() {
    const token = getAccessToken()
    if (!token) return
    setBusy('Sync EcoLogits')
    setError(null)
    try {
      const response = await fetch('/api/admin/ecologits/sync', {
        method: 'POST',
        cache: 'no-store',
        headers: { Authorization: `Bearer ${token}` },
      })
      const payload = await parseApiJson<{ error?: string }>(response)
      if (!response.ok) {
        setError(payload.error || 'Synchronisation impossible')
        return
      }
      setError(null)
      onChanged()
    } catch (syncError) {
      setError(syncError instanceof Error ? syncError.message : 'Synchronisation impossible')
    } finally {
      setBusy(null)
    }
  }

  return (
    <section className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-lg font-semibold text-gray-900">File EcoLogits</h2>
        <button type="button" onClick={() => void syncCatalog()} disabled={busy != null} className="inline-flex items-center justify-center gap-2 rounded-md bg-emerald-700 px-3 py-2 text-sm font-medium text-white disabled:opacity-50">
          <Leaf className="h-4 w-4" /> Lancer Sync EcoLogits
        </button>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {TABS.map((tab) => (
          <button key={tab.key} type="button" onClick={() => setStatus(tab.key)} className={`rounded-full border px-3 py-1 text-sm ${status === tab.key ? 'border-emerald-700 bg-emerald-50 text-emerald-900' : 'border-gray-200 text-gray-700'}`}>
            {tab.label}
            {tab.key !== 'errors' ? <span className="ml-1 font-semibold">{counts[tab.key]}</span> : <span className="ml-1 font-semibold">{lastRunErrors.length}</span>}
          </button>
        ))}
      </div>
      {status !== 'errors' ? (
        <label className="mt-4 flex items-center gap-2 rounded-md border px-3 py-2">
          <Search className="h-4 w-4 text-gray-400" />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Fournisseur ou nom" className="w-full bg-transparent text-sm outline-none" />
        </label>
      ) : null}
      {status === 'unmatched' ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {([
            ['all', 'Toutes'],
            ['complete', 'Avec mesures 5/5 uniquement'],
            ['empty', 'Sans mesures (0/5)'],
          ] as const).map(([key, label]) => (
            <button key={key} type="button" onClick={() => setQualityFilter(key)} className={`rounded-full border px-3 py-1 text-sm ${qualityFilter === key ? 'border-[#0080A3] bg-sky-50 text-[#006280]' : 'border-gray-200 text-gray-700'}`}>{label}</button>
          ))}
        </div>
      ) : null}
      {error ? (
        <p className="mt-3 flex items-start justify-between gap-3 rounded-md bg-red-50 p-3 text-sm text-red-800">
          <span>{error}</span>
          <button type="button" aria-label="Fermer" onClick={() => setError(null)} className="font-semibold">×</button>
        </p>
      ) : null}
      {bulkError ? (
        <p className="mt-3 flex items-start justify-between gap-3 rounded-md bg-red-50 p-3 text-sm text-red-800">
          <span>{bulkError}</span>
          <button type="button" aria-label="Fermer" onClick={() => setBulkError(null)} className="font-semibold">×</button>
        </p>
      ) : null}
      {status !== 'errors' && selectedIds.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" disabled={busy != null} onClick={() => void run('Ignorer', { action: 'ignore_many', ecologits_model_ids: selectedIds }, null)} className="rounded-md border px-3 py-2 text-sm">Ignorer la sélection ({selectedIds.length})</button>
          <button type="button" disabled={busy != null} onClick={() => void run('Réactiver', { action: 'unignore_many', ecologits_model_ids: selectedIds }, null)} className="rounded-md border px-3 py-2 text-sm">Ne plus ignorer la sélection ({selectedIds.length})</button>
        </div>
      ) : null}
      {loading && status !== 'errors' ? <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-[#0080A3]" /></div> : null}
      {status === 'errors' ? (
        <ul className="mt-4 space-y-2">
          {lastRunErrors.length === 0 ? <li className="text-sm text-gray-500">Aucune erreur sur le dernier run.</li> : lastRunErrors.map((message) => (
            <li key={message} className="rounded-md bg-red-50 p-3 text-sm text-red-900">{message}</li>
          ))}
        </ul>
      ) : (
        <ul className="mt-4 space-y-3">
          {rows.filter((row) => status !== 'unmatched' || matchesQuality(row, qualityFilter)).map((row) => {
            const query = optionQuery[row.id] ?? ''
            const visibleOptions = options.filter((option) => `${option.model_provider ?? ''} ${option.model_name} ${option.slug ?? ''}`.toLowerCase().includes(query.toLowerCase())).slice(0, 30)
            const chosen = options.find((option) => option.id === targets[row.id])
            const existingLinks = chosen?.existing_ecologits_links ?? []
            const summary = row.estimate_summary
            const rowError = errorByRowId[row.id]
            return (
              <li key={row.id} className="rounded-lg border border-gray-200 p-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                  <input type="checkbox" checked={checked[row.id] === true} onChange={(event) => setChecked((current) => ({ ...current, [row.id]: event.target.checked }))} aria-label={`Sélectionner ${row.name}`} className="mt-1" />
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-gray-900">{getLabel(row.provider)} / {row.name}</div>
                    <div className="mt-2 rounded-md border border-gray-200 bg-gray-50 p-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Qualité des données EcoLogits</p>
                      {summary?.status === 'complete' ? (
                        <div className="mt-2">
                          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-900">5/5 impacts complets</span>
                          <p className="mt-2 text-sm text-gray-800">Énergie : {formatMeasure(summary.energy_wh_min)}–{formatMeasure(summary.energy_wh_max)} Wh · Carbone : {formatMeasure(summary.gwp_gco2_min)}–{formatMeasure(summary.gwp_gco2_max)} gCO₂eq ({scenarioHint(summary)})</p>
                        </div>
                      ) : null}
                      {summary?.status === 'empty_metrics' ? <span className="mt-2 inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-950">0/5 impact (ligne présente mais métriques vides)</span> : null}
                      {!summary || summary.status === 'no_estimate' ? <span className="mt-2 inline-flex rounded-full bg-gray-200 px-2 py-0.5 text-xs font-medium text-amber-950">0/5 impact (aucune estimation en base)</span> : null}
                    </div>
                    <p className="mt-2 text-sm text-gray-600">Architecture : {row.architecture_label}</p>
                    <p className="mt-1 text-sm text-gray-600">Avertissements : {warningSummary(row.warnings)}</p>
                    {row.linked_model ? <Link href={`/admin/bench-llms/${row.linked_model.id}`} className="mt-2 inline-block text-sm text-[#0080A3] underline">Fiche {row.linked_model.model_name}</Link> : null}
                    <input value={query} onChange={(event) => setOptionQuery((current) => ({ ...current, [row.id]: event.target.value }))} placeholder="Rechercher une fiche MaydAI" className="mt-3 w-full rounded-md border px-3 py-2 text-sm" />
                    <select
                      value={targets[row.id] ?? ''}
                      onChange={(event) => {
                        dismissRowError(row.id)
                        setTargets((current) => ({ ...current, [row.id]: event.target.value }))
                      }}
                      className="mt-2 w-full rounded-md border px-3 py-2 text-sm"
                    >
                      <option value="">Choisir une seule fiche…</option>
                      {visibleOptions.map((option) => <option key={option.id} value={option.id}>{targetOptionLabel(option)}</option>)}
                    </select>
                    {existingLinks.length > 0 ? (
                      <div className="mt-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
                        <p className="font-medium">Déjà lié à cette fiche ({existingLinks.length})</p>
                        <ul className="mt-2 space-y-2">
                          {existingLinks.map((link) => (
                            <li key={link.ecologits_model_id}>
                              <span className="font-medium">{link.provider} / {link.name}</span>
                              <span className="mt-0.5 block text-amber-900">Architecture : {link.architecture_label} · {linkQuality(link.estimate_summary)}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                    {rowError ? (
                      <p className="mt-3 flex items-start justify-between gap-3 rounded-md bg-red-50 p-3 text-sm text-red-800">
                        <span>{rowError}</span>
                        <button type="button" aria-label="Fermer" onClick={() => dismissRowError(row.id)} className="font-semibold">×</button>
                      </p>
                    ) : null}
                    <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                      {existingLinks.length === 0 ? <button type="button" disabled={!targets[row.id] || busy != null} onClick={() => void run('Associer', { action: 'match', ecologits_model_id: row.id, maydai_model_id: targets[row.id], conflict_mode: 'add' }, row.id)} className="rounded-md bg-emerald-700 px-3 py-2 text-sm font-medium text-white disabled:opacity-50">Associer</button> : null}
                      {existingLinks.length > 0 ? <button type="button" disabled={!targets[row.id] || busy != null} onClick={() => void run('Ajouter', { action: 'match', ecologits_model_id: row.id, maydai_model_id: targets[row.id], conflict_mode: 'add' }, row.id)} className="rounded-md bg-emerald-700 px-3 py-2 text-sm font-medium text-white disabled:opacity-50">Ajouter ce lien (N:1)</button> : null}
                      {existingLinks.length > 0 ? <button type="button" disabled={!targets[row.id] || busy != null} onClick={() => void run('Remplacer', { action: 'match', ecologits_model_id: row.id, maydai_model_id: targets[row.id], conflict_mode: 'replace_all' }, row.id)} className="rounded-md border border-amber-300 bg-white px-3 py-2 text-sm">Remplacer le(s) {existingLinks.length} lien(s) existant(s)</button> : null}
                      {row.link_status !== 'ignored' ? <button type="button" disabled={busy != null} onClick={() => void run('Ignorer', { action: 'ignore', ecologits_model_id: row.id }, row.id)} className="rounded-md border px-3 py-2 text-sm">{existingLinks.length > 0 ? 'Ignorer cette entrée' : 'Ignorer'}</button> : null}
                      {row.link_status === 'ignored' ? <button type="button" disabled={busy != null} onClick={() => void run('Réactiver', { action: 'unignore', ecologits_model_id: row.id }, row.id)} className="rounded-md border px-3 py-2 text-sm">Ne plus ignorer</button> : null}
                      {row.link_status === 'matched' ? <button type="button" disabled={busy != null} onClick={() => void run('Délier', { action: 'unlink', ecologits_model_id: row.id }, row.id)} className="rounded-md border px-3 py-2 text-sm">Délier</button> : null}
                    </div>
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
