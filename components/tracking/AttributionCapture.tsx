'use client'

import { useEffect } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { captureAttributionFromCurrentUrl } from '@/lib/tracking/capture-params'

/**
 * Monté une fois dans le layout : à chaque navigation avec query string,
 * fusionne gclid / fbclid / UTM dans localStorage + cookie.
 */
export default function AttributionCapture() {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    captureAttributionFromCurrentUrl()
  }, [pathname, searchParams])

  return null
}
