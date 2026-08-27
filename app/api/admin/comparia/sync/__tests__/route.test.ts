/** @jest-environment node */

import { NextRequest, NextResponse } from 'next/server'

const verifyAdminAuth = jest.fn()
const syncCompariaCatalogFromDrive = jest.fn()

jest.mock('@/lib/admin-auth', () => ({
  verifyAdminAuth: (...args: unknown[]) => verifyAdminAuth(...args),
}))
jest.mock('@/lib/comparia/drive-sync', () => ({
  syncCompariaCatalogFromDrive: (...args: unknown[]) => syncCompariaCatalogFromDrive(...args),
}))
jest.mock('@/lib/ecologits/sync', () => ({
  createEcoLogitsServiceClient: () => ({ from: jest.fn() }),
}))

import { GET, POST } from '../route'

describe('POST /api/admin/comparia/sync', () => {
  const previousCronSecret = process.env.CRON_SECRET

  beforeEach(() => {
    jest.clearAllMocks()
    delete process.env.CRON_SECRET
  })

  afterAll(() => {
    if (previousCronSecret == null) delete process.env.CRON_SECRET
    else process.env.CRON_SECRET = previousCronSecret
  })

  test('rejects a non-admin request before calling Drive', async () => {
    verifyAdminAuth.mockResolvedValue({
      error: NextResponse.json({ error: 'Admin requis' }, { status: 403 }),
    })

    const response = await POST(new NextRequest('http://localhost/api/admin/comparia/sync', {
      method: 'POST',
    }))

    expect(response.status).toBe(403)
    expect(syncCompariaCatalogFromDrive).not.toHaveBeenCalled()
  })

  test('rejects an invalid x-cron-secret with 401 before calling Drive', async () => {
    process.env.CRON_SECRET = 'cron-secret'
    const response = await POST(new NextRequest('http://localhost/api/admin/comparia/sync', {
      method: 'POST',
      headers: { 'x-cron-secret': 'wrong' },
    }))

    expect(response.status).toBe(401)
    expect(await response.json()).toEqual({ error: 'Unauthorized' })
    expect(verifyAdminAuth).not.toHaveBeenCalled()
    expect(syncCompariaCatalogFromDrive).not.toHaveBeenCalled()
  })

  test('accepts Authorization Bearer CRON_SECRET without admin auth', async () => {
    process.env.CRON_SECRET = 'cron-secret'
    syncCompariaCatalogFromDrive.mockResolvedValue({
      rowsImported: 1,
      exactLinksCreated: 0,
      modelsDeactivated: 0,
      fileName: 'leaderboard.csv',
    })

    const response = await POST(new NextRequest('http://localhost/api/admin/comparia/sync', {
      method: 'POST',
      headers: { authorization: 'Bearer cron-secret' },
    }))

    expect(response.status).toBe(200)
    expect(verifyAdminAuth).not.toHaveBeenCalled()
    expect(syncCompariaCatalogFromDrive).toHaveBeenCalled()
  })
})

describe('GET /api/admin/comparia/sync', () => {
  const previousCronSecret = process.env.CRON_SECRET

  beforeEach(() => {
    jest.clearAllMocks()
    process.env.CRON_SECRET = 'cron-secret'
    verifyAdminAuth.mockResolvedValue({
      error: NextResponse.json({ error: 'Admin requis' }, { status: 403 }),
    })
  })

  afterAll(() => {
    if (previousCronSecret == null) delete process.env.CRON_SECRET
    else process.env.CRON_SECRET = previousCronSecret
  })

  test('rejects a Vercel cron call without the secret', async () => {
    const response = await GET(new NextRequest('http://localhost/api/admin/comparia/sync'))
    expect(response.status).toBe(401)
    expect(await response.json()).toEqual({ error: 'Unauthorized' })
    expect(verifyAdminAuth).not.toHaveBeenCalled()
    expect(syncCompariaCatalogFromDrive).not.toHaveBeenCalled()
  })

  test('runs when Vercel sends Authorization Bearer CRON_SECRET', async () => {
    syncCompariaCatalogFromDrive.mockResolvedValue({
      rowsImported: 2,
      exactLinksCreated: 1,
      modelsDeactivated: 0,
      fileName: 'leaderboard.csv',
    })

    const response = await GET(
      new NextRequest('http://localhost/api/admin/comparia/sync', {
        headers: { authorization: 'Bearer cron-secret' },
      }),
    )

    expect(response.status).toBe(200)
    expect(verifyAdminAuth).not.toHaveBeenCalled()
    expect(syncCompariaCatalogFromDrive).toHaveBeenCalled()
  })
})
