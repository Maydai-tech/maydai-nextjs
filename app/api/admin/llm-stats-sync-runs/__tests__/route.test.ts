/** @jest-environment node */

process.env.NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321'
process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'service-key'

const mockLimit = jest.fn()
const mockOrder = jest.fn(() => ({ limit: mockLimit }))
const mockSelect = jest.fn(() => ({ order: mockOrder }))
const mockFrom = jest.fn(() => ({ select: mockSelect }))
const mockCreateClient = jest.fn(() => ({ from: mockFrom }))
const mockVerifyAdminAuth = jest.fn()

jest.mock('@supabase/supabase-js', () => ({
  createClient: (...args: unknown[]) => mockCreateClient(...args),
}))

jest.mock('@/lib/admin-auth', () => ({
  verifyAdminAuth: (...args: unknown[]) => mockVerifyAdminAuth(...args),
}))

import { NextRequest, NextResponse } from 'next/server'

let GET: typeof import('../route').GET

beforeAll(() => {
  GET = require('../route').GET
})

beforeEach(() => {
  jest.clearAllMocks()
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost:54321'
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-key'
  mockVerifyAdminAuth.mockResolvedValue({
    user: { id: 'admin-id', email: 'admin@example.com', role: 'admin' },
  })
  mockLimit.mockResolvedValue({
    data: [
      {
        id: 'run-1',
        started_at: '2026-07-11T10:00:00.000Z',
        finished_at: '2026-07-11T10:00:01.000Z',
        status: 'success',
        models_fetched: 2,
        models_created: 1,
        models_updated: 1,
        models_unchanged: 0,
        created_models: [],
        updated_models: [],
        errors: [],
        email_sent: true,
        failure_email_sent: false,
        execution_time_ms: 1000,
        created_at: '2026-07-11T10:00:01.000Z',
      },
    ],
    error: null,
  })
})

function makeRequest(path = 'http://localhost/api/admin/llm-stats-sync-runs') {
  return new NextRequest(path, {
    headers: {
      authorization: 'Bearer admin-token',
    },
  })
}

describe('GET /api/admin/llm-stats-sync-runs', () => {
  test('returns 401 when admin auth fails', async () => {
    mockVerifyAdminAuth.mockResolvedValueOnce({
      error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    })

    const response = await GET(makeRequest())

    expect(response.status).toBe(401)
    expect(mockCreateClient).not.toHaveBeenCalled()
  })

  test('returns latest runs with a capped limit', async () => {
    const response = await GET(makeRequest('http://localhost/api/admin/llm-stats-sync-runs?limit=500'))

    expect(response.status).toBe(200)
    expect(mockCreateClient).toHaveBeenCalledWith('http://localhost:54321', 'service-key')
    expect(mockFrom).toHaveBeenCalledWith('llm_stats_sync_runs')
    expect(mockOrder).toHaveBeenCalledWith('started_at', { ascending: false })
    expect(mockLimit).toHaveBeenCalledWith(100)
    expect(await response.json()).toMatchObject({
      runs: [
        {
          id: 'run-1',
          status: 'success',
          models_fetched: 2,
          email_sent: true,
        },
      ],
    })
  })

  test('returns 500 when Supabase query fails', async () => {
    mockLimit.mockResolvedValueOnce({
      data: null,
      error: { message: 'relation does not exist' },
    })

    const response = await GET(makeRequest())

    expect(response.status).toBe(500)
    expect(await response.json()).toMatchObject({
      error: "Impossible de récupérer l'historique du cron LLM Stats",
    })
  })
})
