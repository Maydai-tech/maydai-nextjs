'use client'

import { Suspense } from 'react'
import { AuthProvider } from '@/lib/auth'
import ConditionalLayout from '@/components/ConditionalLayout'
import DeferredGoogleTagManager from '@/components/DeferredGoogleTagManager'
import SmartLoader from '@/components/SmartLoader'
import GTMPageViewTracker from '@/components/GTMPageViewTracker'
import HubSpotTrigger from '@/components/tracking/HubSpotTrigger'
import AttributionCapture from '@/components/tracking/AttributionCapture'

const GTM_CONTAINER_ID = 'GTM-KLSD6BXG'

interface RootProvidersProps {
  children: React.ReactNode
  /** GTM prod uniquement — passé depuis le layout serveur */
  loadOfficialGTM?: boolean
  nonce?: string
}

/**
 * Arbre client global (auth, tracking, layout conditionnel).
 * Extrait du layout pour permettre un layout minimal de diagnostic.
 */
export default function RootProviders({
  children,
  loadOfficialGTM = false,
  nonce,
}: RootProvidersProps) {
  return (
    <>
      {loadOfficialGTM && (
        <DeferredGoogleTagManager
          gtmId={GTM_CONTAINER_ID}
          nonce={nonce}
          safetyTimeoutMs={3000}
        />
      )}

      <AuthProvider>
        <Suspense fallback={null}>
          <AttributionCapture />
        </Suspense>
        <GTMPageViewTracker />
        <HubSpotTrigger />
        <SmartLoader>
          <ConditionalLayout>{children}</ConditionalLayout>
        </SmartLoader>
      </AuthProvider>
    </>
  )
}
