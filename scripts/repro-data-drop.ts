/**
 * Reproduction E2E — perte apparente des réponses « Non » (E4/E5/E6) avant complétion dossier.
 *
 * Usage: npx tsx scripts/repro-data-drop.ts
 * Prérequis: .env.local (NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
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
import { normalizeQuestionnaireVersion, QUESTIONNAIRE_VERSION_V3 } from '../lib/questionnaire-version'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const TRACKED = ['E4.N8.Q12', 'E5.N9.Q8'] as const

function log(section: string, msg: string, data?: unknown) {
  const prefix = `[${section}]`
  if (data !== undefined) console.log(prefix, msg, data)
  else console.log(prefix, msg)
}

function requireEnv(name: string): string {
  const v = process.env[name]?.trim()
  if (!v) {
    console.error(`Variable manquante: ${name}`)
    process.exit(1)
  }
  return v
}

/** 9 actions conformité : 8 hors registre + registre. */
function buildNineTodoNegativeAnswers(): Array<{ question_code: string; single_value: string; docType: string }> {
  const docTypes = [...getStandardComplianceDocTypesExcludingRegistry(), 'registry_proof']
  const out: Array<{ question_code: string; single_value: string; docType: string }> = []
  const seen = new Set<string>()

  for (const docType of docTypes) {
    const mappings = getTodoActionMappings(docType)
    for (const m of mappings) {
      if (!m.negativeAnswerCode || seen.has(m.questionCode)) continue
      seen.add(m.questionCode)
      out.push({
        question_code: m.questionCode,
        single_value: m.negativeAnswerCode,
        docType,
      })
    }
  }
  return out
}

async function fetchResponses(admin: SupabaseClient, usecaseId: string) {
  const { data, error } = await admin
    .from('usecase_responses')
    .select('question_code, single_value')
    .eq('usecase_id', usecaseId)
    .order('question_code')
  if (error) throw new Error(`fetchResponses: ${error.message}`)
  return data ?? []
}

function formatTracked(rows: { question_code: string; single_value: string | null }[]) {
  const map = new Map(rows.map((r) => [r.question_code, r.single_value]))
  return Object.fromEntries(TRACKED.map((q) => [q, map.get(q) ?? '(absent)']))
}

async function runCalculateScorePipeline(admin: SupabaseClient, usecaseId: string) {
  const { data: usecase, error: ucErr } = await admin
    .from('usecases')
    .select(
      'questionnaire_version, system_type, path_mode, checklist_gov_enterprise, checklist_gov_usecase'
    )
    .eq('id', usecaseId)
    .single()
  if (ucErr || !usecase) throw new Error(`usecase: ${ucErr?.message ?? 'not found'}`)

  const { data: responses, error: rErr } = await admin
    .from('usecase_responses')
    .select('*')
    .eq('usecase_id', usecaseId)
  if (rErr) throw new Error(`responses: ${rErr.message}`)

  const merged = mergeChecklistIntoDbResponseRows(
    responses ?? [],
    usecase.checklist_gov_enterprise,
    usecase.checklist_gov_usecase
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
    normalizeQuestionnaireVersion(usecase.questionnaire_version),
    merged,
    usecase.system_type,
    'long'
  )

  const base = calculateBaseScore(userResponses, {
    activeQuestionCodes: v3Ctx?.scoringActiveQuestionCodes,
  })
  const final = calculateFinalScore(base, null, usecaseId, {
    activeQuestionCodes: v3Ctx?.scoringActiveQuestionCodes,
    questionnairePathMode: 'long',
  })

  const nowIso = new Date().toISOString()
  const { error: upErr } = await admin
    .from('usecases')
    .update({
      score_base: Math.round(Number(final.scores.score_base)),
      score_final: Math.round(Number(final.scores.score_final)),
      score_model: null,
      is_eliminated: final.scores.is_eliminated,
      elimination_reason: final.scores.elimination_reason,
      last_calculation_date: nowIso,
      updated_at: nowIso,
      path_mode: 'long',
      ...(v3Ctx
        ? {
            bpgv_variant: v3Ctx.bpgv_variant,
            ors_exit: v3Ctx.ors_exit,
            active_question_codes: v3Ctx.active_question_codes,
          }
        : {}),
    })
    .eq('id', usecaseId)
  if (upErr) throw new Error(`update usecases: ${upErr.message}`)

  return {
    score_base: final.scores.score_base,
    score_final: final.scores.score_final,
    mergedCount: merged.length,
    scoringActive: v3Ctx ? [...v3Ctx.scoringActiveQuestionCodes].sort() : [],
    trackedInMerged: formatTracked(
      merged.map((r) => ({
        question_code: r.question_code,
        single_value: r.single_value ?? null,
      }))
    ),
  }
}

