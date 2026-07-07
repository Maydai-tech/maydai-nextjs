import { useState, useEffect, useCallback, useRef } from 'react'
import { UseCaseNextSteps } from '@/lib/supabase'
import { supabase } from '@/lib/supabase'
import { shouldPollForNextSteps } from '../utils/nextsteps-ux-state'

/** Délai max d’attente de la ligne `usecase_nextsteps` après un rapport persisté (évite loader infini). */
const NEXTSTEPS_SYNC_POLL_MAX_MS = 2 * 60 * 1000

interface UseNextStepsProps {
  usecaseId: string
  useCaseStatus?: string
  useCaseUpdatedAt?: string
  /** usecases.report_generated_at — présent dès que le rapport IA a été persisté */
  reportGeneratedAt?: string | null
  /** Pendant POST /api/generate-report côté parent */
  parentReportGenerating?: boolean
  classificationStatus?: string | null
}

interface UseNextStepsReturn {
  nextSteps: UseCaseNextSteps | null
  /** True uniquement pendant le tout premier chargement pour ce use case (pas les polls). */
  loading: boolean
  error: string | null
  /** True si le polling n’a pas reçu de next steps dans le délai imparti (sortie du loader « finalisation »). */
  syncStalled: boolean
  refetch: () => Promise<void>
  /**
   * @deprecated Préférer la phase côté UI via getNextStepsRecommendationsPhase.
   * True si on attend encore la ligne usecase_nextsteps alors qu’un rapport est en cours / déjà persisté.
   */
  isGenerating: boolean
}

export function useNextSteps({
  usecaseId,
  useCaseStatus,
  useCaseUpdatedAt,
  reportGeneratedAt,
  parentReportGenerating = false,
  classificationStatus,
}: UseNextStepsProps): UseNextStepsReturn {
  const [nextSteps, setNextSteps] = useState<UseCaseNextSteps | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [syncStalled, setSyncStalled] = useState(false)
  const lastFetchedId = useRef<string | null>(null)
  const pollDeadlineRef = useRef<number | null>(null)

  const statusRef = useRef(useCaseStatus)
  statusRef.current = useCaseStatus
  const reportAtRef = useRef(reportGeneratedAt)
  reportAtRef.current = reportGeneratedAt
  const classRef = useRef(classificationStatus)
  classRef.current = classificationStatus
  const parentGenRef = useRef(parentReportGenerating)
  parentGenRef.current = parentReportGenerating

  const fetchNextSteps = useCallback(
    async (options?: { silent?: boolean }) => {
      if (!usecaseId || usecaseId === '') return

      const silent = Boolean(options?.silent)
      if (!silent) {
        setLoading(true)
        setError(null)
      }

      try {
        const {
          data: { session },
        } = await supabase.auth.getSession()

        if (!session?.access_token) {
          console.error('[useNextSteps] No session found for token propagation')
          setError('Non authentifié')
          return
        }

        const response = await fetch(`/api/usecases/${usecaseId}/nextsteps`, {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
        })

        let data: unknown = null
        try {
          data = await response.json()
        } catch {
          data = null
        }

        if (response.ok) {
          setError(null)
          setNextSteps((data as UseCaseNextSteps | null) ?? null)
        } else if (response.status === 404) {
          // Rétrocompat : ancienne API « pas de ligne » en 404
          setNextSteps(null)
        } else {
          const msg =
            typeof data === 'object' &&
            data !== null &&
            'error' in data &&
            typeof (data as { error: unknown }).error === 'string'
              ? (data as { error: string }).error
              : 'Erreur lors de la récupération des prochaines étapes'
          setError(msg)
        }
      } catch (err) {
        setError('Erreur de connexion')
        console.error('Erreur fetchNextSteps:', err)
      } finally {
        if (!silent) {
          setLoading(false)
        }
      }
    },
    [usecaseId]
  )

  useEffect(() => {
    pollDeadlineRef.current = null
    setSyncStalled(false)
  }, [usecaseId])

  useEffect(() => {
    if (nextSteps) {
      setSyncStalled(false)
      pollDeadlineRef.current = null
    }
  }, [nextSteps])

  useEffect(() => {
    if (!usecaseId || usecaseId === '') return
    if (lastFetchedId.current !== usecaseId) {
      lastFetchedId.current = usecaseId
      void fetchNextSteps({ silent: false })
    }
  }, [fetchNextSteps, usecaseId])

  const lastHandledUpdatedAt = useRef<string | null>(null)

  useEffect(() => {
    if (useCaseStatus === 'completed' && useCaseUpdatedAt) {
      if (lastHandledUpdatedAt.current === useCaseUpdatedAt) return
      lastHandledUpdatedAt.current = useCaseUpdatedAt
      const timeout = setTimeout(() => {
        void fetchNextSteps({ silent: true })
      }, 2000)
      return () => clearTimeout(timeout)
    }
  }, [useCaseStatus, useCaseUpdatedAt, fetchNextSteps])

  useEffect(() => {
    if (!usecaseId || usecaseId === '') return
    if (nextSteps) {
      return
    }
    if (syncStalled) return

    const poll = shouldPollForNextSteps({
      useCaseStatus: statusRef.current,
      classificationStatus: classRef.current ?? null,
      reportGeneratedAt: reportAtRef.current ?? null,
      parentReportGenerating: parentGenRef.current,
      hasNextSteps: false,
    })

    if (!poll) {
      pollDeadlineRef.current = null
      return
    }

    if (pollDeadlineRef.current === null) {
      pollDeadlineRef.current = Date.now() + NEXTSTEPS_SYNC_POLL_MAX_MS
    }

    const intensiveInterval = setInterval(() => {
      if (pollDeadlineRef.current !== null && Date.now() > pollDeadlineRef.current) {
        clearInterval(intensiveInterval)
        setSyncStalled(true)
        setError(
          "Échec de la synchronisation du plan d'action (délai dépassé). Veuillez rafraîchir la page ou regénérer le rapport."
        )
        console.error(
          '[useNextSteps] Synchronisation usecase_nextsteps interrompue : délai dépassé sans ligne en base',
          { usecaseId, maxMs: NEXTSTEPS_SYNC_POLL_MAX_MS }
        )
        return
      }
      void fetchNextSteps({ silent: true })
    }, 5000)

    return () => clearInterval(intensiveInterval)
  }, [
    fetchNextSteps,
    nextSteps,
    usecaseId,
    useCaseStatus,
    reportGeneratedAt,
    parentReportGenerating,
    classificationStatus,
    syncStalled,
  ])

  const isGenerating =
    !syncStalled &&
    shouldPollForNextSteps({
      useCaseStatus,
      classificationStatus: classificationStatus ?? null,
      reportGeneratedAt: reportGeneratedAt ?? null,
      parentReportGenerating,
      hasNextSteps: Boolean(nextSteps),
    })

  return {
    nextSteps,
    loading,
    error,
    syncStalled,
    refetch: () => fetchNextSteps({ silent: false }),
    isGenerating,
  }
}
