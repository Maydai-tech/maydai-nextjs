import { NextRequest } from 'next/server'

const syncEcoLogitsCatalog = jest.fn()
const createEcoLogitsServiceClient = jest.fn(() => ({ service: true }))

jest.mock('@/lib/ecologits/sync', () => ({
  syncEcoLogitsCatalog: (...args: unknown[]) => syncEcoLogitsCatalog(...args),
  createEcoLogitsServiceClient: () => createEcoLogitsServiceClient(),
}))

import { GET } from '../route'

describe('GET /api/cron/sync-ecologits', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    process.env.CRON_SECRET = 'cron-secret'
  })

  test('rejects an invalid cron secret', async () => {
    const response = await GET(new NextRequest('http://localhost/api/cron/sync-ecologits'))
    expect(response.status).toBe(401)
    expect(syncEcoLogitsCatalog).not.toHaveBeenCalled()
  })

  test('runs a protected cron synchronization', async () => {
    syncEcoLogitsCatalog.mockResolvedValue({
      success: true,
      status: 'success',
      modelsFetched: 2,
    })
    const response = await GET(
      new NextRequest('http://localhost/api/cron/sync-ecologits', {
        headers: { authorization: 'Bearer cron-secret' },
      }),
    )
    expect(response.status).toBe(200)
    expect(syncEcoLogitsCatalog).toHaveBeenCalledWith({ service: true }, 'cron')
  })

  test('returns 207 for a partial synchronization', async () => {
    syncEcoLogitsCatalog.mockResolvedValue({ success: false, status: 'partial' })
    const response = await GET(
      new NextRequest('http://localhost/api/cron/sync-ecologits', {
        headers: { authorization: 'Bearer cron-secret' },
      }),
    )
    expect(response.status).toBe(207)
  })
})
