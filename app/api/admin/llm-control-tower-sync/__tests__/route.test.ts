/** @jest-environment node */

const mockVerifyAdminAuth = jest.fn()
const mockExportControlTowerCsv = jest.fn()
const mockAppendMissingModelsToSheet = jest.fn()
const mockSyncControlTowerDerivedColumns = jest.fn()
const mockEnsureControlTowerSyncHeaders = jest.fn()
const mockPreviewControlTowerSync = jest.fn()
const mockSyncControlTowerSystemCardStatuses = jest.fn()
const mockCreateClient = jest.fn((..._args: unknown[]) => ({ service: true }))

jest.mock('@/lib/admin-auth', () => ({
  verifyAdminAuth: (...args: unknown[]) => mockVerifyAdminAuth(...args),
}))

jest.mock('@/lib/bench-llm/control-tower-csv', () => ({
  exportControlTowerCsv: (...args: unknown[]) => mockExportControlTowerCsv(...args),
  appendMissingModelsToSheet: (...args: unknown[]) => mockAppendMissingModelsToSheet(...args),
  syncControlTowerDerivedColumns: (...args: unknown[]) => mockSyncControlTowerDerivedColumns(...args),
  ensureControlTowerSyncHeaders: (...args: unknown[]) => mockEnsureControlTowerSyncHeaders(...args),
  previewControlTowerSync: (...args: unknown[]) => mockPreviewControlTowerSync(...args),
}))

jest.mock('@/lib/bench-llm/system-cards-import', () => ({
  syncControlTowerSystemCardStatuses: (...args: unknown[]) =>
    mockSyncControlTowerSystemCardStatuses(...args),
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
    expect(mockEnsureControlTowerSyncHeaders).not.toHaveBeenCalled()
    expect(mockAppendMissingModelsToSheet).not.toHaveBeenCalled()
    expect(mockExportControlTowerCsv).not.toHaveBeenCalled()
    expect(await response.json()).toEqual({
      success: false,
      error: 'GOOGLE_SHEETS_CONTROL_TOWER_ID is not defined',
    })
  })

  test('appends missing models, refreshes statuses, then exports the CSV', async () => {
    process.env.GOOGLE_SHEETS_CONTROL_TOWER_ID = ' sheet-id '
    mockAppendMissingModelsToSheet.mockResolvedValue(2)
    mockSyncControlTowerDerivedColumns.mockResolvedValue({
      ficheCells: 14,
      visibilityCells: 14,
      popularityCells: 14,
    })
    mockSyncControlTowerSystemCardStatuses.mockResolvedValue({ errorStatusesSynced: 11 })
    mockExportControlTowerCsv.mockResolvedValue({
      fileId: 'file-1',
      rowCount: 14,
      updated: true,
    })

    const response = await POST(makeRequest())

    expect(response.status).toBe(200)
    expect(mockAppendMissingModelsToSheet).toHaveBeenCalledWith('sheet-id')
    expect(mockSyncControlTowerDerivedColumns).toHaveBeenCalledWith('sheet-id')
    expect(mockEnsureControlTowerSyncHeaders).toHaveBeenCalledWith('sheet-id')
    expect(mockCreateClient).toHaveBeenCalledWith('http://localhost:54321', 'service-key')
    expect(mockSyncControlTowerSystemCardStatuses).toHaveBeenCalledWith({ service: true })
    expect(mockExportControlTowerCsv).toHaveBeenCalledWith({ service: true })
    expect(mockAppendMissingModelsToSheet.mock.invocationCallOrder[0]).toBeLessThan(
      mockSyncControlTowerDerivedColumns.mock.invocationCallOrder[0],
    )
    expect(mockSyncControlTowerDerivedColumns.mock.invocationCallOrder[0]).toBeLessThan(
      mockSyncControlTowerSystemCardStatuses.mock.invocationCallOrder[0],
    )
    expect(mockSyncControlTowerSystemCardStatuses.mock.invocationCallOrder[0]).toBeLessThan(
      mockExportControlTowerCsv.mock.invocationCallOrder[0],
    )
    expect(await response.json()).toEqual({
      success: true,
      message: 'CSV Tour de contrôle mis à jour sur Google Drive (2 modèles ajoutés au Sheet)',
      fileId: 'file-1',
      rowCount: 14,
      updated: true,
      modelsAppended: 2,
      errorStatusesSynced: 11,
    })
  })

  test('returns 500 when the export fails', async () => {
    process.env.GOOGLE_SHEETS_CONTROL_TOWER_ID = 'sheet-id'
    mockAppendMissingModelsToSheet.mockResolvedValue(0)
    mockSyncControlTowerDerivedColumns.mockResolvedValue({
      ficheCells: 0,
      visibilityCells: 0,
      popularityCells: 0,
    })
    mockSyncControlTowerSystemCardStatuses.mockResolvedValue({ errorStatusesSynced: 0 })
    mockExportControlTowerCsv.mockRejectedValue(new Error('Drive indisponible'))

    const response = await POST(makeRequest())

    expect(response.status).toBe(500)
    expect(await response.json()).toEqual({
      success: false,
      error: 'Drive indisponible',
    })
  })

  test('simule sans écrire dans le Sheet, le CSV ou la base', async () => {
    process.env.GOOGLE_SHEETS_CONTROL_TOWER_ID = 'sheet-id'
    mockPreviewControlTowerSync.mockResolvedValue({
      changedCells: [{ column: 'Statut MaydAI', row: 2, before: 'Catalogue', after: 'Questionnaire' }],
      formulasRewritten: 4,
      rowsAdded: [{ row: 5, id: 'new-id', modelName: 'Nouveau', fiche: 'Manquante', llmStatus: '' }],
    })

    const response = await POST(new NextRequest('http://localhost/api/admin/llm-control-tower-sync', {
      method: 'POST',
      headers: { authorization: 'Bearer admin-token', 'content-type': 'application/json' },
      body: JSON.stringify({ dryRun: true }),
    }))

    expect(response.status).toBe(200)
    expect(mockAppendMissingModelsToSheet).not.toHaveBeenCalled()
    expect(mockSyncControlTowerDerivedColumns).not.toHaveBeenCalled()
    expect(mockSyncControlTowerSystemCardStatuses).not.toHaveBeenCalled()
    expect(mockExportControlTowerCsv).not.toHaveBeenCalled()
    expect(await response.json()).toEqual({
      success: true,
      dryRun: true,
      changedCells: [{ column: 'Statut MaydAI', row: 2, before: 'Catalogue', after: 'Questionnaire' }],
      formulasRewritten: 4,
      rowsAdded: [{ row: 5, id: 'new-id', modelName: 'Nouveau', fiche: 'Manquante', llmStatus: '' }],
    })
  })
})
