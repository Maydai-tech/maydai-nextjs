import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { z } from 'zod'

import {
  columnIndexToA1,
  columnLetterForGroup,
  CONTROL_TOWER_CANONICAL_HEADERS,
  CONTROL_TOWER_CSV_HEADERS,
  CONTROL_TOWER_HEADER_GROUPS,
  findControlTowerHeader,
  quoteSheetTitle,
  requireControlTowerGroup,
  sheetCell,
  type ControlTowerHeaderGroup,
} from '@/lib/bench-llm/control-tower-headers'
import {
  applyLifecycleStatusOverride,
  resolveProviderLifecycle,
  type ProviderLifecycleStatus,
} from '@/lib/bench-llm/provider-lifecycle'
import {
  HUMAN_ACTION_HEADER,
  humanActionFormula,
} from '@/lib/bench-llm/control-tower-human-actions'
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

const CSV_HEADERS = CONTROL_TOWER_CSV_HEADERS

export type MaydaiStatusLabel = 'Questionnaire' | 'Catalogue'

export function maydaiStatusLabel(inQuestionnaire: boolean): MaydaiStatusLabel {
  return inQuestionnaire ? 'Questionnaire' : 'Catalogue'
}

export type ControlTowerModelRow = {
  id: string
  slug: string
  model_provider: string | null
  model_name: string | null
  model_provider_id?: number | null
  updated_at: string | null
  hasSystemCard: boolean
  system_card_status?: string | null
  systemCardStatus?: SystemCardStatus
  llmStatus: string
  maydaiStatus: MaydaiStatusLabel
  proposedToUser: 'Oui' | 'Non'
  declaredUseCases: number
}

type ComplAiModelPageRow = {
  id: string
  slug: string
  model_provider: string | null
  model_provider_id: number | null
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

function createControlTowerServiceClient(): SupabaseClient {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY manquant(e)')
  }
  return createClient(supabaseUrl, serviceRoleKey)
}

const APPEND_GROUPS = [
  'id',
  'statutMaydai',
  'provider',
  'modelName',
  'hermesName',
  'proposed',
  'usecases',
  'importResult',
  'fiche',
  'llmStatus',
  'driveFolder',
  'updatedAt',
  'action',
  'ready',
] as const satisfies readonly ControlTowerHeaderGroup[]

const PLATFORM_GROUPS = [
  'statutMaydai',
  'provider',
  'modelName',
  'hermesName',
  'proposed',
  'usecases',
  'fiche',
] as const satisfies readonly ControlTowerHeaderGroup[]

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

export function controlTowerFieldValues(
  row: ControlTowerModelRow,
  action?: 'NONE' | 'CREATE' | 'CLASSER',
): Partial<Record<ControlTowerHeaderGroup, string>> {
  const statutFiche = row.hasSystemCard
    ? STATUT_FICHE_GENEREE
    : row.systemCardStatus === 'error_no_system_card'
      ? STATUT_FICHE_ERREUR
      : STATUT_FICHE_MANQUANTE
  return {
    id: row.id,
    statutMaydai: row.maydaiStatus,
    provider: row.model_provider ?? '',
    modelName: row.model_name ?? '',
    hermesName: toHermesFileName(row.slug),
    proposed: row.proposedToUser,
    usecases: String(row.declaredUseCases),
    importResult: STATUT_BASE_IMPORTE,
    fiche: statutFiche,
    llmStatus: row.llmStatus,
    driveFolder: CONTROL_TOWER_DRIVE_FOLDER_URL,
    markdownFile: '',
    updatedAt: formatControlTowerDate(row.updated_at),
    priorityDate: '',
    action: action ?? (row.hasSystemCard ? 'NONE' : 'CREATE'),
    ready: row.hasSystemCard ? 'Déjà importé' : 'Non',
  }
}

