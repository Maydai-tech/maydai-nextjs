'use client'

/**
 * Hook pour récupérer l'abonnement actuel de l'utilisateur
 * Gère automatiquement le chargement, les erreurs et la récupération des données
 */

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { Subscription, UseSubscriptionReturn } from '@/lib/subscription/types'
import { useApiClient } from '@/lib/api-client'

export function useSubscription(): UseSubscriptionReturn {
  const { user, loading: authLoading } = useAuth()
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const apiClient = useApiClient()

  /**
   * Récupère l'abonnement de l'utilisateur depuis Supabase
   */
  const fetchSubscription = useCallback(async () => {
    // Si pas d'utilisateur connecté, on arrête
    if (!user?.id) {
      setSubscription(null)
      setLoading(false)
      return
    }

    try {
      setError(null)

      // Requête pour récupérer l'abonnement actuel de l'utilisateur
      const { data, error: fetchError } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle() // Peut retourner null si aucun résultat

      if (fetchError) {
        console.error('Erreur lors de la récupération de l\'abonnement:', fetchError)
        setError('Impossible de récupérer les informations d\'abonnement')
        setSubscription(null)
      } else {
        // data peut être null si l'utilisateur n'a pas d'abonnement
        setSubscription(data)
      }
    } catch (err) {
      console.error('Erreur inattendue:', err)
      setError('Une erreur inattendue s\'est produite')
      setSubscription(null)
    } finally {
      setLoading(false)
    }
  }, [user?.id])

  /**
   * Fonction pour annuler l'abonnement
   */
  const cancelSubscription = useCallback(async () => {
    if (!user?.id || !subscription) {
      throw new Error('Aucun abonnement à annuler')
    }

    try {
      const response = await apiClient.postJson('/api/stripe/cancel-subscription', {})

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erreur lors de l\'annulation')
      }

      const result = await response.json()

      // Rafraîchir les données après annulation
      await fetchSubscription()

      return result
    } catch (error) {
      console.error('Erreur lors de l\'annulation:', error)
      throw error
    }
  }, [user?.id, subscription, fetchSubscription])

  /**
   * Fonction pour forcer le rafraîchissement des données
   */
  const refreshSubscription = useCallback(async () => {
    setLoading(true)
    await fetchSubscription()
  }, [fetchSubscription])

  // Effet pour charger les données quand l'utilisateur change
  useEffect(() => {
    // Attendre que l'authentification soit terminée
    if (authLoading) {
      return
    }

    fetchSubscription()
  }, [authLoading, fetchSubscription])

  return {
    subscription,
    loading: authLoading || loading,
    error,
    refreshSubscription,
    cancelSubscription
  }
}