import { useState, useEffect } from 'react'
import { UseCaseNextSteps } from '@/lib/supabase'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface UseNextStepsReturn {
  nextSteps: UseCaseNextSteps | null
  loading: boolean
  error: string | null
}

export function useNextSteps(usecaseId: string): UseNextStepsReturn {
  const [nextSteps, setNextSteps] = useState<UseCaseNextSteps | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Récupérer les next steps existants
  const fetchNextSteps = async () => {
    if (!usecaseId) return

    setLoading(true)
    setError(null)

    try {
      // Récupérer le token d'authentification
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.access_token) {
        setError('Non authentifié')
        return
      }

      const response = await fetch(`/api/usecases/${usecaseId}/nextsteps`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      })
      
      const data = await response.json()

      if (response.ok) {
        setNextSteps(data)
      } else if (response.status === 404) {
        // Pas de next steps existants, c'est normal
        setNextSteps(null)
      } else {
        setError(data.error || 'Erreur lors de la récupération des prochaines étapes')
      }
    } catch (err) {
      setError('Erreur de connexion')
      console.error('Erreur fetchNextSteps:', err)
    } finally {
      setLoading(false)
    }
  }

  // Charger les next steps au montage du composant
  useEffect(() => {
    fetchNextSteps()
  }, [usecaseId])

  return {
    nextSteps,
    loading,
    error
  }
}
