#!/usr/bin/env npx tsx

/**
 * Test backend pur de la génération de rapport AI Act (sans frontend ni JWT).
 *
 * Usage:
 *   npx tsx scripts/force-test-report.ts
 */

import * as dotenv from 'dotenv'
import * as path from 'path'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import {
  mergeShortPathPacksIntoResponses,
  transformToOpenAIFormatComplete,
} from '../lib/openai-data-transformer'
import type { QuestionnaireParcoursMeta } from '../lib/openai-data-transformer'
import { mergeChecklistIntoDbResponseRows } from '../lib/merge-checklist-into-user-responses'
import { deriveRiskLevelFromResponses, type RiskLevelCode } from '../lib/risk-level'
import { dbResponsesToQuestionnaireAnswers } from '../lib/scoring-v2-server'
import { resolveQualificationOutcomeV3 } from '../lib/qualification-v3-decision'
import { computeSlotStatuses } from '../lib/slot-statuses'
import {
  QUESTIONNAIRE_VERSION_V2,
  QUESTIONNAIRE_VERSION_V3,
  normalizeQuestionnaireVersion,
} from '../lib/questionnaire-version'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const USECASE_ID = '202aaee3-da39-4f18-baea-1d6fa8d3c9c4'

const USECASE_SELECT = `
  id, name, description, deployment_date, status, risk_level, ai_category,
  system_type, responsible_service, deployment_countries, company_status,
  technology_partner, llm_model_version, primary_model_id,
  score_base, score_model, score_final, is_eliminated, elimination_reason,
  questionnaire_version, bpgv_variant, active_question_codes, ors_exit, classification_status,
  checklist_gov_enterprise, checklist_gov_usecase,
  block_e5_governance, block_e6_transparence,
  companies(name, industry, city, country)
`

const RESPONSES_SELECT =
  'question_code, single_value, multiple_codes, multiple_labels, conditional_main, conditional_keys, conditional_values, answered_by'

async function generateAnalysisWithRetry(
  transformedData: Awaited<ReturnType<typeof transformToOpenAIFormatComplete>>,
  usecaseId: string,
  openAIClient: { generateComplianceAnalysisComplete: (data: typeof transformedData) => Promise<string> },
  maxRetries = 3
): Promise<string> {
  let lastError: Error | null = null
  const timeoutMs = 60_000

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error(`Timeout après ${timeoutMs}ms`)), timeoutMs)
      })

      const analysisPromise = openAIClient.generateComplianceAnalysisComplete(transformedData)
      return await Promise.race([analysisPromise, timeoutPromise])
    } catch (error) {
      lastError = error as Error
      const errorMessage = error instanceof Error ? error.message : String(error)
      console.error(`[force-test-report] Tentative ${attempt}/${maxRetries} échouée (${usecaseId}): ${errorMessage}`)

      if (attempt === maxRetries) {
        throw new Error(`Échec de génération après ${maxRetries} tentatives: ${errorMessage}`)
      }

      const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10_000)
      await new Promise((resolve) => setTimeout(resolve, delay))
    }
  }

  throw lastError ?? new Error('Erreur inconnue lors de la génération du rapport')
}

