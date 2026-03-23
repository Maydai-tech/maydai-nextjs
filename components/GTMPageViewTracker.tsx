'use client'

import { usePathname } from 'next/navigation'
import { useEffect, useRef } from 'react'
import { sendPageViewEvent } from '@/lib/gtm'

export default function GTMPageViewTracker() {
  const pathname = usePathname()
  const previousPathname = useRef<string | null>(null)

  useEffect(() => {
    if (pathname && pathname !== previousPathname.current) {
      sendPageViewEvent(pathname, document.title)
      previousPathname.current = pathname
    }
  }, [pathname])

  return null
}
