/** @jest-environment node */

process.env.NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321'
process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'service-key'
process.env.LLM_STATS_API_KEY = process.env.LLM_STATS_API_KEY || 'llm-stats-key'
process.env.CRON_SECRET = process.env.CRON_SECRET || 'cron-secret'

const mockCreateClient = jest.fn(() => ({ from: jest.fn() }))
const mockSyncLlmStatsModels = jest.fn()
const mockSendLlmStatsSyncReportEmail = jest.fn()
const mockSendLlmStatsSyncFailureEmail = jest.fn()

jest.mock('@supabase/supabase-js', () => ({
  createClient: (...args: unknown[]) => mockCreateClient(...args),
}))

jest.mock('@/lib/bench-llm/llm-stats-sync', () => ({
  syncLlmStatsModels: (...args: unknown[]) => mockSyncLlmStatsModels(...args),
}))

jest.mock('@/lib/email/mailjet', () => ({
  sendLlmStatsSyncReportEmail: (...args: unknown[]) => mockSendLlmStatsSyncReportEmail(...args),
  sendLlmStatsSyncFailureEmail: (...args: unknown[]) => mockSendLlmStatsSyncFailureEmail(...args),
}))

import { NextRequest } from 'next/server'

let GET: typeof import('../route').GET

beforeAll(() => {
  GET = require('../route').GET
})

function makeRequest(secret = process.env.CRON_SECRET) {
  const headers: Record<string, string> = {}
  if (secret) {
    headers.authorization = `Bearer ${secret}`
  }
  return new NextRequest('http://localhost/api/cron/sync-llm-stats', { headers })
}

beforeEach(() => {
  jest.clearAllMocks()
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost:54321'
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-key'
  process.env.LLM_STATS_API_KEY = 'llm-stats-key'
  process.env.CRON_SECRET = 'cron-secret'
  mockSendLlmStatsSyncReportEmail.mockResolvedValue({ success: true })
  mockSendLlmStatsSyncFailureEmail.mockResolvedValue({ success: true })
})

describe('GET /api/cron/sync-llm-stats', () => {
  test('returns 401 without a valid cron secret', async () => {
    const response = await GET(makeRequest('wrong-secret'))

    expect(response.status).toBe(401)
    expect(mockSyncLlmStatsModels).not.toHaveBeenCalled()
  })

  test('returns 500 and sends failure email when env is missing', async () => {
    delete process.env.LLM_STATS_API_KEY

    const response = await GET(makeRequest())

    expect(response.status).toBe(500)
    expect(mockSendLlmStatsSyncFailureEmail).toHaveBeenCalled()
    expect(mockSyncLlmStatsModels).not.toHaveBeenCalled()
  })

  test('runs sync and sends report email on success', async () => {
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

    const response = await GET(makeRequest())

    expect(response.status).toBe(200)
    expect(mockCreateClient).toHaveBeenCalledWith(
      'http://localhost:54321',
      'service-key',
      expect.any(Object),
    )
    expect(mockSendLlmStatsSyncReportEmail).toHaveBeenCalledWith(result)
    expect(await response.json()).toMatchObject({
      success: true,
      emailSent: true,
      modelsCreated: 1,
      modelsUpdated: 1,
    })
  })

  test('sends failure email when sync throws', async () => {
    mockSyncLlmStatsModels.mockRejectedValue(new Error('LLM Stats failed'))

    const response = await GET(makeRequest())

    expect(response.status).toBe(500)
    expect(mockSendLlmStatsSyncFailureEmail).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({ route: '/api/cron/sync-llm-stats' }),
    )
    expect(await response.json()).toMatchObject({
      success: false,
      error: 'LLM Stats failed',
      failureEmailSent: true,
    })
  })

  test('does not replace a successful sync response when report email fails', async () => {
    mockSyncLlmStatsModels.mockResolvedValue({
      success: true,
      startedAt: '2026-07-11T10:00:00.000Z',
      finishedAt: '2026-07-11T10:00:01.000Z',
      durationMs: 1000,
      modelsFetched: 1,
      modelsCreated: 0,
      modelsUpdated: 0,
      modelsUnchanged: 1,
      createdModels: [],
      updatedModels: [],
      errors: [],
    })
    mockSendLlmStatsSyncReportEmail.mockResolvedValue({
      success: false,
      error: new Error('Mailjet failed'),
    })

    const response = await GET(makeRequest())

    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({
      success: true,
      emailSent: false,
    })
  })
})
