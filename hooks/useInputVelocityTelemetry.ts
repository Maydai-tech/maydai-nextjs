'use client'

import { useCallback, useRef } from 'react'
import {
  InputTelemetrySchema,
  type InputTelemetry,
} from '@/lib/validations/governance-scores'

interface VelocityCounts {
  keystrokes_count: number
  paste_events_count: number
  pasted_chars_count: number
  total_chars_count: number
}

/**
 * Compteurs de frappe hors rendu : aucune mise à jour d'état pendant la saisie.
 */
export function useInputVelocityTelemetry() {
  const counts = useRef<VelocityCounts>({
    keystrokes_count: 0,
    paste_events_count: 0,
    pasted_chars_count: 0,
    total_chars_count: 0,
  })

  const handleKeyDown = useCallback((event: React.KeyboardEvent<HTMLElement>) => {
    if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
      counts.current.keystrokes_count += 1
      counts.current.total_chars_count += 1
    }
  }, [])

  const handlePaste = useCallback((event: React.ClipboardEvent<HTMLElement>) => {
    const pasted = event.clipboardData?.getData('text') || ''
    counts.current.paste_events_count += 1
    counts.current.pasted_chars_count += pasted.length
    counts.current.total_chars_count += pasted.length
  }, [])

  const getTelemetrySnapshot = useCallback((): InputTelemetry => {
    return InputTelemetrySchema.parse({
      ...counts.current,
      captured_at: new Date().toISOString(),
    })
  }, [])

  return { handleKeyDown, handlePaste, getTelemetrySnapshot }
}
