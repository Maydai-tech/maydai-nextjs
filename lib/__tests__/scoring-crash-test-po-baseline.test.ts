/**
 * Crash-test PO : scénarios 1–11 (haut risque, limité, minimal).
 * Utilise `calculateBaseScore` (lib/score-calculator-simple.ts),
 * `deriveMissingPenaltiesForShortPath` (lib/derive-missing-penalties-short-path.ts),
 * `mergeChecklistIntoDbResponseRows`, `buildV3ScoringContextFromDbResponses`,
 * et `calculateScore` pour les jauges catégories (mock Supabase).
 */

jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(() => Promise.resolve({ data: null, error: null })),
        })),
      })),
    })),
    auth: {
      getSession: jest.fn(() => Promise.resolve({ data: { session: null }, error: null })),
    },
  },
  createSupabaseClient: jest.fn(),
}))

import { calculateScore } from '@/app/usecases/[id]/utils/score-calculator'
import { mergeChecklistIntoDbResponseRows } from '@/lib/merge-checklist-into-user-responses'
import { buildV3ScoringContextFromDbResponses } from '@/lib/scoring-v3-server'
import { calculateBaseScore, type BaseScoreResult, type UserResponse } from '@/lib/score-calculator-simple'
import { QUESTIONNAIRE_VERSION_V3 } from '@/lib/questionnaire-version'
import { deriveMissingPenaltiesForShortPath } from '@/lib/derive-missing-penalties-short-path'
import {
  V3_SHORT_ENTREPRISE_ID,
  V3_SHORT_SOCIAL_ENV_ID,
  V3_SHORT_TRANSPARENCE_ID,
  V3_SHORT_USAGE_ID,
} from '@/app/usecases/[id]/utils/questionnaire-v3-graph'
import {
  collectE5DeclaredOptionCodes,
  collectE6DeclaredOptionCodes,
  E6_TRANSPARENCY_PACK_CONTENT_CODE,
  E6_TRANSPARENCY_PACK_INTERACTION_CODE,
} from '@/app/usecases/[id]/utils/bpgv-transparency-checklist-save'
import {
  declarativeAnswersAfterEnterpriseStage,
  declarativeAnswersAfterSocialEnvStage,
  declarativeAnswersAfterTransparenceStage,
  declarativeAnswersAfterUsageStage,
  normalizeShortPathStageSelection,
} from '@/app/usecases/[id]/utils/v3-short-path-stages'

const USECASE_ID = 'crash-test-po-baseline'

/** Six principes IA Act (jauges hors « niveau de risque » agrégé). */
const SIX_PRINCIPLE_CATEGORY_IDS = [
  'human_agency',
  'technical_robustness',
  'privacy_data',
  'transparency',
  'diversity_fairness',
  'social_environmental',
] as const

type Row = {
  question_code: string
  single_value?: string | null
  multiple_codes?: string[] | null
  conditional_main?: string | null
}

