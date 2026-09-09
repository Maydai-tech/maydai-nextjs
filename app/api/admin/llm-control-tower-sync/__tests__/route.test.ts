/** @jest-environment node */

const mockVerifyAdminAuth = jest.fn()
const mockExportControlTowerCsv = jest.fn()
const mockCreateClient = jest.fn((..._args: unknown[]) => ({ service: true }))

jest.mock('@/lib/admin-auth', () => ({
  verifyAdminAuth: (...args: unknown[]) => mockVerifyAdminAuth(...args),
}))

jest.mock('@/lib/bench-llm/control-tower-csv', () => ({
  exportControlTowerCsv: (...args: unknown[]) => mockExportControlTowerCsv(...args),
}))

jest.mock('@supabase/supabase-js', () => ({
  createClient: (...args: unknown[]) => mockCreateClient(...args),
}))

import { NextRequest, NextResponse } from 'next/server'

import { POST } from '../route'

function makeRequest() {
  return new NextRequest('http://localhost/api/admin/llm-control-tower-sync', {
    method: 'POST',
    headers: { authorization: 'Bearer admin-token' },
  })
}

describe('POST /api/admin/llm-control-tower-sync', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost:54321'
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-key'
    mockVerifyAdminAuth.mockResolvedValue({
      user: { id: 'admin-id', email: 'admin@example.com', role: 'admin' },
    })
  })

  test('returns 401 when admin auth fails', async () => {
    mockVerifyAdminAuth.mockResolvedValueOnce({
      error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    })

    const response = await POST(makeRequest())

    expect(response.status).toBe(401)
    expect(mockExportControlTowerCsv).not.toHaveBeenCalled()
  })

  test('exports the Control Tower CSV and returns a success payload', async () => {
    mockExportControlTowerCsv.mockResolvedValue({
      fileId: 'file-1',
      rowCount: 12,
      updated: true,
    })

    const response = await POST(makeRequest())

    expect(response.status).toBe(200)
    expect(mockCreateClient).toHaveBeenCalledWith('http://localhost:54321', 'service-key')
    expect(mockExportControlTowerCsv).toHaveBeenCalledWith({ service: true })
    expect(await response.json()).toEqual({
      success: true,
      message: 'CSV Tour de contrôle mis à jour sur Google Drive',
      fileId: 'file-1',
      rowCount: 12,
      updated: true,
    })
  })

  test('returns 500 when the export fails', async () => {
    mockExportControlTowerCsv.mockRejectedValue(new Error('Drive indisponible'))

    const response = await POST(makeRequest())

    expect(response.status).toBe(500)
    expect(await response.json()).toEqual({
      success: false,
      error: 'Drive indisponible',
    })
  })
})
