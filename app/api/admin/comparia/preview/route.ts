import { NextRequest, NextResponse } from 'next/server'

import { verifyAdminAuth } from '@/lib/admin-auth'
import { planCompariaCatalog } from '@/lib/comparia/catalog-sync'
import { parseCompariaEtalabCsv } from '@/lib/comparia/import'
import { readCompariaCsvUpload } from '@/lib/comparia/upload'
import { createEcoLogitsServiceClient } from '@/lib/ecologits/sync'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function POST(request: NextRequest) {
  const auth = await verifyAdminAuth(request)
  if (auth.error) return auth.error

  try {
    const upload = await readCompariaCsvUpload(request)
    if (!upload.ok) {
      return NextResponse.json({ error: upload.error }, { status: upload.status })
    }

    const rows = parseCompariaEtalabCsv(upload.csv)
    const plan = await planCompariaCatalog(createEcoLogitsServiceClient(), {
      rows,
      fileName: upload.fileName,
    })

    return NextResponse.json({
      success: true,
      dryRun: true,
      fileName: upload.fileName,
      rankingDate: plan.rankingDate,
      rowsValid: rows.length,
      matchedCount: plan.matchedCount,
      ignoredCount: plan.ignoredCount,
      unmatchedCount: plan.unmatchedCount,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur inconnue'
    console.error('[Compar:IA] Prévisualisation impossible:', error)
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
