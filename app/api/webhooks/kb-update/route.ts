import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { findFileIdByName, getFileFromDrive } from '@/lib/google-drive'
import { ingestAiActKnowledgeBase, isAiActDocsFolder } from '@/lib/rag-ingestion'
import { persistCompariaCatalog } from '@/lib/comparia/catalog-sync'
import { parseCompariaCsv } from '@/lib/comparia/import'

/** Durée max Vercel : Compar:IA CSV ou ingestion RAG AI Act (OCR + embeddings) */
export const maxDuration = 300

/** Payload attendu depuis Hermes */
interface KbUpdatePayload {
  event: string
  source: string
  folder_name: string
  subfolder_name: string
  file_name: string
}

function getServiceSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error(
      'NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY manquant(e)'
    )
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

async function downloadCsvFromDrive(fileName: string): Promise<string> {
  const fileId = await findFileIdByName(fileName)
  return getFileFromDrive(fileId)
}

export async function POST(request: NextRequest) {
  const expectedKey = process.env.INTERNAL_API_KEY
  if (!expectedKey) {
    console.error('[Webhook KB Update] INTERNAL_API_KEY non configuré')
    return NextResponse.json(
      { error: 'Configuration serveur incomplète' },
      { status: 500 }
    )
  }

  const providedKey = request.headers.get('x-api-key')
  if (!providedKey || providedKey !== expectedKey) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'JSON invalide' }, { status: 400 })
    }

    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'JSON invalide' }, { status: 400 })
    }

    const payload = body as Partial<KbUpdatePayload>
    const fileName = typeof payload.file_name === 'string' ? payload.file_name.trim() : ''
    const folderName =
      typeof payload.folder_name === 'string' ? payload.folder_name.trim() : ''

    if (isAiActDocsFolder(folderName)) {
      const ingestion = await ingestAiActKnowledgeBase()
      const hasErrors = ingestion.errors.length > 0
      return NextResponse.json(
        {
          success: !hasErrors || ingestion.documents_ingested > 0,
          source: 'ai_act_rag',
          ...ingestion,
        },
        { status: hasErrors && ingestion.documents_ingested === 0 ? 500 : 200 }
      )
    }

    if (!fileName) {
      return NextResponse.json(
        { error: 'file_name manquant dans le payload' },
        { status: 400 }
      )
    }

    const csvContent = await downloadCsvFromDrive(fileName)
    const rows = parseCompariaCsv(csvContent)
    if (rows.length === 0) {
      return NextResponse.json(
        { error: 'Aucune ligne valide dans le CSV' },
        { status: 400 }
      )
    }

    const supabase = getServiceSupabase()
    const result = await persistCompariaCatalog(supabase, {
      rows,
      fileName,
    })

    return NextResponse.json({
      success: true,
      models_updated: result.rowsImported,
      exact_links_created: result.exactLinksCreated,
      models_deactivated: result.modelsDeactivated,
    })
  } catch (error) {
    console.error('[Webhook KB Update]', error)
    const details = error instanceof Error ? error.message : String(error)
    return NextResponse.json(
      { error: 'Erreur interne du webhook KB Update', details },
      { status: 500 }
    )
  }
}
