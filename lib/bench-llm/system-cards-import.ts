import { parse } from 'csv-parse/sync'
import type { SupabaseClient } from '@supabase/supabase-js'

import { CONTROL_TOWER_FOLDER_ID } from '@/lib/bench-llm/control-tower-csv'
import { findControlTowerHeader } from '@/lib/bench-llm/control-tower-headers'
import { normalizeLlmModelSlug } from '@/lib/bench-llm/model-slug'
import {
  formatImportedPillarStatus,
  parseSystemCardPillars,
  PILLAR_PARSE_FAILURE,
  type ParsedPillar,
} from './system-card-pillars-parser'
import {
  parseSheetSystemCardStatus,
  STATUT_FICHE_ERREUR,
  STATUT_FICHE_GENEREE,
  type SystemCardStatus,
} from '@/lib/validations/system-card'
import {
  escapeDriveName,
  getDriveClient,
  getDriveFileText,
  getFileFromDrive,
  getSheetsClient,
} from '@/lib/google-drive'

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export type ControlTowerImportRow = {
  idSupabase: string
  provider: string
  modelName: string
  hermesName: string
  markdownLink: string
  readyForImport: string
  statutFicheTechnique?: string
}

export type DriveMarkdownRef = {
  fileId?: string
  fileName?: string
}

export type ImportSystemCardsResult = {
  success: boolean
  processed: number
  inserted: number
  skipped: string[]
  errors: string[]
  errorStatusesSynced?: number
}

export type ControlTowerStatusUpdate = {
  idSupabase: string
  hermesName: string
  modelName: string
  success: boolean
  errorMessage?: string
  statutSupabase?: string
  ficheTechnique?: string
  importedOn: string
}

export type SystemCardsImportDeps = {
  downloadControlTowerCsv: () => Promise<string>
  downloadMarkdown: (ref: DriveMarkdownRef) => Promise<string>
  writeControlTowerStatuses?: (
    updates: ControlTowerStatusUpdate[],
  ) => Promise<void>
  supabase: SupabaseClient
}

const STATUT_SUPABASE_HEADER = 'Statut Supabase'
const PRET_POUR_IMPORT_HEADER = 'Prêt pour import'
const ACTION_HERMES_HEADER = 'Action requise par Hermes'
const SPREADSHEET_MIME = 'application/vnd.google-apps.spreadsheet'

function stripInvisibleCsvChars(value: string): string {
  return String(value ?? '')
    .replace(/^\uFEFF/, '')
    .replace(/[\u0000-\u001F\u007F]/g, '')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/\u00a0/g, ' ')
}

export function sanitizeCsvHeader(value: string): string {
  return stripInvisibleCsvChars(value).replace(/\s+/g, ' ').trim()
}

export function sanitizeCsvCell(value: string): string {
  return stripInvisibleCsvChars(value).trim()
}