/** Simule saveMultiple frontend : E4/E5/E6 → checklists uniquement. */
function simulateFrontendConsolidatedSave(answers: Record<string, string>) {
  const ent = new Set<string>()
  const uc = new Set<string>()
  const usecaseResponsesBatch: Array<{ question_code: string; single_value: string }> = []

  for (const [qid, code] of Object.entries(answers)) {
    const isE4E5E6 = qid.startsWith('E4.') || qid.startsWith('E5.') || qid.startsWith('E6.')
    if (isE4E5E6) {
      if (code.startsWith('E5.')) ent.add(code)
      else if (code.startsWith('E4.') || code.startsWith('E6.')) uc.add(code)
    } else {
      usecaseResponsesBatch.push({ question_code: qid, single_value: code })
    }
  }

  return {
    checklist_gov_enterprise: [...ent],
    checklist_gov_usecase: [...uc],
    usecaseResponsesBatch,
    droppedFromTable: Object.keys(answers).filter(
      (q) => q.startsWith('E4.') || q.startsWith('E5.') || q.startsWith('E6.')
    ),
  }
}

async function cleanupUsecase(admin: SupabaseClient, usecaseId: string) {
  await admin.from('usecase_responses').delete().eq('usecase_id', usecaseId)
  await admin.from('usecase_history').delete().eq('usecase_id', usecaseId)
  await admin.from('dossiers').delete().eq('usecase_id', usecaseId)
  await admin.from('usecases').delete().eq('id', usecaseId)
}

