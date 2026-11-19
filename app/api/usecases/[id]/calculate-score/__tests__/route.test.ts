/** @jest-environment node */

process.env.NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321'
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'anon-key'

const mockGetUser = jest.fn()
const mockCalculate = jest.fn()

// Client Supabase mock : auth.getUser + lectures usecases / user_companies
let usecaseRow: { data: unknown; error: unknown }
let userCompanyRow: { data: unknown; error: unknown }

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    auth: { getUser: (...a: unknown[]) => mockGetUser(...a) },
    from: (table: string) => {
      const builder: Record<string, unknown> = {
        select: () => builder,
        eq: () => builder,
        single: () =>
          Promise.resolve(table === 'usecases' ? usecaseRow : userCompanyRow),
      }
      return builder
    },
  })),
}))

// On fournit une vraie classe d'erreur pour que `instanceof` fonctionne dans le route.
class MockUseCaseScoreError extends Error {
  status: number
  details?: string
  noInput: boolean
  constructor(message: string, status: number, options?: { details?: string; noInput?: boolean }) {
    super(message)
    this.status = status
    this.details = options?.details
    this.noInput = options?.noInput ?? false
  }
}

jest.mock('@/lib/usecase-score-service', () => ({
  calculateAndPersistUseCaseScore: (...a: unknown[]) => mockCalculate(...a),
  UseCaseScoreError: MockUseCaseScoreError,
}))

import { NextRequest } from 'next/server'

let POST: typeof import('../route').POST

beforeAll(() => {
  POST = require('../route').POST
})

function makeRequest(withAuth = true) {
  const headers: Record<string, string> = {}
  if (withAuth) headers.authorization = 'Bearer test-token'
  return new NextRequest('http://localhost/api/usecases/uc1/calculate-score', {
    method: 'POST',
    headers,
  })
}

const params = Promise.resolve({ id: 'uc1' })

beforeEach(() => {
  jest.clearAllMocks()
  usecaseRow = { data: { company_id: 'c1' }, error: null }
  userCompanyRow = { data: { company_id: 'c1' }, error: null }
})

describe('POST /api/usecases/[id]/calculate-score', () => {
  test('401 sans header d\'autorisation', async () => {
    const res = await POST(makeRequest(false), { params })
    expect(res.status).toBe(401)
    expect(mockCalculate).not.toHaveBeenCalled()
  })

  test('401 si token invalide', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'bad' } })
    const res = await POST(makeRequest(), { params })
    expect(res.status).toBe(401)
  })

  test('403 si l\'utilisateur n\'a pas accès à la company', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null })
    userCompanyRow = { data: null, error: { message: 'none' } }
    const res = await POST(makeRequest(), { params })
    expect(res.status).toBe(403)
    expect(mockCalculate).not.toHaveBeenCalled()
  })

  test('200 : préserve la forme de réponse historique (scores.score_final + statut)', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null })
    mockCalculate.mockResolvedValue({
      finalResult: {
        success: true,
        usecase_id: 'uc1',
        scores: { score_base: 85, score_model: 12, score_final: 73, is_eliminated: false, elimination_reason: '' },
        calculation_details: {},
      },
      company_status: 'utilisateur',
      company_status_definition: 'def',
      classification_status: 'qualified',
      risk_level: 'minimal',
    })

    const res = await POST(makeRequest(), { params })
    expect(res.status).toBe(200)
    const body = await res.json()
    // contrat consommé par recalculateScoreAndGetChange (todo-action-sync)
    expect(body.scores.score_final).toBe(73)
    expect(body.company_status).toBe('utilisateur')
    expect(body.company_status_definition).toBe('def')
    expect(body.classification_status).toBe('qualified')
    expect(body.risk_level).toBe('minimal')
    expect(mockCalculate).toHaveBeenCalledWith(
      expect.objectContaining({ usecaseId: 'uc1', actorUserId: 'u1', recordHistory: true })
    )
  })

  test('mappe UseCaseScoreError sur son code HTTP', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null })
    mockCalculate.mockRejectedValue(new MockUseCaseScoreError('Aucune réponse', 404, { noInput: true }))
    const res = await POST(makeRequest(), { params })
    expect(res.status).toBe(404)
    expect((await res.json()).error).toBe('Aucune réponse')
  })
})
