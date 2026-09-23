/** @jest-environment node */

process.env.NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321'
process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'service-key'

const mockVerifyAdminAuth = jest.fn()
const mockFrom = jest.fn()
const mockCreateClient = jest.fn(() => ({ from: mockFrom }))
const mockRecalculate = jest.fn()

jest.mock('@supabase/supabase-js', () => ({
  createClient: (...args: unknown[]) => mockCreateClient(...args),
}))

jest.mock('@/lib/admin-auth', () => ({
  verifyAdminAuth: (...args: unknown[]) => mockVerifyAdminAuth(...args),
}))

jest.mock('@/lib/usecase-score-service', () => ({
  recalculateUseCaseScoresForModel: (...args: unknown[]) => mockRecalculate(...args),
}))

import { NextRequest, NextResponse } from 'next/server'

let POST: typeof import('../route').POST

beforeAll(() => {
  POST = require('../route').POST
})

beforeEach(() => {
  jest.clearAllMocks()
  mockVerifyAdminAuth.mockResolvedValue({
    user: { id: 'admin-id', email: 'admin@example.com', role: 'admin' },
  })
  mockRecalculate.mockResolvedValue({ success_count: 0 })
})

function makeRequest(body: unknown) {
  return new NextRequest('http://localhost/api/admin/compl-ai/import-csv', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/admin/compl-ai/import-csv', () => {
  test('returns 401 when admin auth fails', async () => {
    mockVerifyAdminAuth.mockResolvedValueOnce({
      error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    })

    const response = await POST(makeRequest({ csvData: [] }))
    expect(response.status).toBe(401)
  })

  test('returns 422 instead of a fake success when every row is rejected', async () => {
    mockFrom.mockImplementation(() => ({
      select: () => Promise.resolve({ data: [], error: null }),
    }))

    const response = await POST(
      makeRequest({
        csvData: [{ 'Nom du Modèle': '', 'Principe Code': '', 'Benchmark Code': '' }],
        updateMode: 'update',
      }),
    )
    const payload = await response.json()

    expect(response.status).toBe(422)
    expect(payload.success).toBe(false)
    expect(payload.message).toContain('aucun score enregistré')
    expect(payload.error).toContain('aucun score enregistré')
  })
})
