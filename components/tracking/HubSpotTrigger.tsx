'use client'

import { useEffect } from 'react'
import { sendGTMEvent } from '@/lib/gtm'

interface HubSpotFormMessage {
  eventName: string
  id: string
}

function isHubSpotFormMessage(data: unknown): data is HubSpotFormMessage {
  return (
    typeof data === 'object' &&
    data !== null &&
    'eventName' in data &&
    'id' in data &&
    typeof (data as HubSpotFormMessage).eventName === 'string' &&
    typeof (data as HubSpotFormMessage).id === 'string'
  )
}

export default function HubSpotTrigger() {
  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (!isHubSpotFormMessage(event.data)) return
      if (event.data.eventName !== 'onFormSubmitted') return

      sendGTMEvent({
        event: 'hubspot_form_success',
        form_id: event.data.id,
      })
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [])

  return null
}
