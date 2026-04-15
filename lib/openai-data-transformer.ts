import { QUESTIONS_DATA } from './questions-data'
import {
  CLASSIFICATION_IMPOSSIBLE_EVALUATION_NIVEAU,
  isRiskLevelCode,
  normalizeToRiskLevelCode,
  riskLevelCodeToReportLabel,
  type RiskLevelCode,
} from '@/lib/risk-level'
import type { SlotStatusMap } from '@/lib/slot-statuses'
import { QUESTIONNAIRE_VERSION_V2, QUESTIONNAIRE_VERSION_V3 } from '@/lib/questionnaire-version'
import { formatReportGroundingForPrompt } from '@/lib/report-llm-grounding'
import type { UseCaseChecklistResponseFields } from '@/types/questions'

function normalizeChecklistStrings(v: unknown): string[] {
  if (!Array.isArray(v)) return []
  return v.filter((x): x is string => typeof x === 'string' && x.length > 0)
}

/** Lignes texte pour le prompt LLM (entreprise + cas d’usage), à partir des colonnes `checklist_gov_*`. */
export function formatGovernanceChecklistLines(
  enterprise?: unknown,
  usecaseGov?: unknown
): { checklist_gouvernance_entreprise: string; checklist_gouvernance_cas_usage: string } {
  const checklistEnterprise = normalizeChecklistStrings(enterprise)
  const checklistUsecaseGov = normalizeChecklistStrings(usecaseGov)
  return {
    checklist_gouvernance_entreprise:
      checklistEnterprise.length > 0
        ? `Critères de gouvernance entreprise validés : ${checklistEnterprise.join(', ')}`
        : 'Critères de gouvernance entreprise validés : (aucun)',
    checklist_gouvernance_cas_usage:
      checklistUsecaseGov.length > 0
        ? `Critères de gouvernance cas d'usage validés : ${checklistUsecaseGov.join(', ')}`
        : `Critères de gouvernance cas d'usage validés : (aucun)`,
  }
}

/** Métadonnées parcours V2 transmises au LLM (source serveur). */
export interface QuestionnaireParcoursMeta {
  questionnaire_version: number
  bpgv_variant: string | null
  ors_exit: string | null
  active_question_codes: string[]
}

interface UseCaseResponse extends UseCaseChecklistResponseFields {
  question_code: string
  single_value?: string
  multiple_codes?: string[]
  multiple_labels?: string[]
  conditional_main?: string
  conditional_keys?: string[]
  conditional_values?: string[]
}

interface OpenAIAnalysisInput {
  usecase_id: string
  usecase_name: string
  company_name: string
  company_industry?: string
  company_city?: string
  company_country?: string
  /** Présents si les colonnes `checklist_gov_*` ont été fournies au transform (ex. régénération rapport). */
  checklist_gouvernance_entreprise?: string
  checklist_gouvernance_cas_usage?: string
  responses: {
    E4_N7_Q2: {
      question: string
      selected_options: string[]
      selected_labels: string[]
    }
  }
}

/**
 * Transforme les données de la base de données vers le format JSON attendu par OpenAI
 */
