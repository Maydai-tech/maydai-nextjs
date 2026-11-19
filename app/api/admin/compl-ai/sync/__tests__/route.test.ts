/** @jest-environment node */

const mockGetAuthedClient = jest.fn()
const mockCascade = jest.fn()
const mockRecalcAllMaydai = jest.fn()

jest.mock('@/lib/api-auth', () => ({
  getAuthenticatedSupabaseClient: (...a: unknown[]) => mockGetAuthedClient(...a),
}))

jest.mock('@/lib/usecase-score-service', () => ({
  recalculateUseCaseScoresForModel: (...a: unknown[]) => mockCascade(...a),
}))

// Pour prouver que le recalcul maydai global a bien été retiré au profit du cascade per-modèle.
jest.mock('@/lib/maydai-calculator', () => ({
  recalculateAllMaydaiScores: (...a: unknown[]) => mockRecalcAllMaydai(...a),
}))

// Filesystem : un seul fichier de résultats avec 1 modèle + 1 benchmark scoré.
jest.mock('fs', () => ({
  __esModule: true,
  default: {
    existsSync: () => true,
    readdirSync: () => ['model1.json'],
    statSync: () => ({ isDirectory: () => false }),
    readFileSync: () =>
      JSON.stringify({
        config: { model_name: 'GPT-4', model_sha: 'sha', model_report: 'report' },
        results: { mmlu_robustness: { aggregate_score: 0.5 } },
      }),
  },
}))

import { NextRequest } from 'next/server'

let POST: typeof import('../route').POST

beforeAll(() => {
  POST = require('../route').POST
})

/**
 * Client Supabase mock : résolution par (table, opération). select→single ou await,
 * insert/update→await.
 */
function makeSupabase(overrides: Record<string, { data?: unknown; error: unknown }> = {}) {
  const defaults: Record<string, { data?: unknown; error: unknown }> = {
    'profiles:select': { data: { role: 'admin' }, error: null },
    'compl_ai_principles:select': {
      data: [{ id: 'p1', code: 'technical_robustness_safety', name: 'Tech Robustness' }],
      error: null,
    },
    'compl_ai_benchmarks:select': {
      data: [{ id: 'b1', code: 'mmlu_robustness', name: 'MMLU', description: '', principle_id: 'p1' }],
      error: null,
    },
    'compl_ai_models:select': { data: { id: 'm1' }, error: null }, // modèle existant → update
    'compl_ai_models:update': { error: null },
    'compl_ai_evaluations:select': { data: null, error: null }, // pas d'éval existante → insert
    'compl_ai_evaluations:insert': { error: null },
    'compl_ai_sync_logs:insert': { error: null },
  }
  const cfg = { ...defaults, ...overrides }

  function builder(table: string) {
    let op = 'select'
    const resolve = () => Promise.resolve(cfg[`${table}:${op}`] ?? { data: null, error: null })
    const b: Record<string, unknown> = {
      select: () => b,
      insert: () => {
        op = 'insert'
        return b
      },
      update: () => {
        op = 'update'
        return b
      },
      eq: () => b,
      single: () => resolve(),
      then: (onF: (v: unknown) => unknown, onR?: (e: unknown) => unknown) => resolve().then(onF, onR),
    }
    return b
  }

  return { from: (t: string) => builder(t) }
}

function makeRequest() {
  return new NextRequest('http://localhost/api/admin/compl-ai/sync', { method: 'POST' })
}

beforeEach(() => {
  jest.clearAllMocks()
  mockCascade.mockResolvedValue({ success_count: 2, processed_count: 2, skipped_count: 0, error_count: 0, errors: [] })
})

describe('POST /api/admin/compl-ai/sync', () => {
  test('déclenche le cascade par modèle touché et n\'appelle plus le recalcul maydai global', async () => {
    mockGetAuthedClient.mockResolvedValue({ supabase: makeSupabase(), user: { id: 'admin-1' } })

    const res = await POST(makeRequest())
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)

    // Cascade appelée une fois avec le modèle touché
    expect(mockCascade).toHaveBeenCalledTimes(1)
    expect(mockCascade).toHaveBeenCalledWith('m1')

    // Plus aucun recalcul maydai global
    expect(mockRecalcAllMaydai).not.toHaveBeenCalled()
  })

  test('une erreur de cascade ne fait pas échouer le sync', async () => {
    mockGetAuthedClient.mockResolvedValue({ supabase: makeSupabase(), user: { id: 'admin-1' } })
    mockCascade.mockRejectedValue(new Error('cascade KO'))

    const res = await POST(makeRequest())
    // Réponse renvoyée ; l'erreur de recalcul est consignée dans stats.errors
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.stats.errors.some((e: string) => e.includes('cascade KO'))).toBe(true)
  })

  test('refuse un non-admin (403) sans cascade', async () => {
    mockGetAuthedClient.mockResolvedValue({
      supabase: makeSupabase({ 'profiles:select': { data: { role: 'user' }, error: null } }),
      user: { id: 'u1' },
    })
    const res = await POST(makeRequest())
    expect(res.status).toBe(403)
    expect(mockCascade).not.toHaveBeenCalled()
  })
})
