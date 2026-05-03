'use client'

import { usePersistAcquisitionFromSearchParams } from '@/hooks/usePersistAcquisitionFromSearchParams'

/**
 * Monté une fois dans le layout : à chaque navigation,
 * fusionne gclid / autres click ids / UTM (useSearchParams) dans localStorage + cookie.
 */
export default function AttributionCapture() {
  usePersistAcquisitionFromSearchParams()
  return null
}
