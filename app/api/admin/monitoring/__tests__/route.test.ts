/** @jest-environment node */

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { NextRequest, NextResponse } from 'next/server'

const verifyAdminAuth = jest.fn()

jest.mock('@/lib/admin-auth', () => ({
  verifyAdminAuth: (...args: unknown[]) => verifyAdminAuth(...args),
}))

jest.mock('@/lib/error-monitor', () => ({
  errorMonitor: {
    getErrorStats: () => ({}),
    getPerformanceStats: () => ({}),
    checkForIssues: () => [],
    getRecentErrors: () => [],
    getRecentMetrics: () => [],
    exportData: () => ({}),
    cleanup: jest.fn(),
  },
}))

jest.mock('node:child_process', () => ({
  exec: jest.fn((_cmd: string, cb: (error: Error) => void) => {
    cb(new Error('df disabled in tests'))
  }),
}))

const fetchMock = jest.fn()
global.fetch = fetchMock as unknown as typeof fetch

import { GET } from '../route'

const ENV_KEYS = [
  'MONITORING_PROD_DISK_JSON_URL',
  'MONITORING_PROD_EMAIL_STATUS_JSON_URL',
  'MONITORING_PROD_DOCKER_PURGES_JSON_URL',
  'MONITORING_HTTP_USER',
  'MONITORING_HTTP_PASSWORD',
  'MONITORING_BEARER_TOKEN',
] as const

describe('GET /api/admin/monitoring', () => {
  const previousEnv: Record<string, string | undefined> = {}

  beforeAll(() => {
    for (const key of ENV_KEYS) {
      previousEnv[key] = process.env[key]
    }
  })

  beforeEach(() => {
    jest.clearAllMocks()
    for (const key of ENV_KEYS) {
      delete process.env[key]
    }
  })

  afterAll(() => {
    for (const key of ENV_KEYS) {
      const value = previousEnv[key]
      if (value === undefined) delete process.env[key]
      else process.env[key] = value
    }
  })

  test('returns 401 and does not fetch host JSON when unauthenticated', async () => {
    verifyAdminAuth.mockResolvedValue({
      error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    })

    const response = await GET(
      new NextRequest('http://localhost/api/admin/monitoring?action=disk')
    )

    expect(response.status).toBe(401)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  test('does not fetch a public HTTP origin even when env points to it', async () => {
    verifyAdminAuth.mockResolvedValue({ user: { id: 'admin', role: 'admin' } })
    process.env.MONITORING_PROD_DISK_JSON_URL = 'http://203.0.113.10/monitoring/disk.json'
    process.env.MONITORING_PROD_EMAIL_STATUS_JSON_URL =
      'http://203.0.113.10/monitoring/email-status.json'
    process.env.MONITORING_PROD_DOCKER_PURGES_JSON_URL =
      'http://203.0.113.10/monitoring/docker-purges.json'
    process.env.MONITORING_HTTP_USER = 'monitoring'
    process.env.MONITORING_HTTP_PASSWORD = 'secret'

    const response = await GET(
      new NextRequest('http://localhost/api/admin/monitoring?action=disk')
    )
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(fetchMock).not.toHaveBeenCalled()
    expect(payload.disk).toBeNull()
    expect(payload.diskError).toBe('Source monitoring non configurée')
    expect(payload.purges).toEqual([])
    expect(payload.purgesError).toBe('Source monitoring non configurée')
  })

  test('fetches HTTPS sources with basic auth when admin', async () => {
    verifyAdminAuth.mockResolvedValue({ user: { id: 'admin', role: 'admin' } })
    process.env.MONITORING_PROD_DISK_JSON_URL = 'https://monitoring.example.com/monitoring/disk.json'
    process.env.MONITORING_PROD_EMAIL_STATUS_JSON_URL =
      'https://monitoring.example.com/monitoring/email-status.json'
    process.env.MONITORING_PROD_DOCKER_PURGES_JSON_URL =
      'https://monitoring.example.com/monitoring/docker-purges.json'
    process.env.MONITORING_HTTP_USER = 'monitoring'
    process.env.MONITORING_HTTP_PASSWORD = 'secret'

    fetchMock.mockImplementation(async (url: string) => {
      if (url.endsWith('disk.json')) {
        return {
          ok: true,
          json: async () => ({
            total: 50,
            used: 20,
            free: 30,
            usePercent: '40%',
            updatedAt: '2026-05-01T00:00:00Z',
          }),
        }
      }
      if (url.endsWith('email-status.json')) {
        return {
          ok: true,
          json: async () => ({ active: true, recipient: 'ops@example.com' }),
        }
      }
      return { ok: true, json: async () => [] }
    })

    const response = await GET(
      new NextRequest('http://localhost/api/admin/monitoring?action=disk')
    )
    const payload = await response.json()
    const expectedAuth = `Basic ${Buffer.from('monitoring:secret', 'utf8').toString('base64')}`

    expect(response.status).toBe(200)
    expect(payload.disk?.source).toBe('production')
    expect(payload.diskError).toBeNull()
    expect(fetchMock).toHaveBeenCalledTimes(3)
    for (const call of fetchMock.mock.calls) {
      expect(String(call[0])).toMatch(/^https:\/\/monitoring\.example\.com\//)
      expect(call[1]).toEqual(
        expect.objectContaining({
          headers: { Authorization: expectedAuth },
          redirect: 'error',
        })
      )
    }
  })
})

test('monitoring route does not embed a public host address', () => {
  const source = readFileSync(join(__dirname, '../route.ts'), 'utf8')
  expect(source).not.toMatch(/\d{1,3}(?:\.\d{1,3}){3}/)
  expect(source).not.toMatch(/DEFAULT_PROD_/)
})
