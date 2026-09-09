/** @jest-environment node */

const mockFindFileIdInFolder = jest.fn()
const mockGetFileFromDrive = jest.fn()
const mockGetDriveFileText = jest.fn()
const mockList = jest.fn()
const mockGet = jest.fn()
const mockExport = jest.fn()
const mockSheetsGet = jest.fn()
const mockValuesGet = jest.fn()
const mockBatchUpdate = jest.fn()

jest.mock('@/lib/google-drive', () => ({
  findFileIdInFolder: (...args: unknown[]) => mockFindFileIdInFolder(...args),
  getFileFromDrive: (...args: unknown[]) => mockGetFileFromDrive(...args),
  getDriveFileText: (...args: unknown[]) => mockGetDriveFileText(...args),
  escapeDriveName: (name: string) => String(name).replace(/'/g, "\\'"),
  getDriveClient: () => ({
    files: {
      list: (...args: unknown[]) => mockList(...args),
      get: (...args: unknown[]) => mockGet(...args),
      export: (...args: unknown[]) => mockExport(...args),
    },
  }),
  getSheetsClient: () => ({
    spreadsheets: {
      get: (...args: unknown[]) => mockSheetsGet(...args),
      values: {
        get: (...args: unknown[]) => mockValuesGet(...args),
        batchUpdate: (...args: unknown[]) => mockBatchUpdate(...args),
      },
    },
  }),
}))

import { CONTROL_TOWER_FOLDER_ID } from '../control-tower-csv'
import {
  columnIndexToA1,
  downloadControlTowerCsvFromDrive,
  downloadMarkdownFromDrive,
  extractCardDateFromMarkdown,
  extractCardVersionDateFromFileName,
  findColumnIndexByHeader,
  formatStatutSupabaseValue,
  isReadyForImport,
  missingDriveFileMessage,
  olderVersionIgnoredMessage,
  parseControlTowerCsv,
  resolveDriveMarkdownRef,
  importSystemCardsFromControlTower,
  writeControlTowerStatusesToSheet,
} from '../system-cards-import'

function cardsTable(upsert: jest.Mock, existing: { card_version_date: string | null } | null = null) {
  return {
    select: () => ({
      eq: () => ({
        maybeSingle: async () => ({ data: existing, error: null }),
      }),
    }),
    upsert,
  }
}

const MARKDOWN_FILE_NAME = 'Claude_Sonnet_3.5_2024-06-20_03_Audit_FR_V2.md'

describe('system cards import helpers', () => {
  test('detects Prêt pour import = Oui case-insensitively', () => {
    expect(isReadyForImport('Oui')).toBe(true)
    expect(isReadyForImport('OUI')).toBe(true)
    expect(isReadyForImport(' oui ')).toBe(true)
    expect(isReadyForImport('Non')).toBe(false)
    expect(isReadyForImport('Déjà importé')).toBe(false)
  })

  test('extracts a Drive fileId from URLs and keeps underscores', () => {
    expect(
      resolveDriveMarkdownRef(
        'https://drive.google.com/file/d/1_c_nWKfM6Yfj9cf4Mb_f6Sv79mHIyVM_/view?usp=drive_link',
      ),
    ).toEqual({ fileId: '1_c_nWKfM6Yfj9cf4Mb_f6Sv79mHIyVM_' })
    expect(
      resolveDriveMarkdownRef('https://docs.google.com/document/d/1abcDEF_ghi-JKLmnopqr/edit'),
    ).toEqual({ fileId: '1abcDEF_ghi-JKLmnopqr' })
    expect(resolveDriveMarkdownRef('https://drive.google.com/open?id=1_c_nWKfM6Yfj9cf4Mb_f6Sv79mHIyVM_')).toEqual({
      fileId: '1_c_nWKfM6Yfj9cf4Mb_f6Sv79mHIyVM_',
    })
    expect(resolveDriveMarkdownRef('1_c_nWKfM6Yfj9cf4Mb_f6Sv79mHIyVM_')).toEqual({
      fileId: '1_c_nWKfM6Yfj9cf4Mb_f6Sv79mHIyVM_',
    })
  })

  test('treats the CSV markdown cell as an exact Drive file name', () => {
    expect(resolveDriveMarkdownRef(MARKDOWN_FILE_NAME)).toEqual({
      fileName: MARKDOWN_FILE_NAME,
    })
    expect(resolveDriveMarkdownRef(`  ${MARKDOWN_FILE_NAME}  `)).toEqual({
      fileName: MARKDOWN_FILE_NAME,
    })
    expect(resolveDriveMarkdownRef('')).toEqual({})
  })

  test('extracts card_version_date from Drive file names', () => {
    expect(extractCardVersionDateFromFileName('Claude_Sonnet_3.5_2024-06-20_03_Audit_FR_V2.md')).toBe(
      '2024-06-20',
    )
    expect(extractCardVersionDateFromFileName('Claude_Sonnet_3.5_2024_06_20_Audit.md')).toBe(
      '2024-06-20',
    )
    expect(extractCardVersionDateFromFileName('sans-date.md')).toBeNull()
  })

  test('extracts card_date_label and card_month from Markdown', () => {
    expect(extractCardDateFromMarkdown('# Fiche\nDate de la fiche : Juin 2024\n')).toEqual({
      card_date_label: 'Juin 2024',
      card_month: '2024-06-01',
    })
    expect(extractCardDateFromMarkdown('Date de la fiche : 2024-06-20')).toEqual({
      card_date_label: '2024-06-20',
      card_month: '2024-06-01',
    })
    expect(extractCardDateFromMarkdown('# Sans date')).toEqual({
      card_date_label: null,
      card_month: null,
    })
    expect(extractCardDateFromMarkdown('* **Date de la fiche :** Février 2026')).toEqual({
      card_date_label: 'Février 2026',
      card_month: '2026-02-01',
    })
  })

  test('trims padded CSV headers including CR leftovers', () => {
    const csv = [
      '"ID Supabase"," Lien du fichier Markdown généré\r ","Prêt pour import"',
      `id-1,${MARKDOWN_FILE_NAME},Oui`,
    ].join('\n')

    const rows = parseControlTowerCsv(csv)
    expect(rows).toHaveLength(1)
    expect(rows[0]?.markdownLink).toBe(MARKDOWN_FILE_NAME)
    expect(rows[0]?.readyForImport).toBe('Oui')
  })

  test('filters CSV rows ready for import', () => {
    const csv = [
      'ID Supabase,Nom de la technologie,Nom du LLM (Standard Supabase),Nom du LLM (Standard Hermes/Fichier),Statut Base de données,Statut Fiche Technique,Lien du dossier Drive cible,Lien du fichier Markdown généré,Date de dernière mise à jour (Supabase),Date de priorisation de l\'action,Action requise par Hermes,Prêt pour import',
      `id-1,Anthropic,Claude Sonnet 3.5,claude_sonnet_3_5,Importé,Manquante,,${MARKDOWN_FILE_NAME},,,CREATE,Oui`,
      'id-2,OpenAI,GPT-4o,gpt_4o,Importé,Manquante,,skip.md,,,CREATE,Non',
    ].join('\n')

    const ready = parseControlTowerCsv(csv).filter((row) => isReadyForImport(row.readyForImport))
    expect(ready).toHaveLength(1)
    expect(ready[0]?.markdownLink).toBe(MARKDOWN_FILE_NAME)
    expect(ready[0]?.modelName).toBe('Claude Sonnet 3.5')
  })
})

describe('downloadMarkdownFromDrive', () => {
  beforeEach(() => {
    mockFindFileIdInFolder.mockReset()
    mockGetFileFromDrive.mockReset()
    mockList.mockReset()
  })

  test('lists the exact file name in the Control Tower folder then downloads text', async () => {
    mockList.mockResolvedValue({
      data: { files: [{ id: 'md-file-id', name: MARKDOWN_FILE_NAME }] },
    })
    mockGetFileFromDrive.mockResolvedValue('# Fiche Claude\n')

    await expect(
      downloadMarkdownFromDrive({ fileName: MARKDOWN_FILE_NAME }),
    ).resolves.toBe('# Fiche Claude\n')

    expect(mockList).toHaveBeenCalledWith({
      q: `name='${MARKDOWN_FILE_NAME}' and '${CONTROL_TOWER_FOLDER_ID}' in parents and trashed=false`,
      fields: 'files(id, name)',
      pageSize: 10,
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
      corpora: 'allDrives',
    })
    expect(mockGetFileFromDrive).toHaveBeenCalledWith('md-file-id')
  })

  test('rejects a missing Drive file with the CSV file name', async () => {
    mockList.mockResolvedValue({ data: { files: [] } })

    await expect(
      downloadMarkdownFromDrive({ fileName: MARKDOWN_FILE_NAME }),
    ).rejects.toThrow(missingDriveFileMessage(MARKDOWN_FILE_NAME))
    expect(mockGetFileFromDrive).not.toHaveBeenCalled()
  })
})

describe('importSystemCardsFromControlTower', () => {
  beforeEach(() => {
    mockGetFileFromDrive.mockReset()
    mockGetDriveFileText.mockReset()
    mockList.mockReset()
  })

  test('downloads a Drive URL by fileId without files.list', async () => {
    mockGetDriveFileText.mockResolvedValue({
      content: '# Fiche Claude 3.7\nDate de la fiche : Juin 2024\n',
      name: 'Claude_3.7_2024-06-20.md',
    })
    const upsert = jest.fn(async () => ({ error: null }))
    const maybeSingle = jest.fn(async () => ({
      data: {
        slug: 'claude-3-7-sonnet',
        model_name: 'Claude 3.7 Sonnet',
        model_provider: 'Anthropic',
      },
      error: null,
    }))
    const downloadMarkdown = jest.fn(async () => {
      throw new Error('files.list ne doit pas être appelé')
    })

    const result = await importSystemCardsFromControlTower({
      supabase: {
        from: jest.fn((table: string) => {
          if (table === 'compl_ai_models') {
            return { select: () => ({ eq: () => ({ maybeSingle }) }) }
          }
          return cardsTable(upsert)
        }),
      } as never,
      downloadControlTowerCsv: async () =>
        [
          'ID Supabase,Nom du LLM (Standard Supabase),Nom du LLM (Standard Hermes/Fichier),Lien du fichier Markdown généré,Prêt pour import',
          'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa,Claude 3.7 Sonnet,claude_3_7_sonnet,https://drive.google.com/file/d/1_c_nWKfM6Yfj9cf4Mb_f6Sv79mHIyVM_/view?usp=drive_link,Oui',
        ].join('\n'),
      downloadMarkdown,
    })

    expect(result).toMatchObject({
      success: true,
      processed: 1,
      inserted: 1,
      skipped: [],
      errors: [],
    })
    expect(mockGetDriveFileText).toHaveBeenCalledWith('1_c_nWKfM6Yfj9cf4Mb_f6Sv79mHIyVM_')
    expect(mockList).not.toHaveBeenCalled()
    expect(downloadMarkdown).not.toHaveBeenCalled()
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        model_identifier: 'claude-3-7-sonnet',
        model_name: 'Claude 3.7 Sonnet',
        source_markdown: '# Fiche Claude 3.7\nDate de la fiche : Juin 2024',
        source_file_name: 'Claude_3.7_2024-06-20.md',
        card_version_date: '2024-06-20',
        card_date_label: 'Juin 2024',
        card_month: '2024-06-01',
      }),
      { onConflict: 'model_identifier' },
    )
  })

  test('upserts llm_system_cards for ready rows and collects per-row errors', async () => {
    const upsert = jest.fn(async () => ({ error: null }))
    const maybeSingle = jest.fn(async () => ({
      data: { slug: 'claude-sonnet-4-5', model_name: 'Claude Sonnet 4.5', model_provider: 'Anthropic' },
      error: null,
    }))
    const supabase = {
      from: jest.fn((table: string) => {
        if (table === 'compl_ai_models') {
          return {
            select: () => ({
              eq: () => ({ maybeSingle }),
            }),
          }
        }
        return cardsTable(upsert)
      }),
    }

    const result = await importSystemCardsFromControlTower({
      supabase: supabase as never,
      downloadControlTowerCsv: async () =>
        [
          'ID Supabase,Nom du LLM (Standard Supabase),Nom du LLM (Standard Hermes/Fichier),Lien du fichier Markdown généré,Prêt pour import',
          `aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa,Claude Sonnet 4.5,claude_sonnet_4_5,${MARKDOWN_FILE_NAME},Oui`,
          'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb,Broken,broken,,Oui',
        ].join('\n'),
      downloadMarkdown: async (ref) => {
        if (ref.fileName === MARKDOWN_FILE_NAME) return '# Fiche Claude\n'
        throw new Error(missingDriveFileMessage(ref.fileName ?? ''))
      },
    })

    expect(result.processed).toBe(2)
    expect(result.inserted).toBe(1)
    expect(result.success).toBe(false)
    expect(result.errors[0]).toContain('Broken')
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        model_identifier: 'claude-sonnet-4-5',
        model_name: 'Claude Sonnet 4.5',
        provider: 'Anthropic',
        source_markdown: '# Fiche Claude',
        source_file_name: MARKDOWN_FILE_NAME,
        card_version_date: '2024-06-20',
      }),
      { onConflict: 'model_identifier' },
    )
  })

  test('records an explicit error when the Drive file name is missing', async () => {
    const upsert = jest.fn()
    const result = await importSystemCardsFromControlTower({
      supabase: { from: jest.fn() } as never,
      downloadControlTowerCsv: async () =>
        [
          'Nom du LLM (Standard Supabase),Lien du fichier Markdown généré,Prêt pour import',
          `Claude Sonnet 3.5,${MARKDOWN_FILE_NAME},Oui`,
        ].join('\n'),
      downloadMarkdown: async (ref) => {
        throw new Error(missingDriveFileMessage(ref.fileName ?? ''))
      },
    })

    expect(result.processed).toBe(1)
    expect(result.inserted).toBe(0)
    expect(result.success).toBe(false)
    expect(result.errors).toEqual([
      `Fichier introuvable sur le Drive pour le nom : ${MARKDOWN_FILE_NAME}`,
    ])
    expect(upsert).not.toHaveBeenCalled()
  })

  test('writes Statut Supabase after import and ignores Sheets failures', async () => {
    const writeControlTowerStatuses = jest.fn(async () => {
      throw new Error('Sheets indisponible')
    })
    mockGetDriveFileText.mockResolvedValue({
      content: '# Fiche Claude 3.7\n',
      name: 'Claude_3.7_2024-06-20.md',
    })
    const upsert = jest.fn(async () => ({ error: null }))
    const maybeSingle = jest.fn(async () => ({
      data: {
        slug: 'claude-3-7-sonnet',
        model_name: 'Claude 3.7 Sonnet',
        model_provider: 'Anthropic',
      },
      error: null,
    }))

    const result = await importSystemCardsFromControlTower({
      supabase: {
        from: jest.fn((table: string) => {
          if (table === 'compl_ai_models') {
            return { select: () => ({ eq: () => ({ maybeSingle }) }) }
          }
          return cardsTable(upsert)
        }),
      } as never,
      downloadControlTowerCsv: async () =>
        [
          'ID Supabase,Nom du LLM (Standard Supabase),Lien du fichier Markdown généré,Prêt pour import',
          'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa,Claude 3.7 Sonnet,https://drive.google.com/file/d/1_c_nWKfM6Yfj9cf4Mb_f6Sv79mHIyVM_/view,Oui',
        ].join('\n'),
      downloadMarkdown: async () => '# unused',
      writeControlTowerStatuses,
    })

    expect(result.success).toBe(true)
    expect(result.inserted).toBe(1)
    expect(writeControlTowerStatuses).toHaveBeenCalledWith([
      expect.objectContaining({
        idSupabase: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        modelName: 'Claude 3.7 Sonnet',
        success: true,
      }),
    ])
  })

  test('skips upsert when the stored card_version_date is newer', async () => {
    mockGetDriveFileText.mockResolvedValue({
      content: '# Fiche ancienne\n',
      name: 'Claude_3.7_2024-01-10.md',
    })
    const upsert = jest.fn(async () => ({ error: null }))
    const writeControlTowerStatuses = jest.fn(async () => undefined)
    const maybeSingle = jest.fn(async () => ({
      data: {
        slug: 'claude-3-7-sonnet',
        model_name: 'Claude 3.7 Sonnet',
        model_provider: 'Anthropic',
      },
      error: null,
    }))

    const result = await importSystemCardsFromControlTower({
      supabase: {
        from: jest.fn((table: string) => {
          if (table === 'compl_ai_models') {
            return { select: () => ({ eq: () => ({ maybeSingle }) }) }
          }
          return cardsTable(upsert, { card_version_date: '2024-06-20' })
        }),
      } as never,
      downloadControlTowerCsv: async () =>
        [
          'ID Supabase,Nom du LLM (Standard Supabase),Lien du fichier Markdown généré,Prêt pour import',
          'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa,Claude 3.7 Sonnet,https://drive.google.com/file/d/1_c_nWKfM6Yfj9cf4Mb_f6Sv79mHIyVM_/view,Oui',
        ].join('\n'),
      downloadMarkdown: async () => '# unused',
      writeControlTowerStatuses,
    })

    const message = olderVersionIgnoredMessage('2024-06-20', '2024-01-10')
    expect(upsert).not.toHaveBeenCalled()
    expect(result.inserted).toBe(0)
    expect(result.success).toBe(true)
    expect(result.errors).toEqual([])
    expect(result.skipped).toEqual([message])
    expect(writeControlTowerStatuses).toHaveBeenCalledWith([
      expect.objectContaining({
        success: false,
        statutSupabase: message,
        errorMessage: message,
      }),
    ])
  })
})

