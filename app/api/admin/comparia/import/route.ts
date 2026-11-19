import { NextRequest, NextResponse } from 'next/server'

import { verifyAdminAuth } from '@/lib/admin-auth'
import { persistCompariaCatalog } from '@/lib/comparia/catalog-sync'
import { parseCompariaCsv } from '@/lib/comparia/import'
import { createEcoLogitsServiceClient } from '@/lib/ecologits/sync'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

const MAX_FILE_SIZE = 5 * 1024 * 1024

export async function POST(request: NextRequest) {
  const auth = await verifyAdminAuth(request)
  if (auth.error) return auth.error

  const supabase = createEcoLogitsServiceClient()

  try {
    const formData = await request.formData()
    const file = formData.get('file')
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Fichier CSV Compar:IA manquant.' }, { status: 400 })
    }
    if (!file.name.toLowerCase().endsWith('.csv')) {
      return NextResponse.json({ error: 'Le fichier doit être au format CSV.' }, { status: 400 })
    }
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'Le fichier CSV dépasse la limite de 5 Mo.' }, { status: 413 })
    }

    const rows = parseCompariaCsv(await file.text())
    const result = await persistCompariaCatalog(supabase, {
      rows,
      fileName: file.name,
    })

    return NextResponse.json({
      success: true,
      rowsImported: result.rowsImported,
      exactLinksCreated: result.exactLinksCreated,
      modelsDeactivated: result.modelsDeactivated,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur inconnue'
    console.error('[Compar:IA] Import impossible:', error)
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