/** Base « Traducteur » : bonnes réponses (hors E4.N7.Q2 / E7 — ajustés par scénario). */
function longPathBestCore(annexIii: string[]): Row[] {
  return [
    { question_code: 'E4.N7.Q1', single_value: 'E4.N7.Q1.B', multiple_codes: null, conditional_main: null },
    { question_code: 'E4.N7.Q2', single_value: null, multiple_codes: annexIii, conditional_main: null },
    { question_code: 'E4.N7.Q2.1', single_value: null, multiple_codes: ['E4.N7.Q2.1.E'], conditional_main: null },
    { question_code: 'E4.N7.Q3', single_value: null, multiple_codes: ['E4.N7.Q3.E'], conditional_main: null },
    { question_code: 'E4.N7.Q3.1', single_value: null, multiple_codes: ['E4.N7.Q3.1.E'], conditional_main: null },
    { question_code: 'E5.N9.Q7', single_value: 'E5.N9.Q7.B', multiple_codes: null, conditional_main: null },
    { question_code: 'E5.N9.Q4', single_value: 'E5.N9.Q4.A', multiple_codes: null, conditional_main: null },
    { question_code: 'E5.N9.Q1', single_value: 'E5.N9.Q1.A', multiple_codes: null, conditional_main: null },
    { question_code: 'E5.N9.Q2', single_value: 'E5.N9.Q2.A', multiple_codes: null, conditional_main: null },
    { question_code: 'E5.N9.Q3', single_value: 'E5.N9.Q3.B', multiple_codes: null, conditional_main: null },
    { question_code: 'E5.N9.Q5', single_value: null, multiple_codes: ['E5.N9.Q5.A'], conditional_main: null },
    { question_code: 'E5.N9.Q6', single_value: 'E5.N9.Q6.B', multiple_codes: null, conditional_main: null },
    { question_code: 'E5.N9.Q9', single_value: 'E5.N9.Q9.B', multiple_codes: null, conditional_main: null },
    { question_code: 'E5.N9.Q8', single_value: 'E5.N9.Q8.B', multiple_codes: null, conditional_main: null },
    { question_code: 'E4.N8.Q12', single_value: 'E4.N8.Q12.B', multiple_codes: null, conditional_main: null },
    { question_code: 'E4.N8.Q9', single_value: 'E4.N8.Q9.B', multiple_codes: null, conditional_main: null },
    { question_code: 'E4.N8.Q9.1', single_value: 'E4.N8.Q9.1.B', multiple_codes: null, conditional_main: null },
    { question_code: 'E4.N8.Q10', single_value: 'E4.N8.Q10.A', multiple_codes: null, conditional_main: null },
    { question_code: 'E4.N8.Q11.0', single_value: 'E4.N8.Q11.0.A', multiple_codes: null, conditional_main: null },
    { question_code: 'E4.N8.Q11.1', single_value: null, multiple_codes: ['E4.N8.Q11.1.A'], conditional_main: null },
    { question_code: 'E4.N8.Q11.T1', single_value: 'E4.N8.Q11.T1.E', multiple_codes: null, conditional_main: null },
    { question_code: 'E6.N10.Q1', single_value: 'E6.N10.Q1.B', multiple_codes: null, conditional_main: null },
    { question_code: 'E6.N10.Q3', single_value: 'E6.N10.Q3.B', multiple_codes: null, conditional_main: null },
    { question_code: 'E7.N11.Q1', single_value: 'E7.N11.Q1.B', multiple_codes: null, conditional_main: null },
    { question_code: 'E7.N11.Q2', single_value: 'E7.N11.Q2.B', multiple_codes: null, conditional_main: null },
  ]
}