function foldHeader(value: string): string {
  return sanitizeCsvHeader(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

function normalizeRecordKeys(row: Record<string, string>): Record<string, string> {
  const normalized: Record<string, string> = {}
  for (const [key, value] of Object.entries(row)) {
    normalized[sanitizeCsvHeader(key)] = value ?? ''
  }
  return normalized
}

function cell(row: Record<string, string>, ...aliases: string[]): string {
  const wanted = new Set(aliases.map(foldHeader))
  for (const [key, value] of Object.entries(row)) {
    if (wanted.has(foldHeader(key))) return sanitizeCsvCell(value ?? '')
  }
  return ''
}

function markdownFileNameFromRow(row: Record<string, string>): string {
  const exact = cell(row, 'Lien du fichier Markdown généré')
  if (exact) return exact

  for (const [key, value] of Object.entries(row)) {
    const folded = foldHeader(key)
    if (
      folded.includes('fichier markdown') ||
      (folded.includes('markdown') && folded.includes('genere'))
    ) {
      return sanitizeCsvCell(value ?? '')
    }
  }
  return ''
}

export function isReadyForImport(value: string | null | undefined): boolean {
  return (value ?? '').trim().toLowerCase() === 'oui'
}

export function parseControlTowerCsv(csvContent: string): ControlTowerImportRow[] {
  const records = parse(csvContent, {
    columns: (headers: string[]) => headers.map((header) => sanitizeCsvHeader(header)),
    skip_empty_lines: true,
    trim: true,
    relax_column_count: true,
    bom: true,
  }) as Record<string, string>[]

  return records.map((rawRow, index) => {
    const row = normalizeRecordKeys(rawRow)
    if (index === 0) {
      console.log(Object.keys(row))
    }

    return {
      idSupabase: cell(row, 'ID Supabase'),
      provider: cell(row, 'Nom de la technologie'),
      modelName: cell(row, 'Nom du LLM (Standard Supabase)'),
      hermesName: cell(row, 'Nom du LLM (Standard Hermes/Fichier)'),
      markdownLink: markdownFileNameFromRow(row),
      readyForImport: cell(row, 'Prêt pour import'),
      statutFicheTechnique: cell(row, 'Statut Fiche Technique'),
    }
  })
}

export function missingDriveFileMessage(fileName: string): string {
  return `Fichier introuvable sur le Drive pour le nom : ${fileName}`
}

export function resolveDriveMarkdownRef(raw: string): DriveMarkdownRef {
  const value = sanitizeCsvCell(raw)
  if (!value) return {}

  const fileMatch = value.match(/\/file\/d\/([A-Za-z0-9_-]{10,})/i)
  if (fileMatch?.[1]) return { fileId: fileMatch[1] }

  const documentMatch = value.match(/\/document\/d\/([A-Za-z0-9_-]{10,})/i)
  if (documentMatch?.[1]) return { fileId: documentMatch[1] }

  const queryIdMatch = value.match(/[?&]id=([A-Za-z0-9_-]{10,})/i)
  if (queryIdMatch?.[1]) return { fileId: queryIdMatch[1] }

  if (/^[A-Za-z0-9_-]{25,}$/.test(value)) return { fileId: value }

  return { fileName: value }
}

const FILE_NAME_DATE_RE = /(\d{4})[-_](\d{2})[-_](\d{2}|XX|xx|\?\?)/
const UNKNOWN_DAY_RE = /^(?:XX|xx|\?\?)$/i
const FR_MONTHS: Array<[string, string]> = [
  ['janvier', '01'],
  ['fevrier', '02'],
  ['mars', '03'],
  ['avril', '04'],
  ['mai', '05'],
  ['juin', '06'],
  ['juillet', '07'],
  ['aout', '08'],
  ['septembre', '09'],
  ['octobre', '10'],
  ['novembre', '11'],
  ['decembre', '12'],
]

export type CardVersionDateParse = {
  card_version_date: string | null
  card_version_date_is_approx: boolean
}

function emptyCardVersionDateParse(): CardVersionDateParse {
  return { card_version_date: null, card_version_date_is_approx: false }
}

function isUnknownDayToken(value: string): boolean {
  return UNKNOWN_DAY_RE.test(value)
}

export function parseCardVersionDateFromFileName(
  fileName: string | null | undefined,
): CardVersionDateParse {
  const match = (fileName ?? '').match(FILE_NAME_DATE_RE)
  if (!match) return emptyCardVersionDateParse()
  const year = match[1]
  const month = match[2]
  const dayToken = match[3]
  if (!year || !month || !dayToken) return emptyCardVersionDateParse()
  const monthNum = Number(month)
  if (monthNum < 1 || monthNum > 12) return emptyCardVersionDateParse()
  if (isUnknownDayToken(dayToken)) {
    return {
      card_version_date: `${year}-${month}-01`,
      card_version_date_is_approx: true,
    }
  }
  const dayNum = Number(dayToken)
  if (dayNum < 1 || dayNum > 31) return emptyCardVersionDateParse()
  return {
    card_version_date: `${year}-${month}-${dayToken}`,
    card_version_date_is_approx: false,
  }
}

export function extractCardVersionDateFromFileName(
  fileName: string | null | undefined,
): string | null {
  return parseCardVersionDateFromFileName(fileName).card_version_date
}

export function cardVersionDatePrecision(
  date: string | null,
  isApprox: boolean,
): 'exacte' | 'approximative' | null {
  if (!date) return null
  return isApprox ? 'approximative' : 'exacte'
}

export function isSameYearMonth(a: string, b: string): boolean {
  return a.slice(0, 7) === b.slice(0, 7)
}

export function approxSameMonthOverwriteWarning(baseDate: string, fileDate: string): string {
  return `dates approximatives sur le même mois : la comparaison n'est pas fiable au jour près (base: ${baseDate}, fichier: ${fileDate})`
}

export function decideCardVersionOverwrite(params: {
  existingDate: string | null
  incomingDate: string | null
  existingApprox?: boolean
  incomingApprox?: boolean
}): { action: 'upsert' | 'skip'; warning?: string; message?: string } {
  const { existingDate, incomingDate, existingApprox, incomingApprox } = params
  const bothApproxSameMonth = Boolean(
    existingDate &&
      incomingDate &&
      existingApprox &&
      incomingApprox &&
      isSameYearMonth(existingDate, incomingDate),
  )
  const warning = bothApproxSameMonth
    ? approxSameMonthOverwriteWarning(existingDate as string, incomingDate as string)
    : undefined

  if (existingDate && incomingDate && existingDate > incomingDate && !bothApproxSameMonth) {
    return { action: 'skip', message: olderVersionIgnoredMessage(existingDate, incomingDate) }
  }

  return warning ? { action: 'upsert', warning } : { action: 'upsert' }
}

function monthFirstOf(year: string, monthToken: string): string | null {
  const month = monthToken.padStart(2, '0')
  const monthNum = Number(month)
  if (monthNum < 1 || monthNum > 12) return null
  return `${year}-${month}-01`
}

export function normalizeCardMonth(label: string | null | undefined): string | null {
  const value = (label ?? '').trim()
  if (!value) return null

  const iso = value.match(/(\d{4})[-_/](\d{1,2}|XX|xx|\?\?)(?:[-_/](\d{2}|XX|xx|\?\?))?/i)
  if (iso?.[1] && iso[2] && /^\d{1,2}$/.test(iso[2])) {
    const fromIso = monthFirstOf(iso[1], iso[2])
    if (fromIso) return fromIso
  }

  const dmy = value.match(/(\d{1,2}|XX|xx|\?\?)[-_/](\d{1,2})[-_/](\d{4})/i)
  if (dmy?.[1] && dmy[2] && dmy[3]) {
    const dayNum = Number(dmy[1])
    const dayOk = isUnknownDayToken(dmy[1]) || (dayNum >= 1 && dayNum <= 31)
    if (dayOk) {
      const fromDmy = monthFirstOf(dmy[3], dmy[2])
      if (fromDmy) return fromDmy
    }
  }

  const folded = foldHeader(value).replace(/^(?:xx|\?\?|\d{1,2})\s+/, '')
  const year = folded.match(/(\d{4})/)?.[1]
  if (!year) return null
  const month = FR_MONTHS.find(([name]) => folded.includes(name))?.[1]
  return month ? `${year}-${month}-01` : null
}

function sanitizeCardDateLabel(value: string): string {
  return value.replace(/^[*_\s\u00a0]+|[*_\s\u00a0]+$/g, '')
}

export function extractCardDateFromMarkdown(
  markdown: string,
  cardVersionDate?: string | null,
): {
  card_date_label: string | null
  card_month: string | null
} {
  const lineMatch = markdown.match(/^.*Date de la fiche\s*:\s*(.+)$/im)
  const card_date_label = sanitizeCardDateLabel(lineMatch?.[1] ?? '') || null
  return {
    card_date_label,
    card_month: resolveCardMonth(card_date_label, cardVersionDate),
  }
}

export function toDateOnly(value: string | null | undefined): string | null {
  const match = String(value ?? '').match(/^(\d{4}-\d{2}-\d{2})/)
  return match?.[1] ?? null
}

export function cardMonthFromVersionDate(
  versionDate: string | null | undefined,
): string | null {
  const date = toDateOnly(versionDate)
  if (!date) return null
  return monthFirstOf(date.slice(0, 4), date.slice(5, 7))
}

export function resolveCardMonth(
  cardDateLabel: string | null | undefined,
  cardVersionDate?: string | null,
): string | null {
  return normalizeCardMonth(cardDateLabel) ?? cardMonthFromVersionDate(cardVersionDate)
}

export function olderVersionIgnoredMessage(baseDate: string, fileDate: string): string {
  return `version plus ancienne ignorée (base: ${baseDate}, fichier: ${fileDate})`
}

function slugFromHermesName(value: string): string | null {
  const withoutExt = value.replace(/\.(md|markdown|txt)$/i, '')
  return normalizeLlmModelSlug(withoutExt.replace(/_/g, '-'))
}

export async function resolveModelIdentifier(
  supabase: SupabaseClient,
  row: ControlTowerImportRow,
): Promise<{ slug: string; modelName: string; provider: string }> {
  if (UUID_RE.test(row.idSupabase)) {
    const { data, error } = await supabase
      .from('compl_ai_models')
      .select('slug, model_name, model_provider')
      .eq('id', row.idSupabase)
      .maybeSingle()

    if (error) {
      throw new Error(`Lecture compl_ai_models: ${error.message}`)
    }
    if (data?.slug) {
      return {
        slug: data.slug,
        modelName: row.modelName || data.model_name || row.hermesName,
        provider: row.provider || data.model_provider || 'Unknown',
      }
    }
  }

  const fromHermes = slugFromHermesName(row.hermesName)
  if (fromHermes) {
    return {
      slug: fromHermes,
      modelName: row.modelName || row.hermesName,
      provider: row.provider || 'Unknown',
    }
  }

  const fromName = normalizeLlmModelSlug(row.modelName)
  if (fromName) {
    return {
      slug: fromName,
      modelName: row.modelName,
      provider: row.provider || 'Unknown',
    }
  }

  throw new Error('Impossible de résoudre le slug du modèle')
}

async function syncModelSystemCardStatus(
  supabase: SupabaseClient,
  row: ControlTowerImportRow,
  status: SystemCardStatus,
): Promise<boolean> {
  if (UUID_RE.test(row.idSupabase)) {
    const { data, error } = await supabase
      .from('compl_ai_models')
      .update({ system_card_status: status })
      .eq('id', row.idSupabase)
      .select('id')
    if (error) {
      throw new Error(error.message || error.details || 'Erreur update system_card_status par id')
    }
    if (data && data.length > 0) return true
  }

  const model = await resolveModelIdentifier(supabase, row)
  const { data: slugData, error: slugError } = await supabase
    .from('compl_ai_models')
    .update({ system_card_status: status })
    .eq('slug', model.slug)
    .select('id')
  if (slugError) {
    throw new Error(slugError.message || slugError.details || 'Erreur update system_card_status par slug')
  }
  return Boolean(slugData && slugData.length > 0)
}

export async function syncControlTowerSystemCardStatuses(
  supabase: SupabaseClient,
  preloadedRows?: ControlTowerImportRow[],
): Promise<{ errorStatusesSynced: number }> {
  let rows = preloadedRows
  if (!rows) {
    const csv = await downloadControlTowerCsvFromDrive()
    rows = parseControlTowerCsv(csv)
  }

  let errorStatusesSynced = 0
  for (const row of rows) {
    if (parseSheetSystemCardStatus(row.statutFicheTechnique) !== 'error_no_system_card') continue
    try {
      const updated = await syncModelSystemCardStatus(supabase, row, 'error_no_system_card')
      if (updated === true) errorStatusesSynced += 1
    } catch (error) {
      console.error('[LLM Control Tower Sync] sync error_no_system_card failed', error)
    }
  }

  console.log('[LLM Control Tower Sync] Statuts erreur synchronisés en DB :', { errorStatusesSynced })
  return { errorStatusesSynced }
}

export function controlTowerFolderId(): string {
  return process.env.GOOGLE_DRIVE_FOLDER_CONTROL_TOWER?.trim() || CONTROL_TOWER_FOLDER_ID
}

export function controlTowerSpreadsheetId(): string {
  const id = process.env.GOOGLE_SHEETS_CONTROL_TOWER_ID?.trim()
  if (!id) {
    throw new Error('GOOGLE_SHEETS_CONTROL_TOWER_ID est requis')
  }
  return id
}

export function findColumnIndexByHeader(headers: string[], ...labels: string[]): number {
  return findControlTowerHeader(headers, ...labels)
}

export function columnIndexToA1(index: number): string {
  if (index < 0) {
    throw new Error(`Index de colonne invalide: ${index}`)
  }
  let n = index + 1
  let label = ''
  while (n > 0) {
    const rem = (n - 1) % 26
    label = String.fromCharCode(65 + rem) + label
    n = Math.floor((n - 1) / 26)
  }
  return label
}

export function quoteSheetTitle(title: string): string {
  return `'${title.replace(/'/g, "''")}'`
}

export function formatStatutSupabaseValue(update: ControlTowerStatusUpdate): string {
  if (update.statutSupabase) return update.statutSupabase
  if (update.success) {
    return `Importé le ${update.importedOn}`
  }
  const raw = (update.errorMessage ?? 'erreur inconnue').replace(/\s+/g, ' ').trim()
  const short = raw.length > 120 ? `${raw.slice(0, 117)}…` : raw
  return `Échec : ${short}`
}

function sheetCell(row: string[] | undefined, index: number): string {
  if (index < 0) return ''
  return sanitizeCsvCell(row?.[index] ?? '')
}

function findMatchingSheetRow(
  rows: string[][],
  update: ControlTowerStatusUpdate,
  columns: { idCol: number; hermesCol: number; nameCol: number },
  usedRows: Set<number>,
): number | null {
  const id = sanitizeCsvCell(update.idSupabase)
  const hermes = sanitizeCsvCell(update.hermesName)
  const name = sanitizeCsvCell(update.modelName)

  for (let i = 1; i < rows.length; i += 1) {
    const sheetRow = i + 1
    if (usedRows.has(sheetRow)) continue
    const line = rows[i]
    if (id && sheetCell(line, columns.idCol) === id) return sheetRow
    if (hermes && foldHeader(sheetCell(line, columns.hermesCol)) === foldHeader(hermes)) {
      return sheetRow
    }
    if (name && foldHeader(sheetCell(line, columns.nameCol)) === foldHeader(name)) {
      return sheetRow
    }
  }
  return null
}

export async function downloadControlTowerCsvFromDrive(): Promise<string> {
  const fileId = controlTowerSpreadsheetId()
  const drive = getDriveClient()
  const metaRes = await drive.files.get({
    fileId,
    fields: 'id,name,mimeType',
    supportsAllDrives: true,
  })
  const mimeType = metaRes.data.mimeType ?? ''
  console.log('[LLM Control Tower] mimeType', {
    fileId,
    name: metaRes.data.name ?? null,
    mimeType,
  })

  if (mimeType === SPREADSHEET_MIME) {
    const exported = await drive.files.export(
      { fileId, mimeType: 'text/csv' },
      { responseType: 'text' },
    )
    if (typeof exported.data !== 'string') {
      throw new Error(`Export CSV invalide pour le Sheet: ${fileId}`)
    }
    return exported.data
  }

  return getFileFromDrive(fileId)
}

export async function writeControlTowerStatusesToSheet(
  updates: ControlTowerStatusUpdate[],
): Promise<void> {
  if (updates.length === 0) return

  const spreadsheetId = process.env.GOOGLE_SHEETS_CONTROL_TOWER_ID?.trim()
  if (!spreadsheetId) {
    console.error(
      '[LLM System Cards Import] GOOGLE_SHEETS_CONTROL_TOWER_ID manquant, écriture Statut Supabase ignorée',
    )
    return
  }

  const sheets = getSheetsClient()
  const meta = await sheets.spreadsheets.get({
    spreadsheetId,
    fields: 'sheets.properties(title,index)',
  })
  const title = [...(meta.data.sheets ?? [])]
    .sort((a, b) => (a.properties?.index ?? 0) - (b.properties?.index ?? 0))[0]
    ?.properties?.title
  if (!title) {
    throw new Error('Aucun onglet dans le Google Sheet de la tour de contrôle')
  }

  const quotedTitle = quoteSheetTitle(title)
  const valuesRes = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: quotedTitle,
  })
  const rows = valuesRes.data.values ?? []
  const headers = (rows[0] ?? []).map((header) => String(header ?? ''))
  const statusCol = findColumnIndexByHeader(headers, "Résultat de l'import", 'Statut Supabase')
  if (statusCol < 0) {
    throw new Error(
      "En-tête manquant : « Résultat de l'import » (ou « Statut Supabase »). Aucune colonne n'a été insérée.",
    )
  }
  const readyCol = findColumnIndexByHeader(headers, 'Prêt pour import')
  const actionCol = findColumnIndexByHeader(headers, 'Action requise par Hermes')
  const ficheCol = findColumnIndexByHeader(headers, 'Statut Fiche Technique')
  const idCol = findColumnIndexByHeader(headers, 'ID Supabase')
  if (idCol < 0) {
    throw new Error("En-tête manquant : « ID Supabase ». Aucune colonne n'a été insérée.")
  }
  if (updates.some((update) => update.success) && (readyCol < 0 || actionCol < 0)) {
    const missing = readyCol < 0 ? 'Prêt pour import' : 'Action requise par Hermes'
    throw new Error(`En-tête manquant : « ${missing} ». Aucune colonne n'a été insérée.`)
  }
  if (updates.some((update) => update.ficheTechnique === STATUT_FICHE_GENEREE) && ficheCol < 0) {
    throw new Error("En-tête manquant : « Statut Fiche Technique ». Aucune colonne n'a été insérée.")
  }

  const matchCols = {
    idCol,
    hermesCol: findColumnIndexByHeader(headers, 'Nom du LLM (Standard Hermes/Fichier)'),
    nameCol: findColumnIndexByHeader(headers, 'Nom du LLM (Standard Supabase)'),
  }
  const usedRows = new Set<number>()
  const data: { range: string; values: string[][] }[] = []

  const pushCell = (colIndex: number, sheetRow: number, value: string, header: string) => {
    if (colIndex < 0) {
      console.error('[LLM System Cards Import] Colonne Sheet introuvable', { header })
      return
    }
    data.push({
      range: `${quotedTitle}!${columnIndexToA1(colIndex)}${sheetRow}`,
      values: [[value]],
    })
  }

  for (const update of updates) {
    const sheetRow = findMatchingSheetRow(rows, update, matchCols, usedRows)
    if (sheetRow == null) {
      console.error('[LLM System Cards Import] Ligne Sheet introuvable pour Statut Supabase', {
        idSupabase: update.idSupabase,
        modelName: update.modelName,
      })
      continue
    }
    usedRows.add(sheetRow)
    pushCell(statusCol, sheetRow, formatStatutSupabaseValue(update), STATUT_SUPABASE_HEADER)
    if (update.success) {
      pushCell(readyCol, sheetRow, 'Déjà importé', PRET_POUR_IMPORT_HEADER)
      pushCell(actionCol, sheetRow, 'NONE', ACTION_HERMES_HEADER)
    }
    if (update.ficheTechnique === STATUT_FICHE_GENEREE) {
      pushCell(ficheCol, sheetRow, STATUT_FICHE_GENEREE, 'Statut Fiche Technique')
    }
  }

  if (data.length === 0) return

  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId,
    requestBody: {
      valueInputOption: 'RAW',
      data,
    },
  })
  console.log('[LLM System Cards Import] Statut Supabase écrit', {
    cellules: data.length,
  })
}

