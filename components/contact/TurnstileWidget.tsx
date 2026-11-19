'use client'

import { useEffect, useRef, useState } from 'react'
import Script from 'next/script'

type TurnstileRenderOptions = {
  sitekey: string
  theme?: 'light' | 'dark' | 'auto'
  size?: 'normal' | 'compact' | 'flexible'
  callback?: (token: string) => void
  'expired-callback'?: () => void
  'error-callback'?: () => void
}

type TurnstileApi = {
  render: (container: HTMLElement, options: TurnstileRenderOptions) => string
  reset: (widgetId?: string) => void
  remove: (widgetId: string) => void
}

declare global {
  interface Window {
    turnstile?: TurnstileApi
  }
}

type TurnstileWidgetProps = {
  resetKey?: number
}

export default function TurnstileWidget({ resetKey = 0 }: TurnstileWidgetProps) {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY
  const containerRef = useRef<HTMLDivElement | null>(null)
  const widgetIdRef = useRef<string | null>(null)
  const [token, setToken] = useState('')
  const [scriptLoaded, setScriptLoaded] = useState(false)

  useEffect(() => {
    if (typeof window !== 'undefined' && window.turnstile) {
      setScriptLoaded(true)
    }
  }, [])

  useEffect(() => {
    if (!siteKey || !scriptLoaded || !containerRef.current || !window.turnstile) {
      return
    }

    if (widgetIdRef.current) {
      try {
        window.turnstile.remove(widgetIdRef.current)
      } catch (error) {
        console.error('[TurnstileWidget] Erreur nettoyage widget:', error)
      }
      widgetIdRef.current = null
    }

    setToken('')

    widgetIdRef.current = window.turnstile.render(containerRef.current, {
      sitekey: siteKey,
      theme: 'light',
      callback: (issuedToken: string) => {
        setToken(issuedToken)
      },
      'expired-callback': () => {
        setToken('')
      },
      'error-callback': () => {
        setToken('')
      },
    })

    return () => {
      if (widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current)
        } catch (error) {
          console.error('[TurnstileWidget] Erreur démontage widget:', error)
        }
        widgetIdRef.current = null
      }
    }
  }, [siteKey, scriptLoaded, resetKey])

  if (!siteKey) {
    return null
  }

  return (
    <div className="my-2">
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        strategy="afterInteractive"
        onLoad={() => setScriptLoaded(true)}
      />
      <div ref={containerRef} />
      <input type="hidden" name="cf-turnstile-response" value={token} />
    </div>
  )
}
