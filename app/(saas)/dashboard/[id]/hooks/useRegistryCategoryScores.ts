import { useState, useEffect } from 'react'
import { CategoryScore } from '@/app/usecases/[id]/types/usecase'
import { useAuth } from '@/lib/auth'

interface RegistryCategoryScoresResponse {
  category_scores: CategoryScore[]
  evaluated_count: number
  message?: string
}

export const useRegistryCategoryScores = (companyId: string, autoFetch: boolean = true) => {
  const [categoryScores, setCategoryScores] = useState<CategoryScore[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [evaluatedCount, setEvaluatedCount] = useState(0)
  const { user, session } = useAuth()

  const fetchCategoryScores = async () => {
    if (!user || !companyId || companyId === '') return

    setLoading(true)
    setError(null)
    
    try {
      const url = `/api/companies/${companyId}/category-scores`
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        let errorMessage = 'Erreur lors du chargement des scores par catégorie'
        
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
          errorMessage = `Erreur ${response.status}: ${response.statusText}`
        }
        
        throw new Error(errorMessage)
      }

      const data: RegistryCategoryScoresResponse = await response.json()
      setCategoryScores(data.category_scores || [])
      setEvaluatedCount(data.evaluated_count || 0)
    } catch (err) {
      console.error('Error fetching registry category scores:', err)
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (autoFetch && companyId && user) {
      fetchCategoryScores()
    }
  }, [companyId, user, autoFetch])

  return {
    categoryScores,
    loading,
    error,
    evaluatedCount,
    fetchCategoryScores,
    refetch: fetchCategoryScores
  }
}


