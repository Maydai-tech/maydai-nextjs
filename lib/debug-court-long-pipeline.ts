/**
 * Pipeline reproduit : parcours court → checklists → GET (merge) → parcours long.
 * Utilisé par le script `scripts/debug-court-long.ts` et le test Jest d'intégration.
 */

import {
  V3_SHORT_ENTREPRISE_ID,
  V3_SHORT_SOCIAL_ENV_ID,
  V3_SHORT_TRANSPARENCE_ID,
  V3_SHORT_USAGE_ID,
} from '@/app/(saas)/usecases/[id]/utils/questionnaire-v3-graph'
import {
  buildShortPathLongAnswerPatches,
  normalizeShortPathStageSelection,
} from '@/app/(saas)/usecases/[id]/utils/v3-short-path-stages'
import { buildConsolidatedChecklistsFromAnswers } from '@/lib/consolidated-checklists-from-answers'
import { deriveMissingPenaltiesForShortPath } from '@/lib/derive-missing-penalties-short-path'
import { mergeChecklistIntoDbResponseRows } from '@/lib/merge-checklist-into-user-responses'
import { dbResponsesToQuestionnaireAnswers } from '@/lib/scoring-v2-server'
import { buildV3ScoringContextFromDbResponses } from '@/lib/scoring-v3-server'
import { calculateBaseScore } from '@/lib/score-calculator-simple'
import { QUESTIONNAIRE_VERSION_V3 } from '@/lib/questionnaire-version'
import type { UserResponse } from '@/lib/score-calculator-simple'

export type DbRow = {
  question_code: string
  single_value?: string | null
  multiple_codes?: string[] | null
  conditional_main?: string | null
}

/** Pivots E4 segments 1–4 (aligné crash-test PO). */
export function shortPathPivotRows(): DbRow[] {
  return [
    { question_code: 'E4.N7.Q1', single_value: 'E4.N7.Q1.B' },
    { question_code: 'E4.N7.Q1.2', single_value: 'E4.N7.Q1.2.A' },
    { question_code: 'E4.N7.Q3', multiple_codes: ['E4.N7.Q3.E'] },
    { question_code: 'E4.N7.Q3.1', multiple_codes: ['E4.N7.Q3.1.E'] },
    { question_code: 'E4.N7.Q2.1', multiple_codes: ['E4.N7.Q2.1.E'] },
    { question_code: 'E4.N7.Q2', multiple_codes: ['E4.N7.Q2.B'] },
    { question_code: 'E4.N8.Q9', single_value: 'E4.N8.Q9.B' },
    { question_code: 'E4.N8.Q9.1', single_value: 'E4.N8.Q9.1.B' },
    { question_code: 'E4.N8.Q11.0', single_value: 'E4.N8.Q11.0.B' },
    { question_code: 'E4.N8.Q10', single_value: 'E4.N8.Q10.A' },
    { question_code: 'E5.N9.Q5', multiple_codes: ['E5.N9.Q5.A'] },
  ]
}

export const SHORT_PACK_ENTERPRISE_BEST = ['E5.N9.Q1.A', 'E5.N9.Q7.B', 'E4.N8.Q12.B'] as const
export const SHORT_PACK_USAGE_BEST = ['E5.N9.Q3.A', 'E5.N9.Q4.A', 'E5.N9.Q6.B', 'E5.N9.Q8.B', 'E5.N9.Q9.B'] as const
export const SHORT_PACK_TRANSPARENCE_BEST = ['E6.N10.Q1.B', 'E6.N10.Q2.B', 'E6.N10.Q3.B'] as const
export const SHORT_PACK_SOCIAL_BEST = ['E7.N11.Q3.B'] as const

function rowsToAnswersMap(rows: DbRow[]): Record<string, unknown> {
  const acc: Record<string, unknown> = {}
  for (const r of rows) {
    if (r.multiple_codes?.length) acc[r.question_code] = r.multiple_codes
    else if (r.single_value) acc[r.question_code] = r.single_value
  }
  return acc
}

function packRowsToDb(packId: string, selection: string[]): DbRow {
  return {
    question_code: packId,
    single_value: null,
    multiple_codes: selection,
  }
}

/**
 * Simule : pivots E4 en mémoire + validation des 4 packs + dépliage + POST checklists consolidées.
 */
