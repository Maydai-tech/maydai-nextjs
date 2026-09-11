/** @jest-environment node */

const verifyAdminAuth = jest.fn()
const mockFrom = jest.fn()
const mockGetUserById = jest.fn()
const mockUpdate = jest.fn()

jest.mock('@/lib/admin-auth', () => ({
  verifyAdminAuth: (...args: unknown[]) => verifyAdminAuth(...args),
}))

jest.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    from: (...args: unknown[]) => mockFrom(...args),
    auth: { admin: { getUserById: (...args: unknown[]) => mockGetUserById(...args) } },
  }),
}))

import { NextRequest } from 'next/server'
import { PATCH } from '../route'

function roleRequest(role: string, targetId = 'target-user') {
  return {
    request: new NextRequest(`http://localhost/api/admin/users/${targetId}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ role }),
    }),
    context: { params: Promise.resolve({ id: targetId }) },
  }
}

function profilesChain(selectResults: Array<{ data: unknown; error: unknown }>) {
  let selectIndex = 0
  const chain: Record<string, unknown> = {
    select: () => chain,
    eq: () => chain,
    update: (...args: unknown[]) => {
      mockUpdate(...args)
      return chain
    },
    single: () => {
      const result = selectResults[selectIndex] ?? { data: null, error: { message: 'exhausted' } }
      selectIndex += 1
      return Promise.resolve(result)
    },
  }
  return chain
}

function mockProfiles(selectResults: Array<{ data: unknown; error: unknown }>) {
  const chain = profilesChain(selectResults)
  mockFrom.mockImplementation((table: string) => {
    if (table === 'admin_logs') {
      return { insert: () => Promise.resolve({ error: null }) }
    }
    return chain
  })
}

describe('PATCH /api/admin/users/[id] RBAC', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co'
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key'
    mockGetUserById.mockResolvedValue({ data: { user: { email: 'target@example.com' } } })
    mockProfiles([
      { data: { id: 'target-user', role: 'user' }, error: null },
      { data: { role: 'user' }, error: null },
      {
        data: {
          id: 'target-user',
          first_name: 'Ada',
          last_name: 'Lovelace',
          role: 'admin',
          user_companies: [],
        },
        error: null,
      },
    ])
  })

  test('refuse qu’un admin modifie son propre rôle', async () => {
    verifyAdminAuth.mockResolvedValue({
      user: { id: 'target-user', email: 'me@example.com', role: 'admin' },
    })

    const { request, context } = roleRequest('user', 'target-user')
    const response = await PATCH(request, context)

    expect(response.status).toBe(403)
    await expect(response.json()).resolves.toEqual({
      error: 'You cannot modify your own role',
    })
    expect(mockUpdate).not.toHaveBeenCalled()
  })

  test('refuse qu’un admin promeuve un utilisateur en super_admin', async () => {
    verifyAdminAuth.mockResolvedValue({
      user: { id: 'caller-admin', email: 'admin@example.com', role: 'admin' },
    })

    const { request, context } = roleRequest('super_admin')
    const response = await PATCH(request, context)

    expect(response.status).toBe(403)
    await expect(response.json()).resolves.toEqual({
      error: 'Only a super_admin can promote a user to super_admin',
    })
    expect(mockUpdate).not.toHaveBeenCalled()
  })

  test('refuse qu’un admin modifie un super_admin existant', async () => {
    verifyAdminAuth.mockResolvedValue({
      user: { id: 'caller-admin', email: 'admin@example.com', role: 'admin' },
    })
    mockProfiles([
      { data: { id: 'target-user', role: 'super_admin' }, error: null },
      { data: { role: 'super_admin' }, error: null },
    ])

    const { request, context } = roleRequest('admin')
    const response = await PATCH(request, context)

    expect(response.status).toBe(403)
    await expect(response.json()).resolves.toEqual({
      error: 'An admin cannot modify a super_admin profile',
    })
    expect(mockUpdate).not.toHaveBeenCalled()
  })

  test('autorise un super_admin à promouvoir un autre utilisateur', async () => {
    verifyAdminAuth.mockResolvedValue({
      user: { id: 'caller-super', email: 'super@example.com', role: 'super_admin' },
    })

    const { request, context } = roleRequest('super_admin')
    const response = await PATCH(request, context)

    expect(response.status).toBe(200)
    expect(mockUpdate).toHaveBeenCalled()
    await expect(response.json()).resolves.toMatchObject({
      success: true,
      user: { id: 'target-user' },
    })
  })

  test('loggue une erreur Supabase puis retourne un fallback 500', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
    const supabaseError = { message: 'role lookup failed' }
    verifyAdminAuth.mockResolvedValue({
      user: { id: 'caller-admin', email: 'admin@example.com', role: 'admin' },
    })
    mockProfiles([
      { data: { id: 'target-user', role: 'user' }, error: null },
      { data: null, error: supabaseError },
    ])

    const { request, context } = roleRequest('admin')
    const response = await PATCH(request, context)

    expect(response.status).toBe(500)
    await expect(response.json()).resolves.toEqual({
      error: 'Failed to verify target user role',
    })
    expect(consoleSpy).toHaveBeenCalledWith('[Admin User Update]', supabaseError)
    expect(mockUpdate).not.toHaveBeenCalled()
    consoleSpy.mockRestore()
  })
})
