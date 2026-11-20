/** @jest-environment node */

const mockSheetsGet = jest.fn()
const mockValuesGet = jest.fn()
const mockValuesAppend = jest.fn()
const mockBatchUpdate = jest.fn()
const mockCreateClient = jest.fn()

jest.mock('@supabase/supabase-js', () => ({
  createClient: (...args: unknown[]) => mockCreateClient(...args),
}))

jest.mock('@/lib/google-drive', () => ({
  getSheetsClient: () => ({
    spreadsheets: {
      get: (...args: unknown[]) => mockSheetsGet(...args),
      values: {
        get: (...args: unknown[]) => mockValuesGet(...args),
        append: (...args: unknown[]) => mockValuesAppend(...args),
        batchUpdate: (...args: unknown[]) => mockBatchUpdate(...args),
      },
    },
  }),
  upsertTextFileInFolder: jest.fn(),
}))

import { STATUT_FICHE_ERREUR, STATUT_FICHE_GENEREE } from '@/lib/validations/system-card'
import {
  appendMissingModelsToSheet,
  buildControlTowerSyncPlan,
  sheetFicheWrite,
  type ControlTowerModelRow,
} from '../control-tower-csv'
import {
  syncControlTowerSystemCardStatuses,
  writeControlTowerStatusesToSheet,
} from '../system-cards-import'

const HEADERS = [
  'ID Supabase',
  'Statut MaydAI',
  'Nom de la technologie',
  'Nom du LLM (Standard Supabase)',
  'Nom du LLM (Standard Hermes/Fichier)',
  "Proposé à l'utilisateur",
  "Cas d'usage déclarés",
  'Statut Fiche Technique',
  'Statut LLM',
  'Action humaine requise',
]

function model(overrides: Partial<ControlTowerModelRow> = {}): ControlTowerModelRow {
  return {
    id: '11111111-1111-4111-8111-111111111111',
    slug: 'claude-3-5-sonnet',
    model_provider: 'Anthropic',
    model_name: 'Claude 3.5 Sonnet',
    updated_at: '2026-01-01',
    hasSystemCard: false,
    llmStatus: 'Retiré',
    maydaiStatus: 'Catalogue',
    proposedToUser: 'Non',
    declaredUseCases: 0,
    ...overrides,
  }
}

describe('control-tower-fiche-sync', () => {
  test('une cellule vide reçoit Générée si une fiche existe, sinon Manquante', () => {
    expect(sheetFicheWrite('', true)).toBe('Générée')
    expect(sheetFicheWrite('   ', false)).toBe('Manquante')
  })

  test('conserve En cours, Générée et Erreur', () => {
    expect(sheetFicheWrite('En cours', true)).toBeNull()
    expect(sheetFicheWrite('Générée', false)).toBeNull()
    expect(sheetFicheWrite('Erreur : Pas de System Card publiée', true)).toBeNull()
    expect(sheetFicheWrite('Erreur : autre motif', false)).toBeNull()
  })

  test('une ligne nouvelle et une ligne existante au statut vide restent vides', () => {
    const existing = model()
    const fresh = model({
      id: '22222222-2222-4222-8222-222222222222',
      slug: 'gpt-4o',
      model_name: 'GPT-4o',
      hasSystemCard: true,
      llmStatus: 'Actif',
    })
    const plan = buildControlTowerSyncPlan({
      headers: HEADERS,
      rows: [
        HEADERS,
        [
          existing.id,
          'Catalogue',
          'Anthropic',
          'Claude 3.5 Sonnet',
          'claude_3_5_sonnet',
          'Non',
          '0',
          'En cours',
          '',
          '=formule',
        ],
      ],
      models: [existing, fresh],
    })

    expect(plan.changedCells.some((cell) => cell.column === 'Statut LLM')).toBe(false)
    expect(plan.changedCells.some((cell) => cell.column === 'Statut Fiche Technique')).toBe(false)
    expect(plan.rowsAdded).toEqual([
      {
        row: 3,
        id: fresh.id,
        modelName: 'GPT-4o',
        fiche: 'Générée',
        llmStatus: '',
      },
    ])
    expect(plan.formulasRewritten).toBe(2)
  })

  test('une cellule fiche vide est la seule écrite, pas le statut LLM vide', () => {
    const row = model({ hasSystemCard: false, llmStatus: 'Déprécié' })
    const plan = buildControlTowerSyncPlan({
      headers: HEADERS,
      rows: [
        HEADERS,
        [row.id, 'Catalogue', 'Anthropic', 'Claude 3.5 Sonnet', 'claude_3_5_sonnet', 'Non', '0', '', '', '=formule'],
      ],
      models: [row],
    })

    expect(plan.changedCells).toEqual([
      { column: 'Statut Fiche Technique', row: 2, before: '', after: 'Manquante' },
    ])
    expect(plan.rowsAdded).toEqual([])
  })
})

