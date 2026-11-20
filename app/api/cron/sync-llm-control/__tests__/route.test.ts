/** @jest-environment node */

const mockAppend = jest.fn()
const mockEnsure = jest.fn()
const mockExportCsv = jest.fn()
const mockSyncDerived = jest.fn()
const mockSyncErrors = jest.fn()
const mockCreateClient = jest.fn(() => ({ service: true }))

jest.mock('@/lib/bench-llm/control-tower-csv', () => ({
  appendMissingModelsToSheet: (...args: unknown[]) => mockAppend(...args),
  ensureControlTowerSyncHeaders: (...args: unknown[]) => mockEnsure(...args),
  exportControlTowerCsv: (...args: unknown[]) => mockExportCsv(...args),
  syncControlTowerDerivedColumns: (...args: unknown[]) => mockSyncDerived(...args),
}))

jest.mock('@/lib/bench-llm/system-cards-import', () => ({
  syncControlTowerSystemCardStatuses: (...args: unknown[]) => mockSyncErrors(...args),
}))

jest.mock('@supabase/supabase-js', () => ({
  createClient: (...args: unknown[]) => mockCreateClient(...args),
}))

import { NextRequest } from 'next/server'

import { MissingControlTowerHeaderError } from '@/lib/bench-llm/control-tower-headers'

import { GET } from '../route'

function call(authorization?: string) {
  return GET(new NextRequest('http://localhost/api/cron/sync-llm-control', {
    headers: authorization ? { authorization } : {},
  }))
}

describe('GET /api/cron/sync-llm-control', () => {
  const previousSecret = process.env.CRON_SECRET
  const previousSheet = process.env.GOOGLE_SHEETS_CONTROL_TOWER_ID

  beforeEach(() => {
    jest.clearAllMocks()
    process.env.CRON_SECRET = 'cron-secret'
    process.env.GOOGLE_SHEETS_CONTROL_TOWER_ID = 'sheet-id'
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost:54321'
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-key'
    mockAppend.mockResolvedValue(0)
    mockSyncDerived.mockResolvedValue({ ficheCells: 0, visibilityCells: 0, popularityCells: 0, humanActionCells: 0 })
    mockSyncErrors.mockResolvedValue({ errorStatusesSynced: 0 })
    mockExportCsv.mockResolvedValue({ fileId: 'file-1', rowCount: 1, updated: true })
  })

  afterEach(() => {
    if (previousSecret == null) delete process.env.CRON_SECRET
    else process.env.CRON_SECRET = previousSecret
    if (previousSheet == null) delete process.env.GOOGLE_SHEETS_CONTROL_TOWER_ID
    else process.env.GOOGLE_SHEETS_CONTROL_TOWER_ID = previousSheet
  })

  test('refuse une requête sans jeton', async () => {
    const response = await call()
    expect(response.status).toBe(401)
    expect(mockEnsure).not.toHaveBeenCalled()
    expect(mockAppend).not.toHaveBeenCalled()
    expect(mockExportCsv).not.toHaveBeenCalled()
  })

  test('refuse un mauvais jeton', async () => {
    const response = await call('Bearer autre-secret')
    expect(response.status).toBe(401)
    expect(mockAppend).not.toHaveBeenCalled()
    expect(mockSyncDerived).not.toHaveBeenCalled()
    expect(mockExportCsv).not.toHaveBeenCalled()
  })

  test('s’arrête avant toute écriture si un en-tête manque', async () => {
    mockEnsure.mockRejectedValueOnce(new MissingControlTowerHeaderError('Statut MaydAI'))

    const response = await call('Bearer cron-secret')

    expect(response.status).toBe(500)
    expect((await response.json()).error).toContain('Statut MaydAI')
    expect(mockAppend).not.toHaveBeenCalled()
    expect(mockSyncDerived).not.toHaveBeenCalled()
    expect(mockSyncErrors).not.toHaveBeenCalled()
    expect(mockExportCsv).not.toHaveBeenCalled()
  })
})