export async function downloadMarkdownFromDrive(ref: DriveMarkdownRef): Promise<string> {
  const fileName = sanitizeCsvCell(ref.fileName ?? '')
  if (!fileName) {
    throw new Error('Lien du fichier Markdown généré vide')
  }

  const drive = getDriveClient()
  const q = `name='${escapeDriveName(fileName)}' and '${CONTROL_TOWER_FOLDER_ID}' in parents and trashed=false`
  console.log('[LLM System Cards Import] Drive files.list', { q, fileName })

  const listRes = await drive.files.list({
    q,
    fields: 'files(id, name)',
    pageSize: 10,
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
    corpora: 'allDrives',
  })

  const match = listRes.data.files?.[0]
  console.log('[LLM System Cards Import] Drive files.list résultat', {
    fileName,
    matches: (listRes.data.files ?? []).map((file) => ({
      id: file.id ?? null,
      name: file.name ?? null,
    })),
  })

  if (!match?.id) {
    throw new Error(missingDriveFileMessage(fileName))
  }

  return getFileFromDrive(match.id)
}

export function createDefaultSystemCardsImportDeps(
  supabase: SupabaseClient,
): SystemCardsImportDeps {
  return {
    supabase,
    downloadControlTowerCsv: downloadControlTowerCsvFromDrive,
    downloadMarkdown: downloadMarkdownFromDrive,
    writeControlTowerStatuses: writeControlTowerStatusesToSheet,
  }
}

