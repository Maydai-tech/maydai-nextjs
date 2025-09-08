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

