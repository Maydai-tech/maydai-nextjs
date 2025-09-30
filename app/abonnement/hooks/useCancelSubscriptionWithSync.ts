'use client'

/**
 * Hook pour gérer l'annulation d'abonnement avec synchronisation webhook
 * Gère l'attente de la synchronisation entre Stripe et Supabase
 */

import { useState, useCallback } from 'react'
import { useAuth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { useApiClient } from '@/lib/api-client'
import type { CancelSubscriptionResponse } from '@/lib/stripe/types'

interface UseCancelSubscriptionWithSyncReturn {
  cancelWithSync: (subscriptionId?: string) => Promise<void>
  isLoading: boolean
  syncCompleted: boolean
  error: string | null
  reset: () => void
}

export function useCancelSubscriptionWithSync(): UseCancelSubscriptionWithSyncReturn {
  const { user } = useAuth()
  const apiClient = useApiClient()
  const [isLoading, setIsLoading] = useState(false)
  const [syncCompleted, setSyncCompleted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /**
   * Attendre que la synchronisation Supabase soit terminée
   */
  const waitForSync = useCallback(async (stripeSubscriptionId: string, maxAttempts = 10): Promise<void> => {
    for (let i = 0; i < maxAttempts; i++) {
      try {
        const { data, error: fetchError } = await supabase
          .from('subscriptions')
          .select('cancel_at_period_end')
          .eq('stripe_subscription_id', stripeSubscriptionId)
          .single()

        if (fetchError) {
          console.error('Erreur lors de la vérification de synchronisation:', fetchError)
          // Continue à essayer en cas d'erreur temporaire
        } else if (data?.cancel_at_period_end === true) {
          console.log('✅ Synchronisation terminée dans Supabase')
          return // Synchronisation terminée
        }

        // Attendre 1 seconde avant le prochain essai
        await new Promise(resolve => setTimeout(resolve, 1000))
      } catch (err) {
        console.error('Erreur lors de la vérification:', err)
      }
    }

    throw new Error('Timeout : synchronisation non terminée après 10 tentatives')
  }, [])

  /**
   * Annuler l'abonnement et attendre la synchronisation
   */
  const cancelWithSync = useCallback(async (subscriptionId?: string): Promise<void> => {
    if (!user?.id) {
      throw new Error('Utilisateur non connecté')
    }

    setIsLoading(true)
    setError(null)
    setSyncCompleted(false)

    try {
      // Étape 1 : Annuler dans Stripe
      console.log('🔄 Annulation de l\'abonnement dans Stripe...')
      const response = await apiClient.postJson('/api/stripe/cancel-subscription', {})

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erreur lors de l\'annulation')
      }

      const result: CancelSubscriptionResponse = await response.json()

      if (!result.success) {
        throw new Error(result.message || 'Échec de l\'annulation')
      }

      console.log('✅ Annulation Stripe réussie')

      // Étape 2 : Attendre la synchronisation Supabase
      if (result.stripeSubscriptionId) {
        console.log('🔄 Attente de la synchronisation Supabase...')
        await waitForSync(result.stripeSubscriptionId)
        console.log('✅ Synchronisation Supabase terminée')
        setSyncCompleted(true)
      } else {
        console.warn('⚠️ Pas de stripeSubscriptionId dans la réponse, synchronisation non vérifiée')
        setSyncCompleted(true)
      }

    } catch (error) {
      console.error('❌ Erreur lors de l\'annulation avec synchronisation:', error)
      setError(error instanceof Error ? error.message : 'Erreur inconnue')
      throw error
    } finally {
      setIsLoading(false)
    }
  }, [user?.id, apiClient, waitForSync])

  /**
   * Réinitialiser l'état du hook
   */
  const reset = useCallback(() => {
    setIsLoading(false)
    setSyncCompleted(false)
    setError(null)
  }, [])

  return {
    cancelWithSync,
    isLoading,
    syncCompleted,
    error,
    reset
  }
}