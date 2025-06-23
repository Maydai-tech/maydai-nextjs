import { useState, useEffect } from 'react'
import { UseCaseScore } from '../types/usecase'
import { useAuth } from '../../../../lib/auth'

export const useUseCaseScore = (usecaseId: string, autoFetch: boolean = true) => {
  const [score, setScore] = useState<UseCaseScore | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { user, session } = useAuth()

  const fetchScore = async () => {
    if (!user || !usecaseId) return

    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch(`/api/usecases/${usecaseId}/score`, {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erreur lors du calcul du score')
      }

      const scoreData = await response.json()
      setScore(scoreData)
    } catch (err) {
      console.error('Error fetching score:', err)
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setLoading(false)
    }
  }

  const recalculateScore = async () => {
    if (!user || !usecaseId) return

    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch(`/api/usecases/${usecaseId}/score`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erreur lors du recalcul du score')
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
    if (autoFetch && usecaseId && user) {
      fetchScore()
    }
  }, [usecaseId, user, autoFetch])

  return {
    score,
    loading,
    error,
    fetchScore,
    recalculateScore,
    refetch: fetchScore
  }
}

// Hook pour récupérer l'historique des scores
export const useUseCaseScoreHistory = (usecaseId: string) => {
  const [scores, setScores] = useState<UseCaseScore[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { user, session } = useAuth()

  const fetchScoreHistory = async () => {
    if (!user || !usecaseId) return

    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch(`/api/usecases/${usecaseId}/score/history`, {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erreur lors de la récupération de l\'historique')
      }

      const historyData = await response.json()
      setScores(historyData)
    } catch (err) {
      console.error('Error fetching score history:', err)
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (usecaseId && user) {
      fetchScoreHistory()
    }
  }, [usecaseId, user])

  return {
    scores,
    loading,
    error,
    refetch: fetchScoreHistory
  }
} 