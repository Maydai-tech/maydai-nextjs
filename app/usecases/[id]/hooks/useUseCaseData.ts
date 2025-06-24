import { useState, useEffect } from 'react'
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
  const api = useApiCall()

  const fetchUseCaseData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      if (!session?.access_token || !useCaseId) {
        return
      }
      
      // Fetch use case details
      const useCaseResponse = await api.get(`/api/usecases/${useCaseId}`)
      
      if (useCaseResponse.status === 404) {
        router.push(useCaseRoutes.companies())
        return
      } else if (useCaseResponse.data) {
        setUseCase(useCaseResponse.data)
        
        // Fetch progress for this use case
        if (useCaseResponse.data.company_id) {
          const progressResponse = await api.get(`/api/companies/${useCaseResponse.data.company_id}/progress`)
          if (progressResponse.data) {
            const useCaseProgress = progressResponse.data.find((p: Progress) => p.usecase_id === useCaseId)
            setProgress(useCaseProgress || null)
          }
        }
      }
    } catch (error) {
      console.error('Error fetching use case data:', error)
      setError('Erreur lors du chargement du cas d\'usage')
      router.push(useCaseRoutes.companies())
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (user && useCaseId) {
      fetchUseCaseData()
    }
  }, [user, useCaseId])

  return {
    useCase,
    progress,
    loading,
    error,
    refetch: fetchUseCaseData
  }
} 