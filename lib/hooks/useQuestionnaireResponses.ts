import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useAuth } from '../auth'

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

function isE4E5E6QuestionCode(code: string): boolean {
  return code.startsWith('E4.') || code.startsWith('E5.') || code.startsWith('E6.')
}

function extractOptionCodesFromAnswer(raw: unknown): string[] {
  if (typeof raw === 'string' && raw.length > 0) return [raw]
  if (Array.isArray(raw)) {
    return raw.filter((x): x is string => typeof x === 'string' && x.length > 0)
  }
  if (raw && typeof raw === 'object' && 'selected' in (raw as Record<string, unknown>)) {
    const s = (raw as { selected?: unknown }).selected
    if (typeof s === 'string' && s.length > 0) return [s]
  }
  return []
}

function collectConsolidatedChecklistsFromAnswers(answers: Record<string, any>): {
  checklist_gov_enterprise: string[]
  checklist_gov_usecase: string[]
} {
  const ent = new Set<string>()
  const uc = new Set<string>()

  for (const [qid, raw] of Object.entries(answers)) {
    if (!isE4E5E6QuestionCode(qid)) continue
    const codes = extractOptionCodesFromAnswer(raw)
    for (const c of codes) {
      if (typeof c !== 'string' || c.length === 0) continue
      if (c.startsWith('E5.')) ent.add(c)
      else if (c.startsWith('E4.') || c.startsWith('E6.')) uc.add(c)
    }
  }

  return {
    checklist_gov_enterprise: [...ent],
    checklist_gov_usecase: [...uc],
  }
}

interface UseQuestionnaireResponsesReturn {
  // État
  responses: UseCaseResponse[]
  formattedAnswers: Record<string, any>
  loading: boolean
  saving: boolean
  error: string | null
  
  // Actions
  saveResponse: (
    questionCode: string,
    responseValue?: string,
    responseData?: any
  ) => Promise<Record<string, unknown> | void>
  saveMultiple: (answers: Record<string, any>) => Promise<void>
  refreshResponses: () => Promise<void>
  getResponse: (questionCode: string) => UseCaseResponse | null
  hasResponse: (questionCode: string) => boolean
}

