import { loadQuestions } from '@/app/usecases/[id]/utils/questions-loader';

// Charger les questions depuis le JSON
const QUESTIONS_DATA = loadQuestions();
import questionnaireMetadata from './questionnaire-metadata.json'

interface UseCaseResponse {
  question_code: string
  single_value?: string
  multiple_codes?: string[]
  multiple_labels?: string[]
  conditional_main?: string
  conditional_keys?: string[]
  conditional_values?: string[]
}

interface UseCaseData {
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
  score_base?: number
  score_model?: number
  score_final?: number
  is_eliminated?: boolean
  elimination_reason?: string
  last_calculation_date?: string
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
  }[] | null
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
  }[] | null
  technology_partner?: string
  llm_model_version?: string
  primary_model_id?: string
}

interface OpenAIAnalysisInput {
  questionnaire_metadata: typeof questionnaireMetadata
  usecase_context: {
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
      deployment_date?: string
      status: string
      risk_level?: string
      ai_category?: string
      system_type?: string
      responsible_service?: string
      deployment_countries?: string[]
    }
    technologie: {
      technology_partner?: string
      llm_model_version?: string
      primary_model_id?: string
      model_name?: string
      model_provider?: string
      model_type?: string
    }
    repondant: {
      profile?: string
      situation?: string
    }
    scores: {
      score_base?: number
      score_model?: number
      score_final?: number
      is_eliminated?: boolean
      elimination_reason?: string
    }
  }
  questionnaire_responses: Record<string, {
    question_text: string
    type: string
    status: string
    selected_answers: string[]
    conditional_data?: Record<string, string>
    interpretation: string
    quick_wins: string[]
    priority: number
    article_concerne: string
    risk_category: string
    impact_conformite: string
  }>
}

/**
 * Transforme les données complètes vers le format JSON enrichi pour OpenAI
 */
export function transformToEnhancedOpenAIFormat(
  usecaseData: any,
  responses: UseCaseResponse[]
): OpenAIAnalysisInput {
  // Construire le contexte du cas d'usage
  const company = Array.isArray(usecaseData.companies) ? usecaseData.companies[0] : usecaseData.companies
  const model = Array.isArray(usecaseData.compl_ai_models) ? usecaseData.compl_ai_models[0] : usecaseData.compl_ai_models
  
  const usecaseContext = {
    entreprise: {
      name: company?.name || 'Non spécifié',
      industry: company?.industry || 'Non spécifié',
      city: company?.city || 'Non spécifié',
      country: company?.country || 'Non spécifié',
      company_status: usecaseData.company_status || 'unknown'
    },
    cas_usage: {
      id: usecaseData.id,
      name: usecaseData.name,
      description: usecaseData.description || 'Aucune description fournie',
      deployment_date: usecaseData.deployment_date,
      status: usecaseData.status,
      risk_level: usecaseData.risk_level,
      ai_category: usecaseData.ai_category,
      system_type: usecaseData.system_type,
      responsible_service: usecaseData.responsible_service,
      deployment_countries: usecaseData.deployment_countries
    },
    technologie: {
      technology_partner: usecaseData.technology_partner,
      llm_model_version: usecaseData.llm_model_version,
      primary_model_id: usecaseData.primary_model_id,
      model_name: model?.model_name,
      model_provider: model?.model_provider,
      model_type: model?.model_type
    },
    repondant: {
      profile: 'Non spécifié',
      situation: 'Non spécifié'
    },
    scores: {
      score_base: usecaseData.score_base,
      score_model: usecaseData.score_model,
      score_final: usecaseData.score_final,
      is_eliminated: usecaseData.is_eliminated,
      elimination_reason: usecaseData.elimination_reason
    }
  }

  // Construire les réponses du questionnaire enrichies
  const questionnaireResponses: Record<string, any> = {}

  responses.forEach(response => {
    const questionCode = response.question_code
    const questionMetadata = questionnaireMetadata.questionnaire_questions[questionCode as keyof typeof questionnaireMetadata.questionnaire_questions]
    
    if (questionMetadata) {
      let selectedAnswers: string[] = []
      let conditionalData: Record<string, string> = {}

      // Traiter selon le type de question
      if (response.single_value) {
        selectedAnswers = [response.single_value]
      } else if (response.multiple_codes && response.multiple_codes.length > 0) {
        selectedAnswers = response.multiple_labels || response.multiple_codes
      } else if (response.conditional_main) {
        selectedAnswers = [response.conditional_main]
        
        // Construire les données conditionnelles
        if (response.conditional_keys && response.conditional_values) {
          response.conditional_keys.forEach((key, index) => {
            const value = response.conditional_values?.[index] || ''
            if (value) {
              conditionalData[key] = value
            }
          })
        }
      }

      questionnaireResponses[questionCode] = {
        question_text: questionMetadata.question_text,
        type: questionMetadata.type,
        status: questionMetadata.status,
        selected_answers: selectedAnswers,
        conditional_data: Object.keys(conditionalData).length > 0 ? conditionalData : undefined,
        interpretation: questionMetadata.interpretation,
        quick_wins: questionMetadata.quick_wins,
        priority: questionMetadata.priority,
        article_concerne: questionMetadata.article_concerne,
        risk_category: questionMetadata.risk_category,
        impact_conformite: questionMetadata.impact_conformite
      }
    }
  })

  return {
    questionnaire_metadata: questionnaireMetadata,
    usecase_context: usecaseContext,
    questionnaire_responses: questionnaireResponses
  }
}

/**
 * Récupère toutes les réponses du questionnaire pour un cas d'usage
 */
export function extractAllResponses(responses: UseCaseResponse[]): UseCaseResponse[] {
  return responses
}

/**
 * Valide que les données transformées sont complètes pour l'analyse OpenAI
 */
export function validateEnhancedOpenAIInput(data: OpenAIAnalysisInput): { isValid: boolean; errors: string[] } {
  const errors: string[] = []

  if (!data.usecase_context.cas_usage.id) {
    errors.push('usecase_id is required')
  }

  if (!data.usecase_context.cas_usage.name) {
    errors.push('usecase_name is required')
  }

  if (Object.keys(data.questionnaire_responses).length === 0) {
    errors.push('No questionnaire responses found')
  }

  return {
    isValid: errors.length === 0,
    errors
  }
}