function valueForSheetHeader(
  header: string,
  values: Partial<Record<ControlTowerHeaderGroup, string>>,
): string {
  for (const group of Object.keys(CONTROL_TOWER_HEADER_GROUPS) as ControlTowerHeaderGroup[]) {
    if (findControlTowerHeader([header], ...CONTROL_TOWER_HEADER_GROUPS[group]) === 0) {
      return values[group] ?? ''
    }
  }
  return ''
}

export function buildControlTowerSheetRow(row: ControlTowerModelRow): string[] {
  const values = controlTowerFieldValues(row)
  return CSV_HEADERS.map((header) => valueForSheetHeader(header, values))
}

function rowAlignedToHeaders(
  headers: readonly string[],
  values: Partial<Record<ControlTowerHeaderGroup, string>>,
): string[] {
  return headers.map((header) => valueForSheetHeader(header, values))
}

function requireGroups(headers: readonly string[], groups: readonly ControlTowerHeaderGroup[]): void {
  for (const group of groups) requireControlTowerGroup(headers, group)
}

async function readFirstSheetMatrix(
  sheets: ReturnType<typeof getSheetsClient>,
  spreadsheetId: string,
  title: string,
): Promise<string[][]> {
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: quoteSheetTitle(title),
  })
  return (response.data.values ?? []).map((row) => row.map((cell) => String(cell ?? '')))
}

function sheetHeaders(matrix: string[][]): string[] {
  return (matrix[0] ?? []).map((header) => String(header ?? ''))
}

function sheetIsEmpty(headers: string[]): boolean {
  return headers.every((header) => header.trim().length === 0)
}

export async function appendMissingModelsToSheet(spreadsheetId: string): Promise<number> {
  const parsedSpreadsheetId = z.string().trim().min(1).parse(spreadsheetId)
  const supabase = createControlTowerServiceClient()
  const sheets = getSheetsClient()
  const { title } = await resolveFirstControlTowerSheet(sheets, parsedSpreadsheetId)
  const quotedTitle = quoteSheetTitle(title)
  const matrix = await readFirstSheetMatrix(sheets, parsedSpreadsheetId, title)
  const existingHeaders = sheetHeaders(matrix)
  const empty = sheetIsEmpty(existingHeaders)
  const headers = empty ? [...CONTROL_TOWER_CANONICAL_HEADERS] : existingHeaders
  requireGroups(headers, APPEND_GROUPS)

  const idIndex = requireControlTowerGroup(headers, 'id')
  const existingIds = new Set(
    matrix.slice(1).map((row) => sheetCell(row, idIndex)).filter((value) => value.length > 0),
  )

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
    .map((model) => rowAlignedToHeaders(headers, controlTowerFieldValues(model, 'CLASSER')))

  if (rowsToAdd.length === 0) return 0

  const values = empty ? [[...headers], ...rowsToAdd] : rowsToAdd
  const lastColumn = columnIndexToA1(headers.length - 1)

  await sheets.spreadsheets.values.append({
    spreadsheetId: parsedSpreadsheetId,
    range: `${quotedTitle}!${columnIndexToA1(0)}:${lastColumn}`,
    valueInputOption: 'USER_ENTERED',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values },
  })

  return rowsToAdd.length
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
  const matrix = await readFirstSheetMatrix(sheets, spreadsheetId, title)
  const headers = sheetHeaders(matrix)
  requireGroups(headers, ['id', 'llmStatus'])
  const idIndex = requireControlTowerGroup(headers, 'id')
  const statusIndex = requireControlTowerGroup(headers, 'llmStatus')
  const column = columnIndexToA1(statusIndex)
  const statusById = new Map(rows.map((row) => [row.id, row.llmStatus]))
  const data: { range: string; values: string[][] }[] = []
  for (let index = 1; index < matrix.length; index += 1) {
    const id = sheetCell(matrix[index], idIndex)
    const current = sheetCell(matrix[index], statusIndex)
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
  return readFirstSheetMatrix(sheets, parsedSpreadsheetId, title)
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
  const headers = sheetHeaders(await readFirstSheetMatrix(sheets, parsedSpreadsheetId, title))
  const column = columnLetterForGroup(headers, 'taxonomyValidated')
  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId: parsedSpreadsheetId,
    requestBody: {
      valueInputOption: 'RAW',
      data: updates.map((update) => ({
        range: `${quotedTitle}!${column}${update.sheetRow}`,
        values: [[update.value]],
      })),
    },
  })
  return updates.length
}

