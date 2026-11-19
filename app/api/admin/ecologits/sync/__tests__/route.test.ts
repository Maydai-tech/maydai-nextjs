import { NextRequest, NextResponse } from 'next/server'

const verifyAdminAuth = jest.fn()
const syncEcoLogitsCatalog = jest.fn()

jest.mock('@/lib/admin-auth', () => ({
  verifyAdminAuth: (...args: unknown[]) => verifyAdminAuth(...args),
}))
jest.mock('@/lib/ecologits/sync', () => ({
  createEcoLogitsServiceClient: () => ({ service: true }),
  syncEcoLogitsCatalog: (...args: unknown[]) => syncEcoLogitsCatalog(...args),
}))

import { POST } from '../route'

describe('POST /api/admin/ecologits/sync', () => {
  beforeEach(() => jest.clearAllMocks())

  test('returns the admin authentication error', async () => {
    verifyAdminAuth.mockResolvedValue({
      error: NextResponse.json({ error: 'Admin requis' }, { status: 403 }),
    })
    const response = await POST(new NextRequest('http://localhost/api/admin/ecologits/sync'))
    expect(response.status).toBe(403)
    expect(syncEcoLogitsCatalog).not.toHaveBeenCalled()
  })

  test('starts an admin synchronization', async () => {
    verifyAdminAuth.mockResolvedValue({ user: { id: 'admin' } })
    syncEcoLogitsCatalog.mockResolvedValue({ success: true, status: 'success' })
    const response = await POST(
      new NextRequest('http://localhost/api/admin/ecologits/sync', { method: 'POST' }),
    )
    expect(response.status).toBe(200)
    expect(syncEcoLogitsCatalog).toHaveBeenCalledWith({ service: true }, 'admin')
  })
})
