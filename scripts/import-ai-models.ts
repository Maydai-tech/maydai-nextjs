/**
 * Import CSV → table Supabase `compl_ai_models` (upsert sur `id`).
 *
 * Usage :
 *   voir README en bas du fichier ou la doc projet pour les commandes npx.
 *
 * Fichier CSV par défaut : ./donnees_modeles_ia.csv (racine du projet)
 * Surcharge : argument CLI ou variable IMPORT_AI_MODELS_CSV
 */

import { readFileSync, existsSync } from 'fs'
import path from 'path'
import { parse } from 'csv-parse/sync'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { config as loadEnv } from 'dotenv'

loadEnv({ path: path.resolve(process.cwd(), '.env.local') })
loadEnv({ path: path.resolve(process.cwd(), '.env') })

/** Colonnes reconnues pour `compl_ai_models` (export / schéma applicatif). */
const ALLOWED_COLUMNS = new Set([
  'id',
  'model_name',
  'model_provider',
  'model_type',
  'version',
  'short_name',
  'long_name',
  'launch_date',
  'model_provider_id',
  'notes_short',
  'notes_long',
  'variants',
  'llm_leader_rank',
  'compl_ai_rank',
  'comparia_rank',
  'input_cost_per_million',
  'output_cost_per_million',
  'model_size',
  'gpqa_score',
  'aime_2025_score',
  'license',
  'context_length',
  'consumption_wh_per_1k_tokens',
  'release_date',
  'knowledge_cutoff',
  'country',
  'created_at',
  'updated_at',
])

const INTEGER_COLUMNS = new Set([
  'model_provider_id',
  'context_length',
  'llm_leader_rank',
  'compl_ai_rank',
  'comparia_rank',
])

const DECIMAL_COLUMNS = new Set([
  'input_cost_per_million',
  'output_cost_per_million',
  'gpqa_score',
  'aime_2025_score',
  'consumption_wh_per_1k_tokens',
])

/** Champs date « jour seulement » (ISO YYYY-MM-DD). */
const DATE_ONLY_COLUMNS = new Set(['launch_date', 'release_date', 'knowledge_cutoff'])

/** Horodatages complets ISO 8601. */
const TIMESTAMP_COLUMNS = new Set(['created_at', 'updated_at'])

const BATCH_SIZE = 200

type CsvRow = Record<string, string | undefined>

function stripCell(value: string | undefined): string | null {
  if (value === undefined || value === null) return null
  const t = String(value).trim()
  return t === '' ? null : t
}

function isNaLike(raw: string | null): boolean {
  if (raw === null) return true
  const t = raw.trim().toLowerCase()
  return t === '' || t === 'n/a' || t === 'na' || t === 'null'
}

function parseInteger(raw: string | null): number | null {
  if (isNaLike(raw)) return null
  const n = parseInt(String(raw), 10)
  return Number.isFinite(n) ? n : null
}

function parseDecimal(raw: string | null): number | null {
  if (isNaLike(raw)) return null
  const n = parseFloat(String(raw).replace(',', '.'))
  return Number.isFinite(n) ? n : null
}

/**
 * `variants` : chaîne JSON (tableau), ou liste séparée par virgules.
 * Toujours un tableau JSON valide pour la contrainte `check_variants_is_array`.
 */
function parseVariants(raw: string | null): string[] {
  if (raw === null || raw.trim() === '') return []
  const t = raw.trim()
  try {
    const parsed: unknown = JSON.parse(t)
    if (Array.isArray(parsed)) {
      return parsed.map((item) => String(item)).filter((s) => s.length > 0)
    }
    if (typeof parsed === 'string' && parsed.trim() !== '') {
      return [parsed.trim()]
    }
    throw new Error('Le JSON variants doit être un tableau ou une chaîne')
  } catch {
    return t
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0)
  }
}

function toIsoDateOnly(raw: string | null): string | null {
  if (raw === null || isNaLike(raw)) return null
  const d = new Date(raw)
  if (Number.isNaN(d.getTime())) return null
  return d.toISOString().slice(0, 10)
}

function toIsoTimestamp(raw: string | null): string | null {
  if (raw === null || isNaLike(raw)) return null
  const d = new Date(raw)
  if (Number.isNaN(d.getTime())) return null
  return d.toISOString()
}

function normalizeColumnKey(key: string): string {
  return key.replace(/^\uFEFF/, '').trim()
}

function mapCsvRowToRecord(row: CsvRow, rowNumber: number): Record<string, unknown> {
  const record: Record<string, unknown> = {}
  const unknownKeys = new Set<string>()

  for (const [rawKey, rawVal] of Object.entries(row)) {
    const key = normalizeColumnKey(rawKey)
    if (!key) continue
    if (!ALLOWED_COLUMNS.has(key)) {
      unknownKeys.add(key)
      continue
    }

    const cell = stripCell(rawVal)

    if (key === 'variants') {
      record[key] = parseVariants(cell)
      continue
    }

    if (cell === null) {
      // Ne pas envoyer `id` vide : laisser Postgres attribuer un UUID par défaut.
      if (key === 'id') continue
      record[key] = null
      continue
    }

    if (INTEGER_COLUMNS.has(key)) {
      record[key] = parseInteger(cell)
      continue
    }

    if (DECIMAL_COLUMNS.has(key)) {
      record[key] = parseDecimal(cell)
      continue
    }

    if (DATE_ONLY_COLUMNS.has(key)) {
      record[key] = toIsoDateOnly(cell)
      continue
    }

    if (TIMESTAMP_COLUMNS.has(key)) {
      record[key] = toIsoTimestamp(cell)
      continue
    }

    record[key] = cell
  }

  if (unknownKeys.size > 0) {
    console.warn(
      `[import-ai-models] Ligne ${rowNumber} : colonnes ignorées (non reconnues) : ${[...unknownKeys].join(', ')}`,
    )
  }

  return record
}

