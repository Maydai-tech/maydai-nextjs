import { NextRequest, NextResponse } from 'next/server'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { verifyAdminAuth } from '@/lib/admin-auth'
import { parisDateRangeToUtcBounds } from '@/lib/admin-analytics-buckets'
import { meanSeconds, medianSeconds } from '@/lib/evaluation-path-runs-stats'
import {
  evaluationPathRunsAdminToCsv,
  type EvaluationPathRunsAdminCsvInput,
} from '@/lib/evaluation-path-runs-admin-csv'
import {
  SHORT_TO_LONG_METHODOLOGY_FR,
  conversionByClassification,
  conversionByCompanyId,
  conversionByEntrySurface,
  conversionByQuestionnaireVersion,
  conversionByRiskLevel,
  conversionBySystemType,
  outcomesForShortCohort,
  summarizeConversion,
  summarizeConversionWindows,
  type LongRunForLinkage,
  type SegmentConversionRow,
  type ShortCohortRun,
} from '@/lib/evaluation-path-short-to-long'
import { isQuestionnaireVersion } from '@/lib/questionnaire-version'

function parseYmd(s: string | null): string | null {
  if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return null
  return s
}

type PathMode = 'short' | 'long'

type RunRow = {
  id: string
  usecase_id: string
  company_id: string
  questionnaire_version: number
  path_mode: PathMode
  entry_surface: string | null
  system_type: string | null
  started_at: string
  completed_at: string | null
  completion_seconds: number | null
  classification_status: string | null
  risk_level: string | null
}

function summarizePath(
  started: RunRow[],
  completed: RunRow[],
  mode: PathMode
): {
  starts: number
  completions: number
  completion_rate: number | null
  mean_completion_seconds: number | null
  median_completion_seconds: number | null
} {
  const s = started.filter((r) => r.path_mode === mode).length
  const done = completed.filter((r) => r.path_mode === mode)
  const c = done.length
  const secs = done
    .map((r) => r.completion_seconds)
    .filter((n): n is number => typeof n === 'number' && Number.isFinite(n))
  return {
    starts: s,
    completions: c,
    completion_rate: s > 0 ? c / s : null,
    mean_completion_seconds: meanSeconds(secs),
    median_completion_seconds: medianSeconds(secs),
  }
}

function entrySurfaceKey(v: string | null | undefined): string {
  if (v == null || String(v).trim() === '') return '(non renseigné)'
  return String(v).trim()
}

const USECASE_CHUNK = 120

async function fetchLongRunsForUsecases(
  supabase: SupabaseClient,
  usecaseIds: string[]
): Promise<LongRunForLinkage[]> {
  const out: LongRunForLinkage[] = []
  const seen = new Set<string>()
  for (let i = 0; i < usecaseIds.length; i += USECASE_CHUNK) {
    const chunk = usecaseIds.slice(i, i + USECASE_CHUNK)
    if (chunk.length === 0) continue
    const { data, error } = await supabase
      .from('evaluation_path_runs')
      .select('id, usecase_id, questionnaire_version, started_at, completed_at')
      .eq('path_mode', 'long')
      .in('usecase_id', chunk)
    if (error) throw error
    for (const r of data || []) {
      const row = r as LongRunForLinkage
      if (seen.has(row.id)) continue
      seen.add(row.id)
      out.push(row)
    }
  }
  return out
}

async function attachCompanyNamesToSegmentRows(
  supabase: SupabaseClient,
  rows: SegmentConversionRow[]
): Promise<SegmentConversionRow[]> {
  if (rows.length === 0) return rows
  const ids = [...new Set(rows.map((r) => r.segment))]
  const { data, error } = await supabase.from('companies').select('id, name').in('id', ids)
  if (error || !data?.length) {
    return rows.map((r) => ({ ...r, company_name: r.company_name ?? null }))
  }
  const map = new Map((data as { id: string; name: string }[]).map((c) => [c.id, c.name]))
  return rows.map((r) => ({ ...r, company_name: map.get(r.segment) ?? null }))
}

