/** @jest-environment node */

import { NextRequest } from 'next/server'

const verifyAdminAuth = jest.fn()

jest.mock('@/lib/admin-auth', () => ({
  verifyAdminAuth: (...args: unknown[]) => verifyAdminAuth(...args),
}))

jest.mock('@/lib/error-monitor', () => ({
  errorMonitor: {
    getErrorStats: () => ({}),
    getPerformanceStats: () => ({}),
    checkForIssues: () => [],
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

const callDisk = async () => {
  const response = await GET(new NextRequest('http://localhost/api/admin/monitoring?action=disk'))
  return { status: response.status, payload: await response.json() }
}

describe('GET /api/admin/monitoring — diagnostics', () => {
  const previousEnv: Record<string, string | undefined> = {}

  beforeAll(() => {
    for (const key of ENV_KEYS) previousEnv[key] = process.env[key]
  })

  beforeEach(() => {
    jest.clearAllMocks()
    for (const key of ENV_KEYS) delete process.env[key]
    verifyAdminAuth.mockResolvedValue({ user: { id: 'admin', role: 'admin' } })
  })

  afterAll(() => {
    for (const key of ENV_KEYS) {
      const value = previousEnv[key]
      if (value === undefined) delete process.env[key]
      else process.env[key] = value
    }
  })

  test('explains that credentials are missing, without echoing URLs', async () => {
    const { payload } = await callDisk()

    expect(payload.sourceIssues.disk).toMatch(/^disk\.json : authentification manquante/)
    expect(payload.sourceIssues.email).toMatch(/^email-status\.json : authentification manquante/)
    expect(payload.sourceIssues.purges).toMatch(/^docker-purges\.json : authentification manquante/)
    expect(JSON.stringify(payload.sourceIssues)).not.toContain('https://')
    expect(payload.emailError).toBe('Source monitoring non configurée')
  })

  test('treats a missing email-status.json (404) as "no alert sent", not an error', async () => {
    process.env.MONITORING_PROD_DISK_JSON_URL = 'https://monitoring.example.com/disk.json'
    process.env.MONITORING_PROD_EMAIL_STATUS_JSON_URL = 'https://monitoring.example.com/email-status.json'
    process.env.MONITORING_PROD_DOCKER_PURGES_JSON_URL = 'https://monitoring.example.com/docker-purges.json'
    process.env.MONITORING_HTTP_USER = 'monitoring'
    process.env.MONITORING_HTTP_PASSWORD = 'secret'

    fetchMock.mockImplementation(async (url: string) => {
      if (url.endsWith('email-status.json')) return { ok: false, status: 404, json: async () => ({}) }
      if (url.endsWith('disk.json')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ total: 48, used: 11, free: 37, usePercent: '22%', updatedAt: '2026-11-18T00:00:00Z' }),
        }
      }
      return { ok: true, status: 200, json: async () => [] }
    })

    const { status, payload } = await callDisk()

    expect(status).toBe(200)
    expect(payload.email).toBeNull()
    expect(payload.emailError).toBeNull()
    expect(payload.sourceIssues).toEqual({})
  })

  test('reports other email source failures', async () => {
    process.env.MONITORING_PROD_EMAIL_STATUS_JSON_URL = 'https://monitoring.example.com/email-status.json'
    process.env.MONITORING_HTTP_USER = 'monitoring'
    process.env.MONITORING_HTTP_PASSWORD = 'secret'
    fetchMock.mockResolvedValue({ ok: false, status: 500, json: async () => ({}) })

    const { payload } = await callDisk()

    expect(payload.emailError).toBe('Source statut email indisponible (500)')
  })
})
