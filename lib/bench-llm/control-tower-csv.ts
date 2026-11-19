import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { z } from 'zod'

import {
  applyLifecycleStatusOverride,
  resolveProviderLifecycle,
  type ProviderLifecycleStatus,
} from '@/lib/bench-llm/provider-lifecycle'
import { getSheetsClient, upsertTextFileInFolder } from '@/lib/google-drive'
import {
  parseSheetSystemCardStatus,
  STATUT_FICHE_ERREUR,
  type SystemCardStatus,
} from '@/lib/validations/system-card'

export const CONTROL_TOWER_FILE_NAME = 'MaydAI_LLM_Control_Tower.csv'
export const CONTROL_TOWER_FOLDER_ID = '1XKR_mqtxiHOkXB3BGY5wszm3ODK1gNUZ'
export const CONTROL_TOWER_DRIVE_FOLDER_URL =
  'https://drive.google.com/drive/u/0/folders/1XKR_mqtxiHOkXB3BGY5wszm3ODK1gNUZ'

const PAGE_SIZE = 1000
const STATUT_FICHE_GENEREE = 'Générée'
const STATUT_FICHE_MANQUANTE = 'Manquante'
const STATUT_BASE_IMPORTE = 'Importé'
export const STATUT_LLM_HEADER = 'Statut LLM'

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
  system_card_status?: string | null
  systemCardStatus?: SystemCardStatus
  llmStatus: string
}

type ComplAiModelPageRow = {
  id: string
  slug: string
  model_provider: string | null
  model_name: string | null
  updated_at: string | null
  lifecycle_status: string | null
  system_card_status?: string | null
  systemCardStatus?: SystemCardStatus
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

function createControlTowerServiceClient(): SupabaseClient {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY manquant(e)')
  }
  return createClient(supabaseUrl, serviceRoleKey)
}

const controlTowerSheetRowSchema = z.tuple([
  z.string().min(1),
  z.string(),
  z.string(),
  z.string().min(1),
  z.literal(STATUT_BASE_IMPORTE),
  z.enum([STATUT_FICHE_GENEREE, STATUT_FICHE_MANQUANTE, STATUT_FICHE_ERREUR]),
  z.string(),
  z.string().min(1),
  z.string(),
  z.string(),
  z.string(),
  z.enum(['NONE', 'CREATE', 'CLASSER']),
  z.enum(['Déjà importé', 'Non']),
])

const controlTowerSheetRowsSchema = z.array(controlTowerSheetRowSchema)

async function resolveFirstControlTowerSheet(
  sheets: ReturnType<typeof getSheetsClient>,
  spreadsheetId: string,
): Promise<{ title: string; sheetId: number }> {
  const meta = await sheets.spreadsheets.get({
    spreadsheetId,
    fields: 'sheets.properties(sheetId,title,index)',
  })
  const properties = [...(meta.data.sheets ?? [])].sort(
    (a, b) => (a.properties?.index ?? 0) - (b.properties?.index ?? 0),
  )[0]?.properties
  const title = properties?.title
  const sheetId = properties?.sheetId
  if (!title || sheetId == null) {
    throw new Error('Aucun onglet dans le Google Sheet de la tour de contrôle')
  }
  return { title, sheetId }
}

export function buildControlTowerSheetRow(row: ControlTowerModelRow): string[] {
  const statutFiche = row.hasSystemCard ? STATUT_FICHE_GENEREE : row.systemCardStatus === 'error_no_system_card' ? STATUT_FICHE_ERREUR : STATUT_FICHE_MANQUANTE
  return [
    row.id,
    row.model_provider ?? '',
    row.model_name ?? '',
    toHermesFileName(row.slug),
    STATUT_BASE_IMPORTE,
    statutFiche,
    row.llmStatus,
    CONTROL_TOWER_DRIVE_FOLDER_URL,
    '',
    formatControlTowerDate(row.updated_at),
    '',
    row.hasSystemCard ? 'NONE' : 'CREATE',
    row.hasSystemCard ? 'Déjà importé' : 'Non',
  ]
}