export function transformToOpenAIFormat(
  usecaseId: string, 
  usecaseName: string, 
  companyName: string,
  responses: UseCaseResponse[],
  companyIndustry?: string,
  companyCity?: string,
  companyCountry?: string,
  checklistGovEnterprise?: unknown,
  checklistGovUsecase?: unknown
): OpenAIAnalysisInput {
  const result: OpenAIAnalysisInput = {
    usecase_id: usecaseId,
    usecase_name: usecaseName,
    company_name: companyName,
    company_industry: companyIndustry,
    company_city: companyCity,
    company_country: companyCountry,
    responses: {
      E4_N7_Q2: {
        question: getQuestionText('E4.N7.Q2'),
        selected_options: [],
        selected_labels: []
      },
    }
  }

  if (checklistGovEnterprise !== undefined || checklistGovUsecase !== undefined) {
    const lines = formatGovernanceChecklistLines(checklistGovEnterprise, checklistGovUsecase)
    result.checklist_gouvernance_entreprise = lines.checklist_gouvernance_entreprise
    result.checklist_gouvernance_cas_usage = lines.checklist_gouvernance_cas_usage
  }

  // Traiter chaque réponse
  responses.forEach(response => {
    if (response.question_code === 'E4.N7.Q2') {
      // Question checkbox
      if (response.multiple_codes && response.multiple_codes.length > 0) {
        result.responses.E4_N7_Q2.selected_options = response.multiple_codes
        const providedLabels = response.multiple_labels
        result.responses.E4_N7_Q2.selected_labels =
          Array.isArray(providedLabels) && providedLabels.length > 0
            ? providedLabels
            : response.multiple_codes.map((code: string) => getOptionLabel('E4.N7.Q2', code))
      }
    }
  })

  return result
}

/**
 * Récupère le texte d'une question
 */
function getQuestionText(questionCode: string): string {
  const question = QUESTIONS_DATA[questionCode as keyof typeof QUESTIONS_DATA]
  return question?.question || questionCode
}

/**
 * Récupère le label d'une option à partir de son code
 */
function getOptionLabel(questionCode: string, optionCode: string): string {
  const question = QUESTIONS_DATA[questionCode as keyof typeof QUESTIONS_DATA]
  if (!question) return optionCode

  const option = question.options.find((opt: any) => opt.code === optionCode)
  return option?.label || optionCode
}

/** Réponses ciblées pour l’ancien flux d’analyse ciblé (Annexe III). */
export function extractTargetResponses(responses: UseCaseResponse[]): UseCaseResponse[] {
  return responses.filter(response => response.question_code === 'E4.N7.Q2')
}

// /**
//  * Valide que les données transformées sont complètes pour l'analyse OpenAI
//  */
export function validateOpenAIInput(data: OpenAIAnalysisInput): { isValid: boolean; errors: string[] } {
  const errors: string[] = []

  if (!data.usecase_id) {
    errors.push('usecase_id is required')
  }

  if (!data.usecase_name) {
    errors.push('usecase_name is required')
  }

  return {
    isValid: errors.length === 0,
    errors
  }
}

// ===== NOUVELLE FONCTION DE TRANSFORMATION COMPLÈTE =====

/** @deprecated utiliser `CLASSIFICATION_IMPOSSIBLE_EVALUATION_NIVEAU` depuis `@/lib/risk-level` */
export const CLASSIFICATION_IMPOSSIBLE_RISK_LABEL_FR = CLASSIFICATION_IMPOSSIBLE_EVALUATION_NIVEAU

interface UseCaseComplete {
  id: string
  name: string
  description?: string
  deployment_date?: string
  status: string
  risk_level?: string
  ai_category?: string
  system_type?: string
  responsible_service?: string
  deployment_countries?: string[]
  company_status?: string
  technology_partner?: string
  llm_model_version?: string
  primary_model_id?: string
  checklist_gov_enterprise?: string[]
  checklist_gov_usecase?: string[]
  score_base?: number
  score_model?: number | null
  score_final?: number | null
  is_eliminated?: boolean
  elimination_reason?: string
  classification_status?: string | null
  companies?: {
    name: string
    industry: string
    city: string
    country: string
  } | {
    name: string
    industry: string
    city: string
    country: string
  }[]
  compl_ai_models?: {
    id: string
    model_name: string
    model_provider: string
    model_type?: string
    version?: string
  } | {
    id: string
    model_name: string
    model_provider: string
    model_type?: string
    version?: string
  }[]
}

interface Company {
  name: string
  industry: string
  city: string
  country: string
}

interface Model {
  id: string
  model_name: string
  model_provider: string
  model_type?: string
  version?: string
}

interface UseCaseResponseComplete extends UseCaseResponse {
  answered_by?: string
}

