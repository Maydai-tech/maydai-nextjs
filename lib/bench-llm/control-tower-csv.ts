import type { SupabaseClient } from '@supabase/supabase-js'

import {
  applyLifecycleStatusOverride,
  resolveProviderLifecycle,
  type ProviderLifecycleStatus,
} from '@/lib/bench-llm/provider-lifecycle'
import { getSheetsClient, upsertTextFileInFolder } from '@/lib/google-drive'

export const CONTROL_TOWER_FILE_NAME = 'MaydAI_LLM_Control_Tower.csv'
export const CONTROL_TOWER_FOLDER_ID = '1XKR_mqtxiHOkXB3BGY5wszm3ODK1gNUZ'
export const CONTROL_TOWER_DRIVE_FOLDER_URL =
  'https://drive.google.com/drive/u/0/folders/1XKR_mqtxiHOkXB3BGY5wszm3ODK1gNUZ'

const PAGE_SIZE = 1000
const STATUT_FICHE_GENEREE = 'Générée'
const STATUT_FICHE_MANQUANTE = 'Manquante'
const STATUT_BASE_IMPORTE = 'Importé'
export const STATUT_LLM_HEADER = 'Statut LLM'
const STATUT_FICHE_HEADER = 'Statut Fiche Technique'

const LIFECYCLE_STATUSES = new Set<ProviderLifecycleStatus>([
  'active',
  'legacy',
  'deprecated',
  'retired',
])

const CSV_HEADERS = [
  'ID Supabase',
  'Nom de la technologie',
  'Nom du LLM (Standard Supabase)',
  'Nom du LLM (Standard Hermes/Fichier)',
  'Statut Supabase',
  'Statut Fiche Technique',
  'Statut LLM',
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
  llmStatus: string
}

type ComplAiModelPageRow = {
  id: string
  slug: string
  model_provider: string | null
  model_name: string | null
  updated_at: string | null
  lifecycle_status: string | null
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

function asLifecycleStatus(value: string | null | undefined): ProviderLifecycleStatus | null {
  if (!value || !LIFECYCLE_STATUSES.has(value as ProviderLifecycleStatus)) return null
  return value as ProviderLifecycleStatus
}

export function resolveControlTowerLlmStatus(input: {
  slug: string
  modelName: string | null
  lifecycleStatus?: string | null
  sourceIds?: Array<string | null | undefined>
}): string {
  return (
    applyLifecycleStatusOverride(
      resolveProviderLifecycle([input.slug, input.modelName, ...(input.sourceIds ?? [])]),
      asLifecycleStatus(input.lifecycleStatus),
    )?.label ?? ''
  )
}

function foldHeader(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
}

function columnIndexToA1(index: number): string {
  let n = index + 1
  let label = ''
  while (n > 0) {
    const rem = (n - 1) % 26
    label = String.fromCharCode(65 + rem) + label
    n = Math.floor((n - 1) / 26)
  }
  return label
}

function quoteSheetTitle(title: string): string {
  return `'${title.replace(/'/g, "''")}'`
}

export async function writeControlTowerLlmStatusColumn(
  rows: Array<{ id: string; llmStatus: string }>,
): Promise<{ updatedCells: number; inserted: boolean }> {
  const spreadsheetId = process.env.GOOGLE_SHEETS_CONTROL_TOWER_ID?.trim()
  if (!spreadsheetId) {
    return { updatedCells: 0, inserted: false }
  }

  const sheets = getSheetsClient()
  const meta = await sheets.spreadsheets.get({
    spreadsheetId,
    fields: 'sheets.properties(sheetId,title,index)',
  })
  const sheet = [...(meta.data.sheets ?? [])].sort(
    (a, b) => (a.properties?.index ?? 0) - (b.properties?.index ?? 0),
  )[0]?.properties
  const title = sheet?.title
  const sheetId = sheet?.sheetId
  if (!title || sheetId == null) {
    throw new Error('Aucun onglet dans le Google Sheet de la tour de contrôle')
  }

  const quotedTitle = quoteSheetTitle(title)
  const headerRes = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${quotedTitle}!1:1`,
  })
  const headers = (headerRes.data.values?.[0] ?? []).map((header) => String(header ?? ''))
  let statusCol = headers.findIndex((header) => foldHeader(header) === foldHeader(STATUT_LLM_HEADER))
  let inserted = false

  if (statusCol < 0) {
    const ficheCol = headers.findIndex((header) => foldHeader(header) === foldHeader(STATUT_FICHE_HEADER))
    const insertAt = ficheCol >= 0 ? ficheCol + 1 : headers.length
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [
          {
            insertDimension: {
              range: {
                sheetId,
                dimension: 'COLUMNS',
                startIndex: insertAt,
                endIndex: insertAt + 1,
              },
              inheritFromBefore: insertAt > 0,
            },
          },
        ],
      },
    })
    statusCol = insertAt
    inserted = true
  }

  const idRes = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${quotedTitle}!A:A`,
  })
  const idRows = idRes.data.values ?? []
  const statusById = new Map(rows.map((row) => [row.id, row.llmStatus]))
  const column = columnIndexToA1(statusCol)
  const values = idRows.map((row, index) => {
    if (index === 0) return [STATUT_LLM_HEADER]
    return [statusById.get(String(row[0] ?? '').trim()) ?? '']
  })

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${quotedTitle}!${column}1:${column}${Math.max(values.length, 1)}`,
    valueInputOption: 'RAW',
    requestBody: { values },
  })

  return { updatedCells: Math.max(values.length - 1, 0), inserted }
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
        csvCell(row.llmStatus),
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

async function fetchSourceIdsByModel(
  supabase: SupabaseClient,
): Promise<Map<string, string[]>> {
  const rows = await fetchAllPages<{ model_id: string; source_id: string | null }>(
    (from, to) =>
      Promise.resolve(
        supabase
          .from('llm_model_source_ids')
          .select('model_id, source_id')
          .order('model_id', { ascending: true })
          .range(from, to),
      ),
    'Lecture llm_model_source_ids',
  )

  const byModel = new Map<string, string[]>()
  for (const row of rows) {
    if (!row.model_id || !row.source_id) continue
    const current = byModel.get(row.model_id) ?? []
    current.push(row.source_id)
    byModel.set(row.model_id, current)
  }
  return byModel
}

async function fetchControlTowerRows(
  supabase: SupabaseClient,
): Promise<ControlTowerModelRow[]> {
  const systemCardIds = await fetchSystemCardIdentifiers(supabase)
  const sourceIdsByModel = await fetchSourceIdsByModel(supabase)
  const models = await fetchAllPages<ComplAiModelPageRow>(
    (from, to) =>
      Promise.resolve(
        supabase
          .from('compl_ai_models')
          .select('id, slug, model_provider, model_name, updated_at, lifecycle_status')
          .order('slug', { ascending: true })
          .range(from, to),
      ),
    'Lecture compl_ai_models',
  )

  return models.map((model) => ({
    ...model,
    hasSystemCard: systemCardIds.has(model.slug),
    llmStatus: resolveControlTowerLlmStatus({
      slug: model.slug,
      modelName: model.model_name,
      lifecycleStatus: model.lifecycle_status,
      sourceIds: sourceIdsByModel.get(model.id),
    }),
  }))
}

export async function exportControlTowerCsv(
  supabase: SupabaseClient,
): Promise<ExportControlTowerCsvResult> {
  const rows = await fetchControlTowerRows(supabase)
  await writeControlTowerLlmStatusColumn(rows)
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
