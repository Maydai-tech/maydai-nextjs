import { useState, useEffect, useCallback, useRef } from 'react'
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
  isGenerating: boolean
}

export function useNextSteps({ usecaseId, useCaseStatus, useCaseUpdatedAt }: UseNextStepsProps): UseNextStepsReturn {
  const [nextSteps, setNextSteps] = useState<UseCaseNextSteps | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const pollingStartTime = useRef<number | null>(null)

  // Récupérer les next steps existants
  const fetchNextSteps = useCallback(async () => {
    if (!usecaseId || usecaseId === '') return

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
        setIsGenerating(false) // Données reçues, génération terminée
        pollingStartTime.current = null // Arrêter le polling intensif
      } else if (response.status === 404) {
        // Pas de next steps existants, probablement en cours de génération
        setNextSteps(null)
        if (useCaseStatus === 'completed' && !pollingStartTime.current) {
          setIsGenerating(true)
          pollingStartTime.current = Date.now()
        }
      } else {
        setError(data.error || 'Erreur lors de la récupération des prochaines étapes')
        setIsGenerating(false)
      }
    } catch (err) {
      setError('Erreur de connexion')
      console.error('Erreur fetchNextSteps:', err)
      setIsGenerating(false)
    } finally {
      setLoading(false)
    }
  }, [usecaseId, useCaseStatus])

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

  // Polling adaptatif : intensif pendant 60 secondes, puis standard
  useEffect(() => {
    // Si on a déjà les données, pas besoin de polling intensif
    if (nextSteps) {
      // Polling standard toutes les 30 secondes
      const standardInterval = setInterval(() => {
        fetchNextSteps()
      }, 30000)
      
      return () => clearInterval(standardInterval)
    }
    
    // Si génération en cours et dans les 60 premières secondes
    if (isGenerating && pollingStartTime.current) {
      const elapsedTime = Date.now() - pollingStartTime.current
      
      if (elapsedTime < 60000) {
        // Polling intensif toutes les 5 secondes pendant les 60 premières secondes
        console.log('🚀 Polling intensif activé (5s)')
        const intensiveInterval = setInterval(() => {
          fetchNextSteps()
        }, 5000)
        
        return () => clearInterval(intensiveInterval)
      } else {
        // Après 60 secondes, passer au polling standard
        console.log('🔄 Passage au polling standard (30s)')
        const standardInterval = setInterval(() => {
          fetchNextSteps()
        }, 30000)
        
        return () => clearInterval(standardInterval)
      }
    }
    
    // Fallback : polling standard si pas de génération en cours
    const fallbackInterval = setInterval(() => {
      fetchNextSteps()
    }, 30000)
    
    return () => clearInterval(fallbackInterval)
  }, [fetchNextSteps, nextSteps, isGenerating])

  return {
    nextSteps,
    loading,
    error,
    refetch: fetchNextSteps,
    isGenerating
  }
}