async function persistParsedPillars(
  supabase: SupabaseClient,
  slug: string,
  markdown: string,
): Promise<{ ok: true; unmappedCount: number } | { ok: false; message: string }> {
  const parsed = parseSystemCardPillars(markdown)
  if (!parsed.ok) return { ok: false, message: parsed.error }

  const { data: card, error: cardError } = await supabase
    .from('llm_system_cards')
    .select('id')
    .eq('model_identifier', slug)
    .maybeSingle()
  if (cardError) return { ok: false, message: cardError.message }
  if (!card?.id) return { ok: false, message: 'Fiche introuvable après import.' }

  const rows = parsed.pillars.map((pillar: ParsedPillar) => ({
    system_card_id: card.id,
    pillar_code: pillar.pillar_code,
    pillar_title: pillar.pillar_title,
    sections_covered: pillar.sections_covered,
    summary: pillar.summary,
    key_points: pillar.key_points,
    ai_act_compliance: pillar.ai_act_compliance,
    recommendations: pillar.recommendations,
  }))
  const { error } = await supabase
    .from('llm_system_card_pillars')
    .upsert(rows, { onConflict: 'system_card_id,pillar_code' })
  if (error) return { ok: false, message: error.message }
  return { ok: true, unmappedCount: parsed.unmappedLabels.length }
}

