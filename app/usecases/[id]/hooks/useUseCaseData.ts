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
}

export function useUseCaseData(useCaseId: string): UseUseCaseDataReturn {
  const { user, session } = useAuth()
  const router = useRouter()
  const [useCase, setUseCase] = useState<UseCase | null>(null)
  const [progress, setProgress] = useState<Progress | null>(null)
  const [loading, setLoading] = useState(true)
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

  return {
    useCase,
    progress,
    loading,
    error,
    refetch
  }
} 