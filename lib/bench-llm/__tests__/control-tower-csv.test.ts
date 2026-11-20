/** @jest-environment node */

jest.mock('@/lib/google-drive', () => ({
  upsertTextFileInFolder: jest.fn(),
  getSheetsClient: jest.fn(),
}))

import { upsertTextFileInFolder } from '@/lib/google-drive'
import {
  buildControlTowerCsv,
  CONTROL_TOWER_DRIVE_FOLDER_URL,
  CONTROL_TOWER_FILE_NAME,
  CONTROL_TOWER_FOLDER_ID,
  exportControlTowerCsv,
  projectPlatformColumns,
  resolveControlTowerLlmStatus,
  toHermesFileName,
} from '../control-tower-csv'
import { MissingControlTowerHeaderError } from '../control-tower-headers'

const mockedUpsert = upsertTextFileInFolder as jest.MockedFunction<
  typeof upsertTextFileInFolder
>

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
    modelsBuilder,
    cardsBuilder,
    sourceIdsBuilder,
  }
}

describe('Control Tower CSV', () => {
  const previousFolder = process.env.GOOGLE_DRIVE_FOLDER_CONTROL_TOWER
  const previousSheetId = process.env.GOOGLE_SHEETS_CONTROL_TOWER_ID

  beforeEach(() => {
    delete process.env.GOOGLE_SHEETS_CONTROL_TOWER_ID
  })

  afterEach(() => {
    mockedUpsert.mockReset()
    if (previousFolder == null) delete process.env.GOOGLE_DRIVE_FOLDER_CONTROL_TOWER
    else process.env.GOOGLE_DRIVE_FOLDER_CONTROL_TOWER = previousFolder
    if (previousSheetId == null) delete process.env.GOOGLE_SHEETS_CONTROL_TOWER_ID
    else process.env.GOOGLE_SHEETS_CONTROL_TOWER_ID = previousSheetId
  })

  test('maps slug dashes to Hermes underscores', () => {
    expect(toHermesFileName('claude-sonnet-4-5')).toBe('claude_sonnet_4_5')
  })

  test('labels a model actif, déprécié or retiré from the provider lifecycle', () => {
    expect(
      resolveControlTowerLlmStatus({
        slug: 'claude-haiku-4-5',
        modelName: 'Claude Haiku 4.5',
      }),
    ).toBe('Actif')
    expect(
      resolveControlTowerLlmStatus({
        slug: 'gpt-4',
        modelName: 'GPT-4',
        lifecycleStatus: 'deprecated',
      }),
    ).toBe('Déprécié')
    expect(
      resolveControlTowerLlmStatus({
        slug: 'chatgpt-4o-latest',
        modelName: 'ChatGPT-4o Latest',
      }),
    ).toBe('Retiré')
  })

  test('builds the export with the new header names', () => {
    const csv = buildControlTowerCsv([
      {
        id: 'id-generated',
        slug: 'claude-sonnet-4-5',
        model_provider: 'Anthropic',
        model_name: 'Claude Sonnet 4.5',
        updated_at: '2026-09-08T14:22:00.000Z',
        hasSystemCard: true,
        llmStatus: 'Actif',
        maydaiStatus: 'Questionnaire',
        proposedToUser: 'Oui',
        declaredUseCases: 2,
      },
      {
        id: 'id-missing',
        slug: 'gpt-4o',
        model_provider: 'OpenAI',
        model_name: 'GPT-4o, flagship',
        updated_at: '2026-01-15',
        hasSystemCard: false,
        llmStatus: 'Retiré',
        maydaiStatus: 'Catalogue',
        proposedToUser: 'Non',
        declaredUseCases: 0,
      },
    ])

    const header = [
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
      'Lien du fichier Markdown généré',
      'Date de dernière mise à jour (Supabase)',
      "Date de priorisation de l'action",
      'Action requise par Hermes',
      'Prêt pour import',
    ].join(',')

    expect(csv).toBe(
      [
        header,
        `id-generated,Questionnaire,Anthropic,Claude Sonnet 4.5,claude_sonnet_4_5,Oui,2,Importé,Générée,Actif,${CONTROL_TOWER_DRIVE_FOLDER_URL},,2026-09-08,,NONE,Déjà importé`,
        `id-missing,Catalogue,OpenAI,"GPT-4o, flagship",gpt_4o,Non,0,Importé,Manquante,Retiré,${CONTROL_TOWER_DRIVE_FOLDER_URL},,2026-01-15,,CREATE,Non`,
        '',
      ].join('\n'),
    )
  })

  test('looks up llm_system_cards by slug and uploads the CSV', async () => {
    delete process.env.GOOGLE_DRIVE_FOLDER_CONTROL_TOWER
    mockedUpsert.mockResolvedValue({ id: 'file-1', updated: true })

    const supabase = createSupabaseMock({
      systemCards: [
        { data: [{ model_identifier: 'claude-sonnet-4-5' }], error: null },
      ],
      models: [
        {
          data: [
            {
              id: 'model-1',
              slug: 'claude-sonnet-4-5',
              model_provider: 'Anthropic',
              model_name: 'Claude Sonnet 4.5',
              updated_at: '2026-09-08T10:00:00.000Z',
            },
            {
              id: 'model-2',
              slug: 'gpt-4o',
              model_provider: 'OpenAI',
              model_name: 'GPT-4o',
              updated_at: null,
            },
          ],
          error: null,
        },
      ],
    })

    const result = await exportControlTowerCsv(supabase as never)

    expect(supabase.from).toHaveBeenCalledWith('llm_system_cards')
    expect(supabase.from).toHaveBeenCalledWith('compl_ai_models')
    expect(mockedUpsert).toHaveBeenCalledWith({
      folderId: CONTROL_TOWER_FOLDER_ID,
      fileName: CONTROL_TOWER_FILE_NAME,
      mimeType: 'text/csv',
      content: expect.stringContaining(
        'model-1,Catalogue,Anthropic,Claude Sonnet 4.5,claude_sonnet_4_5,Non,0,Importé,Générée',
      ),
    })
    expect(mockedUpsert.mock.calls[0]?.[0].content).toContain(
      'model-2,Catalogue,OpenAI,GPT-4o,gpt_4o,Non,0,Importé,Manquante',
    )
    expect(mockedUpsert.mock.calls[0]?.[0].content).toContain(',NONE,Déjà importé')
    expect(mockedUpsert.mock.calls[0]?.[0].content).toContain(',CREATE,Non')
    expect(result).toEqual({ fileId: 'file-1', rowCount: 2, updated: true })
  })

  test('prefers GOOGLE_DRIVE_FOLDER_CONTROL_TOWER over the default folder id', async () => {
    process.env.GOOGLE_DRIVE_FOLDER_CONTROL_TOWER = ' override-folder-id '
    mockedUpsert.mockResolvedValue({ id: 'file-2', updated: false })

    const supabase = createSupabaseMock({})

    await exportControlTowerCsv(supabase as never)

    expect(mockedUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        folderId: 'override-folder-id',
        fileName: CONTROL_TOWER_FILE_NAME,
      }),
    )
  })

  test('throws when compl_ai_models cannot be read', async () => {
    const supabase = createSupabaseMock({
      models: [{ data: null, error: { message: 'permission denied' } }],
    })

    await expect(exportControlTowerCsv(supabase as never)).rejects.toThrow(
      'Lecture compl_ai_models: permission denied',
    )
    expect(mockedUpsert).not.toHaveBeenCalled()
  })

  test('rafraîchit le bloc Identification sous les anciens ou les nouveaux noms', () => {
    const headers = [
      'Popularité',
      'Nom du LLM (Standard Hermes/Fichier)',
      'ID Supabase',
      'Visible dans MaydAI',
      'Nom de la technologie',
      'Nom du LLM (Standard Supabase)',
      'Statut MaydAI',
      'Statut Fiche Technique',
    ]
    const columns = projectPlatformColumns({
      headers,
      rows: [
        headers,
        ['4', 'ancien_slug', 'model-1', 'Non', 'Ancien', 'Ancien nom', 'Catalogue', 'Manquante'],
        ['0', 'orphelin', 'inconnu', 'Non', 'X', 'Fantôme', 'Catalogue', 'Manquante'],
      ],
      models: new Map([
        ['model-1', {
          provider: 'Anthropic',
          modelName: 'Claude Opus 5.5',
          hermesName: 'claude_opus_5_5',
          maydaiStatus: 'Questionnaire',
          proposedToUser: 'Oui',
          declaredUseCases: '3',
          ficheStatus: 'Générée',
        }],
      ]),
    })
    const byHeader = new Map(columns.map((column) => [column.header, column]))
    expect(byHeader.get('Statut MaydAI')?.column).toBe('G')
    expect(byHeader.get('Statut MaydAI')?.values).toEqual([['Questionnaire'], ['Catalogue']])
    expect(byHeader.get("Proposé à l'utilisateur")?.values).toEqual([['Oui'], ['Non']])
    expect(byHeader.get("Cas d'usage déclarés")?.values).toEqual([['3'], ['0']])
    expect(byHeader.get('Nom du LLM (Standard Supabase)')?.values[0]).toEqual(['Claude Opus 5.5'])
    expect(byHeader.get('Nom du LLM (Standard Hermes/Fichier)')?.values[0]).toEqual(['claude_opus_5_5'])
    expect(byHeader.get('Nom du LLM (Standard Supabase)')?.values[1]).toEqual(['Fantôme'])
  })

  test('refuse de projeter le bloc si Statut MaydAI manque', () => {
    expect(() => projectPlatformColumns({
      headers: ['ID Supabase', 'Nom de la technologie'],
      rows: [['ID Supabase', 'Nom de la technologie'], ['model-1', 'Anthropic']],
      models: new Map(),
    })).toThrow(MissingControlTowerHeaderError)
  })
})