function longPathWorstCore(annexIii: string[]): Row[] {
  return [
    { question_code: 'E4.N7.Q1', single_value: 'E4.N7.Q1.B', multiple_codes: null, conditional_main: null },
    { question_code: 'E4.N7.Q2', single_value: null, multiple_codes: annexIii, conditional_main: null },
    { question_code: 'E4.N7.Q2.1', single_value: null, multiple_codes: ['E4.N7.Q2.1.E'], conditional_main: null },
    { question_code: 'E4.N7.Q3', single_value: null, multiple_codes: ['E4.N7.Q3.E'], conditional_main: null },
    { question_code: 'E4.N7.Q3.1', single_value: null, multiple_codes: ['E4.N7.Q3.1.E'], conditional_main: null },
    /** Garde-fou 6.3 : sans réponse le graphe ne va pas à E4.N8 → E5 (chemin actif tronqué). */
    { question_code: 'E4.N7.Q5', single_value: 'E4.N7.Q5.B', multiple_codes: null, conditional_main: null },
    { question_code: 'E5.N9.Q7', single_value: 'E5.N9.Q7.A', multiple_codes: null, conditional_main: null },
    { question_code: 'E5.N9.Q4', single_value: 'E5.N9.Q4.B', multiple_codes: null, conditional_main: null },
    { question_code: 'E5.N9.Q1', single_value: 'E5.N9.Q1.B', multiple_codes: null, conditional_main: null },
    { question_code: 'E5.N9.Q2', single_value: 'E5.N9.Q2.B', multiple_codes: null, conditional_main: null },
    { question_code: 'E5.N9.Q3', single_value: 'E5.N9.Q3.A', multiple_codes: null, conditional_main: null },
    { question_code: 'E5.N9.Q5', single_value: null, multiple_codes: ['E5.N9.Q5.B'], conditional_main: null },
    { question_code: 'E5.N9.Q6', single_value: 'E5.N9.Q6.A', multiple_codes: null, conditional_main: null },
    { question_code: 'E5.N9.Q9', single_value: 'E5.N9.Q9.A', multiple_codes: null, conditional_main: null },
    { question_code: 'E5.N9.Q8', single_value: 'E5.N9.Q8.A', multiple_codes: null, conditional_main: null },
    { question_code: 'E4.N8.Q12', single_value: 'E4.N8.Q12.A', multiple_codes: null, conditional_main: null },
    { question_code: 'E4.N8.Q9', single_value: 'E4.N8.Q9.A', multiple_codes: null, conditional_main: null },
    { question_code: 'E4.N8.Q9.1', single_value: 'E4.N8.Q9.1.B', multiple_codes: null, conditional_main: null },
    { question_code: 'E4.N8.Q10', single_value: 'E4.N8.Q10.B', multiple_codes: null, conditional_main: null },
    { question_code: 'E4.N8.Q11.0', single_value: 'E4.N8.Q11.0.A', multiple_codes: null, conditional_main: null },
    { question_code: 'E4.N8.Q11.1', single_value: null, multiple_codes: ['E4.N8.Q11.1.B'], conditional_main: null },
    { question_code: 'E4.N8.Q11.M1', single_value: 'E4.N8.Q11.M1.A', multiple_codes: null, conditional_main: null },
    /** Débloque le chemin actif après M1 (sinon arrêt sur M2 sans réponse → E5/E6 hors périmètre score). */
    { question_code: 'E4.N8.Q11.M2', single_value: 'E4.N8.Q11.M2.B', multiple_codes: null, conditional_main: null },
    { question_code: 'E6.N10.Q1', single_value: 'E6.N10.Q1.A', multiple_codes: null, conditional_main: null },
    { question_code: 'E6.N10.Q3', single_value: 'E6.N10.Q3.A', multiple_codes: null, conditional_main: null },
    { question_code: 'E7.N11.Q1', single_value: 'E7.N11.Q1.A', multiple_codes: null, conditional_main: null },
    { question_code: 'E7.N11.Q2', single_value: 'E7.N11.Q2.A', multiple_codes: null, conditional_main: null },
  ]
}

function patchRows(rows: Row[], questionCode: string, partial: Partial<Row>): Row[] {
  return rows.map((r) => (r.question_code === questionCode ? { ...r, ...partial } : r))
}

function rowsToUserResponses(rows: Row[]): UserResponse[] {
  return rows.map((r) => ({
    question_code: r.question_code,
    single_value: r.single_value ?? undefined,
    multiple_codes: r.multiple_codes ?? undefined,
    conditional_main: r.conditional_main ?? undefined,
  }))
}

function v3LongBaseScore(rows: Row[]) {
  const merged = mergeChecklistIntoDbResponseRows(rows, null, null)
  const ctx = buildV3ScoringContextFromDbResponses(QUESTIONNAIRE_VERSION_V3, merged, null, 'long')
  if (!ctx) throw new Error('ctx V3 null')
  const user = rowsToUserResponses(merged)
  const base = calculateBaseScore(user, { activeQuestionCodes: ctx.scoringActiveQuestionCodes })
  return { base, ctx, merged }
}

