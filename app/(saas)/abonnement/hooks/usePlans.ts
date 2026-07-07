/**
 * Hook React pour récupérer les plans d'abonnement depuis l'API
 */

import { useState, useEffect } from 'react'
import { fetchPlans, type MaydAIPlan } from '@/lib/api/plans'

interface UsePlansReturn {
  plans: MaydAIPlan[]
  loading: boolean
  error: string | null
  refreshPlans: () => Promise<void>
}

/**
 * Hook pour récupérer les plans d'abonnement
 */
export function usePlans(): UsePlansReturn {
  const [plans, setPlans] = useState<MaydAIPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadPlans = async () => {
    try {
      setLoading(true)
      setError(null)
      const fetchedPlans = await fetchPlans()
      setPlans(fetchedPlans)
    } catch (err) {
      console.error('Error loading plans:', err)
      setError(err instanceof Error ? err.message : 'Failed to load plans')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadPlans()
  }, [])

  return {
    plans,
    loading,
    error,
    refreshPlans: loadPlans
  }
}
