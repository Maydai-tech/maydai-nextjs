/** @jest-environment node */

const mockVerifyAdminAuth = jest.fn()
const mockExportControlTowerCsv = jest.fn()
const mockAppendMissingModelsToSheet = jest.fn()
const mockWriteControlTowerLlmStatusColumn = jest.fn()
const mockCreateClient = jest.fn((..._args: unknown[]) => ({ service: true }))

jest.mock('@/lib/admin-auth', () => ({
  verifyAdminAuth: (...args: unknown[]) => mockVerifyAdminAuth(...args),
}))

jest.mock('@/lib/bench-llm/control-tower-csv', () => ({
  exportControlTowerCsv: (...args: unknown[]) => mockExportControlTowerCsv(...args),
  appendMissingModelsToSheet: (...args: unknown[]) => mockAppendMissingModelsToSheet(...args),
  writeControlTowerLlmStatusColumn: (...args: unknown[]) => mockWriteControlTowerLlmStatusColumn(...args),
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
  const previousSheetId = process.env.GOOGLE_SHEETS_CONTROL_TOWER_ID

  beforeEach(() => {
    jest.clearAllMocks()
    delete process.env.GOOGLE_SHEETS_CONTROL_TOWER_ID
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost:54321'
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-key'
    mockVerifyAdminAuth.mockResolvedValue({
      user: { id: 'admin-id', email: 'admin@example.com', role: 'admin' },
    })
  })

  afterEach(() => {
    if (previousSheetId == null) delete process.env.GOOGLE_SHEETS_CONTROL_TOWER_ID
    else process.env.GOOGLE_SHEETS_CONTROL_TOWER_ID = previousSheetId
  })

  test('returns 401 when admin auth fails', async () => {
    mockVerifyAdminAuth.mockResolvedValueOnce({
      error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    })

    const response = await POST(makeRequest())

    expect(response.status).toBe(401)
    expect(mockExportControlTowerCsv).not.toHaveBeenCalled()
  })

  test('returns 500 when the sheet id is missing', async () => {
    const response = await POST(makeRequest())

    expect(response.status).toBe(500)
    expect(mockAppendMissingModelsToSheet).not.toHaveBeenCalled()
    expect(mockWriteControlTowerLlmStatusColumn).not.toHaveBeenCalled()
    expect(mockExportControlTowerCsv).not.toHaveBeenCalled()
    expect(await response.json()).toEqual({
      success: false,
      error: 'GOOGLE_SHEETS_CONTROL_TOWER_ID is not defined',
    })
  })

  test('appends missing models, refreshes statuses, then exports the CSV', async () => {
    process.env.GOOGLE_SHEETS_CONTROL_TOWER_ID = ' sheet-id '
    mockAppendMissingModelsToSheet.mockResolvedValue(2)
    mockWriteControlTowerLlmStatusColumn.mockResolvedValue({ updatedCells: 14, inserted: false })
    mockExportControlTowerCsv.mockResolvedValue({
      fileId: 'file-1',
      rowCount: 14,
      updated: true,
    })

    const response = await POST(makeRequest())

    expect(response.status).toBe(200)
    expect(mockAppendMissingModelsToSheet).toHaveBeenCalledWith('sheet-id')
    expect(mockWriteControlTowerLlmStatusColumn).toHaveBeenCalledWith('sheet-id')
    expect(mockCreateClient).toHaveBeenCalledWith('http://localhost:54321', 'service-key')
    expect(mockExportControlTowerCsv).toHaveBeenCalledWith({ service: true })
    expect(mockAppendMissingModelsToSheet.mock.invocationCallOrder[0]).toBeLessThan(
      mockWriteControlTowerLlmStatusColumn.mock.invocationCallOrder[0],
    )
    expect(mockWriteControlTowerLlmStatusColumn.mock.invocationCallOrder[0]).toBeLessThan(
      mockExportControlTowerCsv.mock.invocationCallOrder[0],
    )
    expect(await response.json()).toEqual({
      success: true,
      message: 'CSV Tour de contrôle mis à jour sur Google Drive (2 modèles ajoutés au Sheet)',
      fileId: 'file-1',
      rowCount: 14,
      updated: true,
      modelsAppended: 2,
    })
  })

  test('returns 500 when the export fails', async () => {
    process.env.GOOGLE_SHEETS_CONTROL_TOWER_ID = 'sheet-id'
    mockAppendMissingModelsToSheet.mockResolvedValue(0)
    mockWriteControlTowerLlmStatusColumn.mockResolvedValue({ updatedCells: 1, inserted: false })
    mockExportControlTowerCsv.mockRejectedValue(new Error('Drive indisponible'))

    const response = await POST(makeRequest())

    expect(response.status).toBe(500)
    expect(await response.json()).toEqual({
      success: false,
      error: 'Drive indisponible',
    })
  })
})
