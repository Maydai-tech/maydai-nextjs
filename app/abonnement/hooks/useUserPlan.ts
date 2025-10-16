'use client'

/**
 * Hook pour récupérer le plan actuel de l'utilisateur via l'API
 * Centralise les appels à /api/profiles/[profileId]/plans
 */

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/lib/auth'
import { useApiClient } from '@/lib/api-client'
import type { Subscription, PlanInfo } from '@/lib/subscription/types'

export interface UserPlanData {
  subscription: Subscription | null
  plan: PlanInfo
  hasActiveSubscription: boolean
}

interface UseUserPlanReturn {
  subscription: Subscription | null
  plan: PlanInfo
  hasActiveSubscription: boolean
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
}

/**
 * Hook pour récupérer le plan actuel de l'utilisateur
 * Utilise la route API /api/profiles/[profileId]/plans
 */
export function useUserPlan(): UseUserPlanReturn {
  const { user, loading: authLoading } = useAuth()
  const apiClient = useApiClient()

  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [plan, setPlan] = useState<PlanInfo>({
    id: 'freemium',
    name: 'freemium',
    displayName: 'Freemium',
    description: 'Plan gratuit',
    isFree: true
  })
  const [hasActiveSubscription, setHasActiveSubscription] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [hasFetched, setHasFetched] = useState(false)

  /**
   * Récupère le plan de l'utilisateur depuis l'API
   */
  const fetchUserPlan = useCallback(async () => {
    // Si pas d'utilisateur connecté, on arrête
    if (!user?.id) {
      setSubscription(null)
      setPlan({
        id: 'freemium',
        name: 'freemium',
        displayName: 'Freemium',
        description: 'Plan gratuit',
        isFree: true
      })
      setHasActiveSubscription(false)
      setLoading(false)
      setHasFetched(true)
      return
    }

    try {
      setError(null)

      // Appel à l'API pour récupérer le plan
      const response = await apiClient.get(`/api/profiles/${user.id}/plans`)

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erreur lors de la récupération du plan')
      }

      const data: UserPlanData = await response.json()

      setSubscription(data.subscription)
      setPlan(data.plan)
      setHasActiveSubscription(data.hasActiveSubscription)
    } catch (err) {
      console.error('Erreur lors de la récupération du plan:', err)
      setError(err instanceof Error ? err.message : 'Une erreur inattendue s\'est produite')

      // En cas d'erreur, on retourne au plan freemium par défaut
      setSubscription(null)
      setPlan({
        id: 'freemium',
        name: 'freemium',
        displayName: 'Freemium',
        description: 'Plan gratuit',
        isFree: true
      })
      setHasActiveSubscription(false)
    } finally {
      setLoading(false)
      setHasFetched(true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  /**
   * Fonction pour forcer le rafraîchissement des données
   */
  const refresh = useCallback(async () => {
    setLoading(true)
    setHasFetched(false)
    await fetchUserPlan()
  }, [fetchUserPlan])

  // Effet pour charger les données une seule fois au montage
  useEffect(() => {
    // Attendre que l'authentification soit terminée
    if (authLoading) {
      return
    }

    // Ne charger qu'une seule fois
    if (!hasFetched) {
      fetchUserPlan()
    }
  }, [authLoading, hasFetched, user?.id])

  return {
    subscription,
    plan,
    hasActiveSubscription,
    loading: authLoading || loading,
    error,
    refresh
  }
}
