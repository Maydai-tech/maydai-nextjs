/** @jest-environment node */

const mockCalculateAndPersist = jest.fn()
const mockGetServiceRoleClient = jest.fn()
const mockSyncTodoActionToResponse = jest.fn()

jest.mock('@/lib/maydai-calculator', () => ({
  getServiceRoleClient: () => mockGetServiceRoleClient(),
}))

jest.mock('@/lib/usecase-score-service', () => ({
  calculateAndPersistUseCaseScore: (...args: unknown[]) => mockCalculateAndPersist(...args),
}))

jest.mock('@/lib/todo-action-sync', () => ({
  syncTodoActionToResponse: (...args: unknown[]) => mockSyncTodoActionToResponse(...args),
}))

import {
  getSystemCardPillar,
  getSystemCardPillarsByModel,
  resolveDossierStatusFromPillarFlags,
  updateDossierPillarCompletion,
} from '../system-card-service'
import { PILLAR_CODE_TO_DOC_TYPE } from '@/lib/validations/system-card'

const PILLAR_ID = '11111111-1111-4111-8111-111111111111'
const CARD_ID = '22222222-2222-4222-8222-222222222222'
const USECASE_ID = '33333333-3333-4333-8333-333333333333'
const DOSSIER_ID = '44444444-4444-4444-8444-444444444444'

const validPillar = {
  id: PILLAR_ID,
  system_card_id: CARD_ID,
  pillar_code: 'doc_technique',
  pillar_title: 'Documentation Technique',
  sections_covered: 'Abstract',
  summary: 'Résumé',
  key_points: ['Point A'],
  ai_act_compliance: [
    {
      exigence: 'Documentation technique',
      article: 'Art. 53',
      application: 'Remplie',
      status: 'COMPLIANT',
    },
  ],
  recommendations: {
    fournisseur: 'Archiver',
    integrateur: 'Filigrane',
    deployeur: 'Encadrer',
  },
  llm_system_cards: { model_identifier: 'claude-sonnet-4-5' },
}

function createPillarsQuery(result: { data: unknown; error: unknown }) {
  const chain: Record<string, jest.Mock> = {}
  chain.select = jest.fn(() => chain)
  chain.eq = jest.fn(() => chain)
  chain.maybeSingle = jest.fn(async () => result)
  return chain
}

function createDocumentsQuery(options: {
  existing?: Record<string, unknown> | null
  existingError?: { message: string } | null
  upsertError?: { message: string } | null
}) {
  const chain: Record<string, jest.Mock> = {}
  chain.select = jest.fn(() => chain)
  chain.eq = jest.fn(() => chain)
  chain.maybeSingle = jest.fn(async () => ({
    data: options.existing ?? null,
    error: options.existingError ?? null,
  }))
  chain.upsert = jest.fn(async () => ({ error: options.upsertError ?? null }))
  return chain
}

describe('resolveDossierStatusFromPillarFlags', () => {
  test('complete seulement si les deux flags sont vrais', () => {
    expect(resolveDossierStatusFromPillarFlags(true, true)).toBe('complete')
    expect(resolveDossierStatusFromPillarFlags(true, false)).toBe('incomplete')
    expect(resolveDossierStatusFromPillarFlags(false, true)).toBe('incomplete')
    expect(resolveDossierStatusFromPillarFlags(false, false)).toBe('incomplete')
  })
})

describe('getSystemCardPillar', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('retourne le pilier validé par Zod', async () => {
    const query = createPillarsQuery({ data: validPillar, error: null })
    mockGetServiceRoleClient.mockReturnValue({
      from: jest.fn(() => query),
    })

    const result = await getSystemCardPillar('claude-sonnet-4-5', 'doc_technique')

    expect(result).toMatchObject({
      id: PILLAR_ID,
      pillar_code: 'doc_technique',
      pillar_title: 'Documentation Technique',
    })
    expect(result).not.toHaveProperty('llm_system_cards')
  })

  test('retourne null si le pilier est inconnu ou absent', async () => {
    expect(await getSystemCardPillar('claude-sonnet-4-5', 'inconnu')).toBeNull()

    const query = createPillarsQuery({ data: null, error: null })
    mockGetServiceRoleClient.mockReturnValue({ from: jest.fn(() => query) })
    expect(await getSystemCardPillar('claude-sonnet-4-5', 'doc_technique')).toBeNull()
  })

  test('retourne null si Zod échoue', async () => {
    const query = createPillarsQuery({
      data: { ...validPillar, id: 'not-a-uuid' },
      error: null,
    })
    mockGetServiceRoleClient.mockReturnValue({ from: jest.fn(() => query) })

    await expect(getSystemCardPillar('claude-sonnet-4-5', 'doc_technique')).resolves.toBeNull()
  })
})

