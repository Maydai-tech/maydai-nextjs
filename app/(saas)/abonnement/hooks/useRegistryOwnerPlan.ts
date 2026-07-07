'use client'

/**
 * Hook pour récupérer le plan du propriétaire d'un registre
 * Utile pour vérifier les limites basées sur le plan du propriétaire (pas de l'utilisateur connecté)
 */

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/lib/auth'
import type { Subscription, PlanInfo } from '@/lib/subscription/types'

interface UseRegistryOwnerPlanReturn {
  subscription: Subscription | null
  plan: PlanInfo
  hasActiveSubscription: boolean
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
}

const DEFAULT_PLAN: PlanInfo = {
  id: 'freemium',
  name: 'freemium',
  displayName: 'Freemium',
  description: 'Plan gratuit',
  isFree: true,
  maxRegistries: 1,
  maxCollaborators: 0,
  maxUseCasesPerRegistry: 3
}

/**
 * Hook pour récupérer le plan du propriétaire d'un registre
 * @param companyId - L'ID du registre (company)
 */
export function useRegistryOwnerPlan(companyId: string): UseRegistryOwnerPlanReturn {
  const { user, loading: authLoading, getAccessToken } = useAuth()

  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [plan, setPlan] = useState<PlanInfo>(DEFAULT_PLAN)
  const [hasActiveSubscription, setHasActiveSubscription] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [hasFetched, setHasFetched] = useState(false)

  const fetchOwnerPlan = useCallback(async () => {
    // Si pas d'utilisateur connecté ou pas de companyId, on arrête
    if (!user?.id || !companyId) {
      setSubscription(null)
      setPlan(DEFAULT_PLAN)
      setHasActiveSubscription(false)
      setLoading(false)
      setHasFetched(true)
      return
    }

    // Vérifier que le token est disponible
    const token = getAccessToken()
    if (!token) {
      return
    }

    try {
      setError(null)

      const response = await fetch(`/api/companies/${companyId}/owner-plan`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erreur lors de la récupération du plan du propriétaire')
      }

      const data = await response.json()

      setSubscription(data.subscription)
      setPlan(data.plan)
      setHasActiveSubscription(data.hasActiveSubscription)
    } catch (err) {
      console.error('Erreur lors de la récupération du plan du propriétaire:', err)
      setError(err instanceof Error ? err.message : 'Une erreur inattendue s\'est produite')

      // En cas d'erreur, on retourne au plan freemium par défaut
      setSubscription(null)
      setPlan(DEFAULT_PLAN)
      setHasActiveSubscription(false)
    } finally {
      setLoading(false)
      setHasFetched(true)
    }
  }, [user?.id, companyId, getAccessToken])

  const refresh = useCallback(async () => {
    setLoading(true)
    setHasFetched(false)
    await fetchOwnerPlan()
  }, [fetchOwnerPlan])

  useEffect(() => {
    if (authLoading) {
      return
    }

    const token = getAccessToken()

    if (!hasFetched && (token || !user?.id)) {
      fetchOwnerPlan()
    }
  }, [authLoading, hasFetched, user?.id, getAccessToken, fetchOwnerPlan])

  // Reset hasFetched when companyId changes
  useEffect(() => {
    setHasFetched(false)
  }, [companyId])

  return {
    subscription,
    plan,
    hasActiveSubscription,
    loading: authLoading || loading,
    error,
    refresh
  }
}
