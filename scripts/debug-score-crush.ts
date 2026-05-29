/**
 * Script temporaire — vérité mathématique calculate-score (E4.N8.Q12).
 *
 * Usage: npx tsx scripts/debug-score-crush.ts
 *
 * Prérequis: .env.local (NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'
import { mergeChecklistIntoDbResponseRows } from '../lib/merge-checklist-into-user-responses'
import { buildV3ScoringContextFromDbResponses } from '../lib/scoring-v3-server'
import { buildV2ScoringContextFromDbResponses } from '../lib/scoring-v2-server'
import {
  calculateBaseScore,
  calculateFinalScore,
  resolveTotalFinalWeight,
  COMPL_AI_MULTIPLIER,
  type UserResponse,
} from '../lib/score-calculator-simple'
import {
  normalizeQuestionnaireVersion,
  QUESTIONNAIRE_VERSION_V2,
  QUESTIONNAIRE_VERSION_V3,
} from '../lib/questionnaire-version'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const USECASE_ID = '84edbcb4-2576-421c-9b5d-99eea1f8bffc'
const Q12 = 'E4.N8.Q12'

function requireEnv(name: string): string {
  const v = process.env[name]?.trim()
  if (!v) {
    console.error(`❌ Variable manquante: ${name}`)
    process.exit(1)
  }
  return v
}

type DbRow = {
  question_code: string
  single_value: string | null
  multiple_codes: string[] | null
  multiple_labels?: string[] | null
  conditional_main: string | null
  conditional_keys?: string[] | null
  conditional_values?: string[] | null
}

function rowsToUserResponses(rows: DbRow[]): UserResponse[] {
  return rows.map((r) => ({
    question_code: r.question_code,
    single_value: r.single_value ?? undefined,
    multiple_codes: r.multiple_codes ?? undefined,
    conditional_main: r.conditional_main ?? undefined,
    conditional_keys: r.conditional_keys ?? undefined,
    conditional_values: r.conditional_values ?? undefined,
  }))
}

function withQ12Answer(rows: DbRow[], singleValue: string): DbRow[] {
  const out = rows.map((r) => ({ ...r }))
  const idx = out.findIndex((r) => r.question_code === Q12)
  if (idx >= 0) {
    out[idx] = {
      ...out[idx],
      single_value: singleValue,
      multiple_codes: null,
      conditional_main: null,
    }
  } else {
    out.push({
      question_code: Q12,
      single_value: singleValue,
      multiple_codes: null,
      conditional_main: null,
    })
  }
  return out
}

async function resolveModelScore(
  admin: ReturnType<typeof createClient>,
  usecaseId: string,
  storedScoreModel: number | null
): Promise<number | null> {
  if (storedScoreModel != null && !Number.isNaN(Number(storedScoreModel))) {
    return Number(storedScoreModel)
  }

  const { data: uc } = await admin
    .from('usecases')
    .select('primary_model_id')
    .eq('id', usecaseId)
    .single()

  if (!uc?.primary_model_id) return null

  const { data: evaluations } = await admin
    .from('compl_ai_evaluations')
    .select('score, principle_id')
    .eq('model_id', uc.primary_model_id)
    .not('score', 'is', null)

  if (!evaluations?.length) return null

  const principleScores: Record<string, { sum: number; count: number }> = {}
  for (const ev of evaluations) {
    const pid = ev.principle_id as string
    if (!principleScores[pid]) principleScores[pid] = { sum: 0, count: 0 }
    principleScores[pid].sum += Number(ev.score)
    principleScores[pid].count += 1
  }
  const avgs = Object.values(principleScores).map((p) => p.sum / p.count)
  const globalAvg = avgs.reduce((a, b) => a + b, 0) / avgs.length
  return globalAvg * COMPL_AI_MULTIPLIER
}

function runPipeline(
  label: string,
  mergedRows: DbRow[],
  opts: {
    questionnaireVersion: number
    systemType: string | null
    pathMode: 'long' | 'short'
    modelScore: number | null
    checklistEnt: string[] | null
    checklistUc: string[] | null
    dbActiveCodes: string[] | null
  }
) {
  const userResponses = rowsToUserResponses(mergedRows)
  const qv = normalizeQuestionnaireVersion(opts.questionnaireVersion)

  const v2Ctx =
    qv === QUESTIONNAIRE_VERSION_V2
      ? buildV2ScoringContextFromDbResponses(qv, mergedRows)
      : null
  const v3Ctx =
    qv === QUESTIONNAIRE_VERSION_V3
      ? buildV3ScoringContextFromDbResponses(qv, mergedRows, opts.systemType, opts.pathMode)
      : null

  const activeSet =
    v3Ctx?.scoringActiveQuestionCodes ?? v2Ctx?.scoringActiveQuestionCodes ?? undefined

  const q12InActive = activeSet?.has(Q12) ?? false
  const q12InDbActiveList = (opts.dbActiveCodes ?? []).includes(Q12)

  const baseOpts = activeSet
    ? { activeQuestionCodes: activeSet }
    : {
        checklistGovEnterprise: opts.checklistEnt,
        checklistGovUsecase: opts.checklistUc,
      }

  const base = calculateBaseScore(userResponses, baseOpts)
  const final = calculateFinalScore(base, opts.modelScore, USECASE_ID, {
    activeQuestionCodes: activeSet,
    questionnairePathMode: qv === QUESTIONNAIRE_VERSION_V3 ? opts.pathMode : undefined,
  })

  const W = resolveTotalFinalWeight({
    activeQuestionCodes: activeSet,
    questionnairePathMode: qv === QUESTIONNAIRE_VERSION_V3 ? opts.pathMode : undefined,
  })

  const q12Row = mergedRows.find((r) => r.question_code === Q12)

  console.log(`\n${'='.repeat(72)}`)
  console.log(label)
  console.log('='.repeat(72))
  const rawBeforeFloor = 90 + base.calculation_details.total_impact
  console.log(
    `[${label}] isEliminated: ${base.is_eliminated}, totalImpact: ${base.calculation_details.total_impact}, score_base_raw(90+impact): ${rawBeforeFloor}, score_base(plancher): ${base.score_base}, score_final: ${final.scores.score_final}`
  )
  console.log(`  E4.N8.Q12 single_value simulé: ${q12Row?.single_value ?? '(absent)'}`)
  console.log(`  E4.N8.Q12 dans scoringActiveQuestionCodes: ${q12InActive}`)
  console.log(`  E4.N8.Q12 dans usecases.active_question_codes (DB): ${q12InDbActiveList}`)
  console.log(`  scoringActiveQuestionCodes.size: ${activeSet?.size ?? 'N/A (V1)'}`)
  console.log(`  dénominateur W (resolveTotalFinalWeight): ${W}`)
  console.log(`  score_model utilisé: ${opts.modelScore ?? 'null'}`)
  console.log(`  formule: ${final.calculation_details.formula_used}`)
  console.log(
    `  score_brut = score_base + model×2.5 = ${base.score_base} + ${(opts.modelScore ?? 0) * 2.5} = ${base.score_base + (opts.modelScore ?? 0) * 2.5}`
  )
}

async function main() {
  const admin = createClient(
    requireEnv('NEXT_PUBLIC_SUPABASE_URL'),
    requireEnv('SUPABASE_SERVICE_ROLE_KEY'),
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  console.log('🔬 debug-score-crush — usecase', USECASE_ID)

  const { data: usecase, error: ucErr } = await admin
    .from('usecases')
    .select(
      'id, path_mode, active_question_codes, is_eliminated, score_base, score_model, score_final, questionnaire_version, system_type, checklist_gov_enterprise, checklist_gov_usecase'
    )
    .eq('id', USECASE_ID)
    .single()

  if (ucErr || !usecase) {
    console.error('❌ usecase:', ucErr?.message)
    process.exit(1)
  }

  console.log('\n📋 Usecase (DB)')
  console.log(JSON.stringify(usecase, null, 2))

  const { data: responses, error: rErr } = await admin
    .from('usecase_responses')
    .select(
      'question_code, single_value, multiple_codes, conditional_main, conditional_keys, conditional_values'
    )
    .eq('usecase_id', USECASE_ID)

  if (rErr) {
    console.error('❌ responses:', rErr.message)
    process.exit(1)
  }

  const q12Db = responses?.find((r) => r.question_code === Q12)
  console.log(`\n📝 Réponses: ${responses?.length ?? 0} lignes`)
  console.log(`   E4.N8.Q12 en DB: ${JSON.stringify(q12Db ?? null)}`)

  const checklistEnt = (usecase.checklist_gov_enterprise as string[] | null) ?? null
  const checklistUc = (usecase.checklist_gov_usecase as string[] | null) ?? null
  const merged = mergeChecklistIntoDbResponseRows(responses ?? [], checklistEnt, checklistUc) as DbRow[]

  const pathMode: 'long' | 'short' = usecase.path_mode === 'short' ? 'short' : 'long'
  const modelScore = await resolveModelScore(admin, USECASE_ID, usecase.score_model as number | null)

  const pipeOpts = {
    questionnaireVersion: Number(usecase.questionnaire_version ?? 3),
    systemType: (usecase.system_type as string | null) ?? null,
    pathMode,
    modelScore,
    checklistEnt,
    checklistUc,
    dbActiveCodes: (usecase.active_question_codes as string[] | null) ?? null,
  }

  const mergedA = withQ12Answer(merged, 'E4.N8.Q12.A')
  const mergedB = withQ12Answer(merged, 'E4.N8.Q12.B')

  runPipeline('[TEST A - NON]', mergedA, pipeOpts)
  runPipeline('[TEST B - OUI]', mergedB, pipeOpts)

  const baseA = calculateBaseScore(rowsToUserResponses(mergedA), {
    activeQuestionCodes: buildV3ScoringContextFromDbResponses(
      QUESTIONNAIRE_VERSION_V3,
      mergedA,
      pipeOpts.systemType,
      pathMode
    )!.scoringActiveQuestionCodes,
  })
  const baseB = calculateBaseScore(rowsToUserResponses(mergedB), {
    activeQuestionCodes: buildV3ScoringContextFromDbResponses(
      QUESTIONNAIRE_VERSION_V3,
      mergedB,
      pipeOpts.systemType,
      pathMode
    )!.scoringActiveQuestionCodes,
  })

  console.log('\n📐 DELTA attendu (B - A) sur score_base:', baseB.score_base - baseA.score_base)
  console.log('   (attendu +5 si E4.N8.Q12 compte dans le périmètre)')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
