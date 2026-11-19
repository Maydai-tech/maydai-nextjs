import { createHash } from 'node:crypto'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { z } from 'zod'
import {
  embedAiActTexts,
  extractAiActFileText,
} from '@/lib/ai-act-mistral'
import {
  findFileIdByName,
  getBinaryFileFromDrive,
  getFileFromDrive,
} from '@/lib/google-drive'
import { logger } from '@/lib/secure-logger'

export const AI_ACT_DOCS_FOLDER = '05_AI_Act_Docs'
export const AI_ACT_INDEX_FILE_NAME = 'AI_Act_Index.json'

/** ~1000 tokens / chunk, overlap ~200 — heuristique 4 caractères ≈ 1 token (textes juridiques FR). */
export const AI_ACT_CHUNK_TARGET_TOKENS = 1000
export const AI_ACT_CHUNK_OVERLAP_TOKENS = 200
const CHARS_PER_TOKEN = 4
const TARGET_CHUNK_CHARS = AI_ACT_CHUNK_TARGET_TOKENS * CHARS_PER_TOKEN
const OVERLAP_CHUNK_CHARS = AI_ACT_CHUNK_OVERLAP_TOKENS * CHARS_PER_TOKEN

const aiActIndexEntrySchema = z.object({
  canonical_id: z.string().trim().min(1),
  drive_file_id: z.string().trim().min(1),
  file_name: z.string().trim().min(1),
  source_url: z.string().trim().min(1),
  version_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'version_date doit être YYYY-MM-DD'),
  document_type: z.string().trim().min(1),
  hash: z
    .string()
    .trim()
    .regex(/^[a-fA-F0-9]{64}$/, 'hash doit être un SHA-256 hexadécimal'),
  status: z.enum(['active', 'archived']),
})

export type AiActIndexEntry = z.infer<typeof aiActIndexEntrySchema>

export interface AiActIngestionResult {
  documents_processed: number
  documents_ingested: number
  documents_skipped: number
  chunks_created: number
  errors: string[]
}

export interface AiActIngestionDeps {
  fetchIndexJson: () => Promise<string>
  downloadFile: (driveFileId: string) => Promise<Buffer>
  extractText: (fileBuffer: Buffer, fileName: string) => Promise<string>
  embedTexts: (texts: string[]) => Promise<number[][]>
  supabase: SupabaseClient
}

export function isAiActDocsFolder(folderName: string | undefined | null): boolean {
  return typeof folderName === 'string' && folderName.trim() === AI_ACT_DOCS_FOLDER
}

export function normalizeSha256(hash: string): string {
  return hash.trim().toLowerCase()
}

export function computeSha256(buffer: Buffer): string {
  return createHash('sha256').update(buffer).digest('hex')
}

export function parseAiActIndex(raw: string): AiActIndexEntry[] {
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    throw new Error('AI_Act_Index.json n\'est pas un JSON valide')
  }

  const result = z.array(aiActIndexEntrySchema).safeParse(parsed)
  if (!result.success) {
    throw new Error(`AI_Act_Index.json invalide: ${result.error.issues[0]?.message}`)
  }

  const activeIds = result.data
    .filter((entry) => entry.status === 'active')
    .map((entry) => entry.canonical_id)
  const duplicates = activeIds.filter((id, index) => activeIds.indexOf(id) !== index)
  if (duplicates.length > 0) {
    throw new Error(
      `AI_Act_Index.json: canonical_id actif en double (${[...new Set(duplicates)].join(', ')})`
    )
  }

  return result.data.map((entry) => ({
    ...entry,
    hash: normalizeSha256(entry.hash),
  }))
}

export function estimateTokenCount(text: string): number {
  if (!text) return 0
  return Math.ceil(text.length / CHARS_PER_TOKEN)
}

