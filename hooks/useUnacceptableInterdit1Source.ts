'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  buildUnacceptableInterdit1,
  getUnacceptableInterdit1ResponsesSearchParams,
  type UsecaseResponseRow,
} from '@/lib/build-unacceptable-interdit1'

type Options = {
  useCaseId: string | null
  authToken: string | null | undefined
  enabled: boolean
}

/**
 * Charge les réponses questionnaire via l'API existante et produit interdit_1 (E4.N7.* uniquement).
 */
export function useUnacceptableInterdit1Source({
  useCaseId,
  authToken,
  enabled,
}: Options) {
  const [rows, setRows] = useState<UsecaseResponseRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchResponses = useCallback(async () => {
    if (!useCaseId || !authToken || !enabled) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(
        `/api/usecases/${useCaseId}/responses?${getUnacceptableInterdit1ResponsesSearchParams()}`,
        {
          headers: { Authorization: `Bearer ${authToken}` },
        },
      )
      if (!res.ok) {
        setError('Impossible de charger les réponses du questionnaire.')
        setRows([])
        return
      }
      const data = (await res.json()) as unknown
      if (!Array.isArray(data)) {
        setRows([])
        return
      }
      setRows(data as UsecaseResponseRow[])
    } catch {
      setError('Impossible de charger les réponses du questionnaire.')
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [useCaseId, authToken, enabled])

  useEffect(() => {
    if (!enabled || !useCaseId || !authToken) {
      setRows([])
      setLoading(false)
      setError(null)
      return
    }
    void fetchResponses()
  }, [enabled, useCaseId, authToken, fetchResponses])

  const interdit1Text = useMemo(() => buildUnacceptableInterdit1(rows), [rows])

  return { interdit1Text, loading, error, refetch: fetchResponses }
}
