/** @jest-environment node */

const verifyAdminAuth = jest.fn()
const mockFrom = jest.fn()
const mockGetUserById = jest.fn()
const mockUpdate = jest.fn()
const mockDelete = jest.fn()
const mockUpsert = jest.fn()

type DbOperation = { table: string; method: string; args: unknown[] }
const operations: DbOperation[] = []
let activeTable = ''

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
import { GET, PATCH } from '../route'

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
    select: (...args: unknown[]) => {
      operations.push({ table: activeTable, method: 'select', args })
      return chain
    },
    eq: (...args: unknown[]) => {
      operations.push({ table: activeTable, method: 'eq', args })
      return chain
    },
    update: (...args: unknown[]) => {
      mockUpdate(...args)
      operations.push({ table: activeTable, method: 'update', args })
      return chain
    },
    delete: () => {
      mockDelete()
      operations.push({ table: activeTable, method: 'delete', args: [] })
      return chain
    },
    upsert: (...args: unknown[]) => {
      mockUpsert(...args)
      operations.push({ table: activeTable, method: 'upsert', args })
      return Promise.resolve({ error: null })
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
    activeTable = table
    if (table === 'admin_logs') {
      return { insert: () => Promise.resolve({ error: null }) }
    }
    return chain
  })
}

function companyRequest(body: Record<string, unknown>, targetId = 'target-user') {
  return {
    request: new NextRequest(`http://localhost/api/admin/users/${targetId}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    }),
    context: { params: Promise.resolve({ id: targetId }) },
  }
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

describe('PATCH et GET /api/admin/users/[id] associations entreprises', () => {
  const caller = { id: 'caller-admin', email: 'admin@example.com', role: 'admin' as const }
  const linkedProfile = {
    id: 'target-user',
    first_name: 'Ada',
    last_name: 'Lovelace',
    role: 'user',
    user_companies: [
      {
        company_id: 'company-1',
        role: 'user',
        companies: { id: 'company-1', name: 'Acme' },
      },
      {
        company_id: 'company-2',
        role: 'user',
        companies: null,
      },
    ],
  }

  beforeEach(() => {
    jest.clearAllMocks()
    operations.length = 0
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co'
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key'
    verifyAdminAuth.mockResolvedValue({ user: caller })
    mockGetUserById.mockResolvedValue({ data: { user: { email: 'target@example.com' } } })
  })

  test('PATCH remove_company_id supprime la ligne user_companies sans is_active', async () => {
    mockProfiles([
      { data: { id: 'target-user', role: 'user' }, error: null },
      { data: linkedProfile, error: null },
    ])

    const { request, context } = companyRequest({ remove_company_id: 'company-1' })
    const response = await PATCH(request, context)

    expect(response.status).toBe(200)
    expect(mockDelete).toHaveBeenCalledTimes(1)
    expect(operations.filter((op) => op.method === 'delete')).toEqual([
      { table: 'user_companies', method: 'delete', args: [] },
    ])
    expect(operations.filter((op) => op.method === 'eq')).toEqual(
      expect.arrayContaining([
        { table: 'user_companies', method: 'eq', args: ['user_id', 'target-user'] },
        { table: 'user_companies', method: 'eq', args: ['company_id', 'company-1'] },
      ])
    )
    expect(mockUpdate).not.toHaveBeenCalled()
    expect(mockUpsert).not.toHaveBeenCalled()
    expect(JSON.stringify(operations)).not.toContain('is_active')
  })

  test('PATCH add_company_id fait un upsert sans is_active', async () => {
    mockProfiles([
      { data: { id: 'target-user', role: 'user' }, error: null },
      { data: { id: 'company-1' }, error: null },
      { data: linkedProfile, error: null },
    ])

    const { request, context } = companyRequest({ add_company_id: 'company-1' })
    const response = await PATCH(request, context)

    expect(response.status).toBe(200)
    expect(mockUpsert).toHaveBeenCalledWith(
      { user_id: 'target-user', company_id: 'company-1', role: 'user' },
      { onConflict: 'user_id,company_id' }
    )
    expect(mockDelete).not.toHaveBeenCalled()
    expect(JSON.stringify(operations)).not.toContain('is_active')
    await expect(response.json()).resolves.toMatchObject({
      success: true,
      user: {
        companies: [{ id: 'company-1', name: 'Acme', role: 'user' }],
      },
    })
  })

  test('GET sélectionne user_companies sans is_active et retourne les entreprises liées', async () => {
    mockProfiles([{ data: linkedProfile, error: null }])

    const response = await GET(
      new NextRequest('http://localhost/api/admin/users/target-user'),
      { params: Promise.resolve({ id: 'target-user' }) }
    )

    expect(response.status).toBe(200)
    const selects = operations.filter((op) => op.method === 'select').map((op) => String(op.args[0]))
    expect(selects.some((query) => query.includes('user_companies'))).toBe(true)
    expect(selects.every((query) => !query.includes('is_active'))).toBe(true)
    const body = await response.json()
    expect(body.companies).toEqual([{ id: 'company-1', name: 'Acme', role: 'user' }])
  })
})