interface OpenAIAnalysisInputComplete {
  questionnaire_questions: Record<string, any>
  usecase_context_fields: {
    entreprise: {
      name: string
      industry: string
      city: string
      country: string
      company_status: string
    }
    cas_usage: {
      id: string
      name: string
      description: string
      deployment_date: string
      status: string
      /** Libellé affiché / prompt : palier AI Act ou texte d’état « impossible » */
      risk_level: string
      /** Code interne : minimal | limited | high | unacceptable — null si qualification impossible */
      risk_level_code: RiskLevelCode | null
      /** Identique à risk_level — champ explicite pour le prompt */
      risk_level_label_fr: string
      ai_category: string
      system_type: string
      responsible_service: string
      deployment_countries: string[]
      /** V3 : qualified | impossible */
      classification_status?: string | null
      /** Listes persistées sur le use case (JSONB) — texte prêt pour le prompt. */
      checklist_gouvernance_entreprise: string
      checklist_gouvernance_cas_usage: string
    }
    technologie: {
      technology_partner: string
      llm_model_version: string
      primary_model_id: string
      model_name: string
      model_provider: string
      model_type: string
    }
    repondant: {
      profile: string
      situation: string
    }
    scores: {
      score_base: number
      score_model: number | null
      score_final: number | null
      is_eliminated: boolean
      elimination_reason: string
    }
  }
  risk_categories: Record<string, string>
  priority_levels: Record<string, string>
  status_levels: Record<string, string>
  slot_statuses?: SlotStatusMap
  questionnaire_parcours?: QuestionnaireParcoursMeta
  /** Résumé structuré des faits cochés pour ancrage LLM (Lot A) */
  report_grounding_block?: string
}

/**
 * Transforme les données complètes vers le format JSON enrichi pour OpenAI
 */