function splitOversizedUnit(text: string): string[] {
  const step = Math.max(TARGET_CHUNK_CHARS - OVERLAP_CHUNK_CHARS, 1)
  const parts: string[] = []
  for (let i = 0; i < text.length; i += step) {
    const slice = text.slice(i, i + TARGET_CHUNK_CHARS).trim()
    if (slice) parts.push(slice)
    if (i + TARGET_CHUNK_CHARS >= text.length) break
  }
  return parts
}

/** Unités sémantiques : paragraphes, puis alinéas (sauts de ligne), puis coupe dure. */
function splitIntoSemanticUnits(text: string): string[] {
  const paragraphs = text
    .replace(/\r\n/g, '\n')
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .filter(Boolean)

  const units: string[] = []
  for (const paragraph of paragraphs) {
    if (estimateTokenCount(paragraph) <= AI_ACT_CHUNK_TARGET_TOKENS) {
      units.push(paragraph)
      continue
    }

    const lines = paragraph.split('\n').map((line) => line.trim()).filter(Boolean)
    for (const line of lines) {
      if (estimateTokenCount(line) <= AI_ACT_CHUNK_TARGET_TOKENS) {
        units.push(line)
      } else {
        units.push(...splitOversizedUnit(line))
      }
    }
  }
  return units
}

function overlapPrefix(previous: string): string {
  return previous.slice(-OVERLAP_CHUNK_CHARS).trim()
}

/**
 * Chunking sémantique pour textes de lois : coupe aux paragraphes / alinéas,
 * cible ~1000 tokens, recouvrement ~200 tokens.
 */
export function chunkAiActText(text: string): string[] {
  const normalized = text.replace(/\r\n/g, '\n').trim()
  if (!normalized) return []

  const units = splitIntoSemanticUnits(normalized)
  if (units.length === 0) return []

  const chunks: string[] = []
  let current = ''

  const flush = () => {
    const trimmed = current.trim()
    if (trimmed) chunks.push(trimmed)
    current = ''
  }

  for (const unit of units) {
    const candidate = current ? `${current}\n\n${unit}` : unit
    if (estimateTokenCount(candidate) <= AI_ACT_CHUNK_TARGET_TOKENS) {
      current = candidate
      continue
    }

    flush()
    const prefix = chunks.length > 0 ? overlapPrefix(chunks[chunks.length - 1]) : ''
    const withOverlap = prefix ? `${prefix}\n\n${unit}` : unit
    if (estimateTokenCount(withOverlap) <= AI_ACT_CHUNK_TARGET_TOKENS) {
      current = withOverlap
    } else if (estimateTokenCount(unit) <= AI_ACT_CHUNK_TARGET_TOKENS) {
      current = unit
    } else {
      chunks.push(...splitOversizedUnit(unit))
    }
  }

  flush()
  return chunks.filter(Boolean)
}

