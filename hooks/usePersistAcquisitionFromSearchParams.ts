'use client'

import { useEffect } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import {
  parseAttributionFromSearchParams,
  persistAttributionMerge,
} from '@/lib/tracking/capture-params'

/**
 * À chaque navigation : fusionne gclid + UTM depuis l’URL (useSearchParams)
 * vers localStorage + cookie (première capture ou enrichissement).
 */
export function usePersistAcquisitionFromSearchParams(): void {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    persistAttributionMerge(parseAttributionFromSearchParams(searchParams))
  }, [pathname, searchParams])
}
