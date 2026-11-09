import { NextRequest, NextResponse } from 'next/server'
import { confirmDeletionAndStart24hTimer } from '@/lib/services/governancePurgeService'
import { ConfirmDeletionPayloadSchema } from '@/lib/validations/governance-scores'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://www.maydai.io'

function readPayload(request: NextRequest, body: unknown) {
  const query = request.nextUrl.searchParams
  const record = body && typeof body === 'object' ? (body as Record<string, unknown>) : {}
  return ConfirmDeletionPayloadSchema.safeParse({
    type: record.type ?? query.get('type'),
    id: record.id ?? query.get('id'),
    token: record.token ?? query.get('token'),
  })
}

export async function GET(request: NextRequest) {
  const parsed = readPayload(request, null)
  if (!parsed.success) {
    return NextResponse.redirect(`${APP_URL}/dashboard/registries?purge_error=invalid_token`)
  }

  try {
    const result = await confirmDeletionAndStart24hTimer({
      entityType: parsed.data.type,
      entityId: parsed.data.id,
      rawToken: parsed.data.token,
    })
    if (!result.ok) {
      return NextResponse.redirect(`${APP_URL}/dashboard/registries?purge_error=invalid_token`)
    }
    return NextResponse.redirect(`${APP_URL}/dashboard/registries?purge_started=1`)
  } catch (error) {
    console.error('[GET /api/governance/confirm-deletion]', error)
    return NextResponse.redirect(`${APP_URL}/dashboard/registries?purge_error=invalid_token`)
  }
}

export async function POST(request: NextRequest) {
  let body: unknown = null
  try {
    body = await request.json()
  } catch (error) {
    console.error('[POST /api/governance/confirm-deletion] body', error)
    body = null
  }

  const parsed = readPayload(request, body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Jeton de confirmation invalide ou déjà utilisé' }, { status: 400 })
  }

  try {
    const result = await confirmDeletionAndStart24hTimer({
      entityType: parsed.data.type,
      entityId: parsed.data.id,
      rawToken: parsed.data.token,
    })
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }
    return NextResponse.json(result)
  } catch (error) {
    console.error('[POST /api/governance/confirm-deletion]', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur DB' },
      { status: 500 }
    )
  }
}