function groupForHeaderLabel(label: string): ControlTowerHeaderGroup | null {
  for (const group of Object.keys(CONTROL_TOWER_HEADER_GROUPS) as ControlTowerHeaderGroup[]) {
    if (findControlTowerHeader([label], ...CONTROL_TOWER_HEADER_GROUPS[group]) === 0) return group
  }
  return null
}

export async function writeControlTowerCells(
  spreadsheetId: string,
  updates: Array<{ sheetRow: number; header: string; value: string }>,
): Promise<number> {
  if (updates.length === 0) return 0
  const parsedSpreadsheetId = z.string().trim().min(1).parse(spreadsheetId)
  const sheets = getSheetsClient()
  const { title } = await resolveFirstControlTowerSheet(sheets, parsedSpreadsheetId)
  const quotedTitle = quoteSheetTitle(title)
  const headers = sheetHeaders(await readFirstSheetMatrix(sheets, parsedSpreadsheetId, title))
  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId: parsedSpreadsheetId,
    requestBody: {
      valueInputOption: 'RAW',
      data: updates.map((update) => {
        const group = groupForHeaderLabel(update.header)
        if (!group) {
          throw new Error(`En-tête manquant : « ${update.header} ». Aucune colonne n'a été insérée.`)
        }
        return {
          range: `${quotedTitle}!${columnLetterForGroup(headers, group)}${update.sheetRow}`,
          values: [[update.value]],
        }
      }),
    },
  })
  return updates.length
}

export function controlTowerFicheLabel(status: string | null | undefined): string {
  if (status === 'generated') return STATUT_FICHE_GENEREE
  if (status === 'error_no_system_card') return STATUT_FICHE_ERREUR
  return STATUT_FICHE_MANQUANTE
}

export type PlatformSheetModel = {
  provider: string
  modelName: string
  hermesName: string
  maydaiStatus: string
  proposedToUser: string
  declaredUseCases: string
  ficheStatus: string
}

export function projectPlatformColumns(input: {
  headers: string[]
  rows: string[][]
  models: Map<string, PlatformSheetModel>
}): Array<{ header: string; column: string; values: string[][] }> {
  requireGroups(input.headers, ['id', ...PLATFORM_GROUPS])
  const idIndex = requireControlTowerGroup(input.headers, 'id')
  const dataRows = input.rows.slice(1)
  return PLATFORM_GROUPS.map((group) => {
    const index = requireControlTowerGroup(input.headers, group)
    const values = dataRows.map((row) => {
      const id = sheetCell(row, idIndex)
      const model = input.models.get(id)
      if (!model) return [sheetCell(row, index)]
      const fields: Partial<Record<ControlTowerHeaderGroup, string>> = {
        statutMaydai: model.maydaiStatus,
        provider: model.provider,
        modelName: model.modelName,
        hermesName: model.hermesName,
        proposed: model.proposedToUser,
        usecases: model.declaredUseCases,
        fiche: model.ficheStatus,
      }
      return [fields[group] ?? '']
    })
    return {
      header: CONTROL_TOWER_HEADER_GROUPS[group][0],
      column: columnIndexToA1(index),
      values,
    }
  })
}