async function main() {
  const url = requireEnv('NEXT_PUBLIC_SUPABASE_URL')
  const serviceKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY')
  const admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const nineNegatives = buildNineTodoNegativeAnswers()
  log('INIT', `9 actions → ${nineNegatives.length} question(s) unique(s) avec code négatif`)
  console.log(
    nineNegatives.map((n) => `${n.docType}: ${n.question_code}=${n.single_value}`).join('\n')
  )

  const { data: company, error: coErr } = await admin
    .from('companies')
    .insert({ name: `REPRO data-drop ${Date.now()}` })
    .select('id')
    .single()
  if (coErr || !company?.id) throw new Error(`company: ${coErr?.message}`)

  const { data: uc, error: ucErr } = await admin
    .from('usecases')
    .insert({
      company_id: company.id,
      name: 'REPRO Data Drop',
      deployment_phase: 'en_projet',
      path_mode: 'long',
      questionnaire_version: QUESTIONNAIRE_VERSION_V3,
      checklist_gov_enterprise: [],
      checklist_gov_usecase: [],
    })
    .select('id')
    .single()
  if (ucErr || !uc?.id) throw new Error(`usecase: ${ucErr?.message}`)

  const usecaseId = uc.id
  log('STEP1', `Usecase créé: ${usecaseId} (company ${company.id})`)

  // ─── Scénario A : insert direct (simule ancienne persistance / seed manuel) ───
  log('STEP2', 'Insertion directe des « Non » dans usecase_responses + fin E7 long')
  const rowsToInsert = [
    ...nineNegatives.map((n) => ({
      usecase_id: usecaseId,
      question_code: n.question_code,
      single_value: n.single_value,
      answered_by: 'repro@maydai.local',
      answered_at: new Date().toISOString(),
    })),
    {
      usecase_id: usecaseId,
      question_code: 'E7.N11.Q1',
      single_value: 'E7.N11.Q1.A',
      answered_by: 'repro@maydai.local',
      answered_at: new Date().toISOString(),
    },
    {
      usecase_id: usecaseId,
      question_code: 'E7.N11.Q2',
      single_value: 'E7.N11.Q2.A',
      answered_by: 'repro@maydai.local',
      answered_at: new Date().toISOString(),
    },
  ]

  const { error: insErr } = await admin.from('usecase_responses').insert(rowsToInsert)
  if (insErr) throw new Error(`insert responses A: ${insErr.message}`)

  let rows = await fetchResponses(admin, usecaseId)
  log('STEP2', `Après insert: ${rows.length} ligne(s), tracked=`, formatTracked(rows))

  log('STEP3', 'Crash test — pipeline calculate-score (sans DELETE sur usecase_responses)')
  const calcA = await runCalculateScorePipeline(admin, usecaseId)
  log('STEP3', 'Résultat calcul', calcA)

  rows = await fetchResponses(admin, usecaseId)
  log('STEP4', `Après calculate-score (scénario A): ${rows.length} ligne(s), tracked=`, formatTracked(rows))

  const aQ12 = rows.some((r) => r.question_code === 'E4.N8.Q12')
  const aQ8 = rows.some((r) => r.question_code === 'E5.N9.Q8')
  log(
    'STEP4',
    `Scénario A — lignes toujours en base: E4.N8.Q12=${aQ12}, E5.N9.Q8=${aQ8} (calculate-score ne supprime pas)`
  )

  // ─── Scénario B : flux frontend V3 actuel (checklists, pas usecase_responses) ───
  const { data: ucB, error: ucBErr } = await admin
    .from('usecases')
    .insert({
      company_id: company.id,
      name: 'REPRO Data Drop — frontend V3',
      deployment_phase: 'en_projet',
      path_mode: 'long',
      questionnaire_version: QUESTIONNAIRE_VERSION_V3,
      checklist_gov_enterprise: [],
      checklist_gov_usecase: [],
    })
    .select('id')
    .single()
  if (ucBErr || !ucB?.id) throw new Error(`usecase B: ${ucBErr?.message}`)

  const usecaseIdB = ucB.id
  log('STEP2-B', `Usecase B: ${usecaseIdB}`)

  const allAnswers: Record<string, string> = {
    ...Object.fromEntries(nineNegatives.map((n) => [n.question_code, n.single_value])),
    'E7.N11.Q1': 'E7.N11.Q1.A',
    'E7.N11.Q2': 'E7.N11.Q2.A',
  }

  const fe = simulateFrontendConsolidatedSave(allAnswers)
  log('STEP2-B', 'Simulation saveMultiple (frontend)', {
    checklist_enterprise_count: fe.checklist_gov_enterprise.length,
    checklist_usecase_count: fe.checklist_gov_usecase.length,
    persisted_in_usecase_responses: fe.usecaseResponsesBatch.map((r) => r.question_code),
    droppedFromTable_count: fe.droppedFromTable.length,
    dropped_sample: fe.droppedFromTable.slice(0, 5),
    tracked_dropped: {
      E4_N8_Q12: fe.droppedFromTable.includes('E4.N8.Q12'),
      E5_N9_Q8: fe.droppedFromTable.includes('E5.N9.Q8'),
    },
  })

  const { error: clErr } = await admin
    .from('usecases')
    .update({
      checklist_gov_enterprise: fe.checklist_gov_enterprise,
      checklist_gov_usecase: fe.checklist_gov_usecase,
    })
    .eq('id', usecaseIdB)
  if (clErr) throw new Error(`checklists B: ${clErr.message}`)

  if (fe.usecaseResponsesBatch.length > 0) {
    const { error: insB } = await admin.from('usecase_responses').insert(
      fe.usecaseResponsesBatch.map((r) => ({
        usecase_id: usecaseIdB,
        question_code: r.question_code,
        single_value: r.single_value,
        answered_by: 'repro@maydai.local',
        answered_at: new Date().toISOString(),
      }))
    )
    if (insB) throw new Error(`insert E7 B: ${insB.message}`)
  }

  rows = await fetchResponses(admin, usecaseIdB)
  log('STEP2-B', `Après save frontend simulé: ${rows.length} ligne(s) en usecase_responses, tracked=`, formatTracked(rows))

  log('STEP2-C', 'syncTodoActionToResponse (training_plan) — doit lire checklist et shouldRecalculate=true')
  const syncTrain = await syncTodoActionToResponse(
    admin,
    usecaseIdB,
    'training_plan',
    'repro@maydai.local'
  )
  log('STEP2-C', 'sync training_plan', syncTrain)

  const syncHuman = await syncTodoActionToResponse(
    admin,
    usecaseIdB,
    'human_oversight',
    'repro@maydai.local'
  )
  log('STEP2-C', 'sync human_oversight', syncHuman)

  rows = await fetchResponses(admin, usecaseIdB)
  log('STEP2-C', `Après sync dossier simulé: tracked=`, formatTracked(rows))

  const calcB = await runCalculateScorePipeline(admin, usecaseIdB)
  log('STEP3-B', 'calculate-score avec checklists hydratées', calcB)

  rows = await fetchResponses(admin, usecaseIdB)
  log('STEP4-B', `Après calculate-score (scénario B): tracked=`, formatTracked(rows))

  const bQ12 = rows.some((r) => r.question_code === 'E4.N8.Q12')
  const bQ8 = rows.some((r) => r.question_code === 'E5.N9.Q8')
  log(
    'STEP4-B',
    `Scénario B — E4.N8.Q12 en table=${bQ12}, E5.N9.Q8 en table=${bQ8} (jamais écrites par le frontend)`
  )

  const { data: ucRow } = await admin
    .from('usecases')
    .select('checklist_gov_enterprise, checklist_gov_usecase')
    .eq('id', usecaseIdB)
    .single()
  const ent = ucRow?.checklist_gov_enterprise ?? []
  const us = ucRow?.checklist_gov_usecase ?? []
  log('STEP4-B', 'Codes négatifs dans checklists (source réelle V3)', {
    E4_N8_Q12_A_in_usecase_checklist: us.includes('E4.N8.Q12.A'),
    E5_N9_Q8_A_in_enterprise_checklist: ent.includes('E5.N9.Q8.A'),
  })

  // ─── Scénario C : API POST /responses rejette E4.N8.Q12 ───
  log('STEP5', 'Post-fix : sync doit recalculer si malus était en checklist (STEP2-C)')

  await cleanupUsecase(admin, usecaseId)
  await cleanupUsecase(admin, usecaseIdB)
  await admin.from('companies').delete().eq('id', company.id)
  log('CLEANUP', 'Données de test supprimées')
}

main().catch((e) => {
  console.error('FATAL', e)
  process.exit(1)
})
