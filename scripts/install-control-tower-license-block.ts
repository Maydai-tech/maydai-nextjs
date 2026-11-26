/**
 * Ajoute le bloc « Licence des poids » à la fin de l’onglet principal.
 * Refuse d’écrire si la répartition des licences ne correspond plus à l’attendu.
 *
 *   pnpm dlx tsx scripts/install-control-tower-license-block.ts
 */
import * as path from 'path'
import * as dotenv from 'dotenv'
import { getSheetsClient } from '../lib/google-drive'
import { columnIndexToA1, quoteSheetTitle } from '../lib/bench-llm/control-tower-headers'
import { humanActionFormula } from '../lib/bench-llm/control-tower-human-actions'
import { blankLicenseText } from '../lib/bench-llm/license-class'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const EXPECTED = {
  'Propriétaire': 197,
  'Poids ouverts, licence libre': 136,
  'Poids ouverts, licence commerciale sous conditions': 60,
  'Poids ouverts, licence non commerciale': 6,
}
const MODEL_OR_VARIANT = new Set(['modèle', 'modele', 'variante'])
const HEADERS = [
  'Type de modèle',
  'Identifiant de la licence',
  'Source de la licence',
  'Exclusion UE',
]
const TYPE_VALUES = [
  'Propriétaire',
  'Poids ouverts, licence libre',
  'Poids ouverts, licence commerciale sous conditions',
  'Poids ouverts, licence non commerciale',
  'Poids ouverts, licence à qualifier',
  'Non renseigné',
]

