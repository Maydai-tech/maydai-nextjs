'use client'

import { useState, useCallback } from 'react'
import { useApiCall } from '@/lib/api-client-legacy'
import type { ModelProviderOption, ModelOption } from '../types'

export interface UseModelProvidersReturn {
  partners: ModelProviderOption[]
  loadingPartners: boolean
  partnersError: string
  availableModels: ModelOption[]
  loadingModels: boolean
  fetchPartners: () => Promise<void>
  fetchModelsForProvider: (providerId: number) => Promise<void>
  clearModels: () => void
}

export function useModelProviders(): UseModelProvidersReturn {
  const [partners, setPartners] = useState<ModelProviderOption[]>([])
  const [loadingPartners, setLoadingPartners] = useState(false)
  const [partnersError, setPartnersError] = useState('')
  const [availableModels, setAvailableModels] = useState<ModelOption[]>([])
  const [loadingModels, setLoadingModels] = useState(false)
  const api = useApiCall()

  const fetchPartners = useCallback(async () => {
    try {
      setLoadingPartners(true)
      const response = await api.get('/api/model-providers')

      if (!response.data || response.data.length === 0) {
        setPartnersError('Aucun partenaire technologique disponible')
        setPartners([])
      } else {
        setPartners(response.data)
        setPartnersError('')
      }
    } catch (error) {
      console.error('Erreur lors du chargement des partenaires:', error)
      setPartnersError('Impossible de charger les partenaires technologiques')
      setPartners([])
    } finally {
      setLoadingPartners(false)
    }
  }, [api])

  const fetchModelsForProvider = useCallback(async (providerId: number) => {
    if (!providerId) {
      setAvailableModels([])
      return
    }

    try {
      setLoadingModels(true)
      const response = await api.get(`/api/model-providers/${providerId}/models`)
      setAvailableModels(response.data || [])
    } catch (error) {
      console.error('Erreur lors du chargement des modèles:', error)
      setAvailableModels([])
    } finally {
      setLoadingModels(false)
    }
  }, [api])

  const clearModels = useCallback(() => {
    setAvailableModels([])
  }, [])

  return {
    partners,
    loadingPartners,
    partnersError,
    availableModels,
    loadingModels,
    fetchPartners,
    fetchModelsForProvider,
    clearModels,
  }
}
