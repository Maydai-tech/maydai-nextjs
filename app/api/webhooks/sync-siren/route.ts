import { NextRequest, NextResponse } from 'next/server'
import { syncProfileSirenToRegistries } from '@/lib/services/registryScoreService'
import { SyncSirenWebhookSchema } from '@/lib/validations/sync-siren-webhook'

function isAuthorizedInternalRequest(request: NextRequest): boolean {
  const expectedKey = process.env.INTERNAL_API_KEY
  if (!expectedKey) {
    console.error('[Webhook Sync Siren] INTERNAL_API_KEY non configuré')
    return false
  }

  const providedKey = request.headers.get('x-internal-api-key')
  return providedKey === expectedKey
}

export async function POST(request: NextRequest) {
  if (!isAuthorizedInternalRequest(request)) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'JSON invalide' }, { status: 400 })
  }

  const validation = SyncSirenWebhookSchema.safeParse(body)
  if (!validation.success) {
    return NextResponse.json(validation.error.flatten().fieldErrors, { status: 400 })
  }

  const { userId, siren } = validation.data
  const normalizedSiren = (siren ?? '').trim()

  try {
    const result = await syncProfileSirenToRegistries(userId, normalizedSiren)
    return NextResponse.json({
      success: true,
      updatedCount: result.updatedCount,
      companyIds: result.companyIds,
    })
  } catch (error) {
    console.error('[Webhook Sync Siren]', error)
    return NextResponse.json(
      { error: 'Échec de la synchronisation SIREN vers les registres' },
      { status: 500 }
    )
  }
}