export function transformToOpenAIFormatComplete(
  usecase: UseCaseComplete,
  company: Company | null,
  model: Model | null,
  responses: UseCaseResponseComplete[],
  respondentEmail: string,
  questionnaireParcours?: QuestionnaireParcoursMeta | null
): OpenAIAnalysisInputComplete {
  const activeParcoursSet =
    (questionnaireParcours?.questionnaire_version === QUESTIONNAIRE_VERSION_V2 ||
      questionnaireParcours?.questionnaire_version === QUESTIONNAIRE_VERSION_V3) &&
    questionnaireParcours.active_question_codes.length > 0
      ? new Set(questionnaireParcours.active_question_codes)
      : null

  const { checklist_gouvernance_entreprise: lineEntreprise, checklist_gouvernance_cas_usage: lineCasUsage } =
    formatGovernanceChecklistLines(usecase.checklist_gov_enterprise, usecase.checklist_gov_usecase)

  // Construire le questionnaire avec toutes les questions et réponses
  const questionnaireQuestions = buildQuestionnaireQuestions(responses, activeParcoursSet)

  const classificationImpossible = usecase.classification_status === 'impossible'

  let riskLevelCode: RiskLevelCode | null
  let riskLevelLabelFr: string

  if (classificationImpossible) {
    riskLevelCode = null
    riskLevelLabelFr = CLASSIFICATION_IMPOSSIBLE_EVALUATION_NIVEAU
  } else {
    const rawRisk = usecase.risk_level
    riskLevelCode =
      rawRisk && isRiskLevelCode(rawRisk)
        ? rawRisk
        : normalizeToRiskLevelCode(rawRisk || '') ?? 'minimal'
    riskLevelLabelFr = riskLevelCodeToReportLabel(riskLevelCode)
  }

  // Construire les champs de contexte
  const usecaseContextFields = {
    entreprise: {
      name: company?.name || 'Non spécifié',
      industry: company?.industry || 'Non spécifié',
      city: company?.city || 'Non spécifié',
      country: company?.country || 'Non spécifié',
      company_status: usecase.company_status || 'unknown'
    },
    cas_usage: {
      id: usecase.id,
      name: usecase.name,
      description: usecase.description || 'Non spécifié',
      deployment_date: usecase.deployment_date || 'Non spécifié',
      status: usecase.status,
      risk_level: riskLevelLabelFr,
      risk_level_code: riskLevelCode,
      risk_level_label_fr: riskLevelLabelFr,
      ai_category: usecase.ai_category || 'Non spécifié',
      system_type: usecase.system_type || 'Non spécifié',
      responsible_service: usecase.responsible_service || 'Non spécifié',
      deployment_countries: usecase.deployment_countries || [],
      classification_status: usecase.classification_status ?? null,
      checklist_gouvernance_entreprise: lineEntreprise,
      checklist_gouvernance_cas_usage: lineCasUsage,
    },
    technologie: {
      technology_partner: usecase.technology_partner || 'Non spécifié',
      llm_model_version: usecase.llm_model_version || 'Non spécifié',
      primary_model_id: usecase.primary_model_id || 'Non spécifié',
      model_name: model?.model_name || 'Non spécifié',
      model_provider: model?.model_provider || 'Non spécifié',
      model_type: model?.model_type || 'Non spécifié'
    },
    repondant: {
      profile: determineRespondentProfile(respondentEmail),
      situation: determineRespondentSituation(respondentEmail)
    },
    scores: {
      score_base: usecase.score_base || 0,
      score_model: usecase.score_model || null,
      score_final: usecase.score_final || null,
      is_eliminated: usecase.is_eliminated || false,
      elimination_reason: usecase.elimination_reason || ''
    }
  }

  const report_grounding_block = formatReportGroundingForPrompt({
    responses,
    riskLevelCode,
    classificationImpossible,
    questionnaireParcours: questionnaireParcours ?? null,
    checklist_gov_enterprise: normalizeChecklistStrings(usecase.checklist_gov_enterprise),
    checklist_gov_usecase: normalizeChecklistStrings(usecase.checklist_gov_usecase),
  })

  const base: OpenAIAnalysisInputComplete = {
    questionnaire_questions: questionnaireQuestions,
    usecase_context_fields: usecaseContextFields,
    report_grounding_block,
    risk_categories: {
      "Acteurs IA": "Définit le rôle de l'entreprise dans l'écosystème IA",
      "Niveau de risque": "Détermine le niveau de risque global du système",
      "Technical Robustness and Safety": "Robustesse technique et sécurité",
      "Diversity, Non-discrimination & Fairness": "Diversité, non-discrimination et équité",
      "Social & Environmental Well-being": "Bien-être social et environnemental",
      "Human Agency & Oversight": "Agence humaine et supervision",
      "Transparency": "Transparence",
      "Privacy & Data Governance": "Confidentialité et gouvernance des données"
    },
    priority_levels: {
      "1": "Critique - Actions immédiates requises",
      "2": "Important - Actions à court terme",
      "3": "Modéré - Actions à moyen terme",
      "4": "Standard - Actions de routine",
      "5": "Informatif - Actions optionnelles"
    },
    status_levels: {
      "minimal": "Risque minimal - Aucune obligation supplémentaire",
      "limited": "Risque limité - Obligations de transparence",
      "high": "Risque élevé - Obligations complètes de conformité",
      "unacceptable": "Interdit - Interdiction d'utilisation"
    }
  }

  if (questionnaireParcours) {
    return { ...base, questionnaire_parcours: questionnaireParcours }
  }
  return base
}

/**
 * Construit le questionnaire complet avec toutes les questions et réponses
 */
