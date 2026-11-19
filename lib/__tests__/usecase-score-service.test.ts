/** @jest-environment node */

process.env.NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321'
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'anon-key'
process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'service-key'

// --- Mocks des dépendances de calcul (on teste l'orchestration, pas le scoring) ---
const mockCalculateBaseScore = jest.fn()
const mockCalculateFinalScore = jest.fn()
const mockDetermineCompanyStatus = jest.fn((..._a: unknown[]) => 'utilisateur')
const mockRecordHistory = jest.fn(async (..._a: unknown[]) => ({ success: true }))
const mockRecalculateModelMaydaiScores = jest.fn(async (..._a: unknown[]) => ({}))

jest.mock('@/lib/score-calculator-simple', () => ({
  calculateBaseScore: (...a: unknown[]) => mockCalculateBaseScore(...a),
  calculateFinalScore: (...a: unknown[]) => mockCalculateFinalScore(...a),
  determineCompanyStatus: (...a: unknown[]) => mockDetermineCompanyStatus(...a),
  getCompanyStatusDefinition: () => 'Définition statut',
  COMPL_AI_MULTIPLIER: 20,
}))

jest.mock('@/lib/merge-checklist-into-user-responses', () => ({
  // Pour ces tests, la fusion renvoie simplement les réponses brutes.
  mergeChecklistIntoDbResponseRows: (rows: unknown[]) => rows,
}))

jest.mock('@/lib/usecase-history', () => ({
  recordUseCaseHistory: (...a: unknown[]) => mockRecordHistory(...a),
}))

jest.mock('@/lib/risk-level', () => ({
  deriveRiskLevelFromResponses: () => 'minimal',
}))

jest.mock('@/lib/questionnaire-version', () => ({
  normalizeQuestionnaireVersion: (v: unknown) => v,
  QUESTIONNAIRE_VERSION_V2: 2,
  QUESTIONNAIRE_VERSION_V3: 3,
}))

jest.mock('@/lib/scoring-v2-server', () => ({
  buildV2ScoringContextFromDbResponses: jest.fn(),
  dbResponsesToQuestionnaireAnswers: jest.fn(() => ({})),
}))

jest.mock('@/lib/scoring-v3-server', () => ({
  buildV3ScoringContextFromDbResponses: jest.fn(),
}))

jest.mock('@/lib/qualification-v3-decision', () => ({
  resolveQualificationOutcomeV3: jest.fn(),
}))

// getServiceRoleClient renvoie notre client mock ; recalculateModelMaydaiScores est neutralisé.
let sharedClient: ReturnType<typeof createClientMock>
jest.mock('@/lib/maydai-calculator', () => ({
  getServiceRoleClient: () => sharedClient,
  recalculateModelMaydaiScores: (...a: unknown[]) => mockRecalculateModelMaydaiScores(...a),
}))

import {
  calculateAndPersistUseCaseScore,
  recalculateUseCaseScoresForModel,
  UseCaseScoreError,
} from '@/lib/usecase-score-service'

// --- Client Supabase mock programmable ---
interface UseCaseCfg {
  usecase?: Record<string, unknown> | null
  prevScore?: { score_final: number | null; risk_level: string | null }
  responses?: unknown[]
  evaluations?: Array<{ score: number; principle_id: string }>
  updateError?: { message: string; hint?: string } | null
}

interface ClientCfg {
  byId: Record<string, UseCaseCfg>
  modelUsecases?: Array<{ id: string }>
}

