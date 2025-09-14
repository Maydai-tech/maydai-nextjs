import { useState, useEffect, useCallback } from 'react'
import { UseCaseNextSteps } from '@/lib/supabase'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface UseNextStepsProps {
  usecaseId: string
  useCaseStatus?: string
  useCaseUpdatedAt?: string
}

interface UseNextStepsReturn {
  nextSteps: UseCaseNextSteps | null
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useNextSteps({ usecaseId, useCaseStatus, useCaseUpdatedAt }: UseNextStepsProps): UseNextStepsReturn {
  const [nextSteps, setNextSteps] = useState<UseCaseNextSteps | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Récupérer les next steps existants
  const fetchNextSteps = useCallback(async () => {
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
  }, [usecaseId])

  // Charger les next steps au montage du composant
  useEffect(() => {
    fetchNextSteps()
  }, [fetchNextSteps])

  // Recharger automatiquement quand le statut du use case change vers 'completed'
  useEffect(() => {
    if (useCaseStatus === 'completed' && useCaseUpdatedAt) {
      console.log('🔄 Use case completed, reloading next steps...')
      // Délai de 2 secondes pour laisser le temps au rapport de se générer
      const timeout = setTimeout(() => {
        fetchNextSteps()
      }, 2000)
      
      return () => clearTimeout(timeout)
    }
  }, [useCaseStatus, useCaseUpdatedAt, fetchNextSteps])

  // Recharger automatiquement toutes les 30 secondes (fallback)
  useEffect(() => {
    const interval = setInterval(() => {
      fetchNextSteps()
    }, 30000) // 30 secondes

    return () => clearInterval(interval)
  }, [fetchNextSteps])

  return {
    nextSteps,
    loading,
    error,
    refetch: fetchNextSteps
  }
}
