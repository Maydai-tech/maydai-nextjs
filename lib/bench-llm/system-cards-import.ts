import { parse } from 'csv-parse/sync'
import type { SupabaseClient } from '@supabase/supabase-js'

import { CONTROL_TOWER_FOLDER_ID } from '@/lib/bench-llm/control-tower-csv'
import { normalizeLlmModelSlug } from '@/lib/bench-llm/model-slug'
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
}

export type ControlTowerStatusUpdate = {
  idSupabase: string
  hermesName: string
  modelName: string
  success: boolean
  errorMessage?: string
  statutSupabase?: string
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

const FILE_NAME_DATE_RE = /(\d{4})[-_](\d{2})[-_](\d{2})/
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

export function extractCardVersionDateFromFileName(
  fileName: string | null | undefined,
): string | null {
  const match = (fileName ?? '').match(FILE_NAME_DATE_RE)
  if (!match) return null
  const year = match[1]
  const month = match[2]
  const day = match[3]
  if (!year || !month || !day) return null
  const monthNum = Number(month)
  const dayNum = Number(day)
  if (monthNum < 1 || monthNum > 12 || dayNum < 1 || dayNum > 31) return null
  return `${year}-${month}-${day}`
}

export function normalizeCardMonth(label: string | null | undefined): string | null {
  const value = (label ?? '').trim()
  if (!value) return null

  const iso = value.match(/(\d{4})[-_/](\d{1,2})/)
  if (iso?.[1] && iso[2]) {
    const month = iso[2].padStart(2, '0')
    const monthNum = Number(month)
    if (monthNum >= 1 && monthNum <= 12) return `${iso[1]}-${month}-01`
  }

  const folded = foldHeader(value)
  const year = folded.match(/(\d{4})/)?.[1]
  if (!year) return null
  const month = FR_MONTHS.find(([name]) => folded.includes(name))?.[1]
  return month ? `${year}-${month}-01` : null
}

function sanitizeCardDateLabel(value: string): string {
  return value.replace(/^[*_\s\u00a0]+|[*_\s\u00a0]+$/g, '')
}

export function extractCardDateFromMarkdown(markdown: string): {
  card_date_label: string | null
  card_month: string | null
} {
  const lineMatch = markdown.match(/^.*Date de la fiche\s*:\s*(.+)$/im)
  const card_date_label = sanitizeCardDateLabel(lineMatch?.[1] ?? '') || null
  return {
    card_date_label,
    card_month: normalizeCardMonth(card_date_label),
  }
}

export function toDateOnly(value: string | null | undefined): string | null {
  const match = String(value ?? '').match(/^(\d{4}-\d{2}-\d{2})/)
  return match?.[1] ?? null
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

export function findColumnIndexByHeader(headers: string[], label: string): number {
  const wanted = foldHeader(label)
  return headers.findIndex((header) => foldHeader(header) === wanted)
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
  const statusCol = findColumnIndexByHeader(headers, STATUT_SUPABASE_HEADER)
  if (statusCol < 0) {
    throw new Error(`Colonne "${STATUT_SUPABASE_HEADER}" introuvable dans l'en-tête`)
  }
  const readyCol = findColumnIndexByHeader(headers, PRET_POUR_IMPORT_HEADER)
  const actionCol = findColumnIndexByHeader(headers, ACTION_HERMES_HEADER)

  const matchCols = {
    idCol: findColumnIndexByHeader(headers, 'ID Supabase'),
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

export async function importSystemCardsFromControlTower(
  deps: SystemCardsImportDeps,
): Promise<ImportSystemCardsResult> {
  const csv = await deps.downloadControlTowerCsv()
  const readyRows = parseControlTowerCsv(csv).filter((row) =>
    isReadyForImport(row.readyForImport),
  )

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

      const card_version_date = extractCardVersionDateFromFileName(sourceFileName)
      const { card_date_label, card_month } = extractCardDateFromMarkdown(markdown)
      console.log('[LLM System Cards Import] Métadonnées fiche', {
        modele: label,
        source_file_name: {
          value: sourceFileName,
          source: sourceFileName ? 'files.get name' : null,
        },
        card_version_date: {
          value: card_version_date,
          source: card_version_date ? 'nom Drive' : null,
        },
        card_date_label: {
          value: card_date_label,
          source: card_date_label ? 'Date de la fiche' : null,
        },
        card_month: {
          value: card_month,
          source: card_month ? 'Date de la fiche' : null,
        },
      })

      const model = await resolveModelIdentifier(deps.supabase, row)
      const { data: existingCard, error: existingError } = await deps.supabase
        .from('llm_system_cards')
        .select('card_version_date')
        .eq('model_identifier', model.slug)
        .maybeSingle()

      if (existingError) {
        throw new Error(`Lecture llm_system_cards: ${existingError.message}`)
      }

      const existingDate = toDateOnly(existingCard?.card_version_date)
      const incomingDate = toDateOnly(card_version_date)
      if (existingDate && incomingDate && existingDate > incomingDate) {
        const message = olderVersionIgnoredMessage(existingDate, incomingDate)
        console.log('[LLM System Cards Import] Garde-fou version', {
          modele: label,
          slug: model.slug,
          base: existingDate,
          fichier: incomingDate,
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
          card_date_label,
          card_month,
          updated_at: now,
        },
        { onConflict: 'model_identifier' },
      )

      if (error) {
        throw new Error(error.message)
      }
      inserted += 1
      statusUpdates.push({
        idSupabase: row.idSupabase,
        hermesName: row.hermesName,
        modelName: row.modelName,
        success: true,
        importedOn,
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
  }
}
