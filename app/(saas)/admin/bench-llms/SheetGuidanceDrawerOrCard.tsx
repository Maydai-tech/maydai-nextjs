'use client'

import { Copy, RefreshCw } from 'lucide-react'
import { useMemo, useState } from 'react'

import { parseApiJson } from '@/lib/utils'

type SheetColumn = { column_letter: string; header: string; expected_hint: string }

export type SheetGuidance = {
  sheet_url: string | null
  row_number: number | null
  in_sheet: boolean
  sheet_status: string | null
  columns_to_qualify: SheetColumn[]
  columns_to_merge: SheetColumn[]
}

type Fiche = {
  id: string
  slug: string | null
  role: string | null
  model_name: string
  guidance: SheetGuidance
}

type MaydaiOption = {
  id: string
  slug: string | null
  model_name: string
  model_provider: string | null
}

function getLabel(key: string | null | undefined): string {
  return key || 'Inconnu'
}

function authHeaders(token: string): HeadersInit {
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
}

export function SheetGuidanceDrawerOrCard({
  fiche,
  maydaiOptions,
  getAccessToken,
  showWorkflow = false,
  onReload,
}: {
  fiche?: Fiche | null
  maydaiOptions: MaydaiOption[]
  getAccessToken: () => string | null
  showWorkflow?: boolean
  onReload: () => void
}) {
  const [mode, setMode] = useState<'qualify' | 'merge'>('qualify')
  const [query, setQuery] = useState('')
  const [copied, setCopied] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const matches = useMemo(() => maydaiOptions.filter((option) => `${option.model_provider ?? ''} ${option.model_name} ${option.slug ?? ''}`.toLowerCase().includes(query.trim().toLowerCase())).slice(0, 20), [maydaiOptions, query])

  async function copy(value: string) {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(value)
    } catch (copyError) {
      console.error('[SheetGuidance] Copie impossible', copyError)
      setError('Copie impossible.')
    }
  }

  async function post(label: string, url: string, body: unknown) {
    const token = getAccessToken()
    if (!token) return
    setBusy(label)
    setError(null)
    try {
      const response = await fetch(url, { method: 'POST', cache: 'no-store', headers: authHeaders(token), body: JSON.stringify(body) })
      const payload = await parseApiJson<{ error?: string; message?: string }>(response)
      if (!response.ok) throw new Error(payload.error || payload.message || `${label} impossible`)
      onReload()
    } catch (actionError) {
      console.error('[SheetGuidance]', actionError)
      setError(actionError instanceof Error ? actionError.message : 'Action impossible')
    } finally {
      setBusy(null)
    }
  }

  const columns = mode === 'qualify' ? fiche?.guidance.columns_to_qualify ?? [] : fiche?.guidance.columns_to_merge ?? []

  return (
    <section className="rounded-lg border border-gray-200 bg-white p-4">
      {showWorkflow ? (
        <div className="mb-4 flex flex-col gap-2 sm:flex-row">
          <button type="button" disabled={busy != null} onClick={() => void post('Sync Tour de Contrôle', '/api/admin/llm-control-tower-sync', { dryRun: false })} className="inline-flex items-center justify-center gap-2 rounded-md bg-teal-700 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"><RefreshCw className="h-4 w-4" /> 1. Sync vers/depuis Tour de Contrôle</button>
          <button type="button" disabled={busy != null} onClick={() => void post('Appliquer la Tour de Contrôle', '/api/admin/llm-control-tower-apply', { dryRun: false })} className="rounded-md bg-[#0080A3] px-3 py-2 text-sm font-medium text-white disabled:opacity-50">2. Appliquer la Tour de Contrôle en base</button>
        </div>
      ) : null}
      {error ? <p className="mb-3 rounded-md bg-red-50 p-3 text-sm text-red-800">{error}</p> : null}
      {fiche ? (
        <>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h3 className="font-semibold text-gray-900">{fiche.model_name}</h3>
              <p className="mt-1 text-sm text-gray-600">Slug {getLabel(fiche.slug)} · rôle {fiche.role ?? '(vide)'}</p>
              <p className="mt-1 break-all font-mono text-xs text-gray-500">{fiche.id}</p>
            </div>
            <button type="button" onClick={() => void copy(fiche.id)} className="inline-flex items-center gap-1 rounded-md border px-3 py-2 text-sm"><Copy className="h-4 w-4" />{copied === fiche.id ? 'UUID copié' : 'Copier l’UUID'}</button>
          </div>
          <p className="mt-3 text-sm text-gray-700">
            {fiche.guidance.in_sheet && fiche.guidance.row_number != null
              ? `Ligne #${fiche.guidance.row_number} dans le Google Sheet`
              : 'Absent du Sheet — lancer d’abord Sync Tour de Contrôle'}
          </p>
          {fiche.guidance.sheet_status ? <p className="mt-1 text-sm text-amber-800">{fiche.guidance.sheet_status}</p> : null}
          {fiche.guidance.sheet_url ? <a href={fiche.guidance.sheet_url} target="_blank" rel="noreferrer" className="mt-2 inline-block text-sm text-[#0080A3] underline">Ouvrir le Google Sheet</a> : null}
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" onClick={() => setMode('qualify')} className={`rounded-full border px-3 py-1 text-sm ${mode === 'qualify' ? 'border-[#0080A3] bg-sky-50' : 'border-gray-200'}`}>Qualifier la fiche (Modèle / Variante)</button>
            <button type="button" onClick={() => setMode('merge')} className={`rounded-full border px-3 py-1 text-sm ${mode === 'merge' ? 'border-[#0080A3] bg-sky-50' : 'border-gray-200'}`}>Fusionner comme Doublon</button>
          </div>
          <ol className="mt-3 space-y-2 text-sm text-gray-800">
            {columns.map((column) => (
              <li key={`${column.column_letter}-${column.header}`}>Colonne {column.column_letter} ({column.header}) ➔ {column.expected_hint}</li>
            ))}
          </ol>
          {mode === 'merge' ? (
            <div className="mt-4">
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Rechercher une fiche MaydAI cible" className="w-full rounded-md border px-3 py-2 text-sm" readOnly={false} />
              <ul className="mt-2 max-h-48 space-y-2 overflow-auto">
                {matches.map((option) => (
                  <li key={option.id} className="flex flex-col gap-2 rounded-md border p-2 sm:flex-row sm:items-center sm:justify-between">
                    <span className="text-sm">{getLabel(option.model_provider)} / {option.model_name}</span>
                    <button type="button" onClick={() => void copy(option.id)} className="rounded-md border px-2 py-1 text-xs">{copied === option.id ? 'UUID copié' : 'Copier l’UUID cible'}</button>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-sm text-gray-600">Collez « Doublon » et l’UUID cible dans les colonnes listées ci-dessus, notamment « Fusionner avec (ID) ».</p>
            </div>
          ) : null}
        </>
      ) : null}
    </section>
  )
}