describe('getSystemCardPillarsByModel', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('retourne les piliers validés dans l’ordre canonique', async () => {
    const surveillance = {
      ...validPillar,
      id: '55555555-5555-4555-8555-555555555555',
      pillar_code: 'surveillance_plan',
      pillar_title: 'Surveillance',
    }
    const chain: Record<string, jest.Mock> = {}
    chain.select = jest.fn(() => chain)
    chain.eq = jest.fn(async () => ({ data: [surveillance, validPillar], error: null }))
    mockGetServiceRoleClient.mockReturnValue({ from: jest.fn(() => chain) })

    const result = await getSystemCardPillarsByModel('claude-sonnet-4-5')
    expect(result.map((p) => p.pillar_code)).toEqual(['doc_technique', 'surveillance_plan'])
  })
})

describe('updateDossierPillarCompletion', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockCalculateAndPersist.mockResolvedValue({})
    mockSyncTodoActionToResponse.mockResolvedValue({
      changed: true,
      shouldRecalculate: true,
      previousValue: 'E5.N9.Q4.B',
      expectedPointsGained: 5,
    })
  })

  test('upsert sur le doc_type canonique et statut complete à 100 %', async () => {
    const docs = createDocumentsQuery({
      existing: {
        system_card_pillar_id: PILLAR_ID,
        maydai_prefill_applied: true,
        user_completion_applied: false,
      },
    })
    mockGetServiceRoleClient.mockReturnValue({
      from: jest.fn(() => docs),
    })

    const result = await updateDossierPillarCompletion({
      usecaseId: USECASE_ID,
      dossierId: DOSSIER_ID,
      pillarCode: 'doc_technique',
      applyUserCompletion: true,
      pillarId: PILLAR_ID,
    })

    expect(result).toMatchObject({ success: true, newStatus: 'complete' })
    expect(docs.eq).toHaveBeenCalledWith('doc_type', PILLAR_CODE_TO_DOC_TYPE.doc_technique)
    expect(docs.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        dossier_id: DOSSIER_ID,
        doc_type: 'technical_documentation',
        maydai_prefill_applied: true,
        user_completion_applied: true,
        status: 'complete',
      }),
      { onConflict: 'dossier_id,doc_type' }
    )
    expect(mockCalculateAndPersist).toHaveBeenCalledWith({
      client: expect.anything(),
      usecaseId: USECASE_ID,
      actorUserId: null,
    })
  })

  test('reste incomplete à 50 % (enum doc_status sans partially_completed)', async () => {
    const docs = createDocumentsQuery({ existing: null })
    mockGetServiceRoleClient.mockReturnValue({ from: jest.fn(() => docs) })

    const result = await updateDossierPillarCompletion({
      usecaseId: USECASE_ID,
      dossierId: DOSSIER_ID,
      pillarCode: 'data_governance',
      applyMaydaiPrefill: true,
    })

    expect(result.newStatus).toBe('incomplete')
    expect(docs.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        doc_type: 'data_quality',
        maydai_prefill_applied: true,
        user_completion_applied: false,
        status: 'incomplete',
      }),
      expect.anything()
    )
  })

  test('rejette un pillar_code hors contrat', async () => {
    await expect(
      updateDossierPillarCompletion({
        usecaseId: USECASE_ID,
        dossierId: DOSSIER_ID,
        pillarCode: 'doc_technique_legacy',
      })
    ).rejects.toThrow('Pilier inconnu')
    expect(mockGetServiceRoleClient).not.toHaveBeenCalled()
  })

  test('synchronise la question déclarative seulement à 100 % des deux flags', async () => {
    const docs = createDocumentsQuery({
      existing: {
        system_card_pillar_id: PILLAR_ID,
        maydai_prefill_applied: true,
        user_completion_applied: false,
      },
    })
    mockGetServiceRoleClient.mockReturnValue({ from: jest.fn(() => docs) })

    await updateDossierPillarCompletion({
      usecaseId: USECASE_ID,
      dossierId: DOSSIER_ID,
      pillarCode: 'doc_technique',
      applyUserCompletion: true,
    })

    expect(mockSyncTodoActionToResponse).toHaveBeenCalledWith(
      expect.anything(),
      USECASE_ID,
      'technical_documentation',
      'system-card'
    )
    expect(mockCalculateAndPersist).toHaveBeenCalled()
  })

  test('ne synchronise pas la question déclarative à 50 %', async () => {
    const docs = createDocumentsQuery({ existing: null })
    mockGetServiceRoleClient.mockReturnValue({ from: jest.fn(() => docs) })

    await updateDossierPillarCompletion({
      usecaseId: USECASE_ID,
      dossierId: DOSSIER_ID,
      pillarCode: 'data_governance',
      applyMaydaiPrefill: true,
    })

    expect(mockSyncTodoActionToResponse).not.toHaveBeenCalled()
    expect(mockCalculateAndPersist).toHaveBeenCalled()
  })
})
