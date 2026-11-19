import { createHash } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { persistCompariaCatalog } from '@/lib/comparia/catalog-sync'
import { parseCompariaCsv } from '@/lib/comparia/import'
import { findFileIdByName, getFileFromDrive } from '@/lib/google-drive'
import { isAiActDocsFolder } from '@/lib/rag-ingestion'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

const AI_ACT_INDEX_FILE_NAME = 'AI_Act_Index.json'
const VEILLE_DRIVE_FILE_ID = 'veille-json-source'
const MISTRAL_EMBEDDINGS_URL = 'https://api.mistral.ai/v1/embeddings'
const MISTRAL_EMBED_MODEL = 'mistral-embed'
const MISTRAL_EMBED_DIMENSIONS = 1024

/** Payload attendu depuis Hermes */
interface KbUpdatePayload {
  event: string
  source: string
  folder_name: string
  subfolder_name: string
  file_name: string
}

/** Entrée du tableau `documents` dans AI_Act_Index.json (veille juridique). */
export interface AiActVeilleDocument {
  canonical_id: string
  file_name: string
  source_url: string
  version_date: string
  document_type: string
  content: string
}

const aiActVeilleDocumentSchema = z.object({
  canonical_id: z.string().trim().min(1),
  file_name: z.string().trim().min(1),
  source_url: z.string().trim().min(1),
  version_date: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'version_date doit être YYYY-MM-DD'),
  document_type: z.string().trim().min(1),
  content: z.string().trim().min(1),
})

const aiActVeilleIndexSchema = z.object({
  documents: z.array(aiActVeilleDocumentSchema),
})

export interface AiActVeilleIngestionResult {
  success: boolean
  source: 'ai_act_rag'
  documents_processed: number
  documents_inserted: number
  documents_skipped: number
  chunks_created: number
  errors: string[]
}

function getServiceSupabase(): SupabaseClient {
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

function unauthorizedResponse() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}

function isAuthorized(request: NextRequest): boolean {
  const expectedKey = process.env.INTERNAL_API_KEY
  if (!expectedKey) {
    return false
  }
  const providedKey = request.headers.get('x-api-key')
  return Boolean(providedKey) && providedKey === expectedKey
}

function hashContentSha256(content: string): string {
  return createHash('sha256').update(content, 'utf8').digest('hex')
}

function parseAiActVeilleIndex(raw: string): AiActVeilleDocument[] {
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    throw new Error("AI_Act_Index.json n'est pas un JSON valide")
  }

  const result = aiActVeilleIndexSchema.safeParse(parsed)
  if (!result.success) {
    throw new Error(
      `AI_Act_Index.json invalide: ${result.error.issues[0]?.message}`
    )
  }

  return result.data.documents
}

async function findDocumentIdByHash(
  supabase: SupabaseClient,
  hash: string
): Promise<string | null> {
  const { data, error } = await supabase
    .from('ai_act_documents')
    .select('id')
    .eq('hash', hash)
    .maybeSingle()

  if (error) {
    throw new Error(`Lecture hash ${hash}: ${error.message}`)
  }
  return data?.id ?? null
}

async function findActiveDocumentId(
  supabase: SupabaseClient,
  canonicalId: string
): Promise<string | null> {
  const { data, error } = await supabase
    .from('ai_act_documents')
    .select('id')
    .eq('canonical_id', canonicalId)
    .eq('is_active', true)
    .maybeSingle()

  if (error) {
    throw new Error(`Lecture document actif ${canonicalId}: ${error.message}`)
  }
  return data?.id ?? null
}

async function embedContentWithMistral(content: string): Promise<number[]> {
  const apiKey = process.env.MISTRAL_API_KEY?.trim()
  if (!apiKey) {
    throw new Error('MISTRAL_API_KEY manquant(e)')
  }

  const response = await fetch(MISTRAL_EMBEDDINGS_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: MISTRAL_EMBED_MODEL,
      input: [content],
    }),
    cache: 'no-store',
  })

  if (!response.ok) {
    const details = await response.text().catch(() => '')
    throw new Error(
      `API Mistral embeddings HTTP ${response.status}${details ? `: ${details}` : ''}`
    )
  }

  const payload = (await response.json()) as {
    data?: Array<{ embedding?: unknown }>
  }
  const embedding = payload.data?.[0]?.embedding
  if (!Array.isArray(embedding) || embedding.some((value) => typeof value !== 'number')) {
    throw new Error('Réponse Mistral embeddings invalide')
  }
  if (embedding.length !== MISTRAL_EMBED_DIMENSIONS) {
    throw new Error(
      `Dimension d'embedding inattendue: ${embedding.length} (attendu ${MISTRAL_EMBED_DIMENSIONS})`
    )
  }

  return embedding
}

