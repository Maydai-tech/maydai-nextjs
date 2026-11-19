/** @jest-environment node */

process.env.NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321'
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'anon-key'

const mockGetAuthenticatedSupabaseClient = jest.fn()
const mockGetSystemCardPillar = jest.fn()

jest.mock('@/lib/api-auth', () => ({
  getAuthenticatedSupabaseClient: (...args: unknown[]) => mockGetAuthenticatedSupabaseClient(...args),
}))

jest.mock('@/lib/services/system-card-service', () => ({
  getSystemCardPillar: (...args: unknown[]) => mockGetSystemCardPillar(...args),
}))

import { NextRequest } from 'next/server'
import { GET } from '../route'

function makeRequest() {
  return new NextRequest('http://localhost/api/system-cards/claude-sonnet-4-5/pillars/doc_technique', {
    headers: { authorization: 'Bearer test-token' },
  })
}

describe('GET /api/system-cards/[modelIdentifier]/pillars/[pillarCode]', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('renvoie 401 si non authentifié', async () => {
    mockGetAuthenticatedSupabaseClient.mockRejectedValue(new Error('No authorization header'))
    const res = await GET(makeRequest(), {
      params: Promise.resolve({ modelIdentifier: 'claude-sonnet-4-5', pillarCode: 'doc_technique' }),
    })
    expect(res.status).toBe(401)
  })

  test('renvoie 400 si le pilier est invalide', async () => {
    mockGetAuthenticatedSupabaseClient.mockResolvedValue({ supabase: {}, user: { id: 'u1' } })
    const res = await GET(makeRequest(), {
      params: Promise.resolve({ modelIdentifier: 'claude-sonnet-4-5', pillarCode: 'inconnu' }),
    })
    expect(res.status).toBe(400)
    expect(mockGetSystemCardPillar).not.toHaveBeenCalled()
  })

  test('renvoie le pilier trouvé', async () => {
    mockGetAuthenticatedSupabaseClient.mockResolvedValue({ supabase: {}, user: { id: 'u1' } })
    const pillar = { id: '11111111-1111-4111-8111-111111111111', pillar_code: 'doc_technique' }
    mockGetSystemCardPillar.mockResolvedValue(pillar)

    const res = await GET(makeRequest(), {
      params: Promise.resolve({ modelIdentifier: 'claude-sonnet-4-5', pillarCode: 'doc_technique' }),
    })
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ pillar })
  })
})