function createClientMock(cfg: ClientCfg) {
  const updates: Array<{ id: unknown; payload: Record<string, unknown> }> = []

  function resolve(state: {
    table: string
    op: string
    selectArg: string | null
    filters: Record<string, unknown>
    payload: Record<string, unknown> | null
  }) {
    const { table, op, selectArg, filters, payload } = state

    if (table === 'usecases' && op === 'update') {
      updates.push({ id: filters.id, payload: payload || {} })
      const err = cfg.byId[String(filters.id)]?.updateError ?? null
      return { error: err }
    }

    if (table === 'usecases' && op === 'select') {
      if (filters.primary_model_id !== undefined) {
        return { data: cfg.modelUsecases ?? [], error: null }
      }
      const entry = cfg.byId[String(filters.id)]
      if (selectArg && selectArg.includes('questionnaire_version')) {
        if (!entry || entry.usecase === null || entry.usecase === undefined) {
          return { data: null, error: { message: 'not found' } }
        }
        return { data: entry.usecase, error: null }
      }
      // sélection score_final / risk_level
      return { data: entry?.prevScore ?? { score_final: null, risk_level: null }, error: null }
    }

    if (table === 'usecase_responses') {
      const entry = cfg.byId[String(filters.usecase_id)]
      return { data: entry?.responses ?? [], error: null }
    }

    if (table === 'compl_ai_evaluations') {
      // évaluations renvoyées indépendamment du modèle pour la simplicité des tests
      const all = Object.values(cfg.byId).flatMap((e) => e.evaluations ?? [])
      return { data: all, error: null }
    }

    return { data: null, error: null }
  }

  function makeBuilder(table: string) {
    const state = {
      table,
      op: 'select',
      selectArg: null as string | null,
      filters: {} as Record<string, unknown>,
      payload: null as Record<string, unknown> | null,
    }
    const builder: Record<string, unknown> = {
      select(arg: string) {
        if (state.op !== 'update') state.op = 'select'
        state.selectArg = arg
        return builder
      },
      update(p: Record<string, unknown>) {
        state.op = 'update'
        state.payload = p
        return builder
      },
      eq(col: string, val: unknown) {
        state.filters[col] = val
        return builder
      },
      not() {
        return builder
      },
      limit() {
        return builder
      },
      order() {
        return builder
      },
      single() {
        return Promise.resolve(resolve(state))
      },
      maybeSingle() {
        return Promise.resolve(resolve(state))
      },
      then(onF: (v: unknown) => unknown, onR?: (e: unknown) => unknown) {
        return Promise.resolve(resolve(state)).then(onF, onR)
      },
    }
    return builder
  }

  return {
    from: (t: string) => makeBuilder(t),
    __updates: updates,
  }
}

function baseFinalResult(id: string) {
  return {
    success: true,
    usecase_id: id,
    scores: {
      score_base: 85,
      score_model: 12,
      score_final: 73,
      is_eliminated: false,
      elimination_reason: '',
    },
    calculation_details: {},
  }
}

beforeEach(() => {
  jest.clearAllMocks()
  mockDetermineCompanyStatus.mockReturnValue('utilisateur')
  mockCalculateBaseScore.mockReturnValue({
    score_base: 85,
    is_eliminated: false,
    elimination_reason: '',
    calculation_details: { base_score: 90, total_impact: -5, final_base_score: 85 },
  })
})

describe('calculateAndPersistUseCaseScore', () => {
  test('happy path : calcule, persiste et enregistre l\'historique (acteur défini)', async () => {
    mockCalculateFinalScore.mockReturnValue(baseFinalResult('uc1'))
    const client = createClientMock({
      byId: {
        uc1: {
          usecase: { company_id: 'c1', questionnaire_version: 1, primary_model_id: null },
          responses: [{ question_code: 'Q1', single_value: 'A' }],
        },
      },
    })

    const result = await calculateAndPersistUseCaseScore({
      client: client as never,
      usecaseId: 'uc1',
      actorUserId: 'user-1',
    })

    expect(result.finalResult.scores.score_final).toBe(73)
    expect(result.company_status).toBe('utilisateur')
    expect(result.risk_level).toBe('minimal')

    const upd = client.__updates[0]
    expect(upd.payload.score_final).toBe(73)
    expect(upd.payload.score_base).toBe(85)
    expect(upd.payload.score_model).toBe(12)
    expect(upd.payload.updated_by).toBe('user-1')
    expect(mockRecordHistory).toHaveBeenCalledTimes(1)
  })

  test('recalcul automatique (acteur null) : pas d\'historique, updated_by omis', async () => {
    mockCalculateFinalScore.mockReturnValue(baseFinalResult('uc1'))
    const client = createClientMock({
      byId: {
        uc1: {
          usecase: { company_id: 'c1', questionnaire_version: 1, primary_model_id: null },
          responses: [{ question_code: 'Q1', single_value: 'A' }],
        },
      },
    })

    await calculateAndPersistUseCaseScore({
      client: client as never,
      usecaseId: 'uc1',
      actorUserId: null,
    })

    const upd = client.__updates[0]
    expect(upd.payload).not.toHaveProperty('updated_by')
    expect(mockRecordHistory).not.toHaveBeenCalled()
  })

  test('use case introuvable => UseCaseScoreError 404', async () => {
    const client = createClientMock({ byId: { uc1: { usecase: null } } })
    await expect(
      calculateAndPersistUseCaseScore({ client: client as never, usecaseId: 'uc1', actorUserId: 'u' })
    ).rejects.toMatchObject({ status: 404 })
  })

  test('aucune réponse => UseCaseScoreError 404 noInput', async () => {
    const client = createClientMock({
      byId: {
        uc1: {
          usecase: { company_id: 'c1', questionnaire_version: 1, primary_model_id: null },
          responses: [],
        },
      },
    })
    await expect(
      calculateAndPersistUseCaseScore({ client: client as never, usecaseId: 'uc1', actorUserId: 'u' })
    ).rejects.toMatchObject({ status: 404, noInput: true })
  })

  test('path_mode=short sur questionnaire non-V3 => 400', async () => {
    const client = createClientMock({
      byId: {
        uc1: {
          usecase: { company_id: 'c1', questionnaire_version: 2, primary_model_id: null },
          responses: [{ question_code: 'Q1' }],
        },
      },
    })
    await expect(
      calculateAndPersistUseCaseScore({
        client: client as never,
        usecaseId: 'uc1',
        actorUserId: 'u',
        requestPathMode: 'short',
      })
    ).rejects.toMatchObject({ status: 400 })
  })

  test('échec d\'update => UseCaseScoreError 500 avec details', async () => {
    mockCalculateFinalScore.mockReturnValue(baseFinalResult('uc1'))
    const client = createClientMock({
      byId: {
        uc1: {
          usecase: { company_id: 'c1', questionnaire_version: 1, primary_model_id: null },
          responses: [{ question_code: 'Q1' }],
          updateError: { message: 'colonne manquante', hint: 'vérifier le schéma' },
        },
      },
    })
    await expect(
      calculateAndPersistUseCaseScore({ client: client as never, usecaseId: 'uc1', actorUserId: 'u' })
    ).rejects.toMatchObject({ status: 500, message: 'colonne manquante', details: 'vérifier le schéma' })
  })
})