function buildQuestionnaireQuestions(
  responses: UseCaseResponseComplete[],
  activeParcoursCodes: Set<string> | null
): Record<string, any> {
  const questionnaireQuestions: Record<string, any> = {}
  
  // Créer un map des réponses pour un accès rapide
  const responsesMap = new Map<string, UseCaseResponseComplete>()
  responses.forEach(response => {
    responsesMap.set(response.question_code, response)
  })
  
  // Parcourir toutes les questions définies dans QUESTIONS_DATA
  Object.entries(QUESTIONS_DATA).forEach(([questionCode, questionData]) => {
    const response = responsesMap.get(questionCode)
    const horsParcoursV2 =
      activeParcoursCodes !== null && !activeParcoursCodes.has(questionCode)

    // Construire la structure de la question avec métadonnées
    const questionStructure = {
      code: questionData.id,
      question_text: questionData.question,
      type: questionData.type,
      status: determineQuestionStatus(questionData),
      possible_answers: questionData.options.map((opt: any) => opt.label),
      interpretation: generateInterpretation(questionData),
      quick_wins: generateQuickWins(questionData),
      priority: determinePriority(questionData),
      article_concerne: determineArticleConcerne(questionData),
      risk_category: determineRiskCategory(questionData),
      impact_conformite: generateImpactConformite(questionData),
      hors_parcours_questionnaire_v2: horsParcoursV2,
      user_response:
        horsParcoursV2 ? null : response ? buildUserResponse(response, questionData) : null
    }
    
    questionnaireQuestions[questionCode] = questionStructure
  })
  
  return questionnaireQuestions
}

/**
 * Construit la réponse de l'utilisateur pour une question
 */
function buildUserResponse(response: UseCaseResponseComplete, _questionData: any): any {
  const userResponse: any = {
    answered: true,
    question_code: response.question_code
  }

  if (response.single_value) {
    userResponse.single_value = response.single_value
    userResponse.single_label = getOptionLabel(response.question_code, response.single_value)
  }

  if (response.multiple_codes && response.multiple_codes.length > 0) {
    userResponse.multiple_codes = response.multiple_codes
    userResponse.multiple_labels = response.multiple_labels ||
      response.multiple_codes.map((code: string) => getOptionLabel(response.question_code, code))
  }

  if (response.conditional_main) {
    userResponse.conditional_main = response.conditional_main
    userResponse.conditional_label = getOptionLabel(response.question_code, response.conditional_main)

    if (response.conditional_keys && response.conditional_values) {
      userResponse.conditional_data = {}
      response.conditional_keys.forEach((key, index) => {
        const value = response.conditional_values?.[index] || ''
        if (value) {
          userResponse.conditional_data[key] = value
        }
      })
    }
  }

  return userResponse
}

/**
 * Détermine le statut d'une question basé sur ses options
 */
function determineQuestionStatus(questionData: any): string {
  // Logique pour déterminer le statut basé sur les options et impacts
  if (questionData.options.some((opt: any) => opt.is_eliminatory)) {
    return 'unacceptable'
  }
  
  const hasHighRiskImpact = questionData.options.some((opt: any) => 
    opt.score_impact && opt.score_impact <= -30
  )
  
  if (hasHighRiskImpact) {
    return 'high'
  }
  
  const hasLimitedImpact = questionData.options.some((opt: any) => 
    opt.score_impact && opt.score_impact < 0 && opt.score_impact > -30
  )
  
  if (hasLimitedImpact) {
    return 'limited'
  }
  
  return 'minimal'
}

/**
 * Génère l'interprétation d'une question
 */
function generateInterpretation(questionData: any): string {
  // Logique pour générer l'interprétation basée sur le type de question
  const interpretations: Record<string, string> = {
    'E4.N7.Q1': "Détermine le statut de l'entreprise dans la chaîne de valeur IA (fabricant vs utilisateur)",
    'E4.N7.Q2': "Identifie les domaines à haut risque selon l'annexe III de l'AI Act",
    'E4.N7.Q3': "Identifie les finalités interdites par l'AI Act",
  }
  
  return interpretations[questionData.id] || "Question d'évaluation de conformité IA Act"
}

/**
 * Génère les quick wins pour une question
 */
