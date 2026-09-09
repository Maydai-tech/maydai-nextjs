/** @jest-environment node */

jest.mock('@/lib/google-drive', () => ({
  upsertTextFileInFolder: jest.fn(),
}))

import { upsertTextFileInFolder } from '@/lib/google-drive'
import {
  buildControlTowerCsv,
  CONTROL_TOWER_DRIVE_FOLDER_URL,
  CONTROL_TOWER_FILE_NAME,
  CONTROL_TOWER_FOLDER_ID,
  exportControlTowerCsv,
  toHermesFileName,
} from '../control-tower-csv'

const mockedUpsert = upsertTextFileInFolder as jest.MockedFunction<
  typeof upsertTextFileInFolder
>

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
}) {
  const modelsBuilder = createRangeBuilder(options.models ?? [{ data: [], error: null }])
  const cardsBuilder = createRangeBuilder(options.systemCards ?? [{ data: [], error: null }])

  return {
    from: jest.fn((table: string) => {
      if (table === 'llm_system_cards') return cardsBuilder
      return modelsBuilder
    }),
    modelsBuilder,
    cardsBuilder,
  }
}

describe('Control Tower CSV', () => {
  const previousFolder = process.env.GOOGLE_DRIVE_FOLDER_CONTROL_TOWER

  afterEach(() => {
    mockedUpsert.mockReset()
    if (previousFolder == null) delete process.env.GOOGLE_DRIVE_FOLDER_CONTROL_TOWER
    else process.env.GOOGLE_DRIVE_FOLDER_CONTROL_TOWER = previousFolder
  })

  test('maps slug dashes to Hermes underscores', () => {
    expect(toHermesFileName('claude-sonnet-4-5')).toBe('claude_sonnet_4_5')
  })

  test('builds 12 columns with generated vs missing system cards', () => {
    const csv = buildControlTowerCsv([
      {
        id: 'id-generated',
        slug: 'claude-sonnet-4-5',
        model_provider: 'Anthropic',
        model_name: 'Claude Sonnet 4.5',
        updated_at: '2026-09-08T14:22:00.000Z',
        hasSystemCard: true,
      },
      {
        id: 'id-missing',
        slug: 'gpt-4o',
        model_provider: 'OpenAI',
        model_name: 'GPT-4o, flagship',
        updated_at: '2026-01-15',
        hasSystemCard: false,
      },
    ])

    const header =
      'ID Supabase,Nom de la technologie,Nom du LLM (Standard Supabase),Nom du LLM (Standard Hermes/Fichier),Statut Supabase,Statut Fiche Technique,Lien du dossier Drive cible,Lien du fichier Markdown généré,Date de dernière mise à jour (Supabase),Date de priorisation de l\'action,Action requise par Hermes,Prêt pour import'

    expect(csv).toBe(
      [
        header,
        `id-generated,Anthropic,Claude Sonnet 4.5,claude_sonnet_4_5,Importé,Générée,${CONTROL_TOWER_DRIVE_FOLDER_URL},,2026-09-08,,NONE,Déjà importé`,
        `id-missing,OpenAI,"GPT-4o, flagship",gpt_4o,Importé,Manquante,${CONTROL_TOWER_DRIVE_FOLDER_URL},,2026-01-15,,CREATE,Non`,
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
        'model-1,Anthropic,Claude Sonnet 4.5,claude_sonnet_4_5,Importé,Générée',
      ),
    })
    expect(mockedUpsert.mock.calls[0]?.[0].content).toContain(
      'model-2,OpenAI,GPT-4o,gpt_4o,Importé,Manquante',
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
})
