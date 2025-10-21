import { useState, useEffect } from 'react'
import { UseCaseScore } from '../types/usecase'
import { useAuth } from '../../../../lib/auth'

export const useUseCaseScore = (usecaseId: string, autoFetch: boolean = true) => {
  const [score, setScore] = useState<UseCaseScore | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { user, session } = useAuth()

  const fetchScore = async () => {
    if (!user || !usecaseId || usecaseId === '') return

    setLoading(true)
    setError(null)
    
    try {
      const url = `/api/usecases/${usecaseId}/score`
      console.log('Fetching score from:', url)
      console.log('With token:', session?.access_token ? 'Present' : 'Missing')
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json'
        }
      })
      
      console.log('Response status:', response.status)
      console.log('Response headers:', Object.fromEntries(response.headers.entries()))

      if (!response.ok) {
        let errorMessage = 'Erreur lors du calcul du score'
        
        // Vérifier si la réponse est du JSON
        const contentType = response.headers.get('content-type')
        if (contentType && contentType.includes('application/json')) {
          try {
            const errorData = await response.json()
            errorMessage = errorData.error || errorMessage
          } catch (parseError) {
            console.error('Error parsing error response:', parseError)
          }
        } else {
          // Si ce n'est pas du JSON, c'est probablement une page HTML d'erreur
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
  }

  const recalculateScore = async () => {
    if (!user || !usecaseId || usecaseId === '') return

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
        let errorMessage = 'Erreur lors du recalcul du score'
        
        // Vérifier si la réponse est du JSON
        const contentType = response.headers.get('content-type')
        if (contentType && contentType.includes('application/json')) {
          try {
            const errorData = await response.json()
            errorMessage = errorData.error || errorMessage
          } catch (parseError) {
            console.error('Error parsing error response:', parseError)
          }
        } else {
          // Si ce n'est pas du JSON, c'est probablement une page HTML d'erreur
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

 