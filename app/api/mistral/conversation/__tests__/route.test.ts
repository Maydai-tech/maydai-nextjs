/** @jest-environment node */

const completeMistralAgent = jest.fn()

jest.mock('@/lib/mistral/agents', () => ({
  completeMistralAgent: (...args: unknown[]) => completeMistralAgent(...args),
}))

jest.mock('@/lib/api-auth', () => ({
  getAuthenticatedSupabaseClient: jest.fn(),
}))

import { NextRequest } from 'next/server'
import { getAuthenticatedSupabaseClient } from '@/lib/api-auth'
import { POST } from '../route'

function makeRequest(body: unknown, withAuth = true) {
  const headers: Record<string, string> = { 'content-type': 'application/json' }
  if (withAuth) headers.authorization = 'Bearer test-token'
  return new NextRequest('http://localhost/api/mistral/conversation', {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })
}

describe('POST /api/mistral/conversation', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(getAuthenticatedSupabaseClient as jest.Mock).mockResolvedValue({
      user: { id: 'user-1' },
      supabase: {},
    })
  })

  test('refuse une requête non authentifiée', async () => {
    ;(getAuthenticatedSupabaseClient as jest.Mock).mockRejectedValue(new Error('No authorization header'))
    const response = await POST(makeRequest({ messages: [{ role: 'user', content: 'Hi' }] }, false))
    expect(response.status).toBe(401)
    expect(completeMistralAgent).not.toHaveBeenCalled()
  })

  test('refuse un payload sans messages', async () => {
    const response = await POST(makeRequest({}))
    expect(response.status).toBe(400)
    expect(completeMistralAgent).not.toHaveBeenCalled()
  })

  test('renvoie le texte de l’agent', async () => {
    completeMistralAgent.mockResolvedValue('Commençons par nommer le cas d’usage.')
    const response = await POST(
      makeRequest({
        messages: [{ role: 'user', content: 'Bonjour, je veux créer un système RH basé sur Mistral' }],
      })
    )
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.success).toBe(true)
    expect(payload.content).toBe('Commençons par nommer le cas d’usage.')
    expect(completeMistralAgent).toHaveBeenCalledTimes(1)
  })
})
