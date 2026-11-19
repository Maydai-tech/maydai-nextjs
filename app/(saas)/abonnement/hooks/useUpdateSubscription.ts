'use client'

import { useState, useCallback } from 'react'
import { useApiClient } from '@/lib/api-client'
import type { UpdateSubscriptionRequest, UpdateSubscriptionResponse } from '@/lib/stripe/types'

export function useUpdateSubscription() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [prorationAmount, setProrationAmount] = useState<number | undefined>(undefined)
  const apiClient = useApiClient()

  const updateSubscription = useCallback(async (newPriceId: string) => {
    setIsLoading(true)
    setError(null)
    setSuccess(false)
    setProrationAmount(undefined)

    try {
      const requestData: UpdateSubscriptionRequest = { newPriceId }

      const response = await apiClient.postJson('/api/stripe/update-subscription', requestData)

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erreur lors de la modification de l\'abonnement')
      }

      const result: UpdateSubscriptionResponse = await response.json()

      if (!result.success) {
        throw new Error(result.message || 'Échec de la modification')
      }

      setSuccess(true)
      setProrationAmount(result.prorationAmount)

      return result
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Une erreur est survenue'
      setError(errorMessage)
      console.error('Erreur lors de la modification d\'abonnement:', err)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [apiClient])

  const reset = useCallback(() => {
    setError(null)
    setSuccess(false)
    setProrationAmount(undefined)
  }, [])

  return {
    updateSubscription,
    isLoading,
    error,
    success,
    prorationAmount,
    reset
  }
}