function generateQuickWins(questionData: any): string[] {
  const quickWinsMap: Record<string, string[]> = {
    'E4.N7.Q1': ["Identifier clairement le rôle dans la chaîne de valeur", "Documenter les responsabilités légales selon le statut"],
    'E4.N7.Q2': ["Cartographier les domaines d'application", "Vérifier les obligations par domaine", "Mettre en place une surveillance renforcée"],
    'E4.N7.Q3': ["ARRÊT IMMÉDIAT du développement", "Révision de la finalité", "Consultation juridique urgente"],
  }
  
  return quickWinsMap[questionData.id] || ["Évaluer la conformité", "Mettre à jour la documentation"]
}

/**
 * Détermine la priorité d'une question
 */
function determinePriority(questionData: any): number {
  if (questionData.options.some((opt: any) => opt.is_eliminatory)) {
    return 1
  }
  
  const hasHighRiskImpact = questionData.options.some((opt: any) => 
    opt.score_impact && opt.score_impact <= -30
  )
  
  if (hasHighRiskImpact) {
    return 2
  }
  
  const hasLimitedImpact = questionData.options.some((opt: any) => 
    opt.score_impact && opt.score_impact < 0
  )
  
  if (hasLimitedImpact) {
    return 3
  }
  
  return 4
}

/**
 * Détermine l'article concerné
 */
function determineArticleConcerne(questionData: any): string {
  const articleMap: Record<string, string> = {
    'E4.N7.Q1': "Article 3 (définitions Acteur AI)",
    'E4.N7.Q2': "Article 6 (Interdiction de certaines pratiques d'IA), Articles 8 à 13 (Exigences pour les systèmes d'IA à haut risque), Annexe III",
    'E4.N7.Q3': "Article 5 (Pratiques d'IA interdites)",
  }
  
  return articleMap[questionData.id] || "AI Act - Conformité générale"
}

/**
 * Détermine la catégorie de risque
 */
function determineRiskCategory(questionData: any): string {
  const categoryMap: Record<string, string> = {
    'E4.N7.Q1': "Acteurs IA",
    'E4.N7.Q2': "Niveau de risque",
    'E4.N7.Q3': "Niveau de risque",
  }
  
  return categoryMap[questionData.id] || "Conformité générale"
}

/**
 * Génère l'impact sur la conformité
 */
function generateImpactConformite(questionData: any): string {
  const impactMap: Record<string, string> = {
    'E4.N7.Q1': "En fonction de la catégorie d'acteur l'application des règles et obligations spécifiques",
    'E4.N7.Q2': "Une réponse 'Oui' déclenche la nécessité d'évaluer la conformité avec les exigences relatives aux systèmes d'IA à haut risque",
    'E4.N7.Q3': "Une réponse 'Oui' indique que le système relève de la catégorie de risque interdit",
  }
  
  return impactMap[questionData.id] || "Impact sur la conformité générale"
}

/**
 * Détermine le profil du répondant
 */
function determineRespondentProfile(email: string): string {
  if (email.includes('dpo') || email.includes('DPO')) return 'DPO'
  if (email.includes('avocat') || email.includes('legal')) return 'Avocat'
  if (email.includes('dirigeant') || email.includes('ceo') || email.includes('cto')) return 'Dirigeant'
  if (email.includes('etudiant') || email.includes('student')) return 'Étudiant/Chercheur'
  return 'Utilisateur système'
}

/**
 * Détermine la situation du répondant
 */
function determineRespondentSituation(email: string): string {
  if (email.includes('dpo') || email.includes('DPO')) return 'DPO de mon entreprise'
  if (email.includes('avocat') || email.includes('legal')) return 'Avocat apportant des réponses techniques'
  if (email.includes('dirigeant') || email.includes('ceo') || email.includes('cto')) return 'Dirigeant recensant les cas d\'usage'
  if (email.includes('etudiant') || email.includes('student')) return 'Étudiant/chercheur'
  return 'Utilisateur d\'un système d\'IA pour mon entreprise'
}

