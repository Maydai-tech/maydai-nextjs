/**
 * Conversion court → long (dashboard admin).
 *
 * Définitions (cohorte explicite) :
 * - Cohorte : chaque run `path_mode = short` dont `completed_at` tombe dans la fenêtre
 *   temporelle choisie (bornes déjà en UTC côté appelant).
 * - « Premier long après ce court » : parmi les runs `long` du même `usecase_id`,
 *   celui avec le plus petit `started_at` tel que `started_at >= completed_at` du court
 *   (inclut un démarrage exactement à l’instant de clôture du court).
 * - Conversion « long démarré » : ce premier long existe.
 * - Conversion « long terminé » : ce premier long a un `completed_at` non nul.
 * - Délais : mesurés depuis `completed_at` du court jusqu’au `started_at` / `completed_at`
 *   du premier long ainsi défini (secondes, entier).
 *
 * Filtre questionnaire (optionnel) : si `questionnaireVersionFilter` est un nombre,
 * seuls les runs long avec cette même version comptent pour le chaînage ; la cohorte
 * court est déjà filtrée en amont. Si `null`, tout run long éligible (toute version).
 */

import { meanSeconds, medianSeconds } from '@/lib/evaluation-path-runs-stats'

export type ShortCohortRun = {
  id: string
  usecase_id: string
  company_id: string
  questionnaire_version: number
  entry_surface: string | null
  system_type: string | null
  completed_at: string
  classification_status: string | null
  risk_level: string | null
}

export type LongRunForLinkage = {
  id: string
  usecase_id: string
  questionnaire_version: number
  started_at: string
  completed_at: string | null
}

export const SHORT_TO_LONG_METHODOLOGY_FR = {
  cohorte:
    'Runs court dont la date de fin (completed_at) est dans la période sélectionnée (Europe/Paris → UTC).',
  conversion_long_demarre:
    'Existe un run long sur le même cas d’usage, avec started_at ≥ completed_at du court, en prenant le run long avec le started_at le plus tôt (premier long après la clôture du court).',
  conversion_long_termine:
    'Ce premier long a une date de fin (completed_at) renseignée.',
  filtre_version:
    'Si une version questionnaire est sélectionnée dans les filtres, seuls les runs long de cette version sont pris en compte pour le chaînage ; la cohorte court est déjà restreinte à cette version.',
  delais:
    'Délais en secondes : de la fin du court au démarrage du premier long, puis de la fin du court à la fin de ce même long (uniquement si le long est terminé).',
  fenetres_conversion:
    '« Dans 7 jours » / « dans 30 jours » : parmi la cohorte (courts terminés dans la période), part des cas où le premier long (même définition que ci-dessus) démarre au plus 7×24h (resp. 30×24h) après la fin du court ; les taux sont rapportés à la taille de la cohorte. Pour « long terminé », même fenêtre mesurée jusqu’à la fin (completed_at) du premier long.',
} as const

export const SECONDS_7D = 7 * 24 * 3600
export const SECONDS_30D = 30 * 24 * 3600

