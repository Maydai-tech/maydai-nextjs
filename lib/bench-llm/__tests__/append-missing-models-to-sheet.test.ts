/** @jest-environment node */

const mockSpreadsheetsGet = jest.fn()
const mockValuesGet = jest.fn()
const mockValuesAppend = jest.fn()
const mockCreateClient = jest.fn()

jest.mock('@supabase/supabase-js', () => ({
  createClient: (...args: unknown[]) => mockCreateClient(...args),
}))

jest.mock('@/lib/google-drive', () => ({
  getSheetsClient: () => ({
    spreadsheets: {
      get: (...args: unknown[]) => mockSpreadsheetsGet(...args),
      values: {
        get: (...args: unknown[]) => mockValuesGet(...args),
        append: (...args: unknown[]) => mockValuesAppend(...args),
      },
    },
  }),
  upsertTextFileInFolder: jest.fn(),
}))

import {
  appendMissingModelsToSheet,
  CONTROL_TOWER_DRIVE_FOLDER_URL,
  resolveControlTowerLlmStatus,
} from '../control-tower-csv'

type QueryResult = { data: unknown; error: { message: string } | null }

function createRangeBuilder(pages: QueryResult[]) {
  let rangeCalls = 0
  const builder = {
    select: jest.fn(() => builder),
    order: jest.fn(() => builder),
    range: jest.fn(async () => {
      const result = pages[rangeCalls] ?? { data: [], error: null }
      rangeCalls += 1
      return result
    }),
  }
  return builder
}

function createSupabaseMock(options: {
  models?: QueryResult[]
  systemCards?: QueryResult[]
  sourceIds?: QueryResult[]
}) {
  const modelsBuilder = createRangeBuilder(options.models ?? [{ data: [], error: null }])
  const cardsBuilder = createRangeBuilder(options.systemCards ?? [{ data: [], error: null }])
  const sourceIdsBuilder = createRangeBuilder(options.sourceIds ?? [{ data: [], error: null }])

  return {
    from: jest.fn((table: string) => {
      if (table === 'llm_system_cards') return cardsBuilder
      if (table === 'llm_model_source_ids') return sourceIdsBuilder
      return modelsBuilder
    }),
  }
}

const sonnet = {
  id: '11111111-1111-4111-8111-111111111111',
  slug: 'claude-3-5-sonnet-20241022',
  model_provider: 'Anthropic',
  model_name: 'Claude 3.5 Sonnet',
  updated_at: '2024-10-22T00:00:00.000Z',
  lifecycle_status: 'retired',
}

describe('appendMissingModelsToSheet', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost:54321'
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-key'
    mockValuesAppend.mockResolvedValue({ data: {} })
    mockSpreadsheetsGet.mockResolvedValue({
      data: {
        sheets: [
          { properties: { sheetId: 2, title: 'Archive', index: 1 } },
          { properties: { sheetId: 0, title: 'Tour de contrôle', index: 0 } },
        ],
      },
    })
  })

  test('appends models absent from column A on the first sheet, across the 13 control-tower columns', async () => {
    mockValuesGet.mockResolvedValue({
      data: {
        values: [['ID Supabase'], ['already-there']],
      },
    })
    const supabase = createSupabaseMock({
      models: [
        {
          data: [
            { ...sonnet },
            {
              id: 'already-there',
              slug: 'gpt-4o',
              model_provider: 'OpenAI',
              model_name: 'GPT-4o',
              updated_at: null,
              lifecycle_status: 'active',
            },
          ],
          error: null,
        },
      ],
    })
    const llmStatus = resolveControlTowerLlmStatus({
      slug: sonnet.slug,
      modelName: sonnet.model_name,
      lifecycleStatus: sonnet.lifecycle_status,
    })
    mockCreateClient.mockReturnValue(supabase)

    const appended = await appendMissingModelsToSheet(' sheet-id ')

    expect(appended).toBe(1)
    expect(mockValuesGet).toHaveBeenCalledWith({
      spreadsheetId: 'sheet-id',
      range: "'Tour de contrôle'!A:A",
    })
    expect(mockValuesAppend).toHaveBeenCalledWith({
      spreadsheetId: 'sheet-id',
      range: "'Tour de contrôle'!A:M",
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      requestBody: {
        values: [[
          sonnet.id,
          'Anthropic',
          'Claude 3.5 Sonnet',
          'claude_3_5_sonnet_20241022',
          'Importé',
          'Manquante',
          llmStatus,
          CONTROL_TOWER_DRIVE_FOLDER_URL,
          '',
          '2024-10-22',
          '',
          'CREATE',
          'Non',
        ]],
      },
    })
  })

  test('returns 0 without appending when every model id is already in the sheet', async () => {
    mockValuesGet.mockResolvedValue({
      data: { values: [['ID Supabase'], [sonnet.id]] },
    })
    const supabase = createSupabaseMock({
      models: [{ data: [sonnet], error: null }],
    })
    mockCreateClient.mockReturnValue(supabase)

    await expect(appendMissingModelsToSheet('sheet-id')).resolves.toBe(0)
    expect(mockValuesAppend).not.toHaveBeenCalled()
  })

  test('writes the header row when the first sheet is empty', async () => {
    mockValuesGet.mockResolvedValue({ data: { values: [] } })
    const supabase = createSupabaseMock({
      models: [{ data: [sonnet], error: null }],
    })
    mockCreateClient.mockReturnValue(supabase)

    await expect(appendMissingModelsToSheet('sheet-id')).resolves.toBe(1)
    const values = mockValuesAppend.mock.calls[0]?.[0].requestBody.values as string[][]
    expect(values[0]?.[0]).toBe('ID Supabase')
    expect(values[0]).toHaveLength(13)
    expect(values[1]?.[0]).toBe(sonnet.id)
  })

  test('rethrows the Supabase error instead of appending', async () => {
    mockValuesGet.mockResolvedValue({
      data: { values: [['ID Supabase']] },
    })
    const supabase = createSupabaseMock({
      models: [{ data: null, error: { message: 'permission denied' } }],
    })
    mockCreateClient.mockReturnValue(supabase)

    await expect(appendMissingModelsToSheet('sheet-id')).rejects.toThrow(
      'Lecture compl_ai_models: permission denied',
    )
    expect(mockValuesAppend).not.toHaveBeenCalled()
  })
})
