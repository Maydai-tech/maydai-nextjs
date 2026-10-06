/** @jest-environment node */

process.env.NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321'
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'anon-key'
process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'service-key'

const mockGetUser = jest.fn()
const mockGetUserByEmail = jest.fn()
const mockInviteUserByEmail = jest.fn()
const mockCreateProfileForUser = jest.fn()
const mockGetUserOwnedCompanies = jest.fn()

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    auth: { getUser: (...args: unknown[]) => mockGetUser(...args) },
    from: (table: string) => queryFor(table),
  })),
}))

jest.mock('@/lib/invite-user', () => ({
  getUserByEmail: (...args: unknown[]) => mockGetUserByEmail(...args),
  inviteUserByEmail: (...args: unknown[]) => mockInviteUserByEmail(...args),
  createProfileForUser: (...args: unknown[]) => mockCreateProfileForUser(...args),
}))

jest.mock('@/lib/permissions', () => ({
  getUserOwnedCompanies: (...args: unknown[]) => mockGetUserOwnedCompanies(...args),
}))

jest.mock('@/lib/secure-logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
  createRequestContext: jest.fn(() => ({})),
}))

function queryFor(table: string) {
  const chain: {
    select: jest.Mock
    eq: jest.Mock
    in: jest.Mock
    insert: jest.Mock
    single: jest.Mock
  } = {
    select: jest.fn(),
    eq: jest.fn(),
    in: jest.fn().mockResolvedValue({ data: [], error: null }),
    insert: jest.fn().mockResolvedValue({ error: null }),
    single: jest.fn().mockResolvedValue(
      table === 'profiles'
        ? { data: { id: 'victim-1', first_name: 'Ada', last_name: 'Lovelace' }, error: null }
        : { data: null, error: null }
    ),
  }
  chain.select.mockReturnValue(chain)
  chain.eq.mockReturnValue(chain)
  return chain
}

import { NextRequest } from 'next/server'

let POST: typeof import('../route').POST

beforeAll(() => {
  POST = require('../route').POST
})

beforeEach(() => {
  jest.clearAllMocks()
  mockGetUser.mockResolvedValue({ data: { user: { id: 'owner-1' } }, error: null })
  mockGetUserOwnedCompanies.mockResolvedValue(['company-1'])
  mockCreateProfileForUser.mockResolvedValue({ data: { id: 'new-1' }, error: null })
})

function inviteRequest(body: Record<string, string>) {
  return new NextRequest('http://localhost/api/profiles/owner-1/collaborators', {
    method: 'POST',
    headers: {
      authorization: 'Bearer test-token',
      'content-type': 'application/json',
    },
    body: JSON.stringify(body),
  })
}

const params = { params: Promise.resolve({ profileId: 'owner-1' }) }

describe('POST /api/profiles/[profileId]/collaborators', () => {
  test('n\'écrase pas le profil d\'un compte Auth déjà existant', async () => {
    mockGetUserByEmail.mockResolvedValue({
      user: { id: 'victim-1', email: 'victim@example.com' },
      error: null,
    })

    const res = await POST(
      inviteRequest({
        email: 'victim@example.com',
        firstName: 'Nom',
        lastName: 'Imposé',
      }),
      params
    )

    expect(res.status).toBe(200)
    expect(mockCreateProfileForUser).not.toHaveBeenCalled()
    expect(mockInviteUserByEmail).not.toHaveBeenCalled()
  })

  test('crée le profil uniquement pour un compte nouvellement invité', async () => {
    mockGetUserByEmail.mockResolvedValue({ user: undefined, error: null })
    mockInviteUserByEmail.mockResolvedValue({
      data: { user: { id: 'new-1' } },
      error: null,
    })

    const res = await POST(
      inviteRequest({
        email: 'new@example.com',
        firstName: 'Camille',
        lastName: 'Martin',
      }),
      params
    )

    expect(res.status).toBe(200)
    expect(mockInviteUserByEmail).toHaveBeenCalledWith('new@example.com', {
      firstName: 'Camille',
      lastName: 'Martin',
    })
    expect(mockCreateProfileForUser).toHaveBeenCalledWith('new-1', 'Camille', 'Martin')
  })
})