/** Parcours court : chaîne E4 + E5.N9.Q5 (Annexe III « emploi » — haut risque, alignement scénarios 4–5). */
function shortPathRowsPrefix(): Row[] {
  return [
    { question_code: 'E4.N7.Q1', single_value: 'E4.N7.Q1.B', multiple_codes: null, conditional_main: null },
    { question_code: 'E4.N7.Q1.2', single_value: 'E4.N7.Q1.2.A', multiple_codes: null, conditional_main: null },
    { question_code: 'E4.N7.Q3', single_value: null, multiple_codes: ['E4.N7.Q3.E'], conditional_main: null },
    { question_code: 'E4.N7.Q3.1', single_value: null, multiple_codes: ['E4.N7.Q3.1.E'], conditional_main: null },
    { question_code: 'E4.N7.Q2.1', single_value: null, multiple_codes: ['E4.N7.Q2.1.E'], conditional_main: null },
    { question_code: 'E4.N7.Q2', single_value: null, multiple_codes: ['E4.N7.Q2.A'], conditional_main: null },
    { question_code: 'E4.N8.Q9', single_value: 'E4.N8.Q9.B', multiple_codes: null, conditional_main: null },
    { question_code: 'E4.N8.Q9.1', single_value: 'E4.N8.Q9.1.B', multiple_codes: null, conditional_main: null },
    { question_code: 'E4.N8.Q11.0', single_value: 'E4.N8.Q11.0.B', multiple_codes: null, conditional_main: null },
    { question_code: 'E4.N8.Q10', single_value: 'E4.N8.Q10.A', multiple_codes: null, conditional_main: null },
    { question_code: 'E5.N9.Q5', single_value: null, multiple_codes: ['E5.N9.Q5.A'], conditional_main: null },
  ]
}

/** Parcours court : pas d’Annexe III sensible + `E4.N8.Q9.A` (chatbot / risque limité). */
function shortPathRowsPrefixLimitedChatbot(): Row[] {
  return patchRows(shortPathRowsPrefix(), 'E4.N7.Q2', {
    multiple_codes: ['E4.N7.Q2.G'],
    single_value: null,
  }).map((r) =>
    r.question_code === 'E4.N8.Q9' ? { ...r, single_value: 'E4.N8.Q9.A' } : r
  )
}

/** Parcours court : risque minimal (aucun domaine Annexe III + pas d’interlocuteur direct ORS). */
function shortPathRowsPrefixMinimal(): Row[] {
  return patchRows(shortPathRowsPrefix(), 'E4.N7.Q2', {
    multiple_codes: ['E4.N7.Q2.G'],
    single_value: null,
  })
}

function buildShortPathMergedAnswersFromPrefix(
  prefixRows: Row[],
  usageSel: string[],
  transSel: string[],
  socialSel: string[],
  enterpriseSel: string[]
): Record<string, unknown> {
  let acc: Record<string, unknown> = {}
  for (const r of prefixRows) {
    if (r.multiple_codes) acc[r.question_code] = r.multiple_codes
    else if (r.single_value) acc[r.question_code] = r.single_value
  }
  acc[V3_SHORT_ENTREPRISE_ID] = enterpriseSel
  acc = { ...acc, ...declarativeAnswersAfterEnterpriseStage(enterpriseSel) }
  acc[V3_SHORT_USAGE_ID] = usageSel
  acc = { ...acc, ...declarativeAnswersAfterUsageStage(usageSel) }
  acc[V3_SHORT_TRANSPARENCE_ID] = transSel
  acc = { ...acc, ...declarativeAnswersAfterTransparenceStage(transSel) }
  acc[V3_SHORT_SOCIAL_ENV_ID] = socialSel
  acc = { ...acc, ...declarativeAnswersAfterSocialEnvStage(socialSel) }
  return acc
}

function buildShortPathMergedAnswers(
  usageSel: string[],
  transSel: string[],
  socialSel: string[],
  enterpriseSel: string[]
): Record<string, unknown> {
  return buildShortPathMergedAnswersFromPrefix(shortPathRowsPrefix(), usageSel, transSel, socialSel, enterpriseSel)
}

function answersToResponseRows(answers: Record<string, unknown>): Row[] {
  const rows: Row[] = []
  for (const [question_code, val] of Object.entries(answers)) {
    if (val === undefined || val === null) continue
    if (Array.isArray(val)) {
      rows.push({ question_code, multiple_codes: val as string[], single_value: null, conditional_main: null })
    } else if (typeof val === 'string') {
      rows.push({ question_code, single_value: val, multiple_codes: null, conditional_main: null })
    }
  }
  return rows
}

