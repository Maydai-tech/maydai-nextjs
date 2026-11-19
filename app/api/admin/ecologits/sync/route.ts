import { NextRequest, NextResponse } from 'next/server'

import { verifyAdminAuth } from '@/lib/admin-auth'
import { createEcoLogitsServiceClient, syncEcoLogitsCatalog } from '@/lib/ecologits/sync'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

export async function POST(request: NextRequest) {
  const auth = await verifyAdminAuth(request)
  if (auth.error) return auth.error

  try {
    const result = await syncEcoLogitsCatalog(createEcoLogitsServiceClient(), 'admin')
    return NextResponse.json(result, { status: result.status === 'partial' ? 207 : result.success ? 200 : 500 })
  } catch (error) {
    console.error('[EcoLogits Admin] Synchronisation impossible:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Erreur interne du serveur' },
      { status: 500 },
    )
  }
}
