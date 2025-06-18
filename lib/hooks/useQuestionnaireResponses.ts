import { useState, useEffect, useCallback } from 'react'
import { 
  saveQuestionnaireResponse, 
  saveMultipleResponses, 
  getQuestionnaireResponses,
  formatResponsesForQuestionnaire,
  formatAnswersForSaving,
  SavedResponse,
  QuestionnaireResponse
} from '../questionnaire-api'

interface UseQuestionnaireResponsesReturn {
  // État
  responses: SavedResponse[]
  formattedAnswers: Record<string, any>
  loading: boolean
  saving: boolean
  error: string | null
  
  // Actions
  saveResponse: (questionCode: string, responseValue?: string, responseData?: any) => Promise<void>
  saveMultiple: (answers: Record<string, any>) => Promise<void>
  refreshResponses: () => Promise<void>
  getResponse: (questionCode: string) => SavedResponse | null
  hasResponse: (questionCode: string) => boolean
}

export function useQuestionnaireResponses(usecaseId: string): UseQuestionnaireResponsesReturn {
  const [responses, setResponses] = useState<SavedResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Charger les réponses au montage du composant
  const refreshResponses = useCallback(async () => {
    if (!usecaseId) return
    
    try {
      setLoading(true)
      setError(null)
      const fetchedResponses = await getQuestionnaireResponses(usecaseId)
      setResponses(fetchedResponses)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement des réponses')
    } finally {
      setLoading(false)
    }
  }, [usecaseId])

  useEffect(() => {
    refreshResponses()
  }, [refreshResponses])

  // Sauvegarder une réponse unique
  const saveResponse = useCallback(async (
    questionCode: string, 
    responseValue?: string, 
    responseData?: any
  ) => {
    try {
      setSaving(true)
      setError(null)
      
      const savedResponse = await saveQuestionnaireResponse(
        usecaseId, 
        questionCode, 
        responseValue, 
        responseData
      )
      
      if (savedResponse) {
        // Mettre à jour l'état local
        setResponses(prev => {
          const existingIndex = prev.findIndex(r => r.question_code === questionCode)
          if (existingIndex >= 0) {
            // Remplacer la réponse existante
            const newResponses = [...prev]
            newResponses[existingIndex] = savedResponse
            return newResponses
          } else {
            // Ajouter la nouvelle réponse
            return [...prev, savedResponse]
          }
        })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la sauvegarde')
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
      
      const responsesToSave = formatAnswersForSaving(answers)
      const savedResponses = await saveMultipleResponses(usecaseId, responsesToSave)
      
      // Mettre à jour l'état local avec toutes les réponses sauvegardées
      setResponses(prev => {
        const newResponses = [...prev]
        
        savedResponses.forEach(savedResponse => {
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
  const getResponse = useCallback((questionCode: string): SavedResponse | null => {
    return responses.find(r => r.question_code === questionCode) || null
  }, [responses])

  // Vérifier si une réponse existe
  const hasResponse = useCallback((questionCode: string): boolean => {
    return responses.some(r => r.question_code === questionCode)
  }, [responses])

  // Formater les réponses pour le composant de questionnaire
  const formattedAnswers = formatResponsesForQuestionnaire(responses)

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