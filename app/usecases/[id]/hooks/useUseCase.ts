import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import { useApiCall } from '@/lib/api-auth'
import { UseCase, Progress } from '../types/usecase'

interface UseUseCaseReturn {
  useCase: UseCase | null
  progress: Progress | null
  loading: boolean
  showQuestionnaire: boolean
  setShowQuestionnaire: (show: boolean) => void
  refetch: () => Promise<void>
}

export function useUseCase(useCaseId: string): UseUseCaseReturn {
  const { user, session } = useAuth()
  const router = useRouter()
  const [useCase, setUseCase] = useState<UseCase | null>(null)
  const [progress, setProgress] = useState<Progress | null>(null)
  const [loading, setLoading] = useState(true)
  const [showQuestionnaire, setShowQuestionnaire] = useState(false)
  const api = useApiCall()

  const fetchUseCaseData = async () => {
    try {
      setLoading(true)
      
      if (!session?.access_token || !useCaseId) {
        return
      }
      
      // Fetch use case details
      const useCaseResponse = await api.get(`/api/usecases/${useCaseId}`)
      
      if (useCaseResponse.status === 404) {
        router.push('/dashboard/companies')
        return
      } else if (useCaseResponse.data) {
        setUseCase(useCaseResponse.data)
        
        // Show questionnaire if status is draft
        setShowQuestionnaire(useCaseResponse.data.status?.toLowerCase() === 'draft')
        
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
      router.push('/dashboard/companies')
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
    showQuestionnaire,
    setShowQuestionnaire,
    refetch: fetchUseCaseData
  }
} 