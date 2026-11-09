import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedSupabaseClient } from '@/lib/api-auth'
import { recordAndEvaluateDeviceSession } from '@/lib/services/deviceSessionService'
import { DeviceHeartbeatRequestSchema } from '@/lib/validations/device-session'

function clientIp(request: NextRequest): string | null {
  const forwarded = request.headers.get('x-forwarded-for')
  const firstHop = forwarded?.split(',')[0]?.trim()
  if (firstHop) return firstHop
  const realIp = request.headers.get('x-real-ip')?.trim()
  return realIp || null
}

async function resolveUserId(request: NextRequest): Promise<string> {
  const authHeader = request.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ')) {
    const { user } = await getAuthenticatedSupabaseClient(request)
    return user.id
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Configuration Supabase manquante')
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll() {
        /* lecture seule */
      },
    },
  })

  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) {
    console.error('[API /api/auth/device-heartbeat]', error)
    throw new Error('Invalid token')
  }
  return user.id
}

export async function POST(request: NextRequest) {
  try {
    const userId = await resolveUserId(request)
    const rawBody = await request.json().catch(() => null)
    const parsed = DeviceHeartbeatRequestSchema.safeParse(rawBody)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Payload invalide', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const evaluation = await recordAndEvaluateDeviceSession({
      userId,
      deviceId: parsed.data.deviceId,
      userAgentHash: parsed.data.userAgentHash ?? null,
      rawIp: clientIp(request),
    })

    return NextResponse.json(evaluation)
  } catch (error) {
    console.error('[API /api/auth/device-heartbeat]', error)
    const message = error instanceof Error ? error.message : 'Erreur DB'
    if (message === 'No authorization header' || message === 'Invalid token') {
      return NextResponse.json({ error: message }, { status: 401 })
    }
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