export async function syncControlTowerDerivedColumns(spreadsheetId: string): Promise<{
  ficheCells: number
  visibilityCells: number
  popularityCells: number
  humanActionCells: number
}> {
  const parsedSpreadsheetId = z.string().trim().min(1).parse(spreadsheetId)
  const supabase = createControlTowerServiceClient()
  const sheets = getSheetsClient()
  const { title } = await resolveFirstControlTowerSheet(sheets, parsedSpreadsheetId)
  const quotedTitle = quoteSheetTitle(title)
  const matrix = await readFirstSheetMatrix(sheets, parsedSpreadsheetId, title)
  const headers = sheetHeaders(matrix)
  const models = await fetchControlTowerRows(supabase)
  const byId = new Map(models.map((model) => [
    model.id,
    {
      provider: model.model_provider ?? '',
      modelName: model.model_name ?? '',
      hermesName: toHermesFileName(model.slug),
      maydaiStatus: model.maydaiStatus,
      proposedToUser: model.proposedToUser,
      declaredUseCases: String(model.declaredUseCases),
      ficheStatus: controlTowerFicheLabel(model.systemCardStatus),
    },
  ]))
  const columns = projectPlatformColumns({ headers, rows: matrix, models: byId })
  if (columns[0]?.values.length === 0) {
    return { ficheCells: 0, visibilityCells: 0, popularityCells: 0, humanActionCells: 0 }
  }
  const lastRow = (columns[0]?.values.length ?? 0) + 1
  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId: parsedSpreadsheetId,
    requestBody: {
      valueInputOption: 'RAW',
      data: columns.map((column) => ({
        range: `${quotedTitle}!${column.column}2:${column.column}${lastRow}`,
        values: column.values,
      })),
    },
  })
  const humanActionIndex = findControlTowerHeader(headers, HUMAN_ACTION_HEADER)
  let humanActionCells = 0
  if (humanActionIndex >= 0) {
    const column = columnIndexToA1(humanActionIndex)
    const formula = humanActionFormula()
    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId: parsedSpreadsheetId,
      requestBody: {
        valueInputOption: 'USER_ENTERED',
        data: [{
          range: `${quotedTitle}!${column}2:${column}${lastRow}`,
          values: Array.from({ length: lastRow - 1 }, () => [formula]),
        }],
      },
    })
    humanActionCells = lastRow - 1
  }
  const length = columns[0]?.values.length ?? 0
  return { ficheCells: length, visibilityCells: length, popularityCells: length, humanActionCells }
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
  const [systemCardIds, sourceIdsByModel, providers, visibleRows, usecaseRows, models] = await Promise.all([
    fetchSystemCardIdentifiers(supabase),
    fetchSourceIdsByModel(supabase),
    fetchAllPages<{ id: number; tooltip_title: string | null }>(
      (from, to) => Promise.resolve(
        supabase
          .from('model_providers')
          .select('id, tooltip_title')
          .order('id', { ascending: true })
          .range(from, to),
      ),
      'Lecture model_providers',
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
    fetchAllPages<ComplAiModelPageRow>(
      (from, to) =>
        Promise.resolve(
          supabase
            .from('compl_ai_models')
            .select('id, slug, model_provider, model_provider_id, model_name, updated_at, lifecycle_status, system_card_status')
            .order('slug', { ascending: true })
            .range(from, to),
        ),
      'Lecture compl_ai_models',
    ),
  ])
  const questionnaireProviderIds = new Set(
    providers.filter((provider) => provider.tooltip_title != null).map((provider) => provider.id),
  )
  const visibleIds = new Set(visibleRows.map((row) => row.id))
  const usecases = new Map<string, number>()
  for (const row of usecaseRows) {
    usecases.set(row.primary_model_id, (usecases.get(row.primary_model_id) ?? 0) + 1)
  }

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
    maydaiStatus: maydaiStatusLabel(
      model.model_provider_id != null && questionnaireProviderIds.has(model.model_provider_id),
    ),
    proposedToUser: visibleIds.has(model.id) ? 'Oui' : 'Non',
    declaredUseCases: usecases.get(model.id) ?? 0,
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
