import { useState, useEffect, useMemo } from 'react'

/** Date cible de pleine applicabilité de l'IA Act (T0) - Dimanche 2 août 2026 à minuit CEST */
export const AI_ACT_FULL_APPLICABILITY_AT = new Date('2026-08-02T00:00:00+02:00')

export interface AIActCountdownState {
  days: number
  isPassed: boolean
  label: string
  isMounted: boolean
}

export function useAIActCountdown(): AIActCountdownState {
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  return useMemo(() => {
    if (!isMounted) {
      // Sécurité SSR : État neutre par défaut pour le rendu serveur
      return { days: 0, isPassed: false, label: 'jours', isMounted: false }
    }

    const now = new Date()
    const diffMs = now.getTime() - AI_ACT_FULL_APPLICABILITY_AT.getTime()
    const isPassed = diffMs >= 0

    let days = 0

    if (isPassed) {
      // Post-2 août : X = Floor(Date du jour - T0)
      days = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    } else {
      // Pré-2 août : Historique des jours restants (plancher à 0)
      const t0 = new Date(AI_ACT_FULL_APPLICABILITY_AT)
      t0.setHours(0, 0, 0, 0)
      const n = new Date()
      n.setHours(0, 0, 0, 0)
      days = Math.max(0, Math.ceil((t0.getTime() - n.getTime()) / (1000 * 60 * 60 * 24)))
    }

    const label = days <= 1 ? 'jour' : 'jours'

    return { days, isPassed, label, isMounted }
  }, [isMounted])
}