export function useQuestionnaireResponses(usecaseId: string): UseQuestionnaireResponsesReturn {
  const { session } = useAuth()
  const [responses, setResponses] = useState<UseCaseResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const isFetching = useRef(false)
  const lastFetchId = useRef<string>('')

  // Extraire access_token comme string stable pour éviter les changements de référence
  const accessToken = session?.access_token || ''

  // Charger les réponses - STABILISÉ
  const refreshResponses = useCallback(async () => {
    if (!accessToken || !usecaseId || isFetching.current) {
      if (!accessToken || !usecaseId) {
        setLoading(false)
      }
      return
    }

    // Éviter les fetch dupliqués
    const fetchId = `${usecaseId}-${accessToken.slice(-8)}`
    if (lastFetchId.current === fetchId && !isFetching.current) {
      return
    }

    try {
      isFetching.current = true
      lastFetchId.current = fetchId
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/usecases/${usecaseId}/responses`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
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
      isFetching.current = false
    }
  }, [usecaseId, accessToken])

  // Charger uniquement quand nécessaire
  useEffect(() => {
    if (accessToken && usecaseId && !isFetching.current) {
      refreshResponses()
    }
  }, [accessToken, usecaseId, refreshResponses])

  // Sauvegarder une réponse - STABILISÉ
  const saveResponse = useCallback(async (
    questionCode: string, 
    responseValue?: string, 
    responseData?: any
  ): Promise<Record<string, unknown> | void> => {
    if (!accessToken) throw new Error('No session found')

    try {
      setSaving(true)
      setError(null)

      // Migration E4/E5/E6 : ne plus écrire `usecase_responses`, envoyer un payload consolidé.
      if (isE4E5E6QuestionCode(questionCode)) {
        throw new Error(
          "Les blocs E4/E5/E6 doivent être persistés via `checklist_gov_enterprise` / `checklist_gov_usecase` (payload consolidé), pas via saveResponse(questionCode)."
        )
      }

      const response = await fetch(`/api/usecases/${usecaseId}/responses`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
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

      const savedResponse = (await response.json()) as Record<string, unknown>

      if (savedResponse?.updated === 'usecase_checklists') {
        lastFetchId.current = ''
        return savedResponse
      }

      setResponses(prev => {
        const index = prev.findIndex(r => r.question_code === questionCode)
        const row = savedResponse as unknown as UseCaseResponse
        if (index >= 0) {
          const newResponses = [...prev]
          newResponses[index] = row
          return newResponses
        }
        return [...prev, row]
      })

      lastFetchId.current = ''
      return savedResponse
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error saving response')
      throw err
    } finally {
      setSaving(false)
    }
  }, [usecaseId, accessToken])

  // Sauvegarder plusieurs réponses à la fois - STABILISÉ
  const saveMultiple = useCallback(async (answers: Record<string, any>) => {
    if (!accessToken) throw new Error('No session found')

    try {
      setSaving(true)
      setError(null)

      // 1) E4/E5/E6 => payload consolidé direct sur usecases
      const consolidated = collectConsolidatedChecklistsFromAnswers(answers)
      if (
        consolidated.checklist_gov_enterprise.length > 0 ||
        consolidated.checklist_gov_usecase.length > 0
      ) {
        const checklistResp = await fetch(`/api/usecases/${usecaseId}/responses`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
          body: JSON.stringify(consolidated),
        })
        if (!checklistResp.ok) {
          throw new Error('Failed to save consolidated checklists')
        }
      }

      // 2) Autres blocs => table `usecase_responses`
      const responsesToSave = Object.entries(answers)
        .filter(([questionCode]) => !isE4E5E6QuestionCode(questionCode))
        .map(([questionCode, answer]) => {
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

      if (responsesToSave.length === 0) {
        lastFetchId.current = ''
        return
      }

      const response = await fetch(`/api/usecases/${usecaseId}/responses`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({ responses: responsesToSave })
      })

      if (!response.ok) {
        throw new Error('Failed to save multiple responses')
      }

      const result = await response.json()
      const savedResponses = (result.saved_responses || []) as Array<UseCaseResponse | Record<string, unknown>>
      
      setResponses(prev => {
        const newResponses = [...prev]
        
        savedResponses.forEach((savedResponse) => {
          if ((savedResponse as Record<string, unknown>).updated === 'usecase_checklists') {
            return
          }
          const row = savedResponse as UseCaseResponse
          const existingIndex = newResponses.findIndex(r => r.question_code === row.question_code)
          if (existingIndex >= 0) {
            newResponses[existingIndex] = row
          } else {
            newResponses.push(row)
          }
        })
        
        return newResponses
      })
      
      // Invalider le cache
      lastFetchId.current = ''
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la sauvegarde multiple')
      throw err
    } finally {
      setSaving(false)
    }
  }, [usecaseId, accessToken])

  // Obtenir une réponse spécifique
  const getResponse = useCallback((questionCode: string): UseCaseResponse | null => {
    return responses.find(r => r.question_code === questionCode) || null
  }, [responses])

  // Vérifier si une réponse existe
  const hasResponse = useCallback((questionCode: string): boolean => {
    return responses.some(r => r.question_code === questionCode)
  }, [responses])

  // Fonction pour nettoyer les valeurs venant de Supabase
  const cleanValue = (value: string): string => {
    if (!value) return value
    // Supprimer les guillemets échappés au début et à la fin
    if (value.startsWith('"') && value.endsWith('"')) {
      return value.slice(1, -1)
    }
    return value
  }

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
        // Réponse multiple - nettoyer les codes
        formatted[question_code] = multiple_codes.map(code => cleanValue(code))
      } else if (conditional_main) {
        // Réponse conditionnelle - nettoyer la valeur principale
        const conditionalValues: Record<string, string> = {}
        if (conditional_keys && conditional_values) {
          conditional_keys.forEach((key, index) => {
            conditionalValues[key] = conditional_values[index] || ''
          })
        }
        formatted[question_code] = {
          selected: cleanValue(conditional_main),
          conditionalValues
        }
      } else if (single_value) {
        // Réponse simple - nettoyer la valeur
        formatted[question_code] = cleanValue(single_value)
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