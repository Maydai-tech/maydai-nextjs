import { useState, useEffect, useCallback } from 'react'
import { UseCaseScore } from '../types/usecase'
import { useAuth } from '../../../../lib/auth'

export const useUseCaseScore = (usecaseId: string, autoFetch: boolean = true) => {
  const [score, setScore] = useState<UseCaseScore | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { user, session } = useAuth()

  const fetchScore = useCallback(async () => {
    if (!user || !session?.access_token || !usecaseId || usecaseId === '') return

    setLoading(true)
    setError(null)

    try {
      const url = `/api/usecases/${usecaseId}/score`

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        let errorMessage = 'Erreur lors du calcul du score'

        const contentType = response.headers.get('content-type')
        if (contentType && contentType.includes('application/json')) {
          try {
            const errorData = await response.json()
            errorMessage = errorData.error || errorMessage
          } catch (parseError) {
            console.error('Error parsing error response:', parseError)
          }
        } else {
          errorMessage = `Erreur ${response.status}: ${response.statusText}`
        }

        throw new Error(errorMessage)
      }

      const scoreData = await response.json()
      setScore(scoreData)
    } catch (err) {
      console.error('Error fetching score:', err)
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setLoading(false)
    }
  }, [user, session?.access_token, usecaseId])

  const recalculateScore = async () => {
    if (!user || !session?.access_token || !usecaseId || usecaseId === '') return

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/usecases/${usecaseId}/score`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        let errorMessage = 'Erreur lors du recalcul du score'

        const contentType = response.headers.get('content-type')
        if (contentType && contentType.includes('application/json')) {
          try {
            const errorData = await response.json()
            errorMessage = errorData.error || errorMessage
          } catch (parseError) {
            console.error('Error parsing error response:', parseError)
          }
        } else {
          errorMessage = `Erreur ${response.status}: ${response.statusText}`
        }

        throw new Error(errorMessage)
      }

      const scoreData = await response.json()
      setScore(scoreData)
      return scoreData
    } catch (err) {
      console.error('Error recalculating score:', err)
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
      throw err
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (autoFetch && usecaseId && user && session?.access_token) {
      void fetchScore()
    }
  }, [autoFetch, usecaseId, user, session?.access_token, fetchScore])

  useEffect(() => {
    if (!autoFetch || !usecaseId || !user || !session?.access_token) return

    const refetchIfVisible = () => {
      if (document.visibilityState === 'visible') {
        void fetchScore()
      }
    }

    document.addEventListener('visibilitychange', refetchIfVisible)
    window.addEventListener('focus', refetchIfVisible)

    return () => {
      document.removeEventListener('visibilitychange', refetchIfVisible)
      window.removeEventListener('focus', refetchIfVisible)
    }
  }, [autoFetch, usecaseId, user, session?.access_token, fetchScore])

  return {
    score,
    loading,
    error,
    fetchScore,
    recalculateScore,
    refetch: fetchScore,
  }
}
