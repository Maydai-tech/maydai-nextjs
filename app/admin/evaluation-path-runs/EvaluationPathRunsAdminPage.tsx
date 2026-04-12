'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/lib/auth'
import { Download, GitBranch, Loader2, Route, Timer } from 'lucide-react'

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

function formatDurationSeconds(s: number | null | undefined): string {
  if (s == null || !Number.isFinite(s)) return '—'
  if (s < 60) return `${Math.round(s)} s`
  const m = Math.floor(s / 60)
  const sec = Math.round(s % 60)
  return `${m} min ${sec} s`
}

function formatRate(r: number | null | undefined): string {
  if (r == null || !Number.isFinite(r)) return '—'
  return `${Math.round(r * 1000) / 10} %`
}

type PathSummary = {
  starts: number
  completions: number
  completion_rate: number | null
  mean_completion_seconds: number | null
  median_completion_seconds: number | null
}

type ShortToLongSummary = {
  cohort_short_completed_count: number
  with_long_started_after: number
  with_long_completed_after: number
  rate_short_completed_to_long_started: number | null
  rate_short_completed_to_long_completed: number | null
  median_seconds_short_end_to_long_start: number | null
  mean_seconds_short_end_to_long_start: number | null
  median_seconds_short_end_to_long_end: number | null
  mean_seconds_short_end_to_long_end: number | null
}

type ConversionSegmentRow = {
  segment: string
  company_name?: string | null
  cohort_count: number
  long_started: number
  long_completed: number
  rate_started: number | null
  rate_completed: number | null
  median_seconds_to_long_start: number | null
}

type ConversionWindowsSummary = {
  cohort_short_completed_count: number
  long_started_within_7d: number
  long_started_within_30d: number
  rate_cohort_long_started_within_7d: number | null
  rate_cohort_long_started_within_30d: number | null
  long_completed_within_7d: number
  long_completed_within_30d: number
  rate_cohort_long_completed_within_7d: number | null
  rate_cohort_long_completed_within_30d: number | null
}

type ApiResponse = {
  meta: {
    from: string
    to: string
    questionnaire_version: number | null
  }
  methodology?: {
    short_to_long: Record<string, string>
    period_note: string
  }
  short: PathSummary
  long: PathSummary
  short_to_long?: {
    summary: ShortToLongSummary
    summary_windows?: ConversionWindowsSummary
    by_entry_surface: ConversionSegmentRow[]
    by_system_type: ConversionSegmentRow[]
    by_classification_status: ConversionSegmentRow[]
    by_risk_level: ConversionSegmentRow[]
    by_questionnaire_version: ConversionSegmentRow[]
    by_company_id: ConversionSegmentRow[]
  }
  by_entry_surface: {
    entry_surface: string
    short_starts: number
    long_starts: number
  }[]
  by_outcome: {
    classification_status: string
    risk_level: string
    count: number
  }[]
  recent_completions: {
    id: string
    usecase_id: string
    company_id: string
    path_mode: string
    questionnaire_version: number
    entry_surface: string | null
    completed_at: string | null
    completion_seconds: number | null
    classification_status: string | null
    risk_level: string | null
  }[]
}

const METHODOLOGY_LABELS: Record<string, string> = {
  cohorte: 'Cohorte',
  conversion_long_demarre: 'Conversion « long démarré »',
  conversion_long_termine: 'Conversion « long terminé »',
  filtre_version: 'Filtre version questionnaire',
  delais: 'Délais mesurés',
  fenetres_conversion: 'Fenêtres 7 j / 30 j',
}