function shortPathChecklistsFromMerged(mergedAnswers: Record<string, unknown>, injectGhosts: boolean) {
  let e5 = collectE5DeclaredOptionCodes(mergedAnswers)
  let e6 = collectE6DeclaredOptionCodes(mergedAnswers)
  if (injectGhosts) {
    const enterpriseSel = normalizeShortPathStageSelection(mergedAnswers[V3_SHORT_ENTREPRISE_ID])
    const usageSel = normalizeShortPathStageSelection(mergedAnswers[V3_SHORT_USAGE_ID])
    const transSel = normalizeShortPathStageSelection(mergedAnswers[V3_SHORT_TRANSPARENCE_ID])
    const socialSel = normalizeShortPathStageSelection(mergedAnswers[V3_SHORT_SOCIAL_ENV_ID])
    e5 = [
      ...new Set([
        ...e5,
        ...deriveMissingPenaltiesForShortPath(enterpriseSel, V3_SHORT_ENTREPRISE_ID),
        ...deriveMissingPenaltiesForShortPath(usageSel, V3_SHORT_USAGE_ID),
      ]),
    ]
    e6 = [
      ...new Set([
        ...e6,
        ...deriveMissingPenaltiesForShortPath(transSel, V3_SHORT_TRANSPARENCE_ID),
        ...deriveMissingPenaltiesForShortPath(socialSel, V3_SHORT_SOCIAL_ENV_ID),
      ]),
    ]
  }
  return { checklistGovEnterprise: e5, checklistGovUsecase: e6 }
}

function v3ShortBaseScore(
  mergedAnswers: Record<string, unknown>,
  injectGhosts: boolean
) {
  const rawRows = answersToResponseRows(mergedAnswers)
  const { checklistGovEnterprise, checklistGovUsecase } = shortPathChecklistsFromMerged(mergedAnswers, injectGhosts)
  const merged = mergeChecklistIntoDbResponseRows(rawRows, checklistGovEnterprise, checklistGovUsecase)
  const ctx = buildV3ScoringContextFromDbResponses(QUESTIONNAIRE_VERSION_V3, merged, null, 'short')
  if (!ctx) throw new Error('ctx V3 short null')
  const user = rowsToUserResponses(merged)
  const base = calculateBaseScore(user, { activeQuestionCodes: ctx.scoringActiveQuestionCodes })
  return { base, ctx, merged, checklistGovEnterprise, checklistGovUsecase }
}

function formatCategoryGauges(
  categories: { category_id: string; score: number; max_score: number; percentage: number }[]
) {
  return categories
    .filter((c) => c.max_score > 0 || c.score > 0)
    .map((c) => `${c.category_id}: ${c.score.toFixed(1)}/${c.max_score.toFixed(1)} (${c.percentage}%)`)
    .join(' | ')
}

function sixPrinciplePercentagesExact(
  categoryScores: { category_id: string; percentage: number }[]
): Record<(typeof SIX_PRINCIPLE_CATEGORY_IDS)[number], number> {
  const byId = new Map(categoryScores.map((c) => [c.category_id, c.percentage]))
  return Object.fromEntries(
    SIX_PRINCIPLE_CATEGORY_IDS.map((id) => [id, byId.get(id) ?? -1])
  ) as Record<(typeof SIX_PRINCIPLE_CATEGORY_IDS)[number], number>
}

function snapshotScenario(
  base: BaseScoreResult,
  score: Awaited<ReturnType<typeof calculateScore>>
) {
  return {
    score_base: base.score_base,
    total_impact: base.calculation_details.total_impact,
    is_eliminated: base.is_eliminated,
    six_principles_pct_exact: sixPrinciplePercentagesExact(score.category_scores),
    jauges: formatCategoryGauges(score.category_scores),
    score_affiche_calculateScore: score.score,
  }
}

const ANNEX_MINIMAL = ['E4.N7.Q2.G'] as const

