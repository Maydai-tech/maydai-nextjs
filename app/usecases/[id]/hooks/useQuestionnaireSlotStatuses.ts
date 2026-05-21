'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth'
import { mergeShortPathPacksIntoResponses } from '@/lib/openai-data-transformer'
import {
  computeSlotStatuses,
  type ResponseInput,
  type SlotStatusMap,
} from '@/lib/slot-statuses'

/** Lignes réellement persistées dans `usecase_responses` (présence d’un `id` Supabase). */
function persistedQuestionCodesFromApiRows(rows: unknown[]): Set<string> {
  return new Set(
    rows
      .filter(
        (r): r is { question_code: string; id?: unknown } =>
          typeof r === 'object' &&
          r !== null &&
          typeof (r as { question_code?: unknown }).question_code === 'string' &&
          (r as { id?: unknown }).id != null
      )
      .map((r) => r.question_code)
  )
}

/**
 * Charge les réponses questionnaire et calcule les statuts OUI/NON/Information insuffisante
 * pour les 9 slots standard du rapport.
 *
 * Pipeline aligné sur `app/api/generate-report/route.ts` :
 * - GET `/api/usecases/[id]/responses` fusionne déjà `checklist_gov_*` ;
 * - dépliage des packs `V3_SHORT_*` via `mergeShortPathPacksIntoResponses` ;
 * - `persistedQuestionCodes` pour l’extension du périmètre gouvernance E5/E6.
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
  const [questionnaireResponses, setQuestionnaireResponses] = useState<unknown[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!enabled || !usecaseId || !session?.access_token) {
      setSlotStatuses(null)
      setQuestionnaireResponses([])
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
        const persistedQuestionCodes = persistedQuestionCodesFromApiRows(list)
        const slotReadyResponses = mergeShortPathPacksIntoResponses(
          list as ResponseInput[]
        )
        if (!cancelled) {
          setQuestionnaireResponses(slotReadyResponses)
          setSlotStatuses(
            computeSlotStatuses(slotReadyResponses, {
              questionnaireVersion: options?.questionnaireVersion,
              activeQuestionCodes: options?.activeQuestionCodes,
              persistedQuestionCodes,
            })
          )
        }
      } catch {
        if (!cancelled) {
          setSlotStatuses(null)
          setQuestionnaireResponses([])
        }
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

  return { slotStatuses, loading, questionnaireResponses }
}
