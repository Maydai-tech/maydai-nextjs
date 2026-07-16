/** @jest-environment node */

process.env.NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321'
process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'service-key'
process.env.LLM_STATS_API_KEY = process.env.LLM_STATS_API_KEY || 'llm-stats-key'

const mockInsert = jest.fn(async () => ({ error: null }))
const mockFrom = jest.fn(() => ({ insert: mockInsert }))
const mockCreateClient = jest.fn(() => ({ from: mockFrom }))
const mockVerifyAdminAuth = jest.fn()
const mockSyncLlmStatsModels = jest.fn()
const mockSendLlmStatsSyncReportEmail = jest.fn()
const mockSendLlmStatsSyncFailureEmail = jest.fn()

jest.mock('@supabase/supabase-js', () => ({
  createClient: (...args: unknown[]) => mockCreateClient(...args),
}))

jest.mock('@/lib/admin-auth', () => ({
  verifyAdminAuth: (...args: unknown[]) => mockVerifyAdminAuth(...args),
}))

jest.mock('@/lib/bench-llm/llm-stats-sync', () => ({
  syncLlmStatsModels: (...args: unknown[]) => mockSyncLlmStatsModels(...args),
}))

jest.mock('@/lib/email/mailjet', () => ({
  sendLlmStatsSyncReportEmail: (...args: unknown[]) => mockSendLlmStatsSyncReportEmail(...args),
  sendLlmStatsSyncFailureEmail: (...args: unknown[]) => mockSendLlmStatsSyncFailureEmail(...args),
}))

import { NextRequest, NextResponse } from 'next/server'

let POST: typeof import('../route').POST

beforeAll(() => {
  POST = require('../route').POST
})

beforeEach(() => {
  jest.clearAllMocks()
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost:54321'
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-key'
  process.env.LLM_STATS_API_KEY = 'llm-stats-key'
  mockVerifyAdminAuth.mockResolvedValue({
    user: { id: 'admin-id', email: 'admin@example.com', role: 'admin' },
  })
  mockSendLlmStatsSyncReportEmail.mockResolvedValue({ success: true })
  mockSendLlmStatsSyncFailureEmail.mockResolvedValue({ success: true })
})

function makeRequest() {
  return new NextRequest('http://localhost/api/admin/llm-stats-sync-runs', {
    method: 'POST',
    headers: {
      authorization: 'Bearer admin-token',
    },
  })
}

describe('POST /api/admin/llm-stats-sync-runs', () => {
  test('returns 401 when admin auth fails', async () => {
    mockVerifyAdminAuth.mockResolvedValueOnce({
      error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    })

    const response = await POST(makeRequest())

    expect(response.status).toBe(401)
    expect(mockSyncLlmStatsModels).not.toHaveBeenCalled()
  })

  test('runs the sync manually and records history', async () => {
    const result = {
      success: true,
      startedAt: '2026-07-11T10:00:00.000Z',
      finishedAt: '2026-07-11T10:00:01.000Z',
      durationMs: 1000,
      modelsFetched: 2,
      modelsCreated: 1,
      modelsUpdated: 1,
      modelsUnchanged: 0,
      createdModels: [{ model_name: 'New Model', model_provider: 'OpenAI' }],
      updatedModels: [{ model_name: 'Updated Model', model_provider: 'Anthropic' }],
      errors: [],
    }
    mockSyncLlmStatsModels.mockResolvedValue(result)

    const response = await POST(makeRequest())

    expect(response.status).toBe(200)
    expect(mockCreateClient).toHaveBeenCalledWith('http://localhost:54321', 'service-key')
    expect(mockSyncLlmStatsModels).toHaveBeenCalled()
    expect(mockSendLlmStatsSyncReportEmail).toHaveBeenCalledWith(result)
    expect(mockFrom).toHaveBeenCalledWith('llm_stats_sync_runs')
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'success',
        models_fetched: 2,
        models_created: 1,
        models_updated: 1,
        email_sent: true,
      }),
    )
    expect(await response.json()).toMatchObject({
      success: true,
      emailSent: true,
      triggeredBy: 'admin@example.com',
    })
  })

  test('sends a failure email and records failure when sync throws', async () => {
    mockSyncLlmStatsModels.mockRejectedValue(new Error('LLM Stats failed'))

    const response = await POST(makeRequest())

    expect(response.status).toBe(500)
    expect(mockSendLlmStatsSyncFailureEmail).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({ route: '/api/admin/llm-stats-sync-runs' }),
    )
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'error',
        errors: ['LLM Stats failed'],
        failure_email_sent: true,
      }),
    )
    expect(await response.json()).toMatchObject({
      success: false,
      error: 'LLM Stats failed',
      failureEmailSent: true,
    })
  })
})
