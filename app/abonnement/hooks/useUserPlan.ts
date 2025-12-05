'use client'

/**
 * Hook pour récupérer le plan actuel de l'utilisateur via l'API
 * Centralise les appels à /api/profiles/[profileId]/plans
 */

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/lib/auth'
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
  const { user, loading: authLoading, getAccessToken } = useAuth()

  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [plan, setPlan] = useState<PlanInfo>({
    id: 'freemium',
    name: 'freemium',
    displayName: 'Freemium',
    description: 'Plan gratuit',
    isFree: true,
    maxRegistries: 1,
    maxCollaborators: 0,
    maxUseCasesPerRegistry: 3
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
        isFree: true,
        maxRegistries: 1,
        maxCollaborators: 0,
        maxUseCasesPerRegistry: 3
      })
      setHasActiveSubscription(false)
      setLoading(false)
      setHasFetched(true)
      return
    }

    // Vérifier que le token est disponible avant de faire l'appel API
    const token = getAccessToken()
    if (!token) {
      // Token pas encore disponible, on ne fait pas l'appel
      // Le useEffect se déclenchera à nouveau quand la session sera mise à jour
      return
    }

    try {
      setError(null)

      // Appel à l'API pour récupérer le plan avec le token Bearer
      const response = await fetch(`/api/profiles/${user.id}/plans`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      })

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
        isFree: true,
        maxRegistries: 1,
        maxCollaborators: 0,
        maxUseCasesPerRegistry: 3
      })
      setHasActiveSubscription(false)
    } finally {
      setLoading(false)
      setHasFetched(true)
    }
  }, [user?.id, getAccessToken])

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

    // Vérifier si le token est disponible
    const token = getAccessToken()

    // Ne charger qu'une seule fois (quand le token est disponible)
    if (!hasFetched && (token || !user?.id)) {
      fetchUserPlan()
    }
  }, [authLoading, hasFetched, user?.id, getAccessToken, fetchUserPlan])

  return {
    subscription,
    plan,
    hasActiveSubscription,
    loading: authLoading || loading,
    error,
    refresh
  }
}
