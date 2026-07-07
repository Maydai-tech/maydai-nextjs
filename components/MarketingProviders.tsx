'use client'

import { Suspense } from 'react'
import DeferredGoogleTagManager from '@/components/DeferredGoogleTagManager'
import GTMPageViewTracker from '@/components/GTMPageViewTracker'
import AttributionCapture from '@/components/tracking/AttributionCapture'

const GTM_CONTAINER_ID = 'GTM-KLSD6BXG'

interface MarketingProvidersProps {
  children: React.ReactNode
  /** GTM prod uniquement — passé depuis le layout serveur marketing */
  loadOfficialGTM: boolean
  nonce?: string
}

/**
 * Providers site vitrine : tracking uniquement (pas d'auth, pas de sidebar).
 */
export default function MarketingProviders({
  children,
  loadOfficialGTM,
  nonce,
}: MarketingProvidersProps) {
  return (
    <>
      {loadOfficialGTM && (
        <DeferredGoogleTagManager
          gtmId={GTM_CONTAINER_ID}
          nonce={nonce}
          safetyTimeoutMs={3000}
        />
      )}

      <Suspense fallback={null}>
        <AttributionCapture />
      </Suspense>
      <GTMPageViewTracker />
      {children}
    </>
  )
}
