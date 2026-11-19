import { NextRequest, NextResponse } from 'next/server'

const verifyAdminAuth = jest.fn()
const from = jest.fn()

jest.mock('@/lib/admin-auth', () => ({
  verifyAdminAuth: (...args: unknown[]) => verifyAdminAuth(...args),
}))
jest.mock('@/lib/ecologits/sync', () => ({
  createEcoLogitsServiceClient: () => ({ from }),
}))

import { POST } from '../route'

describe('POST /api/admin/comparia/import', () => {
  beforeEach(() => jest.clearAllMocks())

  test('rejects a non-admin request before reading the CSV', async () => {
    verifyAdminAuth.mockResolvedValue({
      error: NextResponse.json({ error: 'Admin requis' }, { status: 403 }),
    })

    const response = await POST(new NextRequest('http://localhost/api/admin/comparia/import', {
      method: 'POST',
    }))

    expect(response.status).toBe(403)
    expect(from).not.toHaveBeenCalled()
  })
})
