import { NextRequest, NextResponse } from 'next/server'

const verifyAdminAuth = jest.fn()
const from = jest.fn()

jest.mock('@/lib/admin-auth', () => ({
  verifyAdminAuth: (...args: unknown[]) => verifyAdminAuth(...args),
}))
jest.mock('@/lib/ecologits/sync', () => ({
  createEcoLogitsServiceClient: () => ({ from }),
}))

import { GET } from '../route'

describe('GET /api/admin/bench-llms', () => {
  beforeEach(() => jest.clearAllMocks())

  test('returns the authentication error', async () => {
    verifyAdminAuth.mockResolvedValue({
      error: NextResponse.json({ error: 'Admin requis' }, { status: 403 }),
    })
    const response = await GET(new NextRequest('http://localhost/api/admin/bench-llms'))
    expect(response.status).toBe(403)
    expect(from).not.toHaveBeenCalled()
  })
})
