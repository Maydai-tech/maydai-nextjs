import { NextRequest, NextResponse } from 'next/server'

import { verifyAdminAuth } from '@/lib/admin-auth'
import { persistCompariaCatalog } from '@/lib/comparia/catalog-sync'
import { parseCompariaEtalabCsv } from '@/lib/comparia/import'
import { readCompariaCsvUpload } from '@/lib/comparia/upload'
import { createEcoLogitsServiceClient } from '@/lib/ecologits/sync'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

export async function POST(request: NextRequest) {
  const auth = await verifyAdminAuth(request)
  if (auth.error) return auth.error

  const supabase = createEcoLogitsServiceClient()

  try {
    const upload = await readCompariaCsvUpload(request)
    if (!upload.ok) {
      return NextResponse.json({ error: upload.error }, { status: upload.status })
    }

    const rows = parseCompariaEtalabCsv(upload.csv)
    const result = await persistCompariaCatalog(supabase, {
      rows,
      fileName: upload.fileName,
    })

    return NextResponse.json({
      success: true,
      message: `${result.rowsImported} modèle(s) importés. ${result.matchedCount} mis à jour, ${result.ignoredCount} ignoré(s), ${result.unmatchedCount} à rapprocher.`,
      rowsImported: result.rowsImported,
      matchedCount: result.matchedCount,
      ignoredCount: result.ignoredCount,
      unmatchedCount: result.unmatchedCount,
      rankingDate: result.rankingDate,
      exactLinksCreated: result.exactLinksCreated,
      modelsDeactivated: result.modelsDeactivated,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur inconnue'
    console.error('[Compar:IA] Import impossible:', error)
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