export async function appendMissingModelsToSheet(spreadsheetId: string): Promise<number> {
  const parsedSpreadsheetId = z.string().trim().min(1).parse(spreadsheetId)
  const supabase = createControlTowerServiceClient()
  const sheets = getSheetsClient()
  const { title } = await resolveFirstControlTowerSheet(sheets, parsedSpreadsheetId)
  const quotedTitle = quoteSheetTitle(title)

  const existingData = await sheets.spreadsheets.values.get({
    spreadsheetId: parsedSpreadsheetId,
    range: `${quotedTitle}!A:A`,
  })
  const columnA = Array.isArray(existingData.data.values) ? existingData.data.values : []
  const populatedIds = columnA
    .map((row) => String(row?.[0] ?? '').trim())
    .filter((value) => value.length > 0)
  const headerPresent = foldHeader(populatedIds[0] ?? '') === foldHeader('ID Supabase')
  const existingIds = new Set(headerPresent ? populatedIds.slice(1) : populatedIds)

  let models: ControlTowerModelRow[]
  try {
    models = await fetchControlTowerRows(supabase)
  } catch (error) {
    console.error('[appendMissingModelsToSheet]', error)
    throw error
  }

  if (models.length === 0) return 0

  const rowsToAdd = models
    .filter((model) => !existingIds.has(model.id))
    .map((model) => {
      const row = buildControlTowerSheetRow(model)
      row[11] = 'CLASSER'
      return row
    })

  if (rowsToAdd.length === 0) return 0

  const parsedRows = controlTowerSheetRowsSchema.parse(rowsToAdd)
  const values = populatedIds.length === 0 ? [[...CSV_HEADERS], ...parsedRows] : parsedRows
  const lastColumn = columnIndexToA1(CSV_HEADERS.length - 1)

  await sheets.spreadsheets.values.append({
    spreadsheetId: parsedSpreadsheetId,
    range: `${quotedTitle}!A:${lastColumn}`,
    valueInputOption: 'USER_ENTERED',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values },
  })

  return parsedRows.length
}