describe('control-tower-fiche-sync sheet writes', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost:54321'
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-key'
    process.env.GOOGLE_SHEETS_CONTROL_TOWER_ID = 'sheet-id'
    mockValuesAppend.mockResolvedValue({ data: {} })
    mockBatchUpdate.mockResolvedValue({ data: {} })
    mockSheetsGet.mockResolvedValue({
      data: { sheets: [{ properties: { sheetId: 0, title: 'Tour de contrôle', index: 0 } }] },
    })
  })

  test('une ligne ajoutée laisse Statut LLM vide et n’écrit pas Erreur', async () => {
    const headers = [
      ...HEADERS,
      "Résultat de l'import",
      'Lien du dossier Drive cible',
      'Date de dernière mise à jour (Supabase)',
      'Action requise par Hermes',
      'Prêt pour import',
    ]
    mockValuesGet.mockResolvedValue({
      data: { values: [headers] },
    })
    mockCreateClient.mockReturnValue({
      from: (table: string) => ({
        select: () => ({
          order: () => ({
            range: async () => {
              if (table === 'compl_ai_models') {
                return {
                  data: [{
                    id: '11111111-1111-4111-8111-111111111111',
                    slug: 'claude-3-5-sonnet',
                    model_provider: 'Anthropic',
                    model_name: 'Claude 3.5 Sonnet',
                    updated_at: null,
                    lifecycle_status: 'retired',
                    system_card_status: 'error_no_system_card',
                  }],
                  error: null,
                }
              }
              return { data: [], error: null }
            },
          }),
          not: () => ({
            is: () => ({
              order: () => ({
                range: async () => ({ data: [], error: null }),
              }),
            }),
          }),
        }),
      }),
    })

    await appendMissingModelsToSheet('sheet-id')

    const values = mockValuesAppend.mock.calls[0][0].requestBody.values[0] as string[]
    expect(values[headers.indexOf('Statut LLM')]).toBe('')
    expect(values[headers.indexOf('Statut Fiche Technique')]).toBe('Manquante')
  })

  test('un import réussi écrit Générée', async () => {
    mockValuesGet.mockResolvedValue({
      data: {
        values: [
          ['ID Supabase', 'Statut Fiche Technique', "Résultat de l'import", 'Prêt pour import', 'Action requise par Hermes'],
          ['aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'En cours', '', 'Oui', 'CREATE'],
        ],
      },
    })

    await writeControlTowerStatusesToSheet([
      {
        idSupabase: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        hermesName: 'claude',
        modelName: 'Claude',
        success: true,
        importedOn: '2026-11-20',
        ficheTechnique: STATUT_FICHE_GENEREE,
      },
    ])

    const data = mockBatchUpdate.mock.calls[0][0].requestBody.data as Array<{ range: string; values: string[][] }>
    expect(data).toEqual(expect.arrayContaining([
      { range: "'Tour de contrôle'!B2", values: [['Générée']] },
    ]))
  })

  test('l’erreur Pas de System Card publiée est recopiée en base', async () => {
    const eq = jest.fn(() => ({
      select: async () => ({ data: [{ id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' }], error: null }),
    }))
    const update = jest.fn(() => ({ eq }))
    const supabase = { from: jest.fn(() => ({ update })) }

    const result = await syncControlTowerSystemCardStatuses(supabase as never, [
      {
        idSupabase: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        provider: 'Anthropic',
        modelName: 'Claude',
        hermesName: 'claude',
        markdownLink: '',
        readyForImport: 'Non',
        statutFicheTechnique: STATUT_FICHE_ERREUR,
      },
      {
        idSupabase: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
        provider: 'OpenAI',
        modelName: 'GPT',
        hermesName: 'gpt',
        markdownLink: '',
        readyForImport: 'Non',
        statutFicheTechnique: 'En cours',
      },
    ])

    expect(result.errorStatusesSynced).toBe(1)
    expect(update).toHaveBeenCalledWith({ system_card_status: 'error_no_system_card' })
    expect(eq).toHaveBeenCalledWith('id', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa')
  })
})
