import { NextRequest, NextResponse } from 'next/server'
import { processScheduledPurgesAndHardDeletes } from '@/lib/services/governancePurgeService'

export const dynamic = 'force-dynamic'

function isAuthorizedCronRequest(request: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET?.trim()
  if (!cronSecret) return false
  return request.headers.get('authorization') === `Bearer ${cronSecret}`
}

export async function GET(request: NextRequest) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  try {
    const counts = await processScheduledPurgesAndHardDeletes()
    return NextResponse.json(counts)
  } catch (error) {
    console.error('[cron process-purges]', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur DB' },
      { status: 500 }
    )
  }
}