export function simulateShortPathSavePipeline(
  pivotRows: DbRow[],
  opts?: {
    enterprise?: string[]
    usage?: string[]
    transparence?: string[]
    social?: string[]
    injectGhostPenalties?: boolean
  }
): {
  usecaseResponses: DbRow[]
  checklists: { checklist_gov_enterprise: string[]; checklist_gov_usecase: string[] }
  fullMergedAnswers: Record<string, unknown>
} {
  const enterprise = opts?.enterprise ?? [...SHORT_PACK_ENTERPRISE_BEST]
  const usage = opts?.usage ?? [...SHORT_PACK_USAGE_BEST]
  const transparence = opts?.transparence ?? [...SHORT_PACK_TRANSPARENCE_BEST]
  const social = opts?.social ?? [...SHORT_PACK_SOCIAL_BEST]

  let answers = rowsToAnswersMap(pivotRows)
  answers[V3_SHORT_ENTREPRISE_ID] = enterprise
  answers[V3_SHORT_USAGE_ID] = usage
  answers[V3_SHORT_TRANSPARENCE_ID] = transparence
  answers[V3_SHORT_SOCIAL_ENV_ID] = social

  const patches = buildShortPathLongAnswerPatches(answers)
  answers = { ...answers, ...patches }

  let checklists = buildConsolidatedChecklistsFromAnswers(answers)
  if (opts?.injectGhostPenalties) {
    checklists = {
      checklist_gov_enterprise: [
        ...new Set([
          ...checklists.checklist_gov_enterprise,
          ...deriveMissingPenaltiesForShortPath(enterprise, V3_SHORT_ENTREPRISE_ID),
          ...deriveMissingPenaltiesForShortPath(usage, V3_SHORT_USAGE_ID),
        ]),
      ],
      checklist_gov_usecase: [
        ...new Set([
          ...checklists.checklist_gov_usecase,
          ...deriveMissingPenaltiesForShortPath(transparence, V3_SHORT_TRANSPARENCE_ID),
          ...deriveMissingPenaltiesForShortPath(social, V3_SHORT_SOCIAL_ENV_ID),
        ]),
      ],
    }
  }

  const usecaseResponses: DbRow[] = [
    ...pivotRows,
    packRowsToDb(V3_SHORT_ENTREPRISE_ID, enterprise),
    packRowsToDb(V3_SHORT_USAGE_ID, usage),
    packRowsToDb(V3_SHORT_TRANSPARENCE_ID, transparence),
    packRowsToDb(V3_SHORT_SOCIAL_ENV_ID, social),
  ]

  return { usecaseResponses, checklists, fullMergedAnswers: answers }
}

/** Simule GET /responses : mergeChecklistIntoDbResponseRows + formattedAnswers. */
export function simulateGetResponsesAfterMerge(
  usecaseResponses: DbRow[],
  checklists: { checklist_gov_enterprise: string[]; checklist_gov_usecase: string[] }
): {
  mergedRows: DbRow[]
  formattedAnswers: Record<string, unknown>
} {
  const mergedRows = mergeChecklistIntoDbResponseRows(
    usecaseResponses,
    checklists.checklist_gov_enterprise,
    checklists.checklist_gov_usecase
  )
  const formattedAnswers = dbResponsesToQuestionnaireAnswers(mergedRows)
  return { mergedRows, formattedAnswers }
}

/** Contrôle humain (dossier human_oversight) : E5.N9.Q8 passe de A à B. */
export function simulateHumanOversightValidation(
  fullMergedAnswers: Record<string, unknown>
): Record<string, unknown> {
  return {
    ...fullMergedAnswers,
    'E5.N9.Q8': 'E5.N9.Q8.B',
    [V3_SHORT_USAGE_ID]: normalizeShortPathStageSelection(fullMergedAnswers[V3_SHORT_USAGE_ID]).filter(
      (c) => c !== 'E5.N9.Q8.A'
    ).concat('E5.N9.Q8.B'),
  }
}

export function scoreShortPath(
  mergedRows: DbRow[],
  pathMode: 'short' | 'long'
): { scoreBase: number; scoreFinalDisplay: number } {
  const ctx = buildV3ScoringContextFromDbResponses(
    QUESTIONNAIRE_VERSION_V3,
    mergedRows,
    null,
    pathMode
  )
  if (!ctx) throw new Error('buildV3ScoringContextFromDbResponses null')
  const userResponses: UserResponse[] = mergedRows.map((r) => ({
    question_code: r.question_code,
    single_value: r.single_value ?? undefined,
    multiple_codes: r.multiple_codes ?? undefined,
    conditional_main: r.conditional_main ?? undefined,
  }))
  const base = calculateBaseScore(userResponses, {
    activeQuestionCodes: ctx.scoringActiveQuestionCodes,
  })
  return { scoreBase: base.score_base, scoreFinalDisplay: base.score_base }
}

export const REQUIRED_LONG_KEYS_AFTER_MERGE = [
  'E4.N7.Q1',
  'E5.N9.Q1',
  'E6.N10.Q1',
] as const

export function assertLongKeysPopulated(formatted: Record<string, unknown>): void {
  const missing: string[] = []
  for (const key of REQUIRED_LONG_KEYS_AFTER_MERGE) {
    const v = formatted[key]
    if (v === undefined || v === null || v === '') missing.push(key)
  }
  if (missing.length > 0) {
    throw new Error(
      `Clés longues absentes après merge GET : ${missing.join(', ')}. Clés présentes : ${Object.keys(formatted).filter((k) => k.startsWith('E4.') || k.startsWith('E5.') || k.startsWith('E6.')).join(', ')}`
    )
  }
}

export function logFormattedAnswersSnapshot(
  label: string,
  formatted: Record<string, unknown>
): void {
  const pick = (prefix: string) =>
    Object.fromEntries(
      Object.entries(formatted).filter(([k]) => k.startsWith(prefix) || k.startsWith('V3_SHORT'))
    )
   
  console.log(`\n=== ${label} ===`)
   
  console.log(JSON.stringify({ E4: pick('E4'), E5: pick('E5'), E6: pick('E6'), E7: pick('E7') }, null, 2))
}