function createServiceSupabaseClient(): SupabaseClient {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('❌ Variables d\'environnement manquantes')
    console.error('   NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✓' : '✗')
    console.error('   SUPABASE_SERVICE_ROLE_KEY:', serviceRoleKey ? '✓' : '✗')
    process.exit(1)
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

async function main(): Promise<void> {
  console.log('🧪 Force test — génération rapport AI Act (backend pur)')
  console.log('='.repeat(60))
  console.log(`📋 Usecase ID: ${USECASE_ID}\n`)

  const supabase = createServiceSupabaseClient()

  // --- 1. Récupérer le usecase (même select que generate-report/route.ts) ---
  console.log('1️⃣  Récupération du cas d\'usage...')
  const { data: usecase, error: usecaseError } = await supabase
    .from('usecases')
    .select(USECASE_SELECT)
    .eq('id', USECASE_ID)
    .single()

  if (usecaseError || !usecase) {
    console.error('❌ Usecase introuvable:', usecaseError?.message ?? 'aucune ligne')
    process.exit(1)
  }

  console.log(`✅ ${usecase.name}`)

  const questionnaireVersion = normalizeQuestionnaireVersion(
    (usecase as { questionnaire_version?: number | null }).questionnaire_version
  )

  if (
    (questionnaireVersion === QUESTIONNAIRE_VERSION_V2 ||
      questionnaireVersion === QUESTIONNAIRE_VERSION_V3) &&
    String(usecase.status || '').toLowerCase() === 'completed' &&
    usecase.score_final == null
  ) {
    console.error(
      '❌ Cas V2/V3 marqué complété sans score final : recalcul ou complétion requise avant génération.'
    )
    process.exit(1)
  }

  // --- 2. Récupérer les réponses ---
  console.log('\n2️⃣  Récupération des réponses questionnaire...')
  const { data: responses, error: responseError } = await supabase
    .from('usecase_responses')
    .select(RESPONSES_SELECT)
    .eq('usecase_id', USECASE_ID)

  if (responseError) {
    console.error('❌ Échec récupération réponses:', responseError.message)
    process.exit(1)
  }

  console.log(`✅ ${responses?.length ?? 0} réponse(s)`)

  // --- 3. Fusion checklists (Early Stage Hydration) ---
  console.log('\n3️⃣  Fusion checklists E4/E5/E6...')
  const unifiedResponses = mergeChecklistIntoDbResponseRows(
    responses ?? [],
    (usecase as { checklist_gov_enterprise?: string[] | null }).checklist_gov_enterprise ?? null,
    (usecase as { checklist_gov_usecase?: string[] | null }).checklist_gov_usecase ?? null
  )
  console.log(`✅ ${unifiedResponses.length} réponse(s) unifiée(s)`)

  // --- 4. Recalcul du risk level autoritatif (sans persistance DB) ---
  console.log('\n4️⃣  Calcul du niveau de risque autoritatif...')
  let authoritativeRiskCode: RiskLevelCode | null

  if (questionnaireVersion === QUESTIONNAIRE_VERSION_V3) {
    const answers = dbResponsesToQuestionnaireAnswers(unifiedResponses)
    const v3Out = resolveQualificationOutcomeV3(
      answers,
      (usecase as { system_type?: string | null }).system_type
    )

    if (v3Out.classification_status === 'impossible') {
      console.error(
        '❌ Classification réglementaire impossible (pivots « Je ne sais pas »). Corrigez le questionnaire.'
      )
      process.exit(1)
    }

    authoritativeRiskCode = v3Out.risk_level ?? 'minimal'
  } else {
    authoritativeRiskCode = deriveRiskLevelFromResponses(unifiedResponses)
  }

  console.log(`✅ risk_level autoritatif: ${authoritativeRiskCode}`)

  const usecaseWithAuthoritativeRisk = {
    ...usecase,
    risk_level: authoritativeRiskCode,
  }

  // --- 5. Entreprise, modèle, répondant ---
  const company = Array.isArray(usecase.companies) ? usecase.companies[0] : usecase.companies
  const respondentEmail = responses?.[0]?.answered_by || 'Non disponible'

  let model: {
    id: string
    model_name: string
    model_provider: string
    model_type: string
    version: string
  } | null = null

  if (usecase.primary_model_id) {
    const { data: modelData } = await supabase
      .from('compl_ai_models')
      .select('id, model_name, model_provider, model_type, version')
      .eq('id', usecase.primary_model_id)
      .single()
    model = modelData
  }

  console.log(`   Entreprise: ${company?.name ?? 'N/A'}`)
  console.log(`   Modèle: ${model?.model_name ?? 'N/A'}`)

  // --- 6. Slot statuses + parcours questionnaire ---
  const activeCodesRaw = (usecase as { active_question_codes?: unknown }).active_question_codes
  const activeQuestionCodes = Array.isArray(activeCodesRaw)
    ? activeCodesRaw.filter((c): c is string => typeof c === 'string')
    : []

  const persistedQuestionCodes = new Set(
    (responses ?? [])
      .map((r) => r.question_code)
      .filter((code): code is string => typeof code === 'string' && code.length > 0)
  )

  const slotReadyResponses = mergeShortPathPacksIntoResponses(unifiedResponses)

  const slotStatuses = computeSlotStatuses(slotReadyResponses, {
    questionnaireVersion,
    activeQuestionCodes,
    persistedQuestionCodes,
  })

  const questionnaireParcours: QuestionnaireParcoursMeta | null =
    questionnaireVersion === QUESTIONNAIRE_VERSION_V2 ||
    questionnaireVersion === QUESTIONNAIRE_VERSION_V3
      ? {
          questionnaire_version: questionnaireVersion,
          bpgv_variant: (usecase as { bpgv_variant?: string | null }).bpgv_variant ?? null,
          ors_exit: (usecase as { ors_exit?: string | null }).ors_exit ?? null,
          active_question_codes: activeQuestionCodes,
          persisted_question_codes: [...persistedQuestionCodes],
        }
      : null

  // --- 7. Transformation OpenAI ---
  console.log('\n5️⃣  Transformation transformToOpenAIFormatComplete...')
  const transformedData = transformToOpenAIFormatComplete(
    usecaseWithAuthoritativeRisk as Parameters<typeof transformToOpenAIFormatComplete>[0],
    company,
    model,
    slotReadyResponses,
    respondentEmail,
    questionnaireParcours
  )

  transformedData.slot_statuses = slotStatuses
  if (questionnaireParcours) {
    transformedData.questionnaire_parcours = questionnaireParcours
  }

  if (!transformedData.usecase_context_fields?.cas_usage?.id) {
    console.error('❌ Données insuffisantes pour l\'analyse OpenAI (usecase_context_fields invalide)')
    process.exit(1)
  }

  console.log('✅ Payload OpenAI prêt')
  console.log(`   Questions questionnaire: ${Object.keys(transformedData.questionnaire_questions ?? {}).length}`)

  // --- 8. Génération OpenAI (import dynamique après dotenv) ---
  console.log('\n6️⃣  Appel OpenAI Assistant (generateComplianceAnalysisComplete)...')
  console.log('⏳ Génération en cours (peut prendre 30–90 s)...\n')

  const { openAIClient } = await import('../lib/openai-client')
  const startTime = Date.now()
  const analysis = await generateAnalysisWithRetry(transformedData, USECASE_ID, openAIClient)
  const processingTime = Date.now() - startTime

  console.log(`\n✅ Rapport généré en ${processingTime} ms (${analysis.length} caractères)\n`)
  console.log('='.repeat(60))
  console.log('RAPPORT BRUT GÉNÉRÉ PAR L\'IA')
  console.log('='.repeat(60))
  console.log(analysis)
  console.log('='.repeat(60))
}

main().catch((error) => {
  console.error('\n❌ Erreur fatale:', error instanceof Error ? error.message : error)
  process.exit(1)
})
