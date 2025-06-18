import { supabase } from './supabase'

export interface QuestionnaireResponse {
  question_code: string
  response_value?: string
  response_data?: any
}

export interface SavedResponse {
  id: string
  usecase_id: string
  question_code: string
  response_value?: string
  response_data?: any
  answered_by?: string
  answered_at: string
  created_at: string
  updated_at: string
}

/**
 * Sauvegarder une réponse à une question
 */
export async function saveQuestionnaireResponse(
  usecaseId: string,
  questionCode: string,
  responseValue?: string,
  responseData?: any
): Promise<SavedResponse | null> {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      throw new Error('No session found')
    }

    const response = await fetch(`/api/usecases/${usecaseId}/responses`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      },
      body: JSON.stringify({
        question_code: questionCode,
        response_value: responseValue,
        response_data: responseData
      })
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Failed to save response')
    }

    return await response.json()
  } catch (error) {
    console.error('Error saving response:', error)
    throw error
  }
}

/**
 * Sauvegarder plusieurs réponses à la fois
 */
export async function saveMultipleResponses(
  usecaseId: string,
  responses: QuestionnaireResponse[]
): Promise<SavedResponse[]> {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      throw new Error('No session found')
    }

    const response = await fetch(`/api/usecases/${usecaseId}/responses`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      },
      body: JSON.stringify({
        responses
      })
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Failed to save responses')
    }

    const result = await response.json()
    return result.saved_responses || []
  } catch (error) {
    console.error('Error saving multiple responses:', error)
    throw error
  }
}

/**
 * Récupérer toutes les réponses d'un use case
 */
export async function getQuestionnaireResponses(usecaseId: string): Promise<SavedResponse[]> {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      throw new Error('No session found')
    }

    const response = await fetch(`/api/usecases/${usecaseId}/responses`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${session.access_token}`
      }
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Failed to fetch responses')
    }

    return await response.json()
  } catch (error) {
    console.error('Error fetching responses:', error)
    throw error
  }
}

/**
 * Obtenir la réponse pour une question spécifique
 */
export async function getQuestionResponse(
  usecaseId: string,
  questionCode: string
): Promise<SavedResponse | null> {
  try {
    const responses = await getQuestionnaireResponses(usecaseId)
    return responses.find(r => r.question_code === questionCode) || null
  } catch (error) {
    console.error('Error fetching question response:', error)
    throw error
  }
}

/**
 * Convertir les réponses sauvegardées en format utilisable par le composant de questionnaire
 */
export function formatResponsesForQuestionnaire(responses: SavedResponse[]): Record<string, any> {
  const formattedResponses: Record<string, any> = {}
  
  responses.forEach(response => {
    if (response.response_data) {
      // Si response_data existe, l'utiliser (pour les réponses complexes)
      formattedResponses[response.question_code] = response.response_data
    } else if (response.response_value) {
      // Sinon utiliser response_value (pour les réponses simples)
      formattedResponses[response.question_code] = response.response_value
    }
  })
  
  return formattedResponses
}

/**
 * Convertir les réponses du questionnaire en format pour la sauvegarde
 */
export function formatAnswersForSaving(answers: Record<string, any>): QuestionnaireResponse[] {
  return Object.entries(answers).map(([questionCode, answer]) => {
    // Si la réponse est un objet complexe, la stocker dans response_data
    if (typeof answer === 'object' && answer !== null) {
      return {
        question_code: questionCode,
        response_data: answer
      }
    } else {
      // Sinon, la stocker dans response_value
      return {
        question_code: questionCode,
        response_value: String(answer)
      }
    }
  })
} 