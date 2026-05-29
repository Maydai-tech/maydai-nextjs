/**
 * Simulation E2E — parcours court V3 : 9 actions todo, malus en checklists, sync dossier.
 *
 * Usage: npx tsx scripts/test-short-path-actions.ts
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'
import {
  getTodoActionMappings,
  syncTodoActionToResponse,
  loadMergedPreviousByCode,
} from '../lib/todo-action-sync'
import { getStandardComplianceDocTypesOrdered } from '../lib/canonical-actions'
import { mergeChecklistIntoDbResponseRows } from '../lib/merge-checklist-into-user-responses'
import { buildV3ScoringContextFromDbResponses } from '../lib/scoring-v3-server'
import {
  calculateBaseScore,
  calculateFinalScore,
  resolveTotalFinalWeight,
  type UserResponse,
} from '../lib/score-calculator-simple'
import { QUESTIONNAIRE_VERSION_V3 } from '../lib/questionnaire-version'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const PATH_MODE = 'short' as const
const NINE_DOC_TYPES = getStandardComplianceDocTypesOrdered()

function requireEnv(name: string): string {
  const v = process.env[name]?.trim()
  if (!v) {
    console.error(`Variable manquante: ${name}`)
    process.exit(1)
  }
  return v
}

function log(msg: string, data?: unknown) {
  if (data !== undefined) console.log(msg, data)
  else console.log(msg)
}

function buildAllNineNegativeChecklists(): {
  checklist_gov_enterprise: string[]
  checklist_gov_usecase: string[]
  byDocType: Array<{ docType: string; question_code: string; code: string; rawImpact: number }>
} {
  const ent = new Set<string>()
  const uc = new Set<string>()
  const byDocType: Array<{ docType: string; question_code: string; code: string; rawImpact: number }> =
    []
  const seenQ = new Set<string>()

  for (const docType of NINE_DOC_TYPES) {
    for (const m of getTodoActionMappings(docType)) {
      if (!m.negativeAnswerCode || seenQ.has(m.questionCode)) continue
      seenQ.add(m.questionCode)
      const code = m.negativeAnswerCode
      byDocType.push({
        docType,
        question_code: m.questionCode,
        code,
        rawImpact: m.expectedPointsGained,
      })
      if (code.startsWith('E5.')) ent.add(code)
      else if (code.startsWith('E4.') || code.startsWith('E6.')) uc.add(code)
    }
  }

  return {
    checklist_gov_enterprise: [...ent],
    checklist_gov_usecase: [...uc],
    byDocType,
  }
}

async function computeScoreSnapshot(admin: SupabaseClient, usecaseId: string) {
  const { data: usecase } = await admin
    .from('usecases')
    .select(
      'questionnaire_version, system_type, path_mode, checklist_gov_enterprise, checklist_gov_usecase'
    )
    .eq('id', usecaseId)
    .single()

  const { data: responses } = await admin
    .from('usecase_responses')
    .select('*')
    .eq('usecase_id', usecaseId)

  const merged = mergeChecklistIntoDbResponseRows(
    responses ?? [],
    usecase?.checklist_gov_enterprise,
    usecase?.checklist_gov_usecase
  )

  const userResponses: UserResponse[] = merged.map((r) => ({
    question_code: r.question_code,
    single_value: r.single_value,
    multiple_codes: r.multiple_codes,
    conditional_main: r.conditional_main,
    conditional_keys: r.conditional_keys,
    conditional_values: r.conditional_values,
  }))

  const v3Ctx = buildV3ScoringContextFromDbResponses(
    QUESTIONNAIRE_VERSION_V3,
    merged,
    usecase?.system_type,
    PATH_MODE
  )

  const base = calculateBaseScore(userResponses, {
    activeQuestionCodes: v3Ctx?.scoringActiveQuestionCodes,
  })
  const totalWeight = resolveTotalFinalWeight({
    activeQuestionCodes: v3Ctx?.scoringActiveQuestionCodes,
    questionnairePathMode: PATH_MODE,
  })
  const final = calculateFinalScore(base, null, usecaseId, {
    activeQuestionCodes: v3Ctx?.scoringActiveQuestionCodes,
    questionnairePathMode: PATH_MODE,
  })

  await admin
    .from('usecases')
    .update({
      score_base: Math.round(Number(final.scores.score_base)),
      score_final: Math.round(Number(final.scores.score_final)),
      path_mode: PATH_MODE,
      short_path_initial_score: Math.round(Number(final.scores.score_final)),
    })
    .eq('id', usecaseId)

  return {
    score_base: final.scores.score_base,
    score_final: final.scores.score_final,
    is_eliminated: base.is_eliminated,
    totalWeight,
    scoringActive: v3Ctx ? [...v3Ctx.scoringActiveQuestionCodes].sort() : [],
    activePath: v3Ctx?.active_question_codes ?? [],
    mergedQuestionCount: merged.length,
  }
}

function auditScoringInclusion(
  questionCodes: string[],
  scoringActive: string[]
): { inScoring: string[]; excluded: string[] } {
  const set = new Set(scoringActive)
  const inScoring: string[] = []
  const excluded: string[] = []
  for (const q of questionCodes) {
    if (set.has(q)) inScoring.push(q)
    else excluded.push(q)
  }
  return { inScoring, excluded }
}

async function cleanup(admin: SupabaseClient, usecaseId: string, companyId: string) {
  await admin.from('usecase_responses').delete().eq('usecase_id', usecaseId)
  await admin.from('usecases').delete().eq('id', usecaseId)
  await admin.from('companies').delete().eq('id', companyId)
}

async function main() {
  const admin = createClient(requireEnv('NEXT_PUBLIC_SUPABASE_URL'), requireEnv('SUPABASE_SERVICE_ROLE_KEY'), {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const negatives = buildAllNineNegativeChecklists()

  log('\n========== ÉTAPE 1 — Initialisation (path_mode: short, V3) ==========')
  log(`Actions todo (${NINE_DOC_TYPES.length}):`, NINE_DOC_TYPES)
  log('Malus injectés (checklists):')
  for (const row of negatives.byDocType) {
    log(`  [${row.docType}] ${row.question_code} = ${row.code} (+${row.rawImpact} brut)`)
  }

  const { data: company } = await admin
    .from('companies')
    .insert({ name: `TEST short path ${Date.now()}`, maydai_as_registry: false })
    .select('id')
    .single()
  if (!company?.id) throw new Error('company insert')

  const { data: uc } = await admin
    .from('usecases')
    .insert({
      company_id: company.id,
      name: 'TEST Short Path — 9 actions',
      deployment_phase: 'en_projet',
      path_mode: PATH_MODE,
      questionnaire_version: QUESTIONNAIRE_VERSION_V3,
      checklist_gov_enterprise: negatives.checklist_gov_enterprise,
      checklist_gov_usecase: negatives.checklist_gov_usecase,
    })
    .select('id')
    .single()
  if (!uc?.id) throw new Error('usecase insert')

  const usecaseId = uc.id
  log('Usecase créé:', usecaseId)

  log('\n========== ÉTAPE 2 — Score initial (dette checklist) ==========')
  const initial = await computeScoreSnapshot(admin, usecaseId)
  log('Score initial:', {
    score_base: initial.score_base,
    score_final: initial.score_final,
    is_eliminated: initial.is_eliminated,
    totalWeight: initial.totalWeight,
    mergedQuestionCount: initial.mergedQuestionCount,
    scoringActive_count: initial.scoringActive.length,
  })

  const allQuestionCodes = [...new Set(negatives.byDocType.map((r) => r.question_code))]
  const preAudit = auditScoringInclusion(allQuestionCodes, initial.scoringActive)
  log('Audit scoringActive (avant sync) — questions des 9 actions:', {
    inScoring: preAudit.inScoring,
    excluded_from_scoring: preAudit.excluded,
  })

  log('\n========== ÉTAPE 3 — Sync dossier × 9 actions ==========')

  const results: Array<Record<string, unknown>> = []
  let cumulativeBase = initial.score_base

  for (const docType of NINE_DOC_TYPES) {
    const mappings = getTodoActionMappings(docType)
    const questionCodes = mappings.map((m) => m.questionCode)

    const { previousByCode } = await loadMergedPreviousByCode(admin, usecaseId, questionCodes)
    const previousValues = Object.fromEntries(
      questionCodes.map((q) => [q, previousByCode.get(q) ?? null])
    )

    const before = await computeScoreSnapshot(admin, usecaseId)
    const sync = await syncTodoActionToResponse(admin, usecaseId, docType, 'test-short-path@local')
    const after = await computeScoreSnapshot(admin, usecaseId)

    const postAudit = auditScoringInclusion(questionCodes, after.scoringActive)
    const deltaBase = after.score_base - before.score_base

    const row = {
      docType,
      questionCodes,
      previousValues,
      shouldRecalculate: sync.shouldRecalculate,
      expectedPointsGained: sync.expectedPointsGained,
      score_base_before: before.score_base,
      score_base_after: after.score_base,
      delta_score_base: deltaBase,
      scoring_included: postAudit.inScoring,
      scoring_excluded: postAudit.excluded,
      ok: sync.shouldRecalculate && deltaBase > 0,
    }
    results.push(row)

    log(`\n--- ${docType} ---`, row)

    if (!sync.shouldRecalculate) {
      log(`  ⚠️ shouldRecalculate=false (previousValues ci-dessus)`)
    }
    if (sync.shouldRecalculate && deltaBase <= 0) {
      log(`  ⚠️ shouldRecalculate=true mais delta score_base=0 (moteur / scoringActive)`)
    }
    if (postAudit.excluded.length > 0) {
      log(`  ⚠️ Questions hors scoringActiveQuestionCodes:`, postAudit.excluded)
    }

    cumulativeBase = after.score_base
  }

  log('\n========== SYNTHÈSE ==========')
  const allOk = results.every((r) => r.ok === true)
  log({
    path_mode: PATH_MODE,
    score_base_initial: initial.score_base,
    score_base_final: cumulativeBase,
    gain_total_base: cumulativeBase - initial.score_base,
    actions_ok: results.filter((r) => r.ok).length,
    actions_total: results.length,
    all_actions_recovered_points: allOk,
  })

  log('\nTableau récapitulatif:')
  console.table(
    results.map((r) => ({
      action: r.docType,
      shouldRecalculate: r.shouldRecalculate,
      delta_base: r.delta_score_base,
      excluded: (r.scoring_excluded as string[]).join(', ') || '—',
      ok: r.ok,
    }))
  )

  await cleanup(admin, usecaseId, company.id)
  log('\n✅ Nettoyage terminé\n')

  if (!allOk) process.exit(1)
}

main().catch((e) => {
  console.error('FATAL', e)
  process.exit(1)
})