export type ConversionWindowsSummary = {
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

export function summarizeConversionWindows(
  outcomes: ShortConversionOutcome[]
): ConversionWindowsSummary {
  const n = outcomes.length
  const startedWithin = (maxSec: number) =>
    outcomes.filter(
      (o) =>
        o.longStartedAfter &&
        o.secondsShortEndToLongStart != null &&
        o.secondsShortEndToLongStart <= maxSec
    ).length
  const completedWithin = (maxSec: number) =>
    outcomes.filter(
      (o) =>
        o.longCompletedAfter &&
        o.secondsShortEndToLongEnd != null &&
        o.secondsShortEndToLongEnd <= maxSec
    ).length
  const s7 = startedWithin(SECONDS_7D)
  const s30 = startedWithin(SECONDS_30D)
  const c7 = completedWithin(SECONDS_7D)
  const c30 = completedWithin(SECONDS_30D)
  return {
    cohort_short_completed_count: n,
    long_started_within_7d: s7,
    long_started_within_30d: s30,
    rate_cohort_long_started_within_7d: n > 0 ? s7 / n : null,
    rate_cohort_long_started_within_30d: n > 0 ? s30 / n : null,
    long_completed_within_7d: c7,
    long_completed_within_30d: c30,
    rate_cohort_long_completed_within_7d: n > 0 ? c7 / n : null,
    rate_cohort_long_completed_within_30d: n > 0 ? c30 / n : null,
  }
}

function ts(iso: string): number {
  return new Date(iso).getTime()
}

/** Premier run long après la clôture du court (même usecase_id). */
export function pickFirstLongRunAfterShort(
  short: ShortCohortRun,
  longRunsByUsecase: Map<string, LongRunForLinkage[]>,
  questionnaireVersionFilter: number | null
): LongRunForLinkage | null {
  const list = longRunsByUsecase.get(short.usecase_id)
  if (!list?.length) return null
  const tEnd = ts(short.completed_at)
  const candidates = list.filter((r) => {
    if (questionnaireVersionFilter != null && r.questionnaire_version !== questionnaireVersionFilter) {
      return false
    }
    return ts(r.started_at) >= tEnd
  })
  if (candidates.length === 0) return null
  candidates.sort((a, b) => {
    const d = ts(a.started_at) - ts(b.started_at)
    if (d !== 0) return d
    return a.id.localeCompare(b.id)
  })
  return candidates[0] ?? null
}

export function secondsBetween(fromIso: string, toIso: string): number | null {
  const a = ts(fromIso)
  const b = ts(toIso)
  if (!Number.isFinite(a) || !Number.isFinite(b) || b < a) return null
  return Math.floor((b - a) / 1000)
}

export type ShortConversionOutcome = {
  short: ShortCohortRun
  firstLong: LongRunForLinkage | null
  longStartedAfter: boolean
  longCompletedAfter: boolean
  secondsShortEndToLongStart: number | null
  secondsShortEndToLongEnd: number | null
}

export function outcomesForShortCohort(
  cohort: ShortCohortRun[],
  longRuns: LongRunForLinkage[],
  questionnaireVersionFilter: number | null
): ShortConversionOutcome[] {
  const byUc = new Map<string, LongRunForLinkage[]>()
  for (const r of longRuns) {
    const arr = byUc.get(r.usecase_id) || []
    arr.push(r)
    byUc.set(r.usecase_id, arr)
  }
  return cohort.map((short) => {
    const firstLong = pickFirstLongRunAfterShort(short, byUc, questionnaireVersionFilter)
    const longStartedAfter = firstLong != null
    const longCompletedAfter = Boolean(firstLong?.completed_at)
    const secondsShortEndToLongStart = firstLong
      ? secondsBetween(short.completed_at, firstLong.started_at)
      : null
    const secondsShortEndToLongEnd =
      firstLong?.completed_at != null
        ? secondsBetween(short.completed_at, firstLong.completed_at)
        : null
    return {
      short,
      firstLong,
      longStartedAfter,
      longCompletedAfter,
      secondsShortEndToLongStart,
      secondsShortEndToLongEnd,
    }
  })
}

export type ConversionSummary = {
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

export function summarizeConversion(outcomes: ShortConversionOutcome[]): ConversionSummary {
  const n = outcomes.length
  const withStart = outcomes.filter((o) => o.longStartedAfter).length
  const withDone = outcomes.filter((o) => o.longCompletedAfter).length
  const toStartSecs = outcomes
    .map((o) => o.secondsShortEndToLongStart)
    .filter((x): x is number => x != null && Number.isFinite(x))
  const toEndSecs = outcomes
    .map((o) => o.secondsShortEndToLongEnd)
    .filter((x): x is number => x != null && Number.isFinite(x))
  return {
    cohort_short_completed_count: n,
    with_long_started_after: withStart,
    with_long_completed_after: withDone,
    rate_short_completed_to_long_started: n > 0 ? withStart / n : null,
    rate_short_completed_to_long_completed: n > 0 ? withDone / n : null,
    median_seconds_short_end_to_long_start: medianSeconds(toStartSecs),
    mean_seconds_short_end_to_long_start: meanSeconds(toStartSecs),
    median_seconds_short_end_to_long_end: medianSeconds(toEndSecs),
    mean_seconds_short_end_to_long_end: meanSeconds(toEndSecs),
  }
}

export type SegmentConversionRow = {
  segment: string
  /** Renseigné pour la segmentation entreprise (segment = company_id). */
  company_name?: string | null
  cohort_count: number
  long_started: number
  long_completed: number
  rate_started: number | null
  rate_completed: number | null
  median_seconds_to_long_start: number | null
}

function segmentLabel(v: string | null | undefined, emptyLabel: string): string {
  if (v == null || String(v).trim() === '') return emptyLabel
  return String(v).trim()
}

function buildSegmentTable(
  outcomes: ShortConversionOutcome[],
  keyFn: (s: ShortCohortRun) => string
): SegmentConversionRow[] {
  const map = new Map<
    string,
    { cohort: number; started: number; completed: number; delays: number[] }
  >()
  for (const o of outcomes) {
    const k = keyFn(o.short)
    const cur = map.get(k) || { cohort: 0, started: 0, completed: 0, delays: [] }
    cur.cohort += 1
    if (o.longStartedAfter) cur.started += 1
    if (o.longCompletedAfter) cur.completed += 1
    if (o.secondsShortEndToLongStart != null) cur.delays.push(o.secondsShortEndToLongStart)
    map.set(k, cur)
  }
  return [...map.entries()]
    .map(([segment, v]) => ({
      segment,
      cohort_count: v.cohort,
      long_started: v.started,
      long_completed: v.completed,
      rate_started: v.cohort > 0 ? v.started / v.cohort : null,
      rate_completed: v.cohort > 0 ? v.completed / v.cohort : null,
      median_seconds_to_long_start: medianSeconds(v.delays),
    }))
    .sort((a, b) => b.cohort_count - a.cohort_count)
}

export function conversionByEntrySurface(outcomes: ShortConversionOutcome[]): SegmentConversionRow[] {
  return buildSegmentTable(outcomes, (s) => segmentLabel(s.entry_surface, '(non renseigné)'))
}

export function conversionBySystemType(outcomes: ShortConversionOutcome[]): SegmentConversionRow[] {
  return buildSegmentTable(outcomes, (s) => segmentLabel(s.system_type, '(non renseigné)'))
}

export function conversionByClassification(outcomes: ShortConversionOutcome[]): SegmentConversionRow[] {
  return buildSegmentTable(outcomes, (s) => segmentLabel(s.classification_status, '(non renseigné)'))
}

export function conversionByRiskLevel(outcomes: ShortConversionOutcome[]): SegmentConversionRow[] {
  return buildSegmentTable(outcomes, (s) => segmentLabel(s.risk_level, '(non renseigné)'))
}

export function conversionByQuestionnaireVersion(
  outcomes: ShortConversionOutcome[]
): SegmentConversionRow[] {
  return buildSegmentTable(outcomes, (s) => `v${s.questionnaire_version}`)
}

export function conversionByCompanyId(outcomes: ShortConversionOutcome[]): SegmentConversionRow[] {
  return buildSegmentTable(outcomes, (s) => s.company_id)
}