async function ingestOneVeilleDocument(
  supabase: SupabaseClient,
  document: AiActVeilleDocument
): Promise<{ inserted: boolean; skipped: boolean }> {
  const hash = hashContentSha256(document.content)
  const existingHashId = await findDocumentIdByHash(supabase, hash)
  if (existingHashId) {
    return { inserted: false, skipped: true }
  }

  const previousActiveId = await findActiveDocumentId(
    supabase,
    document.canonical_id
  )

  if (previousActiveId) {
    const { error: deactivateError } = await supabase
      .from('ai_act_documents')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', previousActiveId)

    if (deactivateError) {
      throw new Error(
        `Désactivation N-1 ${document.canonical_id}: ${deactivateError.message}`
      )
    }
  }

  const { data: inserted, error: insertError } = await supabase
    .from('ai_act_documents')
    .insert({
      canonical_id: document.canonical_id,
      drive_file_id: VEILLE_DRIVE_FILE_ID,
      file_name: document.file_name,
      source_url: document.source_url,
      version_date: document.version_date,
      document_type: document.document_type,
      hash,
      is_active: true,
      supersedes_id: previousActiveId,
    })
    .select('id')
    .single()

  if (insertError || !inserted?.id) {
    if (previousActiveId) {
      await supabase
        .from('ai_act_documents')
        .update({ is_active: true, updated_at: new Date().toISOString() })
        .eq('id', previousActiveId)
    }
    throw new Error(
      `Insert document ${document.canonical_id}: ${insertError?.message ?? 'id manquant'}`
    )
  }

  try {
    const embedding = await embedContentWithMistral(document.content)
    const { error: chunksError } = await supabase.from('ai_act_chunks').insert({
      document_id: inserted.id,
      chunk_index: 0,
      content: document.content,
      embedding,
    })

    if (chunksError) {
      throw new Error(
        `Insert chunk ${document.canonical_id}: ${chunksError.message}`
      )
    }
  } catch (error) {
    await supabase.from('ai_act_documents').delete().eq('id', inserted.id)
    if (previousActiveId) {
      await supabase
        .from('ai_act_documents')
        .update({ is_active: true, updated_at: new Date().toISOString() })
        .eq('id', previousActiveId)
    }
    throw error
  }

  return { inserted: true, skipped: false }
}

async function ingestVeilleJsonFromDrive(): Promise<AiActVeilleIngestionResult> {
  const result: AiActVeilleIngestionResult = {
    success: false,
    source: 'ai_act_rag',
    documents_processed: 0,
    documents_inserted: 0,
    documents_skipped: 0,
    chunks_created: 0,
    errors: [],
  }

  const fileId = await findFileIdByName(AI_ACT_INDEX_FILE_NAME)
  const raw = await getFileFromDrive(fileId)
  const documents = parseAiActVeilleIndex(raw)

  if (documents.length === 0) {
    throw new Error('Aucun document dans AI_Act_Index.json')
  }

  result.documents_processed = documents.length
  const supabase = getServiceSupabase()

  for (const document of documents) {
    try {
      const outcome = await ingestOneVeilleDocument(supabase, document)
      if (outcome.skipped) {
        result.documents_skipped += 1
      } else if (outcome.inserted) {
        result.documents_inserted += 1
        result.chunks_created += 1
      }
    } catch (error) {
      const details = error instanceof Error ? error.message : String(error)
      result.errors.push(`${document.canonical_id}: ${details}`)
    }
  }

  result.success =
    result.errors.length === 0 || result.documents_inserted > 0
  return result
}

async function downloadCsvFromDrive(fileName: string): Promise<string> {
  const fileId = await findFileIdByName(fileName)
  return getFileFromDrive(fileId)
}

function isAiActVeilleRequest(folderName: string, fileName: string): boolean {
  return isAiActDocsFolder(folderName) || fileName === AI_ACT_INDEX_FILE_NAME
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

  if (!isAuthorized(request)) {
    return unauthorizedResponse()
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
    const fileName =
      typeof payload.file_name === 'string' ? payload.file_name.trim() : ''
    const folderName =
      typeof payload.folder_name === 'string' ? payload.folder_name.trim() : ''

    if (isAiActVeilleRequest(folderName, fileName)) {
      const ingestion = await ingestVeilleJsonFromDrive()
      return NextResponse.json(ingestion, {
        status:
          ingestion.errors.length > 0 && ingestion.documents_inserted === 0
            ? 500
            : 200,
      })
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
