/**
 * Simulation des 7 actions todo restantes (hors training_plan / human_oversight).
 * Injecte des « Non » dans les checklists, puis appelle syncTodoActionToResponse par action.
 *
 * Usage: npx tsx scripts/test-remaining-actions.ts
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'
import { getTodoActionMappings, syncTodoActionToResponse } from '../lib/todo-action-sync'
import {
  getStandardComplianceDocTypesExcludingRegistry,
} from '../lib/canonical-actions'
import { mergeChecklistIntoDbResponseRows } from '../lib/merge-checklist-into-user-responses'
import { buildV3ScoringContextFromDbResponses } from '../lib/scoring-v3-server'
import {
  calculateBaseScore,
  calculateFinalScore,
  type UserResponse,
} from '../lib/score-calculator-simple'
import { QUESTIONNAIRE_VERSION_V3 } from '../lib/questionnaire-version'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const REMAINING_DOC_TYPES = [
  'registry_proof',
  ...getStandardComplianceDocTypesExcludingRegistry().filter(
    (d) => d !== 'training_plan' && d !== 'human_oversight'
  ),
] as const

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

function buildNegativeChecklists(): {
  checklist_gov_enterprise: string[]
  checklist_gov_usecase: string[]
  byDocType: Array<{ docType: string; question_code: string; code: string }>
} {
  const ent = new Set<string>()
  const uc = new Set<string>()
  const byDocType: Array<{ docType: string; question_code: string; code: string }> = []
  const seenQ = new Set<string>()

  for (const docType of REMAINING_DOC_TYPES) {
    for (const m of getTodoActionMappings(docType)) {
      if (!m.negativeAnswerCode || seenQ.has(m.questionCode)) continue
      seenQ.add(m.questionCode)
      const code = m.negativeAnswerCode
      byDocType.push({ docType, question_code: m.questionCode, code })
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

async function persistScoreBase(admin: SupabaseClient, usecaseId: string) {
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
    'long'
  )

  const base = calculateBaseScore(userResponses, {
    activeQuestionCodes: v3Ctx?.scoringActiveQuestionCodes,
  })
  const final = calculateFinalScore(base, null, usecaseId, {
    activeQuestionCodes: v3Ctx?.scoringActiveQuestionCodes,
    questionnairePathMode: 'long',
  })

  await admin
    .from('usecases')
    .update({
      score_base: Math.round(Number(final.scores.score_base)),
      score_final: Math.round(Number(final.scores.score_final)),
    })
    .eq('id', usecaseId)

  return {
    score_base: final.scores.score_base,
    score_final: final.scores.score_final,
  }
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

  const negatives = buildNegativeChecklists()
  log('\n=== Actions testées (7) ===')
  for (const row of negatives.byDocType) {
    log(`  ${row.docType} → ${row.question_code} = ${row.code}`)
  }

  const { data: company } = await admin
    .from('companies')
    .insert({ name: `TEST remaining actions ${Date.now()}`, maydai_as_registry: false })
    .select('id')
    .single()
  if (!company?.id) throw new Error('company insert failed')

  const { data: uc } = await admin
    .from('usecases')
    .insert({
      company_id: company.id,
      name: 'TEST Remaining Actions',
      deployment_phase: 'en_projet',
      path_mode: 'long',
      questionnaire_version: QUESTIONNAIRE_VERSION_V3,
      checklist_gov_enterprise: negatives.checklist_gov_enterprise,
      checklist_gov_usecase: negatives.checklist_gov_usecase,
    })
    .select('id')
    .single()
  if (!uc?.id) throw new Error('usecase insert failed')

  const usecaseId = uc.id
  log(`\nUsecase: ${usecaseId}`)

  await admin.from('usecase_responses').insert([
    {
      usecase_id: usecaseId,
      question_code: 'E7.N11.Q1',
      single_value: 'E7.N11.Q1.A',
      answered_by: 'test@local',
    },
    {
      usecase_id: usecaseId,
      question_code: 'E7.N11.Q2',
      single_value: 'E7.N11.Q2.A',
      answered_by: 'test@local',
    },
  ])

  const initial = await persistScoreBase(admin, usecaseId)
  log('\n--- Score initial (tous « Non » en checklist) ---', initial)

  log('\n--- Complétion simulée via syncTodoActionToResponse ---\n')

  for (const docType of REMAINING_DOC_TYPES) {
    const before = await persistScoreBase(admin, usecaseId)
    const sync = await syncTodoActionToResponse(admin, usecaseId, docType, 'test@local')
    const after = await persistScoreBase(admin, usecaseId)

    log(`[${docType}]`, {
      shouldRecalculate: sync.shouldRecalculate,
      expectedPointsGained: sync.expectedPointsGained,
      previousValue: sync.previousValue,
      score_base_before: before.score_base,
      score_base_after: after.score_base,
      delta_base: after.score_base - before.score_base,
    })

    if (!sync.shouldRecalculate) {
      log(`  ⚠️  shouldRecalculate=false pour ${docType} — vérifier checklist / previousValue`)
    }
  }

  log('\n--- Simulation activation MaydAI (registry via paramètres entreprise) ---')
  const { updateUseCaseRegistryResponses } = await import('../lib/registry-sync')
  await admin.from('companies').update({ maydai_as_registry: true }).eq('id', company.id)

  const regBefore = await persistScoreBase(admin, usecaseId)
  const regSync = await updateUseCaseRegistryResponses(company.id, true, 'test@local', admin)
  const regAfter = await persistScoreBase(admin, usecaseId)
  log('updateUseCaseRegistryResponses (sans recalc API)', {
    ...regSync,
    score_base_before: regBefore.score_base,
    score_base_after: regAfter.score_base,
    delta_base: regAfter.score_base - regBefore.score_base,
    note: 'Si delta=0 alors route entreprise ne recalcule pas (bug attendu avant correctif)',
  })

  await cleanup(admin, usecaseId, company.id)
  log('\n✅ Nettoyage terminé\n')
}

main().catch((e) => {
  console.error('FATAL', e)
  process.exit(1)
})
