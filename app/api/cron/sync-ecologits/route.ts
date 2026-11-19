import { NextRequest, NextResponse } from 'next/server'

import { createEcoLogitsServiceClient, syncEcoLogitsCatalog } from '@/lib/ecologits/sync'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET?.trim()
  return Boolean(secret && request.headers.get('authorization') === `Bearer ${secret}`)
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  try {
    const result = await syncEcoLogitsCatalog(createEcoLogitsServiceClient(), 'cron')
    return NextResponse.json(result, { status: result.status === 'partial' ? 207 : result.success ? 200 : 500 })
  } catch (error) {
    console.error('[EcoLogits Cron] Synchronisation impossible:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Erreur interne du serveur' },
      { status: 500 },
    )
  }
}
