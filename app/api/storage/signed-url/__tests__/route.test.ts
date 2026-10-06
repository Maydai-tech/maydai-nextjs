/** @jest-environment node */

process.env.NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321'
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'anon-key'
process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'service-key'

const mockGetUser = jest.fn()
const mockCanAccess = jest.fn()
const mockSign = jest.fn()

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    auth: { getUser: (...args: unknown[]) => mockGetUser(...args) },
  })),
}))

jest.mock('@/lib/dossier-signed-url', () => ({
  userCanAccessDossierPath: (...args: unknown[]) => mockCanAccess(...args),
  createDossierSignedUrl: (...args: unknown[]) => mockSign(...args),
}))

import { NextRequest } from 'next/server'

let GET: typeof import('../route').GET

beforeAll(() => {
  GET = require('../route').GET
})

beforeEach(() => {
  jest.clearAllMocks()
})

function request(path: string | null, withAuth = true) {
  const url = path
    ? `http://localhost/api/storage/signed-url?path=${encodeURIComponent(path)}`
    : 'http://localhost/api/storage/signed-url'
  const headers: Record<string, string> = {}
  if (withAuth) headers.authorization = 'Bearer test-token'
  return new NextRequest(url, { headers })
}

describe('GET /api/storage/signed-url', () => {
  test('refuse une requête sans authentification', async () => {
    const res = await GET(request('comp/u1/doc/a.pdf', false))
    expect(res.status).toBe(401)
    expect(mockSign).not.toHaveBeenCalled()
  })

  test('refuse un chemin invalide', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })
    const res = await GET(request('../secret.pdf'))
    expect(res.status).toBe(400)
    expect(mockSign).not.toHaveBeenCalled()
  })

  test('refuse un fichier d\'une entreprise non accessible', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })
    mockCanAccess.mockResolvedValue(false)
    const res = await GET(request('comp/u1/doc/a.pdf'))
    expect(res.status).toBe(403)
    expect(mockSign).not.toHaveBeenCalled()
  })

  test('renvoie une URL signée pour un membre de l\'entreprise', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })
    mockCanAccess.mockResolvedValue(true)
    mockSign.mockResolvedValue('https://api.maydai.io/storage/v1/object/sign/dossiers/comp/u1/doc/a.pdf?token=abc')

    const res = await GET(request('https://api.maydai.io/storage/v1/object/public/dossiers/comp/u1/doc/a.pdf'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.url).toContain('/object/sign/')
    expect(body.url).not.toContain('/object/public/')
    expect(mockSign).toHaveBeenCalledWith('comp/u1/doc/a.pdf')
  })
})
