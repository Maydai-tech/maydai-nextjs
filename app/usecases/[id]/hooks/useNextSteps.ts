import { useState, useEffect, useCallback, useRef } from 'react'
import { UseCaseNextSteps } from '@/lib/supabase'
import { createClient } from '@supabase/supabase-js'
import { shouldPollForNextSteps } from '../utils/nextsteps-ux-state'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

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
  const lastFetchedId = useRef<string | null>(null)

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
      }
      setError(null)

      try {
        const {
          data: { session },
        } = await supabase.auth.getSession()

        if (!session?.access_token) {
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
    if (nextSteps) return

    const poll = shouldPollForNextSteps({
      useCaseStatus: statusRef.current,
      classificationStatus: classRef.current ?? null,
      reportGeneratedAt: reportAtRef.current ?? null,
      parentReportGenerating: parentGenRef.current,
      hasNextSteps: false,
    })

    if (!poll) return

    const intensiveInterval = setInterval(() => {
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
  ])

  const isGenerating = shouldPollForNextSteps({
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
    refetch: () => fetchNextSteps({ silent: false }),
    isGenerating,
  }
}
