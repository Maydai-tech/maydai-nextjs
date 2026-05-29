/** @jest-environment node */

// Variables d'env requises au chargement du module route (sécurité CI)
process.env.NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321'
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'anon-key'
process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'service-key'

const mockGetUser = jest.fn()
const mockBuildDeletionPreview = jest.fn()
const mockDeleteUserAccount = jest.fn()

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    auth: { getUser: (...args: unknown[]) => mockGetUser(...args) },
  })),
}))

jest.mock('@/lib/account-deletion', () => ({
  buildDeletionPreview: (...args: unknown[]) => mockBuildDeletionPreview(...args),
  deleteUserAccount: (...args: unknown[]) => mockDeleteUserAccount(...args),
}))

jest.mock('@/lib/secure-logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
  createRequestContext: jest.fn(() => ({})),
}))

import { NextRequest } from 'next/server'

// Chargé paresseusement APRÈS la définition des variables d'env (les imports ESM
// sont hoistés au-dessus des assignations process.env ci-dessus).
let GET: typeof import('../route').GET
let DELETE: typeof import('../route').DELETE

beforeAll(() => {
  const route = require('../route')
  GET = route.GET
  DELETE = route.DELETE
})

function makeRequest(method: string, withAuth = true) {
  const headers: Record<string, string> = {}
  if (withAuth) headers.authorization = 'Bearer test-token'
  return new NextRequest('http://localhost/api/account', { method, headers })
}

beforeEach(() => {
  jest.clearAllMocks()
})

describe('GET /api/account (preview)', () => {
  test('renvoie 401 sans header d\'autorisation', async () => {
    const res = await GET(makeRequest('GET', false))
    expect(res.status).toBe(401)
    expect(mockBuildDeletionPreview).not.toHaveBeenCalled()
  })

  test('renvoie 401 si le token est invalide', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'bad token' } })
    const res = await GET(makeRequest('GET'))
    expect(res.status).toBe(401)
  })

  test('renvoie l\'aperçu pour un utilisateur authentifié', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })
    const preview = { ownedCompanies: [{ id: 'c1' }], collaboratingCompanies: [] }
    mockBuildDeletionPreview.mockResolvedValue(preview)

    const res = await GET(makeRequest('GET'))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual(preview)
    expect(mockBuildDeletionPreview).toHaveBeenCalledWith(expect.anything(), 'user-1')
  })
})

describe('DELETE /api/account', () => {
  test('renvoie 401 sans header d\'autorisation', async () => {
    const res = await DELETE(makeRequest('DELETE', false))
    expect(res.status).toBe(401)
    expect(mockDeleteUserAccount).not.toHaveBeenCalled()
  })

  test('supprime le compte et renvoie 204', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1', email: 'a@b.c' } }, error: null })
    mockDeleteUserAccount.mockResolvedValue(undefined)

    const res = await DELETE(makeRequest('DELETE'))
    expect(res.status).toBe(204)
    expect(mockDeleteUserAccount).toHaveBeenCalledWith(expect.anything(), 'user-1')
  })

  test('renvoie 500 si la suppression échoue', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })
    mockDeleteUserAccount.mockRejectedValue(new Error('boom'))

    const res = await DELETE(makeRequest('DELETE'))
    expect(res.status).toBe(500)
  })
})
