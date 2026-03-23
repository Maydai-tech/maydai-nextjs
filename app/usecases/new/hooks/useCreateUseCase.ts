'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useApiCall } from '@/lib/api-client-legacy'
import type { CreateUseCasePayload } from '../types'

export interface UseCreateUseCaseReturn {
  submit: (payload: CreateUseCasePayload) => Promise<void>
  submitting: boolean
  error: string
  clearError: () => void
}

export function useCreateUseCase(): UseCreateUseCaseReturn {
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const api = useApiCall()

  const submit = useCallback(async (payload: CreateUseCasePayload) => {
    setSubmitting(true)
    setError('')

    try {
      const response = await api.post('/api/usecases', payload)

      if (response.status >= 400) {
        let errorMessage = 'Erreur lors de la création du cas d\'usage'
        const errorCode = response.data?.code

        if (errorCode === 'PLAN_LIMIT_REACHED') {
          const limit = response.data?.limit || 3
          const current = response.data?.current || 0
          errorMessage = `Vous avez atteint la limite de ${limit} cas d'usage pour ce registre (${current}/${limit}). Mettez à niveau votre plan pour en créer davantage.`
        } else if (errorCode === 'ACCESS_DENIED') {
          errorMessage = 'Vous n\'avez pas les droits pour créer un cas d\'usage dans ce registre.'
        } else if (response.status === 401) {
          errorMessage = 'Votre session a expiré. Veuillez vous reconnecter.'
        } else {
          errorMessage = response.data?.error || response.error || errorMessage
        }

        setError(errorMessage)
        return
      }

      if (response.data?.id) {
        router.push(`/usecases/${response.data.id}/evaluation`)
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erreur lors de la création du cas d\'usage'
      setError(message)
    } finally {
      setSubmitting(false)
    }
  }, [api, router])

  const clearError = useCallback(() => setError(''), [])

  return { submit, submitting, error, clearError }
}
