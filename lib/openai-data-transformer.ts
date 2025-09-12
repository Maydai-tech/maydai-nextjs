import { QUESTIONS_DATA } from './questions-data'

interface UseCaseResponse {
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
  responses: {
    E4_N7_Q2: {
      question: string
      selected_options: string[]
      selected_labels: string[]
    }
    E5_N9_Q7: {
      question: string
      selected_option: string
      selected_label: string
      conditional_data: {
        registry_type?: string
        system_name?: string
      }
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
  companyCountry?: string
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
      E5_N9_Q7: {
        question: getQuestionText('E5.N9.Q7'),
        selected_option: '',
        selected_label: '',
        conditional_data: {}
      }
    }
  }

  // Traiter chaque réponse
  responses.forEach(response => {
    if (response.question_code === 'E4.N7.Q2') {
      // Question checkbox
      if (response.multiple_codes && response.multiple_codes.length > 0) {
        result.responses.E4_N7_Q2.selected_options = response.multiple_codes
        result.responses.E4_N7_Q2.selected_labels = response.multiple_labels || 
          response.multiple_codes.map(code => getOptionLabel('E4.N7.Q2', code))
      }
    } else if (response.question_code === 'E5.N9.Q7') {
      // Question conditionnelle
      if (response.conditional_main) {
        result.responses.E5_N9_Q7.selected_option = response.conditional_main
        result.responses.E5_N9_Q7.selected_label = getOptionLabel('E5.N9.Q7', response.conditional_main)
        
        // Construire les données conditionnelles
        if (response.conditional_keys && response.conditional_values) {
          const conditionalData: Record<string, string> = {}
          response.conditional_keys.forEach((key, index) => {
            const value = response.conditional_values?.[index] || ''
            if (value) {
              conditionalData[key] = value
            }
          })
          result.responses.E5_N9_Q7.conditional_data = conditionalData
        }
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

  const option = question.options.find(opt => opt.code === optionCode)
  return option?.label || optionCode
}

/**
 * Récupère les réponses spécifiques E4.N7.Q2 et E5.N9.Q7 depuis la base
 */
export function extractTargetResponses(responses: UseCaseResponse[]): UseCaseResponse[] {
  return responses.filter(response => 
    response.question_code === 'E4.N7.Q2' || response.question_code === 'E5.N9.Q7'
  )
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
  score_base?: number
  score_model?: number | null
  score_final?: number | null
  is_eliminated?: boolean
  elimination_reason?: string
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
      risk_level: string
      ai_category: string
      system_type: string
      responsible_service: string
      deployment_countries: string[]
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
}

/**
 * Transforme les données complètes vers le format JSON enrichi pour OpenAI
 */
export function transformToOpenAIFormatComplete(
  usecase: UseCaseComplete,
  company: Company | null,
  model: Model | null,
  responses: UseCaseResponseComplete[],
  respondentEmail: string
): OpenAIAnalysisInputComplete {
  
  // Construire le questionnaire avec toutes les questions et réponses
  const questionnaireQuestions = buildQuestionnaireQuestions(responses)
  
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
      risk_level: usecase.risk_level || 'Non évalué',
      ai_category: usecase.ai_category || 'Non spécifié',
      system_type: usecase.system_type || 'Non spécifié',
      responsible_service: usecase.responsible_service || 'Non spécifié',
      deployment_countries: usecase.deployment_countries || []
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
      score_model: usecase.score_model,
      score_final: usecase.score_final,
      is_eliminated: usecase.is_eliminated || false,
      elimination_reason: usecase.elimination_reason || ''
    }
  }

  return {
    questionnaire_questions: questionnaireQuestions,
    usecase_context_fields: usecaseContextFields,
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
      "unacceptable": "Risque inacceptable - Interdiction d'utilisation"
    }
  }
}

/**
 * Construit le questionnaire complet avec toutes les questions et réponses
 */
function buildQuestionnaireQuestions(responses: UseCaseResponseComplete[]): Record<string, any> {
  const questionnaireQuestions: Record<string, any> = {}
  
  // Créer un map des réponses pour un accès rapide
  const responsesMap = new Map<string, UseCaseResponseComplete>()
  responses.forEach(response => {
    responsesMap.set(response.question_code, response)
  })
  
  // Parcourir toutes les questions définies dans QUESTIONS_DATA
  Object.entries(QUESTIONS_DATA).forEach(([questionCode, questionData]) => {
    const response = responsesMap.get(questionCode)
    
    // Construire la structure de la question avec métadonnées
    const questionStructure = {
      code: questionData.id,
      question_text: questionData.question,
      type: questionData.type,
      status: determineQuestionStatus(questionData),
      possible_answers: questionData.options.map(opt => opt.label),
      interpretation: generateInterpretation(questionData),
      quick_wins: generateQuickWins(questionData),
      priority: determinePriority(questionData),
      article_concerne: determineArticleConcerne(questionData),
      risk_category: determineRiskCategory(questionData),
      impact_conformite: generateImpactConformite(questionData),
      user_response: response ? buildUserResponse(response, questionData) : null
    }
    
    questionnaireQuestions[questionCode] = questionStructure
  })
  
  return questionnaireQuestions
}

/**
 * Construit la réponse de l'utilisateur pour une question
 */
function buildUserResponse(response: UseCaseResponseComplete, questionData: any): any {
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
      response.multiple_codes.map(code => getOptionLabel(response.question_code, code))
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
    'E5.N9.Q1': "Obligation fondamentale pour les systèmes à risque limité et élevé",
    'E5.N9.Q7': "Obligation de registre pour les systèmes à haut risque ; recommandé pour tous"
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
    'E5.N9.Q1': ["Créer un système de gestion des risques", "Documenter les processus de surveillance"],
    'E5.N9.Q7': ["Créer un registre simple (Excel, Notion, etc.)", "Structurer les champs : nom, objectif, MAJ, etc."]
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
    'E5.N9.Q1': "Article 9 (Système de gestion des risques)",
    'E5.N9.Q7': "Article 12"
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
    'E5.N9.Q1': "Technical Robustness and Safety",
    'E5.N9.Q7': "Human Agency & Oversight"
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
    'E5.N9.Q1': "Une réponse 'Non' indique une non-conformité pour les systèmes à haut risque",
    'E5.N9.Q7': "Une réponse autre que Non classerait le système à risque"
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

