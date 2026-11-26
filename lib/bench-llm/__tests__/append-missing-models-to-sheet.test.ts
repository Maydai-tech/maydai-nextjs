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
} from '../control-tower-csv'

type QueryResult = { data: unknown; error: { message: string } | null }

type RangeBuilder = {
  select: jest.Mock
  order: jest.Mock
  not: jest.Mock
  is: jest.Mock
  range: jest.Mock
}

function createRangeBuilder(pages: QueryResult[]) {
  let rangeCalls = 0
  const builder: RangeBuilder = {
    select: jest.fn(() => builder),
    order: jest.fn(() => builder),
    not: jest.fn(() => builder),
    is: jest.fn(() => builder),
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
      if (table === 'compl_ai_models') return modelsBuilder
      return createRangeBuilder([{ data: [], error: null }])
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

const REQUIRED_HEADERS = [
  'ID Supabase',
  'Statut MaydAI',
  'Nom de la technologie',
  'Nom du LLM (Standard Supabase)',
  'Nom du LLM (Standard Hermes/Fichier)',
  "Proposé à l'utilisateur",
  "Cas d'usage déclarés",
  "Résultat de l'import",
  'Statut Fiche Technique',
  'Statut LLM',
  'Lien du dossier Drive cible',
  'Date de dernière mise à jour (Supabase)',
  'Action requise par Hermes',
  'Prêt pour import',
]

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

  test('ajoute une ligne sous les en-têtes, même après réordonnancement', async () => {
    const headers = [
      'Prêt pour import',
      'ID Supabase',
      ...REQUIRED_HEADERS.filter((header) => header !== 'ID Supabase' && header !== 'Prêt pour import'),
    ]
    mockValuesGet.mockResolvedValue({
      data: { values: [headers, ['Non', 'already-there']] },
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
    mockCreateClient.mockReturnValue(supabase)

    const appended = await appendMissingModelsToSheet(' sheet-id ')

    expect(appended).toBe(1)
    expect(mockValuesGet).toHaveBeenCalledWith({
      spreadsheetId: 'sheet-id',
      range: "'Tour de contrôle'",
    })
    const request = mockValuesAppend.mock.calls[0]?.[0]
    const values = request.requestBody.values as string[][]
    expect(request.range).toBe(`'Tour de contrôle'!A:${String.fromCharCode(64 + headers.length)}`)
    expect(values).toHaveLength(1)
    expect(values[0]?.[headers.indexOf('ID Supabase')]).toBe(sonnet.id)
    expect(values[0]?.[headers.indexOf('Nom du LLM (Standard Supabase)')]).toBe('Claude 3.5 Sonnet')
    expect(values[0]?.[headers.indexOf('Nom du LLM (Standard Hermes/Fichier)')]).toBe('claude_3_5_sonnet_20241022')
    expect(values[0]?.[headers.indexOf('Statut MaydAI')]).toBe('Catalogue')
    expect(values[0]?.[headers.indexOf('Action requise par Hermes')]).toBe('CLASSER')
    expect(values[0]?.[0]).toBe('Non')
  })

  test('accepte les anciens noms Visible dans MaydAI, Popularité et Statut Supabase', async () => {
    const headers = REQUIRED_HEADERS.map((header) => {
      if (header === "Proposé à l'utilisateur") return 'Visible dans MaydAI'
      if (header === "Cas d'usage déclarés") return 'Popularité'
      if (header === "Résultat de l'import") return 'Statut Supabase'
      return header
    })
    mockValuesGet.mockResolvedValue({ data: { values: [headers] } })
    mockCreateClient.mockReturnValue(createSupabaseMock({
      models: [{ data: [sonnet], error: null }],
    }))

    await expect(appendMissingModelsToSheet('sheet-id')).resolves.toBe(1)
    const values = mockValuesAppend.mock.calls[0]?.[0].requestBody.values as string[][]
    expect(values[0]?.[headers.indexOf('Visible dans MaydAI')]).toBe('Non')
    expect(values[0]?.[headers.indexOf('Popularité')]).toBe('0')
    expect(values[0]?.[headers.indexOf('Statut Supabase')]).toBe('Importé')
  })

  test('s’arrête sans écrire si un en-tête attendu manque', async () => {
    mockValuesGet.mockResolvedValue({
      data: { values: [REQUIRED_HEADERS.filter((header) => header !== 'Statut MaydAI')] },
    })
    mockCreateClient.mockReturnValue(createSupabaseMock({
      models: [{ data: [sonnet], error: null }],
    }))

    await expect(appendMissingModelsToSheet('sheet-id')).rejects.toThrow(
      'En-tête manquant : « Statut MaydAI ». Aucune colonne n\'a été insérée.',
    )
    expect(mockValuesAppend).not.toHaveBeenCalled()
  })

  test('returns 0 without appending when every model id is already in the sheet', async () => {
    mockValuesGet.mockResolvedValue({
      data: {
        values: [
          REQUIRED_HEADERS,
          REQUIRED_HEADERS.map((header) => (header === 'ID Supabase' ? sonnet.id : '')),
        ],
      },
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
    expect(values[0]).toContain('Statut MaydAI')
    expect(values[1]?.[0]).toBe(sonnet.id)
  })

  test('rethrows the Supabase error instead of appending', async () => {
    mockValuesGet.mockResolvedValue({
      data: { values: [REQUIRED_HEADERS] },
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
