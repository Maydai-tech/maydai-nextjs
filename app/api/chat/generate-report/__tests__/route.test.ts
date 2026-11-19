/** @jest-environment node */

const generateChatReport = jest.fn()
const loadEvaluationContext = jest.fn()

jest.mock('@/lib/api-auth', () => ({
  getAuthenticatedSupabaseClient: jest.fn(),
}))

jest.mock('@/lib/mistral/load-evaluation-context', () => ({
  parseUsecaseId: jest.requireActual('@/lib/mistral/load-evaluation-context').parseUsecaseId,
  loadEvaluationContext: (...args: unknown[]) => loadEvaluationContext(...args),
}))

jest.mock('@/lib/mistral/generate-chat-report', () => ({
  generateChatReport: (...args: unknown[]) => generateChatReport(...args),
}))

import { NextRequest } from 'next/server'
import { getAuthenticatedSupabaseClient } from '@/lib/api-auth'
import { POST } from '../route'

const USECASE_ID = '660e8400-e29b-41d4-a716-446655440000'

function makeRequest(body: unknown, withAuth = true) {
  const headers: Record<string, string> = { 'content-type': 'application/json' }
  if (withAuth) headers.authorization = 'Bearer test-token'
  return new NextRequest('http://localhost/api/chat/generate-report', {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })
}

describe('POST /api/chat/generate-report', () => {
  const supabase = {}
  const user = { id: 'user-1' }

  beforeEach(() => {
    jest.clearAllMocks()
    ;(getAuthenticatedSupabaseClient as jest.Mock).mockResolvedValue({
      user,
      supabase,
    })
    loadEvaluationContext.mockResolvedValue({ ok: true, context: { usecaseId: USECASE_ID } })
    generateChatReport.mockResolvedValue({
      ok: true,
      usecase_id: USECASE_ID,
      usecase_name: 'Assistant RH',
      processing_time_ms: 1200,
      next_steps_status: 'saved',
      next_steps_saved: true,
    })
  })

  test('refuse une requête non authentifiée', async () => {
    ;(getAuthenticatedSupabaseClient as jest.Mock).mockRejectedValue(new Error('Unauthorized'))
    const response = await POST(makeRequest({ usecase_id: USECASE_ID }, false))
    expect(response.status).toBe(401)
    expect(generateChatReport).not.toHaveBeenCalled()
  })

  test('refuse un usecase_id manquant', async () => {
    const response = await POST(makeRequest({}))
    expect(response.status).toBe(400)
    expect(loadEvaluationContext).not.toHaveBeenCalled()
  })

  test('propage un accès refusé au cas d’usage', async () => {
    loadEvaluationContext.mockResolvedValue({
      ok: false,
      status: 403,
      error: 'Accès refusé',
      code: 'ACCESS_DENIED',
    })
    const response = await POST(makeRequest({ usecase_id: USECASE_ID }))
    expect(response.status).toBe(403)
    expect(generateChatReport).not.toHaveBeenCalled()
  })

  test('renvoie un succès après scoring + rapport Mistral', async () => {
    const response = await POST(makeRequest({ usecase_id: USECASE_ID }))
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload).toEqual({
      success: true,
      usecase_id: USECASE_ID,
      usecase_name: 'Assistant RH',
      processing_time_ms: 1200,
      next_steps_status: 'saved',
      next_steps_saved: true,
    })
    expect(generateChatReport).toHaveBeenCalledWith({
      supabase,
      user,
      usecaseId: USECASE_ID,
    })
  })
})