export function planSupersession(existingActiveId: string | null): {
  deactivateId: string | null
  supersedesId: string | null
} {
  if (!existingActiveId) {
    return { deactivateId: null, supersedesId: null }
  }
  return { deactivateId: existingActiveId, supersedesId: existingActiveId }
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

export function createDefaultAiActIngestionDeps(): AiActIngestionDeps {
  return {
    fetchIndexJson: async () => {
      const fileId = await findFileIdByName(AI_ACT_INDEX_FILE_NAME)
      return getFileFromDrive(fileId)
    },
    downloadFile: getBinaryFileFromDrive,
    extractText: extractAiActFileText,
    embedTexts: embedAiActTexts,
    supabase: getServiceSupabase(),
  }
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

async function ingestActiveDocument(
  entry: AiActIndexEntry,
  deps: AiActIngestionDeps
): Promise<{ ingested: boolean; chunks: number; skipped: boolean }> {
  const existingHashId = await findDocumentIdByHash(deps.supabase, entry.hash)
  if (existingHashId) {
    logger.info('RAG AI Act: document déjà ingéré (hash identique)', {
      canonical_id: entry.canonical_id,
    })
    return { ingested: false, chunks: 0, skipped: true }
  }

  const fileBuffer = await deps.downloadFile(entry.drive_file_id)
  const actualHash = computeSha256(fileBuffer)
  if (actualHash !== entry.hash) {
    throw new Error(
      `Hash SHA-256 divergent pour ${entry.canonical_id} (index=${entry.hash}, fichier=${actualHash})`
    )
  }

  const text = await deps.extractText(fileBuffer, entry.file_name)
  const chunks = chunkAiActText(text)
  if (chunks.length === 0) {
    throw new Error(`Aucun chunk extractible pour ${entry.canonical_id}`)
  }

  const embeddings = await deps.embedTexts(chunks)
  if (embeddings.length !== chunks.length) {
    throw new Error(
      `Embeddings incomplets pour ${entry.canonical_id}: ${embeddings.length}/${chunks.length}`
    )
  }

  const existingActiveId = await findActiveDocumentId(deps.supabase, entry.canonical_id)
  const { deactivateId, supersedesId } = planSupersession(existingActiveId)

  if (deactivateId) {
    const { error: deactivateError } = await deps.supabase
      .from('ai_act_documents')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', deactivateId)

    if (deactivateError) {
      throw new Error(
        `Désactivation N-1 ${entry.canonical_id}: ${deactivateError.message}`
      )
    }
  }

  const { data: inserted, error: insertError } = await deps.supabase
    .from('ai_act_documents')
    .insert({
      canonical_id: entry.canonical_id,
      drive_file_id: entry.drive_file_id,
      file_name: entry.file_name,
      source_url: entry.source_url,
      version_date: entry.version_date,
      document_type: entry.document_type,
      hash: entry.hash,
      is_active: true,
      supersedes_id: supersedesId,
    })
    .select('id')
    .single()

  if (insertError || !inserted?.id) {
    if (deactivateId) {
      await deps.supabase
        .from('ai_act_documents')
        .update({ is_active: true, updated_at: new Date().toISOString() })
        .eq('id', deactivateId)
    }
    throw new Error(
      `Insert document ${entry.canonical_id}: ${insertError?.message ?? 'id manquant'}`
    )
  }

  const chunkRows = chunks.map((content, chunkIndex) => ({
    document_id: inserted.id,
    chunk_index: chunkIndex,
    content,
    embedding: embeddings[chunkIndex],
  }))

  const { error: chunksError } = await deps.supabase.from('ai_act_chunks').insert(chunkRows)
  if (chunksError) {
    await deps.supabase.from('ai_act_documents').delete().eq('id', inserted.id)
    if (deactivateId) {
      await deps.supabase
        .from('ai_act_documents')
        .update({ is_active: true, updated_at: new Date().toISOString() })
        .eq('id', deactivateId)
    }
    throw new Error(`Insert chunks ${entry.canonical_id}: ${chunksError.message}`)
  }

  return { ingested: true, chunks: chunkRows.length, skipped: false }
}

export async function ingestAiActKnowledgeBase(
  deps: AiActIngestionDeps = createDefaultAiActIngestionDeps()
): Promise<AiActIngestionResult> {
  const result: AiActIngestionResult = {
    documents_processed: 0,
    documents_ingested: 0,
    documents_skipped: 0,
    chunks_created: 0,
    errors: [],
  }

  const index = parseAiActIndex(await deps.fetchIndexJson())
  const activeEntries = index.filter((entry) => entry.status === 'active')
  result.documents_processed = activeEntries.length

  for (const entry of activeEntries) {
    try {
      const outcome = await ingestActiveDocument(entry, deps)
      if (outcome.skipped) {
        result.documents_skipped += 1
      } else if (outcome.ingested) {
        result.documents_ingested += 1
        result.chunks_created += outcome.chunks
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : `Erreur inconnue (${entry.canonical_id})`
      result.errors.push(message)
      logger.error('RAG AI Act: échec d\'ingestion d\'un document', undefined, {
        canonical_id: entry.canonical_id,
        details: message,
      })
    }
  }

  return result
}