function parisToday(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Paris',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

function quote(title: string): string {
  return quoteSheetTitle(title)
}

function mentionsEuExclusion(remark: string): boolean {
  return /exclusion territoriale|\bUE\b|union europ/i.test(remark)
}

async function main(): Promise<void> {
  const spreadsheetId = process.env.GOOGLE_SHEETS_CONTROL_TOWER_ID!.trim()
  const sheets = getSheetsClient()
  const meta = await sheets.spreadsheets.get({
    spreadsheetId,
    fields: 'sheets.properties(sheetId,title,index,gridProperties),sheets.protectedRanges(protectedRangeId,range,unprotectedRanges),sheets.basicFilter',
  })
  const ordered = [...(meta.data.sheets ?? [])].sort(
    (a, b) => (a.properties?.index ?? 0) - (b.properties?.index ?? 0),
  )
  const main = ordered[0]
  const mainTitle = main?.properties?.title ?? ''
  const mainSheetId = main?.properties?.sheetId
  if (!mainTitle || mainSheetId == null) throw new Error('Onglet principal introuvable.')
  const matrix = (await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: quote(mainTitle),
  })).data.values ?? []
  const headers = (matrix[0] ?? []).map((cell) => String(cell ?? ''))
  if (headers.includes('Type de modèle')) {
    throw new Error('La colonne « Type de modèle » existe déjà. Aucune écriture.')
  }
  if (headers[headers.length - 1] !== 'Date de dernière mise à jour (Supabase)') {
    throw new Error(`La dernière colonne est « ${headers[headers.length - 1]} », pas la date Supabase.`)
  }

  const licenses = (await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: "'Licences par modèle'",
  })).data.values ?? []
  const licenseHeaders = (licenses[0] ?? []).map((cell) => String(cell ?? ''))
  const at = (name: string) => {
    const index = licenseHeaders.indexOf(name)
    if (index < 0) throw new Error(`Colonne absente de « Licences par modèle » : ${name}`)
    return index
  }
  const byId = new Map<string, { type: string; id: string | null; url: string | null; eu: string }>()
  const counts = new Map<string, number>()
  for (const row of licenses.slice(1)) {
    const id = String(row[at('ID Supabase')] ?? '').trim()
    const type = String(row[at('Valeur proposée')] ?? '').trim()
    if (!id) continue
    counts.set(type, (counts.get(type) ?? 0) + 1)
    byId.set(id, {
      type,
      id: blankLicenseText(String(row[at('Identifiant de la licence')] ?? '')),
      url: blankLicenseText(String(row[at('URL du texte de licence consulté')] ?? '')),
      eu: mentionsEuExclusion(String(row[at('Remarque')] ?? '')) ? 'Oui' : '',
    })
  }
  const expectedEntries = Object.entries(EXPECTED)
  const same = expectedEntries.every(([label, count]) => counts.get(label) === count)
    && counts.size === expectedEntries.length
  if (!same) {
    throw new Error(`Répartition inattendue, écriture arrêtée : ${JSON.stringify(Object.fromEntries(counts))}`)
  }

  const lineTypeIndex = headers.indexOf('Type de ligne')
  const statusIndex = headers.indexOf('Statut MaydAI')
  const flagged: string[] = []
  const values: string[][] = []
  let euCount = 0
  for (const row of matrix.slice(1)) {
    const id = String(row[0] ?? '').trim()
    const license = byId.get(id)
    const status = String(row[statusIndex] ?? '').trim()
    if (status === 'Questionnaire' && !license) {
      const lineType = String(row[lineTypeIndex] ?? '').trim()
      if (MODEL_OR_VARIANT.has(lineType.toLowerCase())) {
        flagged.push(`${row[headers.indexOf('Nom du LLM (Standard Supabase)')] ?? ''} (${lineType})`)
      }
    }
    if (status === 'Questionnaire' && license) {
      if (license.eu) euCount += 1
      values.push([license.type, license.id ?? '', license.url ?? '', license.eu])
    } else {
      values.push(['', '', '', ''])
    }
  }
  if (flagged.length > 0) {
    console.error(`Non remplies, type Modèle ou Variante : ${flagged.join(' ; ')}`)
  }

  const protection = (main.protectedRanges ?? []).find((range) => range.range?.startColumnIndex == null)
  if (protection?.protectedRangeId == null) throw new Error('Protection de l’onglet principal introuvable.')
  const endRow = protection.unprotectedRanges?.reduce(
    (max, range) => Math.max(max, range.endRowIndex ?? 0),
    0,
  ) || 1141
  const before = (protection.unprotectedRanges ?? []).map((range) => {
    const start = columnIndexToA1(range.startColumnIndex ?? 0)
    const end = columnIndexToA1((range.endColumnIndex ?? 1) - 1)
    return `${start}${(range.startRowIndex ?? 0) + 1}:${end}${range.endRowIndex ?? ''}`
  })
  const titles = ordered.map((sheet) => sheet.properties?.title ?? '')
  const archiveBase = `Archive ${parisToday()}`
  let archiveTitle = archiveBase
  let suffix = 2
  while (titles.includes(archiveTitle)) {
    archiveTitle = `${archiveBase}-${suffix}`
    suffix += 1
  }
  const insertAt = headers.length

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [
        {
          duplicateSheet: {
            sourceSheetId: mainSheetId,
            insertSheetIndex: ordered.length,
            newSheetName: archiveTitle,
          },
        },
        {
          updateSheetProperties: {
            properties: {
              sheetId: mainSheetId,
              gridProperties: { columnCount: insertAt + HEADERS.length },
            },
            fields: 'gridProperties.columnCount',
          },
        },
      ],
    },
  })

  const green = { red: 0.8862745, green: 0.9372549, blue: 0.85490197 }
  const list = (entries: string[]) => ({
    type: 'ONE_OF_LIST',
    values: entries.map((value) => ({ userEnteredValue: value })),
  })
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [
        {
          repeatCell: {
            range: {
              sheetId: mainSheetId,
              startRowIndex: 0,
              endRowIndex: 1,
              startColumnIndex: insertAt,
              endColumnIndex: insertAt + HEADERS.length,
            },
            cell: {
              userEnteredFormat: {
                backgroundColor: green,
                textFormat: { bold: true },
                wrapStrategy: 'WRAP',
              },
            },
            fields: 'userEnteredFormat(backgroundColor,textFormat.bold,wrapStrategy)',
          },
        },
        {
          updateDimensionProperties: {
            range: { sheetId: mainSheetId, dimension: 'COLUMNS', startIndex: insertAt, endIndex: insertAt + 1 },
            properties: { pixelSize: 340 },
            fields: 'pixelSize',
          },
        },
        {
          updateDimensionProperties: {
            range: { sheetId: mainSheetId, dimension: 'COLUMNS', startIndex: insertAt + 1, endIndex: insertAt + 2 },
            properties: { pixelSize: 220 },
            fields: 'pixelSize',
          },
        },
        {
          updateDimensionProperties: {
            range: { sheetId: mainSheetId, dimension: 'COLUMNS', startIndex: insertAt + 2, endIndex: insertAt + 3 },
            properties: { pixelSize: 360 },
            fields: 'pixelSize',
          },
        },
        {
          updateDimensionProperties: {
            range: { sheetId: mainSheetId, dimension: 'COLUMNS', startIndex: insertAt + 3, endIndex: insertAt + 4 },
            properties: { pixelSize: 140 },
            fields: 'pixelSize',
          },
        },
        {
          setDataValidation: {
            range: {
              sheetId: mainSheetId,
              startRowIndex: 1,
              endRowIndex: endRow,
              startColumnIndex: insertAt,
              endColumnIndex: insertAt + 1,
            },
            rule: { condition: list(TYPE_VALUES), showCustomUi: true, strict: true },
          },
        },
        {
          setDataValidation: {
            range: {
              sheetId: mainSheetId,
              startRowIndex: 1,
              endRowIndex: endRow,
              startColumnIndex: insertAt + 3,
              endColumnIndex: insertAt + 4,
            },
            rule: { condition: list(['Oui']), showCustomUi: true, strict: true },
          },
        },
        {
          updateProtectedRange: {
            protectedRange: {
              protectedRangeId: protection.protectedRangeId,
              unprotectedRanges: [
                ...(protection.unprotectedRanges ?? []),
                {
                  sheetId: mainSheetId,
                  startRowIndex: 1,
                  endRowIndex: endRow,
                  startColumnIndex: insertAt,
                  endColumnIndex: insertAt + HEADERS.length,
                },
              ],
            },
            fields: 'unprotectedRanges',
          },
        },
        ...(main.basicFilter?.range ? [{
          setBasicFilter: {
            filter: {
              range: {
                ...main.basicFilter.range,
                endColumnIndex: insertAt + HEADERS.length,
              },
            },
          },
        }] : []),
      ],
    },
  })

  const pivotSheet = ordered.find((sheet) => sheet.properties?.title === 'Pivot Table 1')
  const pivotSheetId = pivotSheet?.properties?.sheetId
  if (pivotSheetId != null) {
    const pivot = await sheets.spreadsheets.get({
      spreadsheetId,
      ranges: ["'Pivot Table 1'!A1"],
      includeGridData: true,
      fields: 'sheets.data.rowData.values.pivotTable',
    })
    const pivotTable = pivot.data.sheets?.[0]?.data?.[0]?.rowData?.[0]?.values?.[0]?.pivotTable
    if (pivotTable?.source) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [{
            updateCells: {
              rows: [{
                values: [{
                  pivotTable: {
                    ...pivotTable,
                    source: {
                      ...pivotTable.source,
                      endColumnIndex: insertAt + HEADERS.length,
                    },
                  },
                }],
              }],
              fields: 'pivotTable',
              start: { sheetId: pivotSheetId, rowIndex: 0, columnIndex: 0 },
            },
          }],
        },
      })
    }
  }

  const start = columnIndexToA1(insertAt)
  const end = columnIndexToA1(insertAt + HEADERS.length - 1)
  const quotedMain = quote(mainTitle)
  const actionIndex = headers.indexOf('Action humaine requise')
  const actionColumn = columnIndexToA1(actionIndex)
  const formula = humanActionFormula()
  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId,
    requestBody: {
      valueInputOption: 'RAW',
      data: [
        { range: `${quotedMain}!${start}1:${end}1`, values: [HEADERS] },
        { range: `${quotedMain}!${start}2:${end}${values.length + 1}`, values },
      ],
    },
  })
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${quotedMain}!${actionColumn}2:${actionColumn}${matrix.length}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: Array.from({ length: matrix.length - 1 }, () => [formula]) },
  })

  const modeTitle = "Mode d'emploi"
  const modeSheet = ordered.find((sheet) => sheet.properties?.title === modeTitle)
  const modeSheetId = modeSheet?.properties?.sheetId
  if (modeSheetId == null) throw new Error('Onglet Mode d’emploi introuvable.')
  const mode = (await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: quote(modeTitle),
    valueRenderOption: 'FORMULA',
  })).data.values ?? []
  const modeRows = mode.map((row) => row.map((cell) => String(cell ?? '')))
  const a8Index = modeRows.findIndex((row) => row[0] === 'A8')
  if (a8Index < 0) throw new Error('Ligne A8 introuvable dans le mode d’emploi.')
  const guide = [
    [],
    ['Licence des poids'],
    ['Bloc écrit par l’agent de veille, d’après la table des licences arbitrée par le Pôle Doctrine et Juridique. La synchronisation de la plateforme n’écrit pas dans ce bloc.'],
    ['Colonne', 'Valeurs', 'Rôle'],
    ['Licence des poids · Type de modèle', TYPE_VALUES.join(' | '), 'Une des six valeurs arbitrées. Vide sur les lignes Catalogue, et sur un Doublon ou un Hors champ sans fiche de licence.'],
    ['Licence des poids · Identifiant de la licence', 'identifiant court, vide si aucun', 'Par exemple apache-2.0 ou llama4. Un tiret de l’onglet source est enregistré vide.'],
    ['Licence des poids · Source de la licence', 'URL', 'Texte de licence dans le dépôt officiel de l’éditeur.'],
    ['Licence des poids · Exclusion UE', 'Oui, ou vide', 'Oui quand la licence exclut les personnes et les entreprises établies dans l’Union européenne.'],
    [],
    ['Affichage d’un modèle retiré'],
    ['Un modèle dont « Suivi du LLM · Statut LLM » vaut Retiré reste proposé à l’utilisateur si « Licence des poids · Type de modèle » est une licence à poids publiés : libre, commerciale sous conditions, non commerciale, ou à qualifier. Propriétaire et Non renseigné restent masqués. L’éditeur au questionnaire, le rôle de modèle, l’absence de fusion et le forçage manuel ne changent pas. Le sélecteur affiche « Retiré par l’éditeur — poids publiés ».'],
    [],
    ['Alerte Exclusion UE'],
    ['Quand « Licence des poids · Exclusion UE » vaut Oui, le cas d’usage affiche l’alerte de risque contractuel à la sélection du modèle et sur sa page. L’alerte s’affiche si le pays de l’organisation est dans l’Union européenne, vide ou illisible. Elle est masquée seulement quand ce pays est renseigné et reconnu hors de l’Union européenne.'],
    [],
    ['Action A9'],
    ['« Actions humaines · Action humaine requise » ajoute « Faire arbitrer la licence » quand « Licence des poids · Type de modèle » vaut « Poids ouverts, licence à qualifier », sur les lignes Questionnaire seulement.'],
  ]
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [{
        insertDimension: {
          range: {
            sheetId: modeSheetId,
            dimension: 'ROWS',
            startIndex: a8Index + 1,
            endIndex: a8Index + 2,
          },
          inheritFromBefore: false,
        },
      }],
    },
  })
  const lastContent = modeRows.reduce(
    (last, row, index) => (row.some((cell) => cell.trim()) ? index : last),
    0,
  )
  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId,
    requestBody: {
      valueInputOption: 'RAW',
      data: [
        {
          range: `${quote(modeTitle)}!A${a8Index + 2}`,
          values: [[
            'A9',
            'Faire arbitrer la licence',
            '« Licence des poids · Type de modèle » vaut « Poids ouverts, licence à qualifier ». Lignes Questionnaire seulement. Une cellule vide n’allume pas l’action.',
          ]],
        },
        {
          range: `${quote(modeTitle)}!A${lastContent + 3}`,
          values: guide,
        },
      ],
    },
  })

  const after = [
    ...before,
    `${start}2:${end}${endRow}`,
  ]
  console.log(JSON.stringify({
    archiveTitle,
    columns: HEADERS.map((header, index) => `${columnIndexToA1(insertAt + index)} ${header}`),
    filledRows: values.filter((row) => row[0]).length,
    euCount,
    protectionBefore: before,
    protectionAfter: after,
    formulaColumn: actionColumn,
  }, null, 2))
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