function ConversionSegmentTable({
  title,
  rows,
  segmentColumnLabel,
  companySegment,
}: {
  title: string
  rows: ConversionSegmentRow[]
  segmentColumnLabel: string
  /** Affiche le nom d’entreprise + id secondaire (segment = company_id). */
  companySegment?: boolean
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden">
      <div className="border-b border-gray-200 px-4 py-3">
        <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
        <p className="mt-1 text-xs text-gray-500">
          Cohorte = courts terminés sur la période. Taux = part de cette cohorte ayant un premier
          long après la fin du court (voir encadré méthodologie).
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-left text-gray-600">
            <tr>
              <th className="px-4 py-2 font-medium">{segmentColumnLabel}</th>
              <th className="px-4 py-2 font-medium text-right">Cohorte</th>
              <th className="px-4 py-2 font-medium text-right">Long démarré</th>
              <th className="px-4 py-2 font-medium text-right">Long terminé</th>
              <th className="px-4 py-2 font-medium text-right">Taux → long</th>
              <th className="px-4 py-2 font-medium text-right">Taux → fin long</th>
              <th className="px-4 py-2 font-medium text-right">Médiane délai→long</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-gray-500">
                  Aucune donnée.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.segment} className="border-t border-gray-100">
                  <td className="px-4 py-2 text-gray-900 max-w-[16rem]">
                    {companySegment ? (
                      <div>
                        <div className="font-medium truncate" title={row.company_name ?? ''}>
                          {row.company_name ?? '(nom inconnu)'}
                        </div>
                        <div className="text-xs font-mono text-gray-500 truncate" title={row.segment}>
                          {row.segment}
                        </div>
                      </div>
                    ) : (
                      <span className="truncate block" title={row.segment}>
                        {row.segment}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums">{row.cohort_count}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{row.long_started}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{row.long_completed}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{formatRate(row.rate_started)}</td>
                  <td className="px-4 py-2 text-right tabular-nums">
                    {formatRate(row.rate_completed)}
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums text-gray-700">
                    {formatDurationSeconds(row.median_seconds_to_long_start)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function PathCards({ title, s }: { title: string; s: PathSummary }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
      <dl className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
        <div>
          <dt className="text-gray-500">Démarrages</dt>
          <dd className="font-medium text-gray-900">{s.starts}</dd>
        </div>
        <div>
          <dt className="text-gray-500">Complétions</dt>
          <dd className="font-medium text-gray-900">{s.completions}</dd>
        </div>
        <div>
          <dt className="text-gray-500">Taux complétion</dt>
          <dd className="font-medium text-gray-900">{formatRate(s.completion_rate)}</dd>
        </div>
        <div>
          <dt className="text-gray-500 flex items-center gap-1">
            <Timer className="h-3.5 w-3.5" aria-hidden />
            Temps moyen
          </dt>
          <dd className="font-medium text-gray-900">
            {formatDurationSeconds(s.mean_completion_seconds)}
          </dd>
        </div>
        <div>
          <dt className="text-gray-500">Temps médian</dt>
          <dd className="font-medium text-gray-900">
            {formatDurationSeconds(s.median_completion_seconds)}
          </dd>
        </div>
      </dl>
    </div>
  )
}

export default function EvaluationPathRunsAdminPage() {
  const { session, loading: authLoading } = useAuth()
  const [from, setFrom] = useState(() => formatInputDate(addDays(new Date(), -30)))
  const [to, setTo] = useState(() => formatInputDate(new Date()))
  const [qVersion, setQVersion] = useState<string>('3')
  const [data, setData] = useState<ApiResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!session?.access_token) return
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ from, to })
      if (qVersion !== 'all') params.set('questionnaire_version', qVersion)
      const res = await fetch(`/api/admin/evaluation-path-runs?${params}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || `Erreur ${res.status}`)
      setData(json as ApiResponse)
    } catch (e) {
      setData(null)
      setError(e instanceof Error ? e.message : 'Erreur inconnue')
    } finally {
      setLoading(false)
    }
  }, [session?.access_token, from, to, qVersion])

  const exportCsv = useCallback(async () => {
    if (!session?.access_token) return
    try {
      const params = new URLSearchParams({ from, to, format: 'csv' })
      if (qVersion !== 'all') params.set('questionnaire_version', qVersion)
      const res = await fetch(`/api/admin/evaluation-path-runs?${params}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error((err as { error?: string }).error || `Erreur ${res.status}`)
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `evaluation-path-runs_${from}_${to}.csv`
      a.rel = 'noopener'
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Export CSV impossible')
    }
  }, [session?.access_token, from, to, qVersion])

  useEffect(() => {
    if (!authLoading && session) void load()
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
    <div className="max-w-6xl mx-auto px-4 py-6 sm:px-6">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Route className="h-8 w-8 text-[#0080A3]" />
            Parcours court / long
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Mesure first-party (Supabase) : démarrages, complétions et durées — source principale
            pour le pilotage produit (GA4 reste en complément).
          </p>
          <p className="mt-2 text-xs text-gray-500">
            Période en dates calendaires <strong>Europe/Paris</strong>, comme l’admin Analytics.
          </p>
        </div>
        <Link
          href="/admin"
          className="text-sm text-[#0080A3] hover:text-[#006280] whitespace-nowrap"
        >
          ← Tableau de bord admin
        </Link>
      </div>

      <div className="mb-6 flex flex-col gap-4 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col text-xs text-gray-600">
            Du
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="mt-1 rounded border border-gray-300 px-2 py-1.5 text-sm text-gray-900"
            />
          </label>
          <label className="flex flex-col text-xs text-gray-600">
            Au
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="mt-1 rounded border border-gray-300 px-2 py-1.5 text-sm text-gray-900"
            />
          </label>
          <label className="flex flex-col text-xs text-gray-600">
            Version questionnaire
            <select
              value={qVersion}
              onChange={(e) => setQVersion(e.target.value)}
              className="mt-1 rounded border border-gray-300 px-2 py-1.5 text-sm text-gray-900 min-w-[8rem]"
            >
              <option value="3">V3</option>
              <option value="2">V2</option>
              <option value="1">V1</option>
              <option value="all">Toutes</option>
            </select>
          </label>
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className="rounded-lg bg-[#0080A3] px-4 py-2 text-sm font-medium text-white hover:bg-[#006280] disabled:opacity-50"
          >
            Actualiser
          </button>
          <button
            type="button"
            onClick={() => void exportCsv()}
            disabled={loading || !session?.access_token}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50 disabled:opacity-50"
          >
            <Download className="h-4 w-4" aria-hidden />
            Export CSV
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {presets.map((p) => (
            <button
              key={p.label}
              type="button"
              onClick={() => {
                const end = new Date()
                setTo(formatInputDate(end))
                setFrom(formatInputDate(addDays(end, -p.days)))
              }}
              className="rounded border border-gray-200 px-2 py-1 text-xs text-gray-700 hover:bg-gray-50"
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <div className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-[#0080A3]" />
        </div>
      )}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      {data && !loading && (
        <div className="space-y-8">
          {data.methodology && (
            <details className="rounded-lg border border-sky-200 bg-sky-50/60 p-4 text-sm text-gray-800">
              <summary className="cursor-pointer font-semibold text-gray-900">
                Méthodologie & périmètre des indicateurs
              </summary>
              <p className="mt-3 text-xs leading-relaxed text-gray-700">{data.methodology.period_note}</p>
              <h4 className="mt-3 text-xs font-semibold uppercase tracking-wide text-gray-600">
                Conversion court → long
              </h4>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-gray-700">
                {Object.entries(data.methodology.short_to_long).map(([key, text]) => (
                  <li key={key}>
                    <span className="font-medium text-gray-800">
                      {METHODOLOGY_LABELS[key] ?? key} :{' '}
                    </span>
                    {text}
                  </li>
                ))}
              </ul>
            </details>
          )}

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <PathCards title="Parcours court (V3)" s={data.short} />
            <PathCards title="Parcours long" s={data.long} />
          </div>

          {data.short_to_long && (
            <section className="space-y-4" aria-labelledby="conversion-short-long-heading">
              <h2
                id="conversion-short-long-heading"
                className="text-lg font-semibold text-gray-900 flex items-center gap-2"
              >
                <GitBranch className="h-5 w-5 text-[#0080A3]" aria-hidden />
                Conversion court → long
              </h2>
              <p className="text-xs text-gray-600 max-w-3xl">
                Indicateurs basés sur la <strong>cohorte des parcours courts terminés</strong> dans
                la période (date de fin du court). Les délais et conversions utilisent le{' '}
                <strong>premier run long</strong> du même cas après cette fin (détails ci-dessus).
              </p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                  <p className="text-xs text-gray-500">Cohorte (courts terminés)</p>
                  <p className="mt-1 text-2xl font-bold text-gray-900">
                    {data.short_to_long.summary.cohort_short_completed_count}
                  </p>
                </div>
                <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                  <p className="text-xs text-gray-500">Puis long démarré</p>
                  <p className="mt-1 text-2xl font-bold text-gray-900">
                    {data.short_to_long.summary.with_long_started_after}
                  </p>
                  <p className="mt-1 text-xs text-gray-600">
                    Taux :{' '}
                    {formatRate(data.short_to_long.summary.rate_short_completed_to_long_started)}
                  </p>
                </div>
                <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                  <p className="text-xs text-gray-500">Puis long terminé</p>
                  <p className="mt-1 text-2xl font-bold text-gray-900">
                    {data.short_to_long.summary.with_long_completed_after}
                  </p>
                  <p className="mt-1 text-xs text-gray-600">
                    Taux :{' '}
                    {formatRate(data.short_to_long.summary.rate_short_completed_to_long_completed)}
                  </p>
                </div>
                <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                  <p className="text-xs text-gray-500 flex items-center gap-1">
                    <Timer className="h-3.5 w-3.5" aria-hidden />
                    Délais (fin court → …)
                  </p>
                  <dl className="mt-2 space-y-1 text-xs text-gray-700">
                    <div className="flex justify-between gap-2">
                      <dt>Médiane → début long</dt>
                      <dd className="font-medium tabular-nums">
                        {formatDurationSeconds(
                          data.short_to_long.summary.median_seconds_short_end_to_long_start
                        )}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-2">
                      <dt>Moyenne → début long</dt>
                      <dd className="font-medium tabular-nums">
                        {formatDurationSeconds(
                          data.short_to_long.summary.mean_seconds_short_end_to_long_start
                        )}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-2">
                      <dt>Médiane → fin long</dt>
                      <dd className="font-medium tabular-nums">
                        {formatDurationSeconds(
                          data.short_to_long.summary.median_seconds_short_end_to_long_end
                        )}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-2">
                      <dt>Moyenne → fin long</dt>
                      <dd className="font-medium tabular-nums">
                        {formatDurationSeconds(
                          data.short_to_long.summary.mean_seconds_short_end_to_long_end
                        )}
                      </dd>
                    </div>
                  </dl>
                </div>
              </div>

              {data.short_to_long.summary_windows ? (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-4">
                  <h3 className="text-sm font-semibold text-gray-900">
                    Conversion dans une fenêtre après la fin du court
                  </h3>
                  <p className="mt-1 text-xs text-gray-600 max-w-3xl">
                    Tous les pourcentages ci-dessous sont rapportés à la <strong>cohorte</strong>{' '}
                    (nombre de courts terminés dans la période), pas seulement aux cas ayant déjà
                    ouvert un long.
                  </p>
                  <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <div>
                      <p className="text-xs text-gray-500">Long démarré ≤ 7 j</p>
                      <p className="text-lg font-bold text-gray-900">
                        {data.short_to_long.summary_windows.long_started_within_7d}
                      </p>
                      <p className="text-xs text-gray-600">
                        {formatRate(
                          data.short_to_long.summary_windows.rate_cohort_long_started_within_7d
                        )}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Long démarré ≤ 30 j</p>
                      <p className="text-lg font-bold text-gray-900">
                        {data.short_to_long.summary_windows.long_started_within_30d}
                      </p>
                      <p className="text-xs text-gray-600">
                        {formatRate(
                          data.short_to_long.summary_windows.rate_cohort_long_started_within_30d
                        )}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Long terminé ≤ 7 j</p>
                      <p className="text-lg font-bold text-gray-900">
                        {data.short_to_long.summary_windows.long_completed_within_7d}
                      </p>
                      <p className="text-xs text-gray-600">
                        {formatRate(
                          data.short_to_long.summary_windows.rate_cohort_long_completed_within_7d
                        )}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Long terminé ≤ 30 j</p>
                      <p className="text-lg font-bold text-gray-900">
                        {data.short_to_long.summary_windows.long_completed_within_30d}
                      </p>
                      <p className="text-xs text-gray-600">
                        {formatRate(
                          data.short_to_long.summary_windows.rate_cohort_long_completed_within_30d
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              ) : null}

              <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                <ConversionSegmentTable
                  title="Conversion par surface d’entrée (issue du run court)"
                  rows={data.short_to_long.by_entry_surface}
                  segmentColumnLabel="Surface"
                />
                <ConversionSegmentTable
                  title="Conversion par type de cas (system_type au démarrage du court)"
                  rows={data.short_to_long.by_system_type}
                  segmentColumnLabel="Type de cas"
                />
                <ConversionSegmentTable
                  title="Conversion par classification (résultat du court)"
                  rows={data.short_to_long.by_classification_status}
                  segmentColumnLabel="Classification"
                />
                <ConversionSegmentTable
                  title="Conversion par niveau / risque (résultat du court)"
                  rows={data.short_to_long.by_risk_level}
                  segmentColumnLabel="Niveau"
                />
                <ConversionSegmentTable
                  title="Conversion par version questionnaire (run court)"
                  rows={data.short_to_long.by_questionnaire_version}
                  segmentColumnLabel="Version"
                />
                <ConversionSegmentTable
                  title="Conversion par entreprise (max 35 lignes, nom issu de la table companies)"
                  rows={data.short_to_long.by_company_id}
                  segmentColumnLabel="Entreprise"
                  companySegment
                />
              </div>
            </section>
          )}

          <div className="rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden">
            <div className="border-b border-gray-200 px-4 py-3">
              <h2 className="text-base font-semibold text-gray-900">
                Répartition par surface d’entrée (démarrages)
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 text-left text-gray-600">
                  <tr>
                    <th className="px-4 py-2 font-medium">Surface</th>
                    <th className="px-4 py-2 font-medium text-right">Court</th>
                    <th className="px-4 py-2 font-medium text-right">Long</th>
                  </tr>
                </thead>
                <tbody>
                  {data.by_entry_surface.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-4 py-6 text-center text-gray-500">
                        Aucun démarrage sur la période.
                      </td>
                    </tr>
                  ) : (
                    data.by_entry_surface.map((row) => (
                      <tr key={row.entry_surface} className="border-t border-gray-100">
                        <td className="px-4 py-2 text-gray-900">{row.entry_surface}</td>
                        <td className="px-4 py-2 text-right tabular-nums">{row.short_starts}</td>
                        <td className="px-4 py-2 text-right tabular-nums">{row.long_starts}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden">
            <div className="border-b border-gray-200 px-4 py-3">
              <h2 className="text-base font-semibold text-gray-900">
                Complétions par résultat (classification / niveau)
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 text-left text-gray-600">
                  <tr>
                    <th className="px-4 py-2 font-medium">Classification</th>
                    <th className="px-4 py-2 font-medium">Niveau / risque</th>
                    <th className="px-4 py-2 font-medium text-right">Nombre</th>
                  </tr>
                </thead>
                <tbody>
                  {data.by_outcome.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-4 py-6 text-center text-gray-500">
                        Aucune complétion sur la période.
                      </td>
                    </tr>
                  ) : (
                    data.by_outcome.map((row, i) => (
                      <tr key={`${row.classification_status}-${row.risk_level}-${i}`} className="border-t border-gray-100">
                        <td className="px-4 py-2 text-gray-900">{row.classification_status}</td>
                        <td className="px-4 py-2 text-gray-700">{row.risk_level}</td>
                        <td className="px-4 py-2 text-right tabular-nums">{row.count}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden">
            <div className="border-b border-gray-200 px-4 py-3">
              <h2 className="text-base font-semibold text-gray-900">Dernières complétions</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 text-left text-gray-600">
                  <tr>
                    <th className="px-4 py-2 font-medium">Fin</th>
                    <th className="px-4 py-2 font-medium">Mode</th>
                    <th className="px-4 py-2 font-medium">Cas d’usage</th>
                    <th className="px-4 py-2 font-medium">Durée</th>
                    <th className="px-4 py-2 font-medium">Résultat</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recent_completions.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-6 text-center text-gray-500">
                        Aucune complétion récente.
                      </td>
                    </tr>
                  ) : (
                    data.recent_completions.map((r) => (
                      <tr key={r.id} className="border-t border-gray-100">
                        <td className="px-4 py-2 whitespace-nowrap text-gray-800">
                          {r.completed_at
                            ? new Date(r.completed_at).toLocaleString('fr-FR')
                            : '—'}
                        </td>
                        <td className="px-4 py-2">{r.path_mode === 'short' ? 'Court' : 'Long'}</td>
                        <td className="px-4 py-2 font-mono text-xs text-gray-700">{r.usecase_id}</td>
                        <td className="px-4 py-2 tabular-nums">
                          {formatDurationSeconds(r.completion_seconds)}
                        </td>
                        <td className="px-4 py-2 text-gray-700">
                          {[r.classification_status, r.risk_level].filter(Boolean).join(' · ') ||
                            '—'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