describe('control tower sheet helpers', () => {
  const previousSheetId = process.env.GOOGLE_SHEETS_CONTROL_TOWER_ID

  afterEach(() => {
    if (previousSheetId == null) delete process.env.GOOGLE_SHEETS_CONTROL_TOWER_ID
    else process.env.GOOGLE_SHEETS_CONTROL_TOWER_ID = previousSheetId
    mockGet.mockReset()
    mockExport.mockReset()
    mockGetFileFromDrive.mockReset()
    mockSheetsGet.mockReset()
    mockValuesGet.mockReset()
    mockBatchUpdate.mockReset()
  })

  test('locates Statut Supabase by header label and converts to A1', () => {
    expect(
      findColumnIndexByHeader(
        ['ID Supabase', ' Statut Supabase ', 'Prêt pour import'],
        'Statut Supabase',
      ),
    ).toBe(1)
    expect(columnIndexToA1(0)).toBe('A')
    expect(columnIndexToA1(4)).toBe('E')
    expect(columnIndexToA1(26)).toBe('AA')
    expect(
      formatStatutSupabaseValue({
        idSupabase: 'id',
        hermesName: '',
        modelName: '',
        success: true,
        importedOn: '2026-09-09',
      }),
    ).toBe('Importé le 2026-09-09')
    expect(
      formatStatutSupabaseValue({
        idSupabase: 'id',
        hermesName: '',
        modelName: '',
        success: false,
        errorMessage: 'Fichier introuvable',
        importedOn: '2026-09-09',
      }),
    ).toBe('Échec : Fichier introuvable')
  })

  test('exports a native Google Sheet as CSV via files.export', async () => {
    process.env.GOOGLE_SHEETS_CONTROL_TOWER_ID = 'sheet-id-1'
    mockGet.mockResolvedValue({
      data: {
        id: 'sheet-id-1',
        name: 'Tour de controle',
        mimeType: 'application/vnd.google-apps.spreadsheet',
      },
    })
    mockExport.mockResolvedValue({ data: 'ID Supabase,Prêt pour import\n' })

    await expect(downloadControlTowerCsvFromDrive()).resolves.toBe(
      'ID Supabase,Prêt pour import\n',
    )
    expect(mockFindFileIdInFolder).not.toHaveBeenCalled()
    expect(mockExport).toHaveBeenCalledWith(
      { fileId: 'sheet-id-1', mimeType: 'text/csv' },
      { responseType: 'text' },
    )
    expect(mockGetFileFromDrive).not.toHaveBeenCalled()
  })

  test('falls back to files.get for a non-spreadsheet control tower file', async () => {
    process.env.GOOGLE_SHEETS_CONTROL_TOWER_ID = 'csv-file-id'
    mockGet.mockResolvedValue({
      data: { id: 'csv-file-id', name: 'tower.csv', mimeType: 'text/csv' },
    })
    mockGetFileFromDrive.mockResolvedValue('ID Supabase\n')

    await expect(downloadControlTowerCsvFromDrive()).resolves.toBe('ID Supabase\n')
    expect(mockExport).not.toHaveBeenCalled()
    expect(mockGetFileFromDrive).toHaveBeenCalledWith('csv-file-id')
  })

  test('writes Statut Supabase plus ready/action columns for upserted rows only', async () => {
    process.env.GOOGLE_SHEETS_CONTROL_TOWER_ID = 'sheet-id-1'
    mockSheetsGet.mockResolvedValue({
      data: { sheets: [{ properties: { title: "Tour de contrôle", index: 0 } }] },
    })
    mockValuesGet.mockResolvedValue({
      data: {
        values: [
          [
            'ID Supabase',
            'Nom du LLM (Standard Supabase)',
            'Statut Supabase',
            'Prêt pour import',
            'Action requise par Hermes',
          ],
          ['aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Claude 3.7 Sonnet', '', 'Oui', 'CREATE'],
          ['bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'Broken', '', 'Oui', 'CREATE'],
        ],
      },
    })
    mockBatchUpdate.mockResolvedValue({ data: {} })

    await writeControlTowerStatusesToSheet([
      {
        idSupabase: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        hermesName: 'claude_3_7_sonnet',
        modelName: 'Claude 3.7 Sonnet',
        success: true,
        importedOn: '2026-09-09',
      },
      {
        idSupabase: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
        hermesName: 'broken',
        modelName: 'Broken',
        success: false,
        errorMessage: 'Fichier Markdown vide',
        importedOn: '2026-09-09',
      },
    ])

    expect(mockBatchUpdate).toHaveBeenCalledTimes(1)
    expect(mockBatchUpdate).toHaveBeenCalledWith({
      spreadsheetId: 'sheet-id-1',
      requestBody: {
        valueInputOption: 'RAW',
        data: [
          {
            range: "'Tour de contrôle'!C2",
            values: [['Importé le 2026-09-09']],
          },
          {
            range: "'Tour de contrôle'!D2",
            values: [['Déjà importé']],
          },
          {
            range: "'Tour de contrôle'!E2",
            values: [['NONE']],
          },
          {
            range: "'Tour de contrôle'!C3",
            values: [['Échec : Fichier Markdown vide']],
          },
        ],
      },
    })
  })
})