describe('recalculateUseCaseScoresForModel (cascade service-role)', () => {
  test('rafraîchit le maydai_score puis recalcule chaque use case, avec isolation d\'erreur et skip', async () => {
    mockCalculateFinalScore.mockReturnValue(baseFinalResult('x'))
    sharedClient = createClientMock({
      modelUsecases: [{ id: 'ok' }, { id: 'skip' }, { id: 'boom' }],
      byId: {
        ok: {
          usecase: { company_id: 'c1', questionnaire_version: 1, primary_model_id: 'm1' },
          responses: [{ question_code: 'Q1' }],
        },
        skip: {
          usecase: { company_id: 'c2', questionnaire_version: 1, primary_model_id: 'm1' },
          responses: [], // pas de réponses => skip
        },
        boom: {
          usecase: { company_id: 'c3', questionnaire_version: 1, primary_model_id: 'm1' },
          responses: [{ question_code: 'Q1' }],
          updateError: { message: 'échec update' },
        },
      },
    })

    const summary = await recalculateUseCaseScoresForModel('m1')

    expect(mockRecalculateModelMaydaiScores).toHaveBeenCalledWith('m1')
    expect(summary.model_id).toBe('m1')
    expect(summary.processed_count).toBe(3)
    expect(summary.success_count).toBe(1)
    expect(summary.skipped_count).toBe(1)
    expect(summary.error_count).toBe(1)
    expect(summary.errors[0].usecase_id).toBe('boom')
  })

  test('un échec du recalcul maydai n\'empêche pas la cascade des use cases', async () => {
    mockRecalculateModelMaydaiScores.mockRejectedValueOnce(new Error('maydai down'))
    mockCalculateFinalScore.mockReturnValue(baseFinalResult('ok'))
    sharedClient = createClientMock({
      modelUsecases: [{ id: 'ok' }],
      byId: {
        ok: {
          usecase: { company_id: 'c1', questionnaire_version: 1, primary_model_id: 'm1' },
          responses: [{ question_code: 'Q1' }],
        },
      },
    })

    const summary = await recalculateUseCaseScoresForModel('m1')
    expect(summary.success_count).toBe(1)
  })
})

describe('UseCaseScoreError', () => {
  test('porte status, details et noInput', () => {
    const e = new UseCaseScoreError('msg', 404, { details: 'd', noInput: true })
    expect(e.status).toBe(404)
    expect(e.details).toBe('d')
    expect(e.noInput).toBe(true)
  })
})
