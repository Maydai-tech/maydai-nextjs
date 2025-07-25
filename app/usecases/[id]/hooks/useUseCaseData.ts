import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import { useApiCall } from '@/lib/api-auth'
import { UseCase, Progress } from '../types/usecase'
import { useCaseRoutes } from '../utils/routes'

interface UseUseCaseDataReturn {
  useCase: UseCase | null
  progress: Progress | null
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
  updateUseCase: (updates: Partial<UseCase>) => Promise<UseCase | null>
  updating: boolean
}

export function useUseCaseData(useCaseId: string): UseUseCaseDataReturn {
  const { user, session } = useAuth()
  const router = useRouter()
  const [useCase, setUseCase] = useState<UseCase | null>(null)
  const [progress, setProgress] = useState<Progress | null>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const isFetching = useRef(false)

  // Fonction pour récupérer les données du cas d'usage
  const fetchUseCaseData = useCallback(async () => {
    if (!user || !session?.access_token || !useCaseId || isFetching.current) {
      if (!user || !session?.access_token || !useCaseId) {
        setLoading(false)
      }
      return
    }

    try {
      isFetching.current = true
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/usecases/${useCaseId}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })

      if (!response.ok) {
        throw new Error('Failed to fetch use case')
      }

      const data = await response.json()
      setUseCase(data)

      // Progress fetch temporairement désactivé pour éviter les erreurs 500
      // TODO: Réactiver une fois l'API corrigée
      setProgress(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error loading use case')
    } finally {
      setLoading(false)
      isFetching.current = false
    }
  }, [user, session?.access_token, useCaseId])

  // Charger les données quand les dépendances changent
  useEffect(() => {
    if (user && session?.access_token && useCaseId && !isFetching.current) {
      fetchUseCaseData()
    }
  }, [user, session?.access_token, useCaseId, fetchUseCaseData])

  const refetch = useCallback(async () => {
    await fetchUseCaseData()
  }, [fetchUseCaseData])

  const updateUseCase = useCallback(async (updates: Partial<UseCase>): Promise<UseCase | null> => {
    if (!user || !session?.access_token || !useCaseId) {
      throw new Error('Authentication required')
    }

    try {
      setUpdating(true)
      setError(null)

      const response = await fetch(`/api/usecases/${useCaseId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updates)
      })

      if (!response.ok) {
        let errorMessage = 'Failed to update use case'
        
        const contentType = response.headers.get('content-type')
        if (contentType && contentType.includes('application/json')) {
          try {
            const errorData = await response.json()
            errorMessage = errorData.error || errorMessage
          } catch (parseError) {
            console.error('Error parsing error response:', parseError)
          }
        }
        
        throw new Error(errorMessage)
      }

      const updatedUseCase = await response.json()
      setUseCase(updatedUseCase)
      return updatedUseCase
    } catch (err) {
      console.error('Error updating use case:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
      throw err
    } finally {
      setUpdating(false)
    }
  }, [user, session?.access_token, useCaseId])

  return {
    useCase,
    progress,
    loading,
    updating,
    error,
    refetch,
    updateUseCase
  }
} 