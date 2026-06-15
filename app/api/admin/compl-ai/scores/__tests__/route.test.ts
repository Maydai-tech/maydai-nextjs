/** @jest-environment node */

const mockGetAuthedClient = jest.fn()
const mockCascade = jest.fn()

jest.mock('@/lib/api-auth', () => ({
  getAuthenticatedSupabaseClient: (...a: unknown[]) => mockGetAuthedClient(...a),
}))

jest.mock('@/lib/usecase-score-service', () => ({
  recalculateUseCaseScoresForModel: (...a: unknown[]) => mockCascade(...a),
}))

import { NextRequest } from 'next/server'

let POST: typeof import('../route').POST
let PUT: typeof import('../route').PUT

beforeAll(() => {
  const route = require('../route')
  POST = route.POST
  PUT = route.PUT
})

/**
 * Construit un client Supabase mock : les terminaux `.single()` sont résolus en
 * fonction de (table, opération). `insert`/`update` passent l'op à 'insert'/'update'.
 */
function makeSupabase(overrides: Record<string, { data: unknown; error: unknown }> = {}) {
  const defaults: Record<string, { data: unknown; error: unknown }> = {
    'profiles:select': { data: { role: 'admin' }, error: null },
    'compl_ai_models:select': { data: { id: 'm1' }, error: null },
    'compl_ai_benchmarks:select': { data: { id: 'b1', name: 'B', principle_id: 'p1' }, error: null },
    'compl_ai_evaluations:select': { data: null, error: null }, // pas d'évaluation existante
    'compl_ai_evaluations:insert': { data: { id: 'e1' }, error: null },
    'compl_ai_evaluations:update': { data: { id: 'e1' }, error: null },
  }
  const cfg = { ...defaults, ...overrides }

  function builder(table: string) {
    let op = 'select'
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
      single: () => Promise.resolve(cfg[`${table}:${op}`] ?? { data: null, error: null }),
    }
    return b
  }

  return { from: (t: string) => builder(t) }
}

function jsonRequest(body: unknown) {
  return new NextRequest('http://localhost/api/admin/compl-ai/scores', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  jest.clearAllMocks()
  mockCascade.mockResolvedValue({ success_count: 1 })
})

describe('POST /api/admin/compl-ai/scores', () => {
  test('crée l\'évaluation puis déclenche le recalcul automatique du modèle', async () => {
    mockGetAuthedClient.mockResolvedValue({ supabase: makeSupabase(), user: { id: 'admin-1' } })

    const res = await POST(jsonRequest({ modelId: 'm1', benchmarkCode: 'B1', score: 0.8 }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(mockCascade).toHaveBeenCalledWith('m1')
    expect(body.recalc_warning).toBeUndefined()
  })

  test('une erreur de cascade ne fait pas échouer la création (recalc_warning renvoyé)', async () => {
    mockGetAuthedClient.mockResolvedValue({ supabase: makeSupabase(), user: { id: 'admin-1' } })
    mockCascade.mockRejectedValue(new Error('cascade KO'))

    const res = await POST(jsonRequest({ modelId: 'm1', benchmarkCode: 'B1', score: 0.8 }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.recalc_warning).toBe('cascade KO')
  })

  test('refuse un non-admin (403) sans déclencher de cascade', async () => {
    mockGetAuthedClient.mockResolvedValue({
      supabase: makeSupabase({ 'profiles:select': { data: { role: 'user' }, error: null } }),
      user: { id: 'u1' },
    })
    const res = await POST(jsonRequest({ modelId: 'm1', benchmarkCode: 'B1', score: 0.8 }))
    expect(res.status).toBe(403)
    expect(mockCascade).not.toHaveBeenCalled()
  })
})

describe('PUT /api/admin/compl-ai/scores', () => {
  test('met à jour via evaluation_id puis déclenche la cascade', async () => {
    mockGetAuthedClient.mockResolvedValue({ supabase: makeSupabase(), user: { id: 'admin-1' } })

    const req = new NextRequest('http://localhost/api/admin/compl-ai/scores', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ modelId: 'm1', benchmarkCode: 'B1', score: 0.5, evaluation_id: 'e1' }),
    })
    const res = await PUT(req)
    expect(res.status).toBe(200)
    expect(mockCascade).toHaveBeenCalledWith('m1')
  })
})
