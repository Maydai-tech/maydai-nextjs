import {
  columnIndexToA1,
  findControlTowerHeader,
  MissingControlTowerHeaderError,
  quoteSheetTitle,
} from '@/lib/bench-llm/control-tower-headers'
import { getSheetsClient } from '@/lib/google-drive'

export const HUMAN_ACTION_HEADER = 'Action humaine requise'
export const HUMAN_ACTIONS_SHEET = 'Actions humaines'
export const MODE_EMPLOI_SHEET = "Mode d'emploi"
export const UNCATALOGUED_SHEET = 'Modèles non catalogués'
export const JOURNAL_SHEET = 'Journal veille'
export const HUMAN_ACTION_SEPARATOR = ' | '

/** Horizon déjà utilisé par les formules du mode d'emploi. Au-delà, la synchro réécrit la formule. */
export const HUMAN_ACTION_ROW_SPAN = 2009

/**
 * Liste déroulante réelle de « Validation juridique » (relevé du 2026-11-20).
 * « V2 » n'y figure pas : ce sont les 3 cellules à requalifier.
 */
export const LEGAL_VALIDATION_VALUES = [
  'À valider',
  'Validée r1',
  'Validée r2',
  'Validée r3',
  'Validée r4',
  'À reprendre',
] as const

/**
 * Le mode d'emploi compte déjà « Fiches validées » avec Validée*.
 * r1, r2 et r3 sont les trois valeurs d'accord présentes dans le Sheet.
 * A4 ne s'affiche que si « Prêt pour import » vaut Non.
 */
export const LEGAL_AGREEMENT_PATTERN = '^Validée'

/** Cet échec de fiche relève de A6, pas d'un échec d'import distinct. */
export const IMPORT_RESULT_OWNED_BY_AUDIT = 'Erreur : Pas de System Card publiée'

export const HUMAN_ACTION_RULES = [
  {
    code: 'A1',
    label: 'Valider la taxonomie',
    condition: '« Type de ligne » est non vide, « Taxonomie validée » est vide, et « Action requise par Hermes » n’est pas CLASSER. « Oui » et « Appliquée le … » éteignent l’action.',
  },
  {
    code: 'A2',
    label: 'Valider la fiche',
    condition: '« Statut Fiche Technique » vaut Générée, et « Validation juridique » est vide ou vaut « À valider ».',
  },
  {
    code: 'A3',
    label: 'Requalifier la validation juridique',
    condition: `« Validation juridique » est non vide et hors de la liste ${LEGAL_VALIDATION_VALUES.join(', ')}.`,
  },
  {
    code: 'A4',
    label: 'Marquer prêt pour import',
    condition: '« Validation juridique » commence par « Validée », et « Prêt pour import » vaut Non. « Déjà importé » éteint l’action.',
  },
  {
    code: 'A5',
    label: "Traiter l'échec d'import",
    condition: `« Résultat de l’import » commence par « Erreur » ou « Échec », sauf « ${IMPORT_RESULT_OWNED_BY_AUDIT} », qui relève de l’audit.`,
  },
  {
    code: 'A6',
    label: "Décider de la suite de l'audit",
    condition: '« Statut Fiche Technique » commence par « Erreur : ».',
  },
  {
    code: 'A7',
    label: "Suivre la migration des cas d'usage",
    condition: '« Statut LLM » vaut Déprécié ou Retiré, et « Cas d’usage déclarés » est supérieur à 0.',
  },
  {
    code: 'A8',
    label: 'Appliquer la taxonomie en base',
    condition: '« Taxonomie validée » vaut Oui : validée, pas encore appliquée par le bouton.',
  },
] as const

export const JOURNAL_REMINDER = 'Consulter l’onglet « Journal veille » pour les lignes « à vérifier ».'

export type HumanActionInput = {
  statutMaydai: string
  lineType: string
  taxonomyValidated: string
  hermesAction: string
  ficheStatus: string
  legalValidation: string
  readyForImport: string
  importResult: string
  llmStatus: string
  declaredUseCases: string
}

type UnprotectedBand = {
  label: string
  startColumn: number
  endColumn: number
}

function clean(value: string): string {
  return value.trim()
}

function isOui(value: string): boolean {
  return clean(value).toLowerCase() === 'oui'
}

function isNon(value: string): boolean {
  return clean(value).toLowerCase() === 'non'
}