export async function GET(request: NextRequest) {
  const authResult = await verifyAdminAuth(request)
  if (authResult.error) return authResult.error

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ error: 'Configuration error' }, { status: 500 })
  }

  const sp = request.nextUrl.searchParams
  const fromYmd = parseYmd(sp.get('from'))
  const toYmd = parseYmd(sp.get('to'))
  if (!fromYmd || !toYmd) {
    return NextResponse.json(
      { error: 'Paramètres from et to requis (YYYY-MM-DD, fuseau Paris)' },
      { status: 400 }
    )
  }

  const qvRaw = sp.get('questionnaire_version')
  const questionnaireVersionFilter =
    qvRaw && isQuestionnaireVersion(Number(qvRaw)) ? Number(qvRaw) : null

  const { startUtc, endUtc } = parisDateRangeToUtcBounds(fromYmd, toYmd)
  const startIso = startUtc.toISOString()
  const endIso = endUtc.toISOString()

  const supabase = createClient(supabaseUrl, serviceKey)

  let startedQuery = supabase
    .from('evaluation_path_runs')
    .select('*')
    .gte('started_at', startIso)
    .lte('started_at', endIso)

  let completedQuery = supabase
    .from('evaluation_path_runs')
    .select('*')
    .not('completed_at', 'is', null)
    .gte('completed_at', startIso)
    .lte('completed_at', endIso)

  if (questionnaireVersionFilter != null) {
    startedQuery = startedQuery.eq('questionnaire_version', questionnaireVersionFilter)
    completedQuery = completedQuery.eq('questionnaire_version', questionnaireVersionFilter)
  }

  let shortCompletedCohortQuery = supabase
    .from('evaluation_path_runs')
    .select('*')
    .eq('path_mode', 'short')
    .not('completed_at', 'is', null)
    .gte('completed_at', startIso)
    .lte('completed_at', endIso)

  if (questionnaireVersionFilter != null) {
    shortCompletedCohortQuery = shortCompletedCohortQuery.eq(
      'questionnaire_version',
      questionnaireVersionFilter
    )
  }

  const [
    { data: startedRows, error: e1 },
    { data: completedRows, error: e2 },
    { data: shortCohortRows, error: e3 },
  ] = await Promise.all([startedQuery, completedQuery, shortCompletedCohortQuery])

  if (e1 || e2 || e3) {
    return NextResponse.json(
      {
        error:
          e1?.message || e2?.message || e3?.message || 'Erreur lecture runs',
      },
      { status: 500 }
    )
  }

  const started = (startedRows || []) as RunRow[]
  const completed = (completedRows || []) as RunRow[]

  const short = summarizePath(started, completed, 'short')
  const long = summarizePath(started, completed, 'long')

  const shortCohort: ShortCohortRun[] = (shortCohortRows || [])
    .filter((r) => r.completed_at)
    .map((r) => ({
      id: r.id as string,
      usecase_id: r.usecase_id as string,
      company_id: r.company_id as string,
      questionnaire_version: Number(r.questionnaire_version),
      entry_surface: (r.entry_surface as string | null) ?? null,
      system_type: (r.system_type as string | null) ?? null,
      completed_at: r.completed_at as string,
      classification_status: (r.classification_status as string | null) ?? null,
      risk_level: (r.risk_level as string | null) ?? null,
    }))

  const uniqueUsecaseIds = [...new Set(shortCohort.map((s) => s.usecase_id))]
  let longRunsForLinkage: LongRunForLinkage[] = []
  try {
    longRunsForLinkage =
      uniqueUsecaseIds.length > 0
        ? await fetchLongRunsForUsecases(supabase, uniqueUsecaseIds)
        : []
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Erreur lecture runs long' },
      { status: 500 }
    )
  }

  const linkageVersionFilter =
    questionnaireVersionFilter != null ? questionnaireVersionFilter : null

  const shortToLongOutcomes = outcomesForShortCohort(
    shortCohort,
    longRunsForLinkage,
    linkageVersionFilter
  )
  const short_to_long_summary = summarizeConversion(shortToLongOutcomes)
  const short_to_long_summary_windows = summarizeConversionWindows(shortToLongOutcomes)

  const conversion_by_entry_surface = conversionByEntrySurface(shortToLongOutcomes)
  const conversion_by_system_type = conversionBySystemType(shortToLongOutcomes)
  const conversion_by_classification = conversionByClassification(shortToLongOutcomes)
  const conversion_by_risk_level = conversionByRiskLevel(shortToLongOutcomes)
  const conversion_by_questionnaire_version =
    conversionByQuestionnaireVersion(shortToLongOutcomes)
  const conversion_by_company_id_raw = conversionByCompanyId(shortToLongOutcomes).slice(0, 35)
  const conversion_by_company_id = await attachCompanyNamesToSegmentRows(
    supabase,
    conversion_by_company_id_raw
  )

  const surfaceMap = new Map<
    string,
    { entry_surface: string; short_starts: number; long_starts: number }
  >()
  for (const r of started) {
    const k = entrySurfaceKey(r.entry_surface)
    const cur = surfaceMap.get(k) || {
      entry_surface: k,
      short_starts: 0,
      long_starts: 0,
    }
    if (r.path_mode === 'short') cur.short_starts += 1
    else cur.long_starts += 1
    surfaceMap.set(k, cur)
  }
  const by_entry_surface = [...surfaceMap.values()].sort(
    (a, b) => b.short_starts + b.long_starts - (a.short_starts + a.long_starts)
  )

  const outcomeMap = new Map<string, number>()
  for (const r of completed) {
    const ck = `${r.classification_status ?? '—'}|||${r.risk_level ?? '—'}`
    outcomeMap.set(ck, (outcomeMap.get(ck) || 0) + 1)
  }
  const by_outcome = [...outcomeMap.entries()]
    .map(([key, count]) => {
      const [classification_status, risk_level] = key.split('|||')
      return { classification_status, risk_level, count }
    })
    .sort((a, b) => b.count - a.count)

  const recent_completions = [...completed]
    .sort((a, b) => (b.completed_at || '').localeCompare(a.completed_at || ''))
    .slice(0, 25)
    .map((r) => ({
      id: r.id,
      usecase_id: r.usecase_id,
      company_id: r.company_id,
      path_mode: r.path_mode,
      questionnaire_version: r.questionnaire_version,
      entry_surface: r.entry_surface,
      started_at: r.started_at,
      completed_at: r.completed_at,
      completion_seconds: r.completion_seconds,
      classification_status: r.classification_status,
      risk_level: r.risk_level,
    }))

  const payload = {
    meta: {
      from: fromYmd,
      to: toYmd,
      start_utc: startIso,
      end_utc: endIso,
      questionnaire_version: questionnaireVersionFilter,
    },
    methodology: {
      short_to_long: SHORT_TO_LONG_METHODOLOGY_FR,
      period_note:
        'Les cartes « Court / Long » (démarrages & complétions) utilisent la période sur started_at ou completed_at comme avant. La cohorte conversion court → long utilise uniquement les courts dont la fin (completed_at) tombe dans la période ; les runs long liés peuvent commencer ou finir en dehors de cette période.',
    },
    short,
    long,
    short_to_long: {
      summary: short_to_long_summary,
      summary_windows: short_to_long_summary_windows,
      by_entry_surface: conversion_by_entry_surface,
      by_system_type: conversion_by_system_type,
      by_classification_status: conversion_by_classification,
      by_risk_level: conversion_by_risk_level,
      by_questionnaire_version: conversion_by_questionnaire_version,
      by_company_id: conversion_by_company_id,
    },
    by_entry_surface,
    by_outcome,
    recent_completions,
  }

  if (sp.get('format') === 'csv') {
    const csvInput: EvaluationPathRunsAdminCsvInput = {
      meta: payload.meta,
      short: payload.short,
      long: payload.long,
      short_to_long: payload.short_to_long,
      by_entry_surface: payload.by_entry_surface,
      by_outcome: payload.by_outcome,
    }
    const csv = evaluationPathRunsAdminToCsv(csvInput)
    const filename = `evaluation-path-runs_${fromYmd}_${toYmd}.csv`
    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  }

  return NextResponse.json(payload)
}