function validateRecord(
  record: Record<string, unknown>,
  rowNumber: number,
): string | null {
  const name = record.model_name
  const provider = record.model_provider
  if (typeof name !== 'string' || name.trim() === '') {
    return `Ligne ${rowNumber} : model_name est obligatoire`
  }
  if (typeof provider !== 'string' || provider.trim() === '') {
    return `Ligne ${rowNumber} : model_provider est obligatoire`
  }
  return null
}

function getSupabaseUrl(): string {
  return (
    process.env.SUPABASE_URL?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ||
    ''
  )
}

function getServiceRoleKey(): string {
  return process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || ''
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < arr.length; i += size) {
    out.push(arr.slice(i, i + size))
  }
  return out
}

async function upsertBatches(
  supabase: SupabaseClient,
  records: Record<string, unknown>[],
): Promise<{ ok: boolean; errors: string[] }> {
  const errors: string[] = []
  const batches = chunk(records, BATCH_SIZE)
  let batchIndex = 0

  for (const batch of batches) {
    batchIndex += 1
    const { error } = await supabase.from('compl_ai_models').upsert(batch, {
      onConflict: 'id',
    })

    if (error) {
      const msg = `Lot ${batchIndex}/${batches.length} : échec upsert — ${error.message} (${error.code ?? 'sans code'})`
      console.error(`[import-ai-models] ERREUR ${msg}`)
      errors.push(msg)
    } else {
      console.log(
        `[import-ai-models] OK lot ${batchIndex}/${batches.length} (${batch.length} ligne(s)).`,
      )
    }
  }

  return { ok: errors.length === 0, errors }
}

async function main(): Promise<void> {
  const csvPathArg = process.argv[2]
  const csvPath = path.resolve(
    process.cwd(),
    csvPathArg || process.env.IMPORT_AI_MODELS_CSV || 'donnees_modeles_ia.csv',
  )

  console.log(`[import-ai-models] Fichier CSV : ${csvPath}`)

  if (!existsSync(csvPath)) {
    console.error(
      `[import-ai-models] ERREUR : fichier introuvable. Placez donnees_modeles_ia.csv à la racine du projet, ou passez le chemin en argument / IMPORT_AI_MODELS_CSV.`,
    )
    process.exit(1)
  }

  const supabaseUrl = getSupabaseUrl()
  const serviceKey = getServiceRoleKey()

  if (!supabaseUrl || !serviceKey) {
    console.error(
      '[import-ai-models] ERREUR : SUPABASE_URL (ou NEXT_PUBLIC_SUPABASE_URL) et SUPABASE_SERVICE_ROLE_KEY sont requis.',
    )
    process.exit(1)
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  let fileContent: string
  try {
    fileContent = readFileSync(csvPath, 'utf8')
  } catch (e) {
    console.error(
      `[import-ai-models] ERREUR lecture fichier : ${e instanceof Error ? e.message : String(e)}`,
    )
    process.exit(1)
  }

  let rows: CsvRow[]
  try {
    rows = parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      bom: true,
      relax_column_count: true,
    }) as CsvRow[]
  } catch (e) {
    console.error(
      `[import-ai-models] ERREUR parse CSV : ${e instanceof Error ? e.message : String(e)}`,
    )
    process.exit(1)
  }

  console.log(`[import-ai-models] ${rows.length} ligne(s) données lues (hors lignes vides).`)

  const records: Record<string, unknown>[] = []
  const rowErrors: string[] = []

  for (let i = 0; i < rows.length; i++) {
    const rowNumber = i + 2
    const record = mapCsvRowToRecord(rows[i], rowNumber)
    const validationError = validateRecord(record, rowNumber)
    if (validationError) {
      rowErrors.push(validationError)
      console.error(`[import-ai-models] ERREUR ${validationError}`)
      continue
    }
    records.push(record)
  }

  if (rowErrors.length > 0) {
    console.error(`[import-ai-models] ${rowErrors.length} ligne(s) ignorée(s) après validation.`)
  }

  if (records.length === 0) {
    console.error('[import-ai-models] ERREUR : aucun enregistrement valide à importer.')
    process.exit(1)
  }

  const { ok, errors } = await upsertBatches(supabase, records)

  if (ok) {
    console.log(
      `[import-ai-models] Succès : ${records.length} enregistrement(s) traité(s) en upsert (conflit sur id).`,
    )
    process.exit(0)
  }

  console.error(
    `[import-ai-models] Terminé avec erreurs : ${errors.length} lot(s) en échec sur ${Math.ceil(records.length / BATCH_SIZE)}.`,
  )
  process.exit(1)
}

main().catch((e) => {
  console.error(`[import-ai-models] ERREUR fatale : ${e instanceof Error ? e.message : String(e)}`)
  process.exit(1)
})