export async function writeControlTowerLlmStatusColumn(
  rowsOrSpreadsheetId: string | Array<{ id: string; llmStatus: string }>,
): Promise<{ updatedCells: number; inserted: boolean }> {
  const explicitSheetId = typeof rowsOrSpreadsheetId === 'string'
  const spreadsheetId = explicitSheetId
    ? z.string().trim().min(1).parse(rowsOrSpreadsheetId)
    : process.env.GOOGLE_SHEETS_CONTROL_TOWER_ID?.trim()
  if (!spreadsheetId) {
    return { updatedCells: 0, inserted: false }
  }

  const rows = explicitSheetId
    ? await fetchControlTowerRows(createControlTowerServiceClient())
    : rowsOrSpreadsheetId
  const sheets = getSheetsClient()
  const { title } = await resolveFirstControlTowerSheet(sheets, spreadsheetId)
  const quotedTitle = quoteSheetTitle(title)
  const headerRes = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${quotedTitle}!1:1`,
  })
  const headers = (headerRes.data.values?.[0] ?? []).map((header) => String(header ?? ''))
  const statusCol = headers.findIndex((header) => foldHeader(header) === foldHeader(STATUT_LLM_HEADER))
  if (statusCol < 0) return { updatedCells: 0, inserted: false }

  const column = columnIndexToA1(statusCol)
  const [idRes, statusRes] = await Promise.all([
    sheets.spreadsheets.values.get({ spreadsheetId, range: `${quotedTitle}!A:A` }),
    sheets.spreadsheets.values.get({ spreadsheetId, range: `${quotedTitle}!${column}:${column}` }),
  ])
  const idRows = idRes.data.values ?? []
  const statusRows = statusRes.data.values ?? []
  const statusById = new Map(rows.map((row) => [row.id, row.llmStatus]))
  const data: { range: string; values: string[][] }[] = []
  for (let index = 1; index < idRows.length; index += 1) {
    const id = String(idRows[index]?.[0] ?? '').trim()
    const current = String(statusRows[index]?.[0] ?? '').trim()
    const next = statusById.get(id)
    if (!id || current || !next) continue
    data.push({
      range: `${quotedTitle}!${column}${index + 1}`,
      values: [[next]],
    })
  }
  if (data.length === 0) return { updatedCells: 0, inserted: false }

  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId,
    requestBody: { valueInputOption: 'RAW', data },
  })
  return { updatedCells: data.length, inserted: false }
}

export async function readControlTowerSheetMatrix(spreadsheetId: string): Promise<string[][]> {
  const parsedSpreadsheetId = z.string().trim().min(1).parse(spreadsheetId)
  const sheets = getSheetsClient()
  const { title } = await resolveFirstControlTowerSheet(sheets, parsedSpreadsheetId)
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: parsedSpreadsheetId,
    range: `${quoteSheetTitle(title)}!A:AA`,
  })
  return response.data.values ?? []
}

export async function writeControlTowerTaxonomyStatuses(
  spreadsheetId: string,
  updates: Array<{ sheetRow: number; value: string }>,
): Promise<number> {
  if (updates.length === 0) return 0
  const parsedSpreadsheetId = z.string().trim().min(1).parse(spreadsheetId)
  const sheets = getSheetsClient()
  const { title } = await resolveFirstControlTowerSheet(sheets, parsedSpreadsheetId)
  const quotedTitle = quoteSheetTitle(title)
  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId: parsedSpreadsheetId,
    requestBody: {
      valueInputOption: 'RAW',
      data: updates.map((update) => ({
        range: `${quotedTitle}!S${update.sheetRow}`,
        values: [[update.value]],
      })),
    },
  })
  return updates.length
}

export async function writeControlTowerCells(
  spreadsheetId: string,
  updates: Array<{ sheetRow: number; column: string; value: string }>,
): Promise<number> {
  if (updates.length === 0) return 0
  const parsedSpreadsheetId = z.string().trim().min(1).parse(spreadsheetId)
  const sheets = getSheetsClient()
  const { title } = await resolveFirstControlTowerSheet(sheets, parsedSpreadsheetId)
  const quotedTitle = quoteSheetTitle(title)
  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId: parsedSpreadsheetId,
    requestBody: {
      valueInputOption: 'RAW',
      data: updates.map((update) => ({
        range: `${quotedTitle}!${update.column}${update.sheetRow}`,
        values: [[update.value]],
      })),
    },
  })
  return updates.length
}

export function controlTowerFicheLabel(status: string | null | undefined): string {
  if (status === 'generated') return STATUT_FICHE_GENEREE
  if (status === 'error_no_system_card') return STATUT_FICHE_ERREUR
  return STATUT_FICHE_MANQUANTE
}

export async function syncControlTowerDerivedColumns(spreadsheetId: string): Promise<{
  ficheCells: number
  visibilityCells: number
  popularityCells: number
}> {
  const parsedSpreadsheetId = z.string().trim().min(1).parse(spreadsheetId)
  const supabase = createControlTowerServiceClient()
  const sheets = getSheetsClient()
  const { title } = await resolveFirstControlTowerSheet(sheets, parsedSpreadsheetId)
  const quotedTitle = quoteSheetTitle(title)
  const [idRes, models, visibleRows, usecaseRows] = await Promise.all([
    sheets.spreadsheets.values.get({
      spreadsheetId: parsedSpreadsheetId,
      range: `${quotedTitle}!A:A`,
    }),
    fetchAllPages<{ id: string; system_card_status: string | null }>(
      (from, to) => Promise.resolve(
        supabase
          .from('compl_ai_models')
          .select('id, system_card_status')
          .order('id', { ascending: true })
          .range(from, to),
      ),
      'Lecture compl_ai_models',
    ),
    fetchAllPages<{ id: string }>(
      (from, to) => Promise.resolve(
        supabase
          .from('compl_ai_models_visible')
          .select('id')
          .order('id', { ascending: true })
          .range(from, to),
      ),
      'Lecture compl_ai_models_visible',
    ),
    fetchAllPages<{ primary_model_id: string }>(
      (from, to) => Promise.resolve(
        supabase
          .from('usecases')
          .select('primary_model_id')
          .not('primary_model_id', 'is', null)
          .is('soft_deleted_at', null)
          .order('id', { ascending: true })
          .range(from, to),
      ),
      'Lecture usecases',
    ),
  ])

  const statusById = new Map(models.map((model) => [model.id, model.system_card_status]))
  const visibleIds = new Set(visibleRows.map((row) => row.id))
  const popularity = new Map<string, number>()
  for (const row of usecaseRows) {
    popularity.set(row.primary_model_id, (popularity.get(row.primary_model_id) ?? 0) + 1)
  }

  const idRows = (idRes.data.values ?? []).slice(1)
  if (idRows.length === 0) {
    return { ficheCells: 0, visibilityCells: 0, popularityCells: 0 }
  }
  const lastRow = idRows.length + 1
  const fiche: string[][] = []
  const visibility: string[][] = []
  const counts: number[][] = []
  for (const row of idRows) {
    const id = String(row?.[0] ?? '').trim()
    if (!id) {
      fiche.push([''])
      visibility.push([''])
      counts.push([0])
      continue
    }
    fiche.push([controlTowerFicheLabel(statusById.get(id))])
    visibility.push([visibleIds.has(id) ? 'Oui' : 'Non'])
    counts.push([popularity.get(id) ?? 0])
  }

  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId: parsedSpreadsheetId,
    requestBody: {
      valueInputOption: 'RAW',
      data: [
        { range: `${quotedTitle}!F2:F${lastRow}`, values: fiche },
        { range: `${quotedTitle}!Z2:Z${lastRow}`, values: visibility },
        { range: `${quotedTitle}!AA2:AA${lastRow}`, values: counts },
      ],
    },
  })

  return {
    ficheCells: fiche.length,
    visibilityCells: visibility.length,
    popularityCells: counts.length,
  }
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
    lines.push(buildControlTowerSheetRow(row).map((cell) => csvCell(cell)).join(','))
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
          .select('id, slug, model_provider, model_name, updated_at, lifecycle_status, system_card_status')
          .order('slug', { ascending: true })
          .range(from, to),
      ),
    'Lecture compl_ai_models',
  )

  return models.map((model) => ({
    ...model,
    hasSystemCard: systemCardIds.has(model.slug),
    systemCardStatus: systemCardIds.has(model.slug)
      ? 'generated'
      : parseSheetSystemCardStatus(model.system_card_status),
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
