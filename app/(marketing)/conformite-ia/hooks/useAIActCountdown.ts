import { useMemo } from 'react'

/** Pleine applicabilité AI Act — date unique utilisée pour le compteur (alignée avec le Hero conformité). */
export const AI_ACT_FULL_APPLICABILITY_AT = new Date('2026-08-02')

function calendarDaysUntil(target: Date): number {
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const t = new Date(target)
  t.setHours(0, 0, 0, 0)
  const diffMs = t.getTime() - now.getTime()
  return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)))
}

/**
 * Jours restants avant `AI_ACT_FULL_APPLICABILITY_AT` (comparaison en jours calendaires locaux, plancher à 0).
 * Recalculé à chaque montage du composant consommateur (comportement identique à l’ancien `useDaysUntil` local).
 */
export function useAIActCountdown(): number {
  return useMemo(
    () => calendarDaysUntil(AI_ACT_FULL_APPLICABILITY_AT),
    [],
  )
}
