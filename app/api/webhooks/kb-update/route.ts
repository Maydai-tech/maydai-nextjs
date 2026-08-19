import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import Papa from 'papaparse'
import { findFileIdByName, getFileFromDrive } from '@/lib/google-drive'
import { ingestAiActKnowledgeBase, isAiActDocsFolder } from '@/lib/rag-ingestion'

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

/** Ligne CSV brute (en-têtes anglais Compar:IA — 16 colonnes) */
interface CompariaCsvRow {
  id?: string
  Rank?: string
  'Bradley-Terry Score'?: string
  'BT p2.5'?: string
  'BT p97.5'?: string
  'Confidence interval'?: string
  'Rank p2.5'?: string
  'Rank p97.5'?: string
  'Total votes'?: string
  'Consumption mWh (1000 tokens)'?: string
  Size?: string
  'Parameters (B)'?: string
  Architecture?: string
  Release?: string
  Organisation?: string
  License?: string
  [key: string]: string | undefined
}

/** Ligne mappée vers `comparia_rankings` */
interface CompariaRankingRow {
  id: string
  rank: number
  bradley_terry_score: number
  bt_p2_5: number | null
  bt_p97_5: number | null
  confidence_interval: string
  rank_p2_5: number | null
  rank_p97_5: number | null
  total_votes: number
  consumption_mwh: number | null
  size: string
  parameters_b: number | null
  architecture: string
  release: string
  organisation: string
  license: string
  updated_at: string
}

/**
 * Allowlist strict des colonnes upsertées dans `comparia_rankings`.
 * Toute clé hors liste (colonne CSV surprise, champ futur non migré) est ignorée.
 */
const COMPARIA_RANKINGS_UPSERT_KEYS = [
  'id',
  'rank',
  'bradley_terry_score',
  'bt_p2_5',
  'bt_p97_5',
  'confidence_interval',
  'rank_p2_5',
  'rank_p97_5',
  'total_votes',
  'consumption_mwh',
  'size',
  'parameters_b',
  'architecture',
  'release',
  'organisation',
  'license',
  'updated_at',
] as const satisfies readonly (keyof CompariaRankingRow)[]

type CompariaUpsertRow = Pick<
  CompariaRankingRow,
  (typeof COMPARIA_RANKINGS_UPSERT_KEYS)[number]
>

/** Ne conserve que les clés du schéma attendu avant l’upsert Supabase. */
function toCompariaUpsertRow(row: CompariaRankingRow): CompariaUpsertRow {
  const cleaned = {} as CompariaUpsertRow
  for (const key of COMPARIA_RANKINGS_UPSERT_KEYS) {
    cleaned[key] = row[key] as never
  }
  return cleaned
}

/** Convertit une cellule CSV en float, ou null si vide / invalide (évite 22P02). */
function safeFloat(val: unknown): number | null {
  if (val === null || val === undefined || val === 'NaN') return null
  if (typeof val === 'string' && val.trim() === '') return null
  if (val === '') return null
  const parsed = parseFloat(String(val).replace(',', '.'))
  return Number.isNaN(parsed) ? null : parsed
}

/** Convertit une cellule CSV en entier, avec fallback si vide / invalide. */
function safeInt(val: unknown, fallback = 0): number {
  if (val === null || val === undefined || val === 'NaN') return fallback
  if (typeof val === 'string' && val.trim() === '') return fallback
  if (val === '') return fallback
  const parsed = parseInt(String(val), 10)
  return Number.isNaN(parsed) ? fallback : parsed
}

function mapCsvRowToRanking(row: CompariaCsvRow, updatedAt: string): CompariaRankingRow | null {
  const id = row.id?.trim()
  if (!id) return null

  // Mapping explicite : les en-têtes CSV hors liste ne sont jamais propagés.
  return {
    id,
    rank: safeInt(row.Rank, 0),
    bradley_terry_score: safeFloat(row['Bradley-Terry Score']) ?? 0,
    bt_p2_5: safeFloat(row['BT p2.5']),
    bt_p97_5: safeFloat(row['BT p97.5']),
    confidence_interval: String(row['Confidence interval'] || ''),
    rank_p2_5: safeFloat(row['Rank p2.5']),
    rank_p97_5: safeFloat(row['Rank p97.5']),
    total_votes: safeInt(row['Total votes'], 0),
    consumption_mwh: safeFloat(row['Consumption mWh (1000 tokens)']),
    size: String(row.Size || ''),
    parameters_b: safeFloat(row['Parameters (B)']),
    architecture: String(row.Architecture || ''),
    release: String(row.Release || ''),
    organisation: String(row.Organisation || ''),
    license: String(row.License || ''),
    updated_at: updatedAt,
  }
}

function getServiceSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error(
      'NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY manquant(e)'
    )
  }
  // Service role obligatoire : contourne RLS pour l'upsert backend
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

/**
 * PostgrestError hérite de Error : `message` est non-énumérable.
 * `JSON.stringify(error)` / NextResponse.json(error) → `{}` vide.
 * On extrait donc explicitement les champs utiles + un dump brut.
 */
function serializePostgrestError(error: unknown): {
  message: string | null
  details: string | null
  hint: string | null
  code: string | null
  name: string | null
  raw: string
} {
  const e = error as {
    message?: string
    details?: string
    hint?: string
    code?: string
    name?: string
  } | null

  let raw = ''
  try {
    raw = JSON.stringify(
      error,
      error instanceof Error
        ? Object.getOwnPropertyNames(error)
        : undefined,
      2
    )
  } catch {
    raw = String(error)
  }

  return {
    message: e?.message ?? (error instanceof Error ? error.message : null),
    details: e?.details ?? null,
    hint: e?.hint ?? null,
    code: e?.code ?? null,
    name: e?.name ?? (error instanceof Error ? error.name : null),
    raw,
  }
}

async function downloadCsvFromDrive(fileName: string): Promise<string> {
  const fileId = await findFileIdByName(fileName)
  return getFileFromDrive(fileId)
}

export async function POST(request: NextRequest) {
  // 1. Vérification de sécurité
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
    // 2. Parsing du payload JSON
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
      // Désactivation temporaire de l'ingestion Mistral / pgvector.
      return NextResponse.json(
        { message: 'RAG Ingestion temporarily disabled' },
        { status: 200 }
      )

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

    // 3. Téléchargement CSV depuis Google Drive
    const csvContent = await downloadCsvFromDrive(fileName)

    // 4. Parsing CSV + mapping colonnes
    const parsed = Papa.parse<CompariaCsvRow>(csvContent, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim(),
    })

    if (parsed.errors.length > 0) {
      console.warn('[Webhook KB Update] Erreurs PapaParse:', parsed.errors.slice(0, 5))
    }

    const updatedAt = new Date().toISOString()
    const rows = parsed.data
      .map((row) => mapCsvRowToRanking(row, updatedAt))
      .filter((row): row is CompariaRankingRow => row !== null)
      .map(toCompariaUpsertRow)

    if (rows.length === 0) {
      return NextResponse.json(
        { error: 'Aucune ligne valide dans le CSV' },
        { status: 400 }
      )
    }

    // 5. Upsert massif dans Supabase (service role, contourne RLS)
    // Payload filtré : uniquement COMPARIA_RANKINGS_UPSERT_KEYS
    const supabase = getServiceSupabase()
    const { error: upsertError } = await supabase
      .from('comparia_rankings')
      .upsert(rows, { onConflict: 'id' })

    if (upsertError) {
      const serialized = serializePostgrestError(upsertError)
      // Observabilité temporaire : dump brut + champs extraits
      console.error('[Webhook KB Update] Erreur Upsert Supabase (raw):', upsertError)
      console.error('[Webhook KB Update] Erreur Upsert Supabase (serialized):', serialized)

      return NextResponse.json(
        {
          error: 'Échec de l’upsert Supabase',
          message: serialized.message,
          details: serialized.details,
          hint: serialized.hint,
          code: serialized.code,
          name: serialized.name,
          raw: serialized.raw,
        },
        { status: 500 }
      )
    }

    // 6. Succès
    return NextResponse.json({
      success: true,
      models_updated: rows.length,
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