function isImportFailure(result: string): boolean {
  if (/^erreur : pas de system card publiée/i.test(result)) return false
  return /^(erreur|échec)/i.test(result)
}

function useCount(value: string): number {
  const text = clean(value).replace(',', '.')
  if (!text) return 0
  const parsed = Number(text)
  return Number.isFinite(parsed) ? parsed : 0
}

function quoteFormulaText(value: string): string {
  return value.replace(/"/g, '""')
}

export function humanActionsForRow(input: HumanActionInput): string {
  if (clean(input.statutMaydai) !== 'Questionnaire') return ''
  const legal = clean(input.legalValidation)
  const fiche = clean(input.ficheStatus)
  const result = clean(input.importResult)
  const labels: string[] = []
  if (
    clean(input.lineType) !== ''
    && clean(input.taxonomyValidated) === ''
    && clean(input.hermesAction) !== 'CLASSER'
  ) {
    labels.push(HUMAN_ACTION_RULES[0].label)
  }
  if (fiche === 'Générée' && (legal === '' || legal === 'À valider')) labels.push(HUMAN_ACTION_RULES[1].label)
  if (legal !== '' && !(LEGAL_VALIDATION_VALUES as readonly string[]).includes(legal)) {
    labels.push(HUMAN_ACTION_RULES[2].label)
  }
  if (new RegExp(LEGAL_AGREEMENT_PATTERN, 'i').test(legal) && isNon(input.readyForImport)) {
    labels.push(HUMAN_ACTION_RULES[3].label)
  }
  if (isImportFailure(result)) labels.push(HUMAN_ACTION_RULES[4].label)
  if (fiche.startsWith('Erreur :')) labels.push(HUMAN_ACTION_RULES[5].label)
  if (
    (clean(input.llmStatus) === 'Déprécié' || clean(input.llmStatus) === 'Retiré')
    && useCount(input.declaredUseCases) > 0
  ) {
    labels.push(HUMAN_ACTION_RULES[6].label)
  }
  if (isOui(input.taxonomyValidated)) labels.push(HUMAN_ACTION_RULES[7].label)
  return labels.join(HUMAN_ACTION_SEPARATOR)
}

/**
 * Formule en_GB (virgules, noms anglais). Elle ne contient aucune lettre de colonne :
 * chaque valeur est retrouvée par MATCH sur la ligne d'en-tête, et ROW() suit le tri.
 */
export function humanActionFormula(rowSpan = HUMAN_ACTION_ROW_SPAN): string {
  void rowSpan
  const allowed = `{${LEGAL_VALIDATION_VALUES.map((value) => `"${quoteFormulaText(value)}"`).join(',')}}`
  const labels = HUMAN_ACTION_RULES.map((rule) => rule.label)
  return [
    '=LET(',
    'rownum, ROW(),',
    'value, LAMBDA(name, INDEX(INDIRECT(rownum&":"&rownum), 1, MATCH(name, $1:$1, 0))),',
    'text, LAMBDA(name, IF(value(name)="", "", TRIM(value(name)&""))),',
    'is_oui, LAMBDA(name, LOWER(text(name))="oui"),',
    'is_non, LAMBDA(name, LOWER(text(name))="non"),',
    'questionnaire, text("Statut MaydAI")="Questionnaire",',
    'legal, text("Validation juridique"),',
    'fiche, text("Statut Fiche Technique"),',
    `result, text("${quoteFormulaText("Résultat de l'import")}"),`,
    'TEXTJOIN(" | ", TRUE,',
    `IF(AND(questionnaire, text("Type de ligne")<>"", text("Taxonomie validée")="", text("Action requise par Hermes")<>"CLASSER"), "${labels[0]}", ""),`,
    `IF(AND(questionnaire, fiche="Générée", OR(legal="", legal="À valider")), "${labels[1]}", ""),`,
    `IF(AND(questionnaire, legal<>"", NOT(ISNUMBER(MATCH(legal, ${allowed}, 0)))), "${labels[2]}", ""),`,
    `IF(AND(questionnaire, REGEXMATCH(legal, "(?i)${LEGAL_AGREEMENT_PATTERN}"), is_non("Prêt pour import")), "${labels[3]}", ""),`,
    `IF(AND(questionnaire, REGEXMATCH(result, "(?i)^(erreur|échec)"), NOT(REGEXMATCH(result, "(?i)^erreur : pas de system card publiée"))), "${labels[4]}", ""),`,
    `IF(AND(questionnaire, REGEXMATCH(fiche, "^Erreur :")), "${labels[5]}", ""),`,
    `IF(AND(questionnaire, OR(text("Statut LLM")="Déprécié", text("Statut LLM")="Retiré"), IF(ISNUMBER(value("Cas d'usage déclarés")), value("Cas d'usage déclarés"), IFERROR(value("Cas d'usage déclarés")*1, 0))>0), "${labels[6]}", ""),`,
    `IF(AND(questionnaire, is_oui("Taxonomie validée")), "${labels[7]}", "")`,
    '))',
  ].join('')
}

export function humanActionCountFormula(mainTitle: string, label: string, rowSpan = HUMAN_ACTION_ROW_SPAN): string {
  const sheet = quoteSheetTitle(mainTitle)
  return [
    '=LET(',
    `main, ${sheet}!$1:$${rowSpan},`,
    'headers, INDEX(main, 1, 0),',
    `col, MATCH("${quoteFormulaText(HUMAN_ACTION_HEADER)}", headers, 0),`,
    'cells, INDEX(main, 0, col),',
    `COUNTIF(cells, "*${quoteFormulaText(label)}*")`,
    ')',
  ].join('')
}

export function humanActionsTabFormula(mainTitle: string, rowSpan = HUMAN_ACTION_ROW_SPAN): string {
  const sheet = quoteSheetTitle(mainTitle)
  return [
    '=LET(',
    `main, ${sheet}!$1:$${rowSpan},`,
    'headers, INDEX(main, 1, 0),',
    'col, LAMBDA(name, MATCH(name, headers, 0)),',
    'ids, INDEX(main, 0, col("ID Supabase")),',
    'editors, INDEX(main, 0, col("Nom de la technologie")),',
    'models, INDEX(main, 0, col("Nom du LLM (Standard Supabase)")),',
    `actions, INDEX(main, 0, col("${quoteFormulaText(HUMAN_ACTION_HEADER)}")),`,
    'body, IFERROR(SORT(FILTER(HSTACK(ids, editors, models, actions), ROW(ids)>1, actions<>""), 2, TRUE, 3, TRUE), {"","","",""}),',
    'VSTACK({"ID Supabase","Éditeur","Modèle","Action humaine requise"}, body)',
    ')',
  ].join('')
}

export function uncataloguedCountFormula(rowSpan = 1000): string {
  const sheet = quoteSheetTitle(UNCATALOGUED_SHEET)
  return [
    '=LET(',
    `grid, ${sheet}!$1:$${rowSpan},`,
    'headers, INDEX(grid, 1, 0),',
    'col, MATCH("éditeur", headers, 0),',
    'cells, INDEX(grid, 0, col),',
    'IFERROR(COUNTA(FILTER(cells, ROW(cells)>1, cells<>"")), 0)',
    ')',
  ].join('')
}

export function validatedFichesFormula(mainTitle: string, rowSpan = HUMAN_ACTION_ROW_SPAN): string {
  const sheet = quoteSheetTitle(mainTitle)
  return [
    '=LET(',
    `main, ${sheet}!$1:$${rowSpan},`,
    'headers, INDEX(main, 1, 0),',
    'col, MATCH("Validation juridique", headers, 0),',
    'COUNTIF(INDEX(main, 0, col), "Validée*")',
    ')',
  ].join('')
}

function headerIndex(headers: readonly string[], name: string): number {
  const index = findControlTowerHeader(headers, name)
  if (index < 0) throw new MissingControlTowerHeaderError(name)
  return index
}

function band(headers: readonly string[], startName: string, endName: string, label: string): UnprotectedBand {
  return {
    label,
    startColumn: headerIndex(headers, startName),
    endColumn: headerIndex(headers, endName) + 1,
  }
}

/** Colonnes humaines éditables, retrouvées par en-tête. La date Supabase et l'action calculée restent protégées. */
export function humanActionUnprotectedBands(headers: readonly string[]): UnprotectedBand[] {
  return [
    band(headers, 'Type de ligne', 'Modèle de base (ID)', 'Classement'),
    band(headers, 'Statut LLM', 'Dernière vérification', 'Suivi du LLM'),
    band(headers, 'Statut Fiche Technique', 'Lien du fichier Markdown généré', 'Fiche AI Act'),
    band(headers, 'Validation juridique', "Résultat de l'import", 'Contrôle et import'),
  ]
}

export function unprotectedRangeA1(bandRange: UnprotectedBand, endRow: number): string {
  const start = columnIndexToA1(bandRange.startColumn)
  const end = columnIndexToA1(bandRange.endColumn - 1)
  return `${start}2:${end}${endRow}`
}

export type ModeEmploiPlan = {
  insertBeforeRow: number
  newRow: string[]
  renumber: Array<{ row: number; value: string }>
  validatedFormula: { row: number; formula: string } | null
  appendAtRow: number
  appendRows: string[][]
}

export function modeEmploiGuide(mainTitle: string): string[][] {
  return [
    ['Actions humaines'],
    ["Onglet placé juste après le premier. Une ligne par modèle qui a au moins une action. Les actions d'un même modèle restent dans la même cellule, séparées par « | ». Le filtre de la colonne « Action humaine requise » isole une action, par exemple « contient Valider la fiche ». Les lignes Catalogue n'y figurent pas."],
    [],
    ['Code', 'Action', "Condition d'apparition"],
    ...HUMAN_ACTION_RULES.map((rule) => [rule.code, rule.label, rule.condition]),
    [],
    ['Synthèse', 'Modèles concernés'],
    ...HUMAN_ACTION_RULES.map((rule) => [rule.label, humanActionCountFormula(mainTitle, rule.label)]),
  ]
}

export function planModeEmploi(matrix: string[][], mainTitle: string): ModeEmploiPlan {
  const rows = matrix.map((row) => row.map((cell) => String(cell ?? '')))
  const legalIndex = rows.findIndex((row) => clean(row[2] ?? '') === 'Validation juridique')
  if (legalIndex < 0) throw new Error('Mode d’emploi : ligne « Validation juridique » introuvable.')
  const headerIndex = rows.findIndex((row) => clean(row[0] ?? '') === 'N°' && clean(row[2] ?? '') === 'Colonne')
  if (headerIndex < 0 || headerIndex > legalIndex) {
    throw new Error('Mode d’emploi : tableau des colonnes introuvable.')
  }
  const newRow = [
    '',
    'Contrôle et import',
    HUMAN_ACTION_HEADER,
    'Plateforme',
    'calculée, ne pas modifier',
    'Actions de la ligne, dans l’ordre, séparées par « | ». Vide s’il n’y a rien à faire.',
    'Nouvelle',
  ]
  rows.splice(legalIndex, 0, newRow)
  const renumber: Array<{ row: number; value: string }> = []
  let number = 1
  for (let index = headerIndex + 1; index < rows.length; index += 1) {
    if (!clean(rows[index]?.[2] ?? '')) break
    renumber.push({ row: index + 1, value: String(number) })
    number += 1
  }
  const validatedIndex = rows.findIndex((row) => String(row[1] ?? '').includes('Fiches validées'))
  const lastContent = rows.reduce(
    (last, row, index) => (row.some((cell) => clean(cell) !== '') ? index : last),
    0,
  )
  const ownNumber = renumber.find((item) => item.row === legalIndex + 1)
  if (ownNumber) newRow[0] = ownNumber.value
  return {
    insertBeforeRow: legalIndex + 1,
    newRow,
    renumber,
    validatedFormula: validatedIndex < 0
      ? null
      : { row: validatedIndex + 1, formula: validatedFichesFormula(mainTitle) },
    appendAtRow: lastContent + 3,
    appendRows: modeEmploiGuide(mainTitle),
  }
}

export function humanActionsSheetRows(mainTitle: string): string[][] {
  const rows: string[][] = [
    ['Actions humaines'],
    ['Action', 'Modèles concernés'],
    ...HUMAN_ACTION_RULES.map((rule) => [rule.label, humanActionCountFormula(mainTitle, rule.label)]),
    [],
    ['Modèles non catalogués', uncataloguedCountFormula()],
    ['Journal veille', JOURNAL_REMINDER],
    [],
    [humanActionsTabFormula(mainTitle)],
  ]
  return rows
}

function parisToday(date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Paris',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

function archiveTitle(titles: readonly string[], today: string): string {
  const base = `Archive ${today}`
  if (!titles.includes(base)) return base
  let suffix = 2
  while (titles.includes(`${base}-${suffix}`)) suffix += 1
  return `${base}-${suffix}`
}

type SheetProperties = {
  sheetId?: number | null
  title?: string | null
  index?: number | null
  gridProperties?: { rowCount?: number | null } | null
}

type ProtectedRange = {
  protectedRangeId?: number | null
  range?: { sheetId?: number | null; startColumnIndex?: number | null } | null
  unprotectedRanges?: Array<{
    startRowIndex?: number | null
    endRowIndex?: number | null
    startColumnIndex?: number | null
    endColumnIndex?: number | null
  }> | null
}

export type HumanActionInstallReport = {
  archiveTitle: string
  columnLetter: string
  unprotectedRanges: string[]
  formulaRows: number
  actionsSheet: string
}

export async function installControlTowerHumanActions(
  spreadsheetId: string,
  options?: { today?: string },
): Promise<HumanActionInstallReport> {
  const sheets = getSheetsClient()
  const meta = await sheets.spreadsheets.get({
    spreadsheetId,
    fields: 'sheets.properties(sheetId,title,index,gridProperties(rowCount)),sheets.protectedRanges(protectedRangeId,range,unprotectedRanges)',
  })
  const ordered = [...(meta.data.sheets ?? [])].sort(
    (a, b) => (a.properties?.index ?? 0) - (b.properties?.index ?? 0),
  )
  const first = ordered[0]?.properties as SheetProperties | undefined
  const mainTitle = first?.title
  const mainSheetId = first?.sheetId
  if (!mainTitle || mainSheetId == null) {
    throw new Error('Aucun onglet dans le Google Sheet de la tour de contrôle')
  }
  if (ordered.some((sheet) => sheet.properties?.title === HUMAN_ACTIONS_SHEET)) {
    throw new Error(`L'onglet « ${HUMAN_ACTIONS_SHEET} » existe déjà.`)
  }
  const titles = ordered.map((sheet) => sheet.properties?.title ?? '').filter(Boolean)
  const quotedMain = quoteSheetTitle(mainTitle)
  const matrixResponse = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: quotedMain,
    valueRenderOption: 'FORMATTED_VALUE',
  })
  const matrix = (matrixResponse.data.values ?? []).map((row) => row.map((cell) => String(cell ?? '')))
  const headers = (matrix[0] ?? []).map((header) => String(header ?? ''))
  if (findControlTowerHeader(headers, HUMAN_ACTION_HEADER) >= 0) {
    throw new Error(`La colonne « ${HUMAN_ACTION_HEADER} » existe déjà.`)
  }
  const legalIndex = headerIndex(headers, 'Validation juridique')
  const modeSheet = ordered.find((sheet) => sheet.properties?.title === MODE_EMPLOI_SHEET)
  const modeSheetId = modeSheet?.properties?.sheetId
  if (modeSheetId == null) throw new Error(`Onglet « ${MODE_EMPLOI_SHEET} » introuvable.`)
  const modeResponse = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: quoteSheetTitle(MODE_EMPLOI_SHEET),
    valueRenderOption: 'FORMULA',
  })
  const modeMatrix = (modeResponse.data.values ?? []).map((row) => row.map((cell) => String(cell ?? '')))
  const plan = planModeEmploi(modeMatrix, mainTitle)
  const protection = ((ordered[0] as { protectedRanges?: ProtectedRange[] }).protectedRanges ?? [])
    .find((range) => range.range?.startColumnIndex == null)
  if (protection?.protectedRangeId == null) {
    throw new Error('Protection de l’onglet principal introuvable.')
  }
  const endRow = protection.unprotectedRanges?.reduce(
    (max, range) => Math.max(max, range.endRowIndex ?? 0),
    0,
  ) || (first?.gridProperties?.rowCount ?? 1141)
  const today = options?.today ?? parisToday()
  const archive = archiveTitle(titles, today)
  const headersAfter = headers.slice()
  headersAfter.splice(legalIndex, 0, HUMAN_ACTION_HEADER)
  const bands = humanActionUnprotectedBands(headersAfter)

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [
        {
          duplicateSheet: {
            sourceSheetId: mainSheetId,
            insertSheetIndex: ordered.length,
            newSheetName: archive,
          },
        },
        {
          insertDimension: {
            range: {
              sheetId: mainSheetId,
              dimension: 'COLUMNS',
              startIndex: legalIndex,
              endIndex: legalIndex + 1,
            },
            inheritFromBefore: false,
          },
        },
        {
          copyPaste: {
            source: {
              sheetId: mainSheetId,
              startRowIndex: 0,
              endRowIndex: 1,
              startColumnIndex: legalIndex + 1,
              endColumnIndex: legalIndex + 2,
            },
            destination: {
              sheetId: mainSheetId,
              startRowIndex: 0,
              endRowIndex: 1,
              startColumnIndex: legalIndex,
              endColumnIndex: legalIndex + 1,
            },
            pasteType: 'PASTE_FORMAT',
          },
        },
        {
          updateDimensionProperties: {
            range: {
              sheetId: mainSheetId,
              dimension: 'COLUMNS',
              startIndex: legalIndex,
              endIndex: legalIndex + 1,
            },
            properties: { pixelSize: 320 },
            fields: 'pixelSize',
          },
        },
      ],
    },
  })

  const column = columnIndexToA1(legalIndex)
  const formula = humanActionFormula()
  const lastRow = Math.max(matrix.length, 1)
  const formulaRows = Math.max(lastRow - 1, 0)
  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId,
    requestBody: {
      valueInputOption: 'USER_ENTERED',
      data: [
        { range: `${quotedMain}!${column}1`, values: [[HUMAN_ACTION_HEADER]] },
        ...(formulaRows > 0
          ? [{
            range: `${quotedMain}!${column}2:${column}${lastRow}`,
            values: Array.from({ length: formulaRows }, () => [formula]),
          }]
          : []),
      ],
    },
  })

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [
        {
          updateProtectedRange: {
            protectedRange: {
              protectedRangeId: protection.protectedRangeId,
              unprotectedRanges: bands.map((item) => ({
                sheetId: mainSheetId,
                startRowIndex: 1,
                endRowIndex: endRow,
                startColumnIndex: item.startColumn,
                endColumnIndex: item.endColumn,
              })),
            },
            fields: 'unprotectedRanges',
          },
        },
      ],
    },
  })

  const created = await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [
        {
          addSheet: {
            properties: {
              title: HUMAN_ACTIONS_SHEET,
              index: 1,
            },
          },
        },
      ],
    },
  })
  const actionsSheetId = created.data.replies?.[0]?.addSheet?.properties?.sheetId
  if (actionsSheetId == null) throw new Error(`Onglet « ${HUMAN_ACTIONS_SHEET} » non créé.`)
  const actionRows = humanActionsSheetRows(mainTitle)
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${quoteSheetTitle(HUMAN_ACTIONS_SHEET)}!A1`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: actionRows },
  })
  const tableRow = actionRows.length
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [
        {
          repeatCell: {
            range: { sheetId: actionsSheetId, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: 1 },
            cell: { userEnteredFormat: { textFormat: { bold: true } } },
            fields: 'userEnteredFormat.textFormat.bold',
          },
        },
        {
          setBasicFilter: {
            filter: {
              range: {
                sheetId: actionsSheetId,
                startRowIndex: tableRow - 1,
                endRowIndex: HUMAN_ACTION_ROW_SPAN,
                startColumnIndex: 0,
                endColumnIndex: 4,
              },
            },
          },
        },
      ],
    },
  })

  const quotedMode = quoteSheetTitle(MODE_EMPLOI_SHEET)
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [
        {
          insertDimension: {
            range: {
              sheetId: modeSheetId,
              dimension: 'ROWS',
              startIndex: plan.insertBeforeRow - 1,
              endIndex: plan.insertBeforeRow,
            },
            inheritFromBefore: true,
          },
        },
      ],
    },
  })
  const modeData: { range: string; values: string[][] }[] = [
    { range: `${quotedMode}!A${plan.insertBeforeRow}`, values: [plan.newRow] },
    ...plan.renumber.map((item) => ({
      range: `${quotedMode}!A${item.row}`,
      values: [[item.value]],
    })),
  ]
  if (plan.validatedFormula) {
    modeData.push({
      range: `${quotedMode}!C${plan.validatedFormula.row}`,
      values: [[plan.validatedFormula.formula]],
    })
  }
  modeData.push({
    range: `${quotedMode}!A${plan.appendAtRow}`,
    values: plan.appendRows,
  })
  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId,
    requestBody: { valueInputOption: 'USER_ENTERED', data: modeData },
  })

  return {
    archiveTitle: archive,
    columnLetter: column,
    unprotectedRanges: bands.map((item) => unprotectedRangeA1(item, endRow)),
    formulaRows,
    actionsSheet: HUMAN_ACTIONS_SHEET,
  }
}