export async function importSystemCardsFromControlTower(
  deps: SystemCardsImportDeps,
): Promise<ImportSystemCardsResult> {
  const csv = await deps.downloadControlTowerCsv()
  const allRows = parseControlTowerCsv(csv)
  const { errorStatusesSynced } = await syncControlTowerSystemCardStatuses(deps.supabase, allRows)

  const readyRows = allRows.filter((row) => isReadyForImport(row.readyForImport))

  console.log('[LLM System Cards Import] Lignes prêtes (Prêt pour import = Oui)', {
    processed: readyRows.length,
  })

  const errors: string[] = []
  const skipped: string[] = []
  const statusUpdates: ControlTowerStatusUpdate[] = []
  let inserted = 0
  const importedOn = new Date().toISOString().slice(0, 10)

  for (const row of readyRows) {
    const label = row.modelName || row.hermesName || row.idSupabase || 'ligne'
    console.log('[LLM System Cards Import] Valeur CSV lue', {
      modele: label,
      idSupabase: row.idSupabase,
      markdownLink: row.markdownLink,
      pretPourImport: row.readyForImport,
    })

    try {
      if (parseSheetSystemCardStatus(row.statutFicheTechnique) === 'error_no_system_card') {
        await syncModelSystemCardStatus(deps.supabase, row, 'error_no_system_card')
        statusUpdates.push({
          idSupabase: row.idSupabase,
          hermesName: row.hermesName,
          modelName: row.modelName,
          success: true,
          statutSupabase: STATUT_FICHE_ERREUR,
          importedOn,
        })
        continue
      }

      const markdownRef = resolveDriveMarkdownRef(row.markdownLink)
      console.log('[LLM System Cards Import] Fichier Markdown recherché', {
        modele: label,
        fileId: markdownRef.fileId ?? null,
        fileName: markdownRef.fileName ?? null,
        folderId: CONTROL_TOWER_FOLDER_ID,
      })

      if (!markdownRef.fileId && !markdownRef.fileName) {
        throw new Error(
          `Lien du fichier Markdown généré vide pour le modèle ${label}`,
        )
      }

      let markdown: string
      let sourceFileName: string | null = markdownRef.fileName ?? null
      if (markdownRef.fileId) {
        console.log('[LLM System Cards Import] files.get direct', {
          fileId: markdownRef.fileId,
        })
        const driveFile = await getDriveFileText(markdownRef.fileId)
        markdown = driveFile.content.trim()
        sourceFileName = driveFile.name ?? sourceFileName
      } else {
        markdown = (await deps.downloadMarkdown(markdownRef)).trim()
      }
      console.log('[LLM System Cards Import] Statut du téléchargement', {
        modele: label,
        ok: markdown.length > 0,
        caracteres: markdown.length,
      })
      if (!markdown) {
        throw new Error('Fichier Markdown vide')
      }

      const parsedVersion = parseCardVersionDateFromFileName(sourceFileName)
      const card_version_date = parsedVersion.card_version_date
      const card_version_date_is_approx = parsedVersion.card_version_date_is_approx
      const { card_date_label, card_month } = extractCardDateFromMarkdown(
        markdown,
        card_version_date,
      )
      const monthFromLabel = normalizeCardMonth(card_date_label)
      const versionPrecision = cardVersionDatePrecision(
        card_version_date,
        card_version_date_is_approx,
      )
      console.log('[LLM System Cards Import] Métadonnées fiche', {
        modele: label,
        source_file_name: {
          value: sourceFileName,
          source: sourceFileName ? 'files.get name' : null,
        },
        card_version_date: {
          value: card_version_date,
          source: card_version_date ? 'nom Drive' : null,
          precision: versionPrecision,
        },
        card_version_date_is_approx,
        card_date_label: {
          value: card_date_label,
          source: card_date_label ? 'Date de la fiche' : null,
        },
        card_month: {
          value: card_month,
          source: monthFromLabel
            ? 'Date de la fiche'
            : card_month
              ? 'nom Drive'
              : null,
        },
      })

      const model = await resolveModelIdentifier(deps.supabase, row)
      const { data: existingCard, error: existingError } = await deps.supabase
        .from('llm_system_cards')
        .select('card_version_date, card_version_date_is_approx')
        .eq('model_identifier', model.slug)
        .maybeSingle()

      if (existingError) {
        throw new Error(`Lecture llm_system_cards: ${existingError.message}`)
      }

      const existingDate = toDateOnly(existingCard?.card_version_date)
      const incomingDate = toDateOnly(card_version_date)
      const existingApprox = Boolean(existingCard?.card_version_date_is_approx)
      const overwrite = decideCardVersionOverwrite({
        existingDate,
        incomingDate,
        existingApprox,
        incomingApprox: card_version_date_is_approx,
      })
      if (overwrite.warning) {
        console.warn('[LLM System Cards Import] Garde-fou version approximatif', {
          modele: label,
          slug: model.slug,
          base: existingDate,
          fichier: incomingDate,
          base_precision: cardVersionDatePrecision(existingDate, existingApprox),
          fichier_precision: versionPrecision,
          avertissement: overwrite.warning,
        })
      }
      if (overwrite.action === 'skip') {
        const message = overwrite.message ?? olderVersionIgnoredMessage(
          existingDate ?? '',
          incomingDate ?? '',
        )
        console.log('[LLM System Cards Import] Garde-fou version', {
          modele: label,
          slug: model.slug,
          base: existingDate,
          fichier: incomingDate,
          base_precision: cardVersionDatePrecision(existingDate, existingApprox),
          fichier_precision: versionPrecision,
        })
        skipped.push(message)
        statusUpdates.push({
          idSupabase: row.idSupabase,
          hermesName: row.hermesName,
          modelName: row.modelName,
          success: false,
          errorMessage: message,
          statutSupabase: message,
          importedOn,
        })
        continue
      }

      const now = new Date().toISOString()
      const auditDate = importedOn

      const { error } = await deps.supabase.from('llm_system_cards').upsert(
        {
          model_identifier: model.slug,
          model_name: model.modelName,
          provider: model.provider,
          audit_date: auditDate,
          source_markdown: markdown,
          source_file_name: sourceFileName,
          card_version_date,
          card_version_date_is_approx,
          card_date_label,
          card_month,
          updated_at: now,
        },
        { onConflict: 'model_identifier' },
      )

      if (error) {
        throw new Error(error.message)
      }

      await syncModelSystemCardStatus(deps.supabase, row, 'generated')
      inserted += 1
      const pillarOutcome = await persistParsedPillars(deps.supabase, model.slug, markdown)
      if (!pillarOutcome.ok) {
        errors.push(`${label}: ${pillarOutcome.message}`)
        statusUpdates.push({
          idSupabase: row.idSupabase,
          hermesName: row.hermesName,
          modelName: row.modelName,
          success: false,
          errorMessage: 'piliers non générés',
          statutSupabase: PILLAR_PARSE_FAILURE,
          importedOn,
        })
        continue
      }
      statusUpdates.push({
        idSupabase: row.idSupabase,
        hermesName: row.hermesName,
        modelName: row.modelName,
        success: true,
        importedOn,
        ficheTechnique: STATUT_FICHE_GENEREE,
        statutSupabase: pillarOutcome.unmappedCount > 0
          ? formatImportedPillarStatus(importedOn, pillarOutcome.unmappedCount)
          : undefined,
      })
      console.log('[LLM System Cards Import] Upsert OK', {
        modele: label,
        slug: model.slug,
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      console.error('[LLM System Cards Import] Échec ligne', {
        modele: label,
        markdownLink: row.markdownLink,
        erreur: message,
      })
      errors.push(
        message.startsWith('Fichier introuvable sur le Drive pour le nom :')
          ? message
          : `${label}: ${message}`,
      )
      statusUpdates.push({
        idSupabase: row.idSupabase,
        hermesName: row.hermesName,
        modelName: row.modelName,
        success: false,
        errorMessage: message,
        importedOn,
      })
    }
  }

  try {
    await (deps.writeControlTowerStatuses ?? writeControlTowerStatusesToSheet)(
      statusUpdates,
    )
  } catch (error) {
    console.error('[LLM System Cards Import] Écriture Statut Supabase échouée', error)
  }

  return {
    success: errors.length === 0,
    processed: readyRows.length,
    inserted,
    skipped,
    errors,
    errorStatusesSynced,
  }
}