describe('Crash-test PO — baseline scoring (scénarios 1–11)', () => {
  it('exécute les scénarios 1–11 et affiche le rapport (score_base, total_impact, 6 jauges %)', async () => {
    // --- Scénario 1 : éliminatoire biométrie (E4.N7.Q2.1.A) ---
    const s1rows: Row[] = [
      { question_code: 'E4.N7.Q2.1', single_value: null, multiple_codes: ['E4.N7.Q2.1.A'], conditional_main: null },
    ]
    const s1merged = mergeChecklistIntoDbResponseRows(s1rows, null, null)
    const s1ctx = buildV3ScoringContextFromDbResponses(QUESTIONNAIRE_VERSION_V3, s1merged, null, 'long')
    const s1base = calculateBaseScore(rowsToUserResponses(s1merged), {
      activeQuestionCodes: s1ctx?.scoringActiveQuestionCodes,
    })
    const s1score = await calculateScore(USECASE_ID, s1merged, undefined, {
      questionnaireVersion: QUESTIONNAIRE_VERSION_V3,
      questionnairePathMode: 'long',
    })

    // --- Scénarios 2 & 3 : long, emploi -30 ---
    const annex = ['E4.N7.Q2.A']
    const { base: s2base, merged: s2merged } = v3LongBaseScore(longPathBestCore(annex))
    const s2score = await calculateScore(USECASE_ID, s2merged, undefined, {
      questionnaireVersion: QUESTIONNAIRE_VERSION_V3,
      questionnairePathMode: 'long',
    })

    const { base: s3base, merged: s3merged } = v3LongBaseScore(longPathWorstCore(annex))
    const s3score = await calculateScore(USECASE_ID, s3merged, undefined, {
      questionnaireVersion: QUESTIONNAIRE_VERSION_V3,
      questionnairePathMode: 'long',
    })

    // --- Scénarios 4 & 5 : court, packs « tout coché » vs vide + ghost saving ---
    const usageBest = ['E5.N9.Q3.B', 'E5.N9.Q4.A', 'E5.N9.Q6.B', 'E5.N9.Q8.B', 'E5.N9.Q9.B']
    const transBest = [
      E6_TRANSPARENCY_PACK_INTERACTION_CODE,
      E6_TRANSPARENCY_PACK_CONTENT_CODE,
      'E6.N10.Q3.B',
    ]
    const socialBest = ['E7.N11.Q3.B']
    /** Toutes les options « pratique positive » du pack entreprise court (questions-with-scores.json). */
    const enterpriseBest = ['E5.N9.Q1.A', 'E5.N9.Q7.B', 'E4.N8.Q12.B']

    const mergedBest = buildShortPathMergedAnswers(usageBest, transBest, socialBest, enterpriseBest)
    const { base: s4base, merged: s4merged, ctx: s4ctx } = v3ShortBaseScore(mergedBest, false)
    const s4score = await calculateScore(USECASE_ID, s4merged, undefined, {
      questionnaireVersion: QUESTIONNAIRE_VERSION_V3,
      questionnairePathMode: 'short',
    })

    const mergedWorstPacks = buildShortPathMergedAnswers([], [], [], [])
    const { base: s5base, merged: s5merged } = v3ShortBaseScore(mergedWorstPacks, true)
    const s5score = await calculateScore(USECASE_ID, s5merged, undefined, {
      questionnaireVersion: QUESTIONNAIRE_VERSION_V3,
      questionnairePathMode: 'short',
    })

    // --- Scénario 6 : limité — best long (Annexe III vide + E4.N8.Q9.A -3, reste best) ---
    const s6rows = patchRows(longPathBestCore([...ANNEX_MINIMAL]), 'E4.N8.Q9', { single_value: 'E4.N8.Q9.A' })
    const { base: s6base, merged: s6merged } = v3LongBaseScore(s6rows)
    const s6score = await calculateScore(USECASE_ID, s6merged, undefined, {
      questionnaireVersion: QUESTIONNAIRE_VERSION_V3,
      questionnairePathMode: 'long',
    })

    // --- Scénario 7 : limité — worst long (même entrée Q9.A + pires réponses conformité) ---
    const { base: s7base, merged: s7merged } = v3LongBaseScore(longPathWorstCore([...ANNEX_MINIMAL]))
    const s7score = await calculateScore(USECASE_ID, s7merged, undefined, {
      questionnaireVersion: QUESTIONNAIRE_VERSION_V3,
      questionnairePathMode: 'long',
    })

    // --- Scénario 8 : limité — worst court (Q9.A + packs vides + ghost saving) ---
    const merged8 = buildShortPathMergedAnswersFromPrefix(shortPathRowsPrefixLimitedChatbot(), [], [], [], [])
    const { base: s8base, merged: s8merged } = v3ShortBaseScore(merged8, true)
    const s8score = await calculateScore(USECASE_ID, s8merged, undefined, {
      questionnaireVersion: QUESTIONNAIRE_VERSION_V3,
      questionnairePathMode: 'short',
    })

    // --- Scénario 9 : minimal — best long (aucun malus ORS / Annexe) ---
    const { base: s9base, merged: s9merged } = v3LongBaseScore(longPathBestCore([...ANNEX_MINIMAL]))
    const s9score = await calculateScore(USECASE_ID, s9merged, undefined, {
      questionnaireVersion: QUESTIONNAIRE_VERSION_V3,
      questionnairePathMode: 'long',
    })

    // --- Scénario 10 : minimal — worst long (Q9.B / Q9.1.B : pas de malus ORS initial ; pires réponses ailleurs) ---
    const s10rows = patchRows(longPathWorstCore([...ANNEX_MINIMAL]), 'E4.N8.Q9', { single_value: 'E4.N8.Q9.B' })
    const { base: s10base, merged: s10merged } = v3LongBaseScore(s10rows)
    const s10score = await calculateScore(USECASE_ID, s10merged, undefined, {
      questionnaireVersion: QUESTIONNAIRE_VERSION_V3,
      questionnairePathMode: 'long',
    })

    // --- Scénario 11 : minimal — worst court (packs vides + ghost saving) ---
    const merged11 = buildShortPathMergedAnswersFromPrefix(shortPathRowsPrefixMinimal(), [], [], [], [])
    const { base: s11base, merged: s11merged } = v3ShortBaseScore(merged11, true)
    const s11score = await calculateScore(USECASE_ID, s11merged, undefined, {
      questionnaireVersion: QUESTIONNAIRE_VERSION_V3,
      questionnairePathMode: 'short',
    })

    const report = {
      scenario1: {
        score_base: s1base.score_base,
        is_eliminated: s1base.is_eliminated,
        elimination_reason: s1base.elimination_reason,
        total_impact: s1base.calculation_details.total_impact,
        jauges: formatCategoryGauges(s1score.category_scores),
        score_affiche_calculateScore: s1score.score,
      },
      scenario2: {
        score_base: s2base.score_base,
        total_impact: s2base.calculation_details.total_impact,
        is_eliminated: s2base.is_eliminated,
        jauges: formatCategoryGauges(s2score.category_scores),
        score_affiche_calculateScore: s2score.score,
      },
      scenario3: {
        score_base: s3base.score_base,
        total_impact: s3base.calculation_details.total_impact,
        is_eliminated: s3base.is_eliminated,
        jauges: formatCategoryGauges(s3score.category_scores),
        score_affiche_calculateScore: s3score.score,
      },
      scenario4: {
        score_base: s4base.score_base,
        total_impact: s4base.calculation_details.total_impact,
        is_eliminated: s4base.is_eliminated,
        jauges: formatCategoryGauges(s4score.category_scores),
        score_affiche_calculateScore: s4score.score,
      },
      scenario5: snapshotScenario(s5base, s5score),
      parity_2_vs_4_score_base: s2base.score_base === s4base.score_base,
      parity_3_vs_5_score_base: s3base.score_base === s5base.score_base,
      v3_short_scoringActiveQuestionCodes_count: s4ctx.scoringActiveQuestionCodes.size,
      scenario6: snapshotScenario(s6base, s6score),
      scenario7: snapshotScenario(s7base, s7score),
      scenario8: snapshotScenario(s8base, s8score),
      scenario9: snapshotScenario(s9base, s9score),
      scenario10: snapshotScenario(s10base, s10score),
      scenario11: snapshotScenario(s11base, s11score),
    }

    // eslint-disable-next-line no-console
    console.log('\n=== RAPPORT CRASH-TEST PO (score_base sur 90) ===\n', JSON.stringify(report, null, 2))

    expect(s1base.is_eliminated).toBe(true)
    expect(s1base.score_base).toBe(0)
    expect(s2base.score_base).toBe(60)
    expect(s4base.score_base).toBe(60)
    expect(s5base.score_base).toBeGreaterThanOrEqual(0)
    expect(s6base.score_base).toBe(87)
    expect(s9base.score_base).toBe(90)
  })
})
