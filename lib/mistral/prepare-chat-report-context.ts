import type { SupabaseClient } from '@supabase/supabase-js'
import {
  mergeShortPathPacksIntoResponses,
  transformToOpenAIFormatComplete,
  type QuestionnaireParcoursMeta,
} from '@/lib/openai-data-transformer'
import { mergeChecklistIntoDbResponseRows } from '@/lib/merge-checklist-into-user-responses'
import { computeSlotStatuses } from '@/lib/slot-statuses'
import {
  QUESTIONNAIRE_VERSION_V2,
  QUESTIONNAIRE_VERSION_V3,
  normalizeQuestionnaireVersion,
} from '@/lib/questionnaire-version'
import {
  isRiskLevelCode,
  riskLevelCodeToReportLabel,
  type RiskLevelCode,
} from '@/lib/risk-level'

const USECASE_REPORT_SELECT = `
  id, name, description, deployment_date, status, risk_level, ai_category,
  system_type, responsible_service, deployment_countries, company_status,
  technology_partner, llm_model_version, primary_model_id,
  score_base, score_model, score_final, is_eliminated, elimination_reason,
  questionnaire_version, bpgv_variant, active_question_codes, ors_exit, classification_status,
  checklist_gov_enterprise, checklist_gov_usecase,
  block_e5_governance, block_e6_transparence,
  companies(name, industry, city, country)
`

export type PreparedChatReportContext = {
  usecaseId: string
  usecaseName: string
  authoritativeRiskCode: RiskLevelCode
  riskLevelLabelFr: string
  isUnacceptable: boolean
  userMessage: string
}

function asCompany(
  raw: unknown
): { name?: string; industry?: string; city?: string; country?: string } | null {
  if (!raw || typeof raw !== 'object') return null
  if (Array.isArray(raw)) {
    const first = raw[0]
    return first && typeof first === 'object'
      ? (first as { name?: string; industry?: string; city?: string; country?: string })
      : null
  }
  return raw as { name?: string; industry?: string; city?: string; country?: string }
}

export function buildChatReportUserMessage(input: {
  companyName: string
  companyIndustry: string
  companyCity: string
  companyCountry: string
  riskLevelLabelFr: string
  riskLevelCode: RiskLevelCode
  transformedData: unknown
}): string {
  return `Génère le rapport de conformité AI Act au format JSON strict.

CONTEXTE ENTREPRISE
- Nom : ${input.companyName}
- Secteur : ${input.companyIndustry || 'Non spécifié'}
- Localisation : ${input.companyCity || 'Non spécifié'}, ${input.companyCountry || 'Non spécifié'}

NIVEAU DE RISQUE AUTORITATIF (calculé par l’application, ne pas recalculer ni modifier)
- Code : ${input.riskLevelCode}
- evaluation_risque.niveau : "${input.riskLevelLabelFr}"

RÉPONSES DU RUN, SCORES ET FAITS STRUCTURÉS (source de vérité) :
${JSON.stringify(input.transformedData)}

Réponds uniquement par un objet JSON conforme au schéma demandé (9 actions standard, ou interdit_1..3 si le cas est interdit).`
}

/**
 * Recharge le cas d’usage après le scoring et prépare le contexte LLM.
 */
export async function prepareChatReportContext(
  supabase: SupabaseClient,
  usecaseId: string,
  authoritativeRiskCode: RiskLevelCode
): Promise<PreparedChatReportContext> {
  const { data: usecase, error: usecaseError } = await supabase
    .from('usecases')
    .select(USECASE_REPORT_SELECT)
    .eq('id', usecaseId)
    .single()

  if (usecaseError || !usecase) {
    throw new Error('Cas d’usage introuvable après le calcul du score')
  }

  const { data: responses, error: responseError } = await supabase
    .from('usecase_responses')
    .select(
      'question_code, single_value, multiple_codes, multiple_labels, conditional_main, conditional_keys, conditional_values, answered_by'
    )
    .eq('usecase_id', usecaseId)

  if (responseError) {
    throw new Error('Impossible de récupérer les réponses du parcours')
  }

  const unifiedResponses = mergeChecklistIntoDbResponseRows(
    responses ?? [],
    (usecase as { checklist_gov_enterprise?: string[] | null }).checklist_gov_enterprise ?? null,
    (usecase as { checklist_gov_usecase?: string[] | null }).checklist_gov_usecase ?? null
  )

  const company = asCompany(usecase.companies)
  const companyName = company?.name || 'MaydAI'
  const companyIndustry = company?.industry || ''
  const companyCity = company?.city || ''
  const companyCountry = company?.country || ''

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

  const respondentEmail = responses?.[0]?.answered_by || 'Non disponible'
  const questionnaireVersion = normalizeQuestionnaireVersion(
    (usecase as { questionnaire_version?: number | null }).questionnaire_version
  )

  const activeCodesRaw = (usecase as { active_question_codes?: unknown }).active_question_codes
  const activeQuestionCodes = Array.isArray(activeCodesRaw)
    ? activeCodesRaw.filter((code): code is string => typeof code === 'string')
    : []

  const persistedQuestionCodes = new Set(
    (responses ?? [])
      .map((row) => row.question_code)
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

  const usecaseWithAuthoritativeRisk = {
    ...usecase,
    risk_level: authoritativeRiskCode,
  }

  const transformedData = transformToOpenAIFormatComplete(
    usecaseWithAuthoritativeRisk as never,
    company as never,
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
    throw new Error('Données insuffisantes pour générer le rapport')
  }

  const riskLevelLabelFr = isRiskLevelCode(authoritativeRiskCode)
    ? riskLevelCodeToReportLabel(authoritativeRiskCode)
    : riskLevelCodeToReportLabel('minimal')

  return {
    usecaseId,
    usecaseName: typeof usecase.name === 'string' ? usecase.name : '',
    authoritativeRiskCode,
    riskLevelLabelFr,
    isUnacceptable: authoritativeRiskCode === 'unacceptable',
    userMessage: buildChatReportUserMessage({
      companyName,
      companyIndustry,
      companyCity,
      companyCountry,
      riskLevelLabelFr,
      riskLevelCode: authoritativeRiskCode,
      transformedData,
    }),
  }
}
