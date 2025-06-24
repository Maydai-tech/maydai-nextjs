import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '../supabase'

interface UseCaseResponse {
  id: string
  usecase_id: string
  question_code: string
  single_value?: string
  multiple_codes?: string[]
  multiple_labels?: string[]
  conditional_main?: string
  conditional_keys?: string[]
  conditional_values?: string[]
  answered_by: string
  answered_at: string
  created_at: string
  updated_at: string
}

interface UseQuestionnaireResponsesReturn {
  // État
  responses: UseCaseResponse[]
  formattedAnswers: Record<string, any>
  loading: boolean
  saving: boolean
  error: string | null
  
  // Actions
  saveResponse: (questionCode: string, responseValue?: string, responseData?: any) => Promise<void>
  saveMultiple: (answers: Record<string, any>) => Promise<void>
  refreshResponses: () => Promise<void>
  getResponse: (questionCode: string) => UseCaseResponse | null
  hasResponse: (questionCode: string) => boolean
}

export function useQuestionnaireResponses(usecaseId: string): UseQuestionnaireResponsesReturn {
  const [responses, setResponses] = useState<UseCaseResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Charger les réponses au montage
  const refreshResponses = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('No session found')

      const response = await fetch(`/api/usecases/${usecaseId}/responses`, {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      })

      if (!response.ok) {
        throw new Error('Failed to fetch responses')
      }

      const data = await response.json()
      setResponses(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error loading responses')
    } finally {
      setLoading(false)
    }
  }, [usecaseId])

  useEffect(() => {
    refreshResponses()
  }, [refreshResponses])

  // Sauvegarder une réponse
  const saveResponse = useCallback(async (
    questionCode: string, 
    responseValue?: string, 
    responseData?: any
  ) => {
    try {
      setSaving(true)
      setError(null)
      
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('No session found')

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
        throw new Error('Failed to save response')
      }

      const savedResponse = await response.json()
      
      // Mettre à jour l'état local
      setResponses(prev => {
        const index = prev.findIndex(r => r.question_code === questionCode)
        if (index >= 0) {
          const newResponses = [...prev]
          newResponses[index] = savedResponse
          return newResponses
        } else {
          return [...prev, savedResponse]
        }
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error saving response')
      throw err
    } finally {
      setSaving(false)
    }
  }, [usecaseId])

  // Sauvegarder plusieurs réponses à la fois
  const saveMultiple = useCallback(async (answers: Record<string, any>) => {
    try {
      setSaving(true)
      setError(null)
      
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('No session found')

      const responsesToSave = Object.entries(answers).map(([questionCode, answer]) => {
        // Si la réponse est un objet complexe, la traiter selon son type
        if (typeof answer === 'object' && answer !== null) {
          if (Array.isArray(answer)) {
            // Réponse multiple (codes)
            return {
              question_code: questionCode,
              response_data: { selected_codes: answer }
            }
          } else {
            // Réponse conditionnelle ou autre objet
            return {
              question_code: questionCode,
              response_data: answer
            }
          }
        } else {
          // Réponse simple
          return {
            question_code: questionCode,
            response_value: String(answer)
          }
        }
      })

      const response = await fetch(`/api/usecases/${usecaseId}/responses`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ responses: responsesToSave })
      })

      if (!response.ok) {
        throw new Error('Failed to save multiple responses')
      }

      const result = await response.json()
      const savedResponses = result.saved_responses || []
      
      // Mettre à jour l'état local avec toutes les réponses sauvegardées
      setResponses(prev => {
        const newResponses = [...prev]
        
        savedResponses.forEach((savedResponse: UseCaseResponse) => {
          const existingIndex = newResponses.findIndex(r => r.question_code === savedResponse.question_code)
          if (existingIndex >= 0) {
            newResponses[existingIndex] = savedResponse
          } else {
            newResponses.push(savedResponse)
          }
        })
        
        return newResponses
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la sauvegarde multiple')
      throw err
    } finally {
      setSaving(false)
    }
  }, [usecaseId])

  // Obtenir une réponse spécifique
  const getResponse = useCallback((questionCode: string): UseCaseResponse | null => {
    return responses.find(r => r.question_code === questionCode) || null
  }, [responses])

  // Vérifier si une réponse existe
  const hasResponse = useCallback((questionCode: string): boolean => {
    return responses.some(r => r.question_code === questionCode)
  }, [responses])

  // Formater les réponses pour l'UI
  const formattedAnswers = useMemo(() => {
    const formatted: Record<string, any> = {}
    
    responses.forEach(response => {
      const { 
        question_code, 
        single_value, 
        multiple_codes, 
        conditional_main, 
        conditional_keys, 
        conditional_values 
      } = response
      
      if (multiple_codes && multiple_codes.length > 0) {
        // Réponse multiple - retourner les codes
        formatted[question_code] = multiple_codes
      } else if (conditional_main) {
        // Réponse conditionnelle
        const conditionalValues: Record<string, string> = {}
        if (conditional_keys && conditional_values) {
          conditional_keys.forEach((key, index) => {
            conditionalValues[key] = conditional_values[index] || ''
          })
        }
        formatted[question_code] = {
          selected: conditional_main,
          conditionalValues
        }
      } else if (single_value) {
        // Réponse simple
        formatted[question_code] = single_value
      }
    })
    
    return formatted
  }, [responses])

  return {
    responses,
    formattedAnswers,
    loading,
    saving,
    error,
    saveResponse,
    saveMultiple,
    refreshResponses,
    getResponse,
    hasResponse
  }
} 