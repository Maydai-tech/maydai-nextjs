'use client'

import { useState, useCallback } from 'react'
import { useApiClient } from '@/lib/api-client'

interface ReactivateSubscriptionResponse {
  success: boolean
  message: string
}

export function useReactivateSubscription() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const apiClient = useApiClient()

  const reactivateSubscription = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    setSuccess(false)

    try {
      const response = await apiClient.postJson('/api/stripe/reactivate-subscription', {})

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erreur lors de la réactivation de l\'abonnement')
      }

      const result: ReactivateSubscriptionResponse = await response.json()

      if (!result.success) {
        throw new Error(result.message || 'Échec de la réactivation')
      }

      setSuccess(true)
      return result
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Une erreur est survenue'
      setError(errorMessage)
      console.error('Erreur lors de la réactivation d\'abonnement:', err)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [apiClient])

  const reset = useCallback(() => {
    setError(null)
    setSuccess(false)
  }, [])

  return {
    reactivateSubscription,
    isLoading,
    error,
    success,
    reset
  }
}
