'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth'
import { computeSlotStatuses, type SlotStatusMap } from '@/lib/slot-statuses'

/**
 * Charge les réponses questionnaire et calcule les statuts OUI/NON/Information insuffisante
 * pour les 9 slots standard du rapport (aligné sur `lib/slot-statuses.ts`).
 */
export function useQuestionnaireSlotStatuses(
  usecaseId: string | null | undefined,
  enabled: boolean,
  options?: {
    questionnaireVersion?: number | null
    activeQuestionCodes?: string[] | null
  }
) {
  const { session } = useAuth()
  const [slotStatuses, setSlotStatuses] = useState<SlotStatusMap | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!enabled || !usecaseId || !session?.access_token) {
      setSlotStatuses(null)
      return
    }

    let cancelled = false

    ;(async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/usecases/${usecaseId}/responses`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        })
        if (!res.ok || cancelled) return
        const responses = (await res.json()) as unknown
        const list = Array.isArray(responses) ? responses : []
        if (!cancelled) {
          setSlotStatuses(
            computeSlotStatuses(list as Parameters<typeof computeSlotStatuses>[0], {
              questionnaireVersion: options?.questionnaireVersion,
              activeQuestionCodes: options?.activeQuestionCodes,
            })
          )
        }
      } catch {
        if (!cancelled) setSlotStatuses(null)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [
    usecaseId,
    session?.access_token,
    enabled,
    options?.questionnaireVersion,
    JSON.stringify(options?.activeQuestionCodes ?? []),
  ])

  return { slotStatuses, loading }
}
