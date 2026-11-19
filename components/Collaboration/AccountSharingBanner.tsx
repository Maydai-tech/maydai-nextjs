'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { X } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import {
  DeviceHeartbeatResponseSchema,
  type DeviceHeartbeatResponse,
} from '@/lib/validations/device-session'

const DEVICE_SEED_KEY = 'maydai_device_seed'
const HEARTBEAT_CACHE_KEY = 'maydai_device_heartbeat_result'
const DISMISS_KEY = 'maydai_sharing_banner_dismissed'

async function sha256Hex(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value)
  const digest = await window.crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

function readOrCreateSeed(): string {
  const existing = window.localStorage.getItem(DEVICE_SEED_KEY)
  if (existing && existing.length >= 16) return existing
  const seed = window.crypto.randomUUID()
  window.localStorage.setItem(DEVICE_SEED_KEY, seed)
  return seed
}

export default function AccountSharingBanner() {
  const pathname = usePathname()
  const { getAccessToken } = useAuth()
  const [result, setResult] = useState<DeviceHeartbeatResponse | null>(null)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    let cancelled = false

    const run = async () => {
      try {
        if (window.sessionStorage.getItem(DISMISS_KEY) === '1') {
          setDismissed(true)
          return
        }

        const cached = window.sessionStorage.getItem(HEARTBEAT_CACHE_KEY)
        if (cached) {
          const parsed = DeviceHeartbeatResponseSchema.safeParse(JSON.parse(cached))
          if (parsed.success && !cancelled) setResult(parsed.data)
          return
        }

        const token = getAccessToken()
        if (!token) return

        const seed = readOrCreateSeed()
        const fingerprint = `${seed}|${navigator.userAgent}|${window.screen.width}x${window.screen.height}|${Intl.DateTimeFormat().resolvedOptions().timeZone}`
        const deviceId = await sha256Hex(fingerprint)
        const response = await fetch('/api/auth/device-heartbeat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ deviceId, userAgentHash: null }),
        })
        if (!response.ok) return
        const parsed = DeviceHeartbeatResponseSchema.safeParse(await response.json())
        if (!parsed.success) {
          console.error('[AccountSharingBanner]', parsed.error)
          return
        }
        window.sessionStorage.setItem(HEARTBEAT_CACHE_KEY, JSON.stringify(parsed.data))
        if (!cancelled) setResult(parsed.data)
      } catch (error) {
        console.error('[AccountSharingBanner]', error)
      }
    }

    void run()
    return () => {
      cancelled = true
    }
  }, [getAccessToken])

  if (dismissed || !result?.multipleDevicesDetected) return null

  const dashboardMatch = pathname.match(/^\/dashboard\/([^/]+)/)
  const registryId = dashboardMatch?.[1]
  const inviteHref =
    registryId && registryId !== 'registries'
      ? `/dashboard/${registryId}/collaboration`
      : '/settings?tab=collaboration'

  return (
    <div className="border-b border-[#0080A3]/20 bg-[#0080A3]/5 px-4 py-3 lg:px-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <p className="text-sm text-gray-800 leading-relaxed">
          🤝 Plusieurs personnes semblent consulter ce compte ! Ne partagez pas vos identifiants : votre forfait Freemium inclut gratuitement l&apos;invitation de 2 collaborateurs. Invitez votre collègue depuis l&apos;onglet Collaboration pour assurer une traçabilité individuelle conforme à l&apos;AI Act.
        </p>
        <div className="flex shrink-0 items-center gap-2">
          {result.canInviteMoreCollaborators ? (
            <Link
              href={inviteHref}
              className="inline-flex min-h-11 items-center rounded-lg bg-[#0080A3] px-3 py-2 text-sm font-medium text-white hover:bg-[#006280]"
            >
              Inviter un collaborateur
            </Link>
          ) : (
            <Link
              href="/abonnement"
              className="inline-flex min-h-11 items-center rounded-lg bg-[#0080A3] px-3 py-2 text-sm font-medium text-white hover:bg-[#006280]"
            >
              Débloquer plus de collaborateurs
            </Link>
          )}
          <button
            type="button"
            aria-label="Fermer le bandeau pour cette session"
            className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-gray-500 hover:bg-white"
            onClick={() => {
              window.sessionStorage.setItem(DISMISS_KEY, '1')
              setDismissed(true)
            }}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
