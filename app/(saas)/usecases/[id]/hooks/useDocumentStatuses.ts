/**
 * Hook pour récupérer les statuts de tous les documents de conformité d'un use case
 */

import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '@/lib/auth'
import { getDocumentTypesForStatusHook } from '@/lib/canonical-actions'

export interface DocumentStatus {
  status: 'incomplete' | 'complete' | 'validated'
  formData?: any
  fileUrl?: string
  updatedAt?: string
}

export type DocumentStatuses = Record<string, DocumentStatus>

// Types interrogés pour les statuts (aligné sur le catalogue canonique)
const DOCUMENT_TYPES = getDocumentTypesForStatusHook()

export function useDocumentStatuses(usecaseId: string | null) {
  const { session } = useAuth()
  const [statuses, setStatuses] = useState<DocumentStatuses>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchStatuses = useCallback(async () => {
    if (!usecaseId || !session?.access_token) {
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    const fetchedStatuses: DocumentStatuses = {}

    try {
      await Promise.all(
        DOCUMENT_TYPES.map(async (docType) => {
          try {
            const res = await fetch(`/api/dossiers/${usecaseId}/${docType}`, {
              headers: { Authorization: `Bearer ${session.access_token}` },
            })

            if (res.ok) {
              const doc = await res.json()
              fetchedStatuses[docType] = {
                status: doc.status || 'incomplete',
                formData: doc.formData,
                fileUrl: doc.fileUrl,
                updatedAt: doc.updatedAt,
              }
            } else {
              fetchedStatuses[docType] = { status: 'incomplete' }
            }
          } catch (err) {
            console.warn(`Error fetching status for ${docType}:`, err)
            fetchedStatuses[docType] = { status: 'incomplete' }
          }
        })
      )

      setStatuses(fetchedStatuses)
    } catch (err) {
      console.error('Error fetching document statuses:', err)
      setError('Erreur lors du chargement des statuts des documents')
    } finally {
      setLoading(false)
    }
  }, [usecaseId, session?.access_token])

  useEffect(() => {
    void fetchStatuses()
  }, [fetchStatuses])

  useEffect(() => {
    if (!usecaseId || !session?.access_token) return

    const refetchIfVisible = () => {
      if (document.visibilityState === 'visible') {
        void fetchStatuses()
      }
    }

    document.addEventListener('visibilitychange', refetchIfVisible)
    window.addEventListener('focus', refetchIfVisible)

    return () => {
      document.removeEventListener('visibilitychange', refetchIfVisible)
      window.removeEventListener('focus', refetchIfVisible)
    }
  }, [usecaseId, session?.access_token, fetchStatuses])

  return { statuses, loading, error, refetch: fetchStatuses }
}
