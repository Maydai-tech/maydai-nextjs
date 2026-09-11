import type { SupabaseClient } from '@supabase/supabase-js'

import { upsertTextFileInFolder } from '@/lib/google-drive'

export const CONTROL_TOWER_FILE_NAME = 'MaydAI_LLM_Control_Tower.csv'
export const CONTROL_TOWER_FOLDER_ID = '1XKR_mqtxiHOkXB3BGY5wszm3ODK1gNUZ'
export const CONTROL_TOWER_DRIVE_FOLDER_URL =
  'https://drive.google.com/drive/u/0/folders/1XKR_mqtxiHOkXB3BGY5wszm3ODK1gNUZ'

const PAGE_SIZE = 1000
const STATUT_FICHE_GENEREE = 'Générée'
const STATUT_FICHE_MANQUANTE = 'Manquante'
const STATUT_BASE_IMPORTE = 'Importé'

const CSV_HEADERS = [
  'ID Supabase',
  'Nom de la technologie',
  'Nom du LLM (Standard Supabase)',
  'Nom du LLM (Standard Hermes/Fichier)',
  'Statut Supabase',
  'Statut Fiche Technique',
  'Lien du dossier Drive cible',
  'Lien du fichier Markdown généré',
  'Date de dernière mise à jour (Supabase)',
  "Date de priorisation de l'action",
  'Action requise par Hermes',
  'Prêt pour import',
] as const

export type ControlTowerModelRow = {
  id: string
  slug: string
  model_provider: string | null
  model_name: string | null
  updated_at: string | null
  hasSystemCard: boolean
}

type ComplAiModelPageRow = {
  id: string
  slug: string
  model_provider: string | null
  model_name: string | null
  updated_at: string | null
}

export type ExportControlTowerCsvResult = {
  fileId: string
  rowCount: number
  updated: boolean
}

function csvCell(value: string | number | null | undefined): string {
  const text = value == null ? '' : String(value)
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`
  }
  return text
}

export function toHermesFileName(slug: string): string {
  return slug.replace(/-/g, '_')
}

export function formatControlTowerDate(value: string | null | undefined): string {
  if (!value) return ''
  const trimmed = value.trim()
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
    return trimmed.slice(0, 10)
  }
  const parsed = Date.parse(trimmed)
  if (!Number.isFinite(parsed)) return ''
  return new Date(parsed).toISOString().slice(0, 10)
}

export function buildControlTowerCsv(rows: ControlTowerModelRow[]): string {
  const lines = [CSV_HEADERS.join(',')]

  for (const row of rows) {
    const statutFiche = row.hasSystemCard ? STATUT_FICHE_GENEREE : STATUT_FICHE_MANQUANTE
    lines.push(
      [
        csvCell(row.id),
        csvCell(row.model_provider),
        csvCell(row.model_name),
        csvCell(toHermesFileName(row.slug)),
        csvCell(STATUT_BASE_IMPORTE),
        csvCell(statutFiche),
        csvCell(CONTROL_TOWER_DRIVE_FOLDER_URL),
        csvCell(''),
        csvCell(formatControlTowerDate(row.updated_at)),
        csvCell(''),
        csvCell(row.hasSystemCard ? 'NONE' : 'CREATE'),
        csvCell(row.hasSystemCard ? 'Déjà importé' : 'Non'),
      ].join(','),
    )
  }

  return `${lines.join('\n')}\n`
}

type PageResult<T> = { data: T[] | null; error: { message: string } | null }

async function fetchAllPages<T>(
  loadPage: (from: number, to: number) => PromiseLike<PageResult<T>>,
  errorPrefix: string,
): Promise<T[]> {
  const rows: T[] = []
  let page = 0
  let hasMore = true

  while (hasMore) {
    const from = page * PAGE_SIZE
    const to = from + PAGE_SIZE - 1
    const { data, error } = await loadPage(from, to)

    if (error) {
      throw new Error(`${errorPrefix}: ${error.message}`)
    }

    const pageRows = data || []
    rows.push(...pageRows)
    hasMore = pageRows.length === PAGE_SIZE
    page += 1
  }

  return rows
}

async function fetchSystemCardIdentifiers(
  supabase: SupabaseClient,
): Promise<Set<string>> {
  const rows = await fetchAllPages<{ model_identifier: string }>(
    (from, to) =>
      Promise.resolve(
        supabase
          .from('llm_system_cards')
          .select('model_identifier')
          .order('model_identifier', { ascending: true })
          .range(from, to),
      ),
    'Lecture llm_system_cards',
  )

  return new Set(rows.map((row) => row.model_identifier).filter(Boolean))
}

async function fetchControlTowerRows(
  supabase: SupabaseClient,
): Promise<ControlTowerModelRow[]> {
  const systemCardIds = await fetchSystemCardIdentifiers(supabase)
  const models = await fetchAllPages<ComplAiModelPageRow>(
    (from, to) =>
      Promise.resolve(
        supabase
          .from('compl_ai_models')
          .select('id, slug, model_provider, model_name, updated_at')
          .order('slug', { ascending: true })
          .range(from, to),
      ),
    'Lecture compl_ai_models',
  )

  return models.map((model) => ({
    ...model,
    hasSystemCard: systemCardIds.has(model.slug),
  }))
}

export async function exportControlTowerCsv(
  supabase: SupabaseClient,
): Promise<ExportControlTowerCsvResult> {
  const rows = await fetchControlTowerRows(supabase)
  const csv = buildControlTowerCsv(rows)
  const folderId =
    process.env.GOOGLE_DRIVE_FOLDER_CONTROL_TOWER?.trim() || CONTROL_TOWER_FOLDER_ID

  const uploaded = await upsertTextFileInFolder({
    folderId,
    fileName: CONTROL_TOWER_FILE_NAME,
    content: csv,
    mimeType: 'text/csv',
  })

  return {
    fileId: uploaded.id,
    rowCount: rows.length,
    updated: uploaded.updated,
  }
}
