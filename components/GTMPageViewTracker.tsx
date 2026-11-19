'use client'

import { usePathname } from 'next/navigation'
import { useEffect, useRef } from 'react'
import { sendPageViewEvent } from '@/lib/gtm'

export default function GTMPageViewTracker() {
  const pathname = usePathname()
  const previousPathname = useRef<string | null>(null)

  useEffect(() => {
    if (pathname && pathname !== previousPathname.current) {
      previousPathname.current = pathname
      void (async () => {
        try {
          await sendPageViewEvent(pathname, document.title)
        } catch (err) {
          console.error('[gtm] Page view tracking failed:', err)
        }
      })()
    }
  }, [pathname])

  return null
}
