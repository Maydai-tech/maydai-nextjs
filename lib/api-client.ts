'use client'

import { useCallback } from 'react'
import { useAuth } from '@/lib/auth'

interface ApiCallOptions extends RequestInit {
  headers?: Record<string, string>
}

/**
 * Hook pour effectuer des appels API avec authentification Bearer token uniquement
 */
export function useApiClient() {
  const { getAccessToken } = useAuth()

  const call = useCallback(async (url: string, options: ApiCallOptions = {}) => {
    // Préparer les headers de base
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...options.headers,
    }

    // Ajouter le Bearer token
    const token = getAccessToken()
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    // Effectuer l'appel API
    return fetch(url, {
      ...options,
      headers,
    })
  }, [getAccessToken])

  // Helper pour les appels POST avec JSON
  const postJson = useCallback(async (url: string, data: any, options: ApiCallOptions = {}) => {
    return call(url, {
      method: 'POST',
      body: JSON.stringify(data),
      ...options,
    })
  }, [call])

  // Helper pour les appels PUT avec JSON
  const putJson = useCallback(async (url: string, data: any, options: ApiCallOptions = {}) => {
    return call(url, {
      method: 'PUT',
      body: JSON.stringify(data),
      ...options,
    })
  }, [call])

  // Helper pour les appels DELETE
  const deleteRequest = useCallback(async (url: string, options: ApiCallOptions = {}) => {
    return call(url, {
      method: 'DELETE',
      ...options,
    })
  }, [call])

  // Helper pour les appels GET
  const get = useCallback(async (url: string, options: ApiCallOptions = {}) => {
    return call(url, {
      method: 'GET',
      ...options,
    })
  }, [call])

  return {
    call,
    get,
    postJson,
    putJson,
    delete: deleteRequest,
  }
}

/**
 * Version non-hook pour utilisation dans les composants de classe ou contextes non-React
 */
export async function apiCall(url: string, options: ApiCallOptions = {}, accessToken?: string) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...options.headers,
  }

  // Ajouter le Bearer token si fourni
  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`
  }

  return fetch(url, {
    ...options,
    headers,
  })
}