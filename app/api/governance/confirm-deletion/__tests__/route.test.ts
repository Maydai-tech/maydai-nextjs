/** @jest-environment node */

const mockConfirmDeletionAndStart24hTimer = jest.fn()

jest.mock('@/lib/services/governancePurgeService', () => ({
  confirmDeletionAndStart24hTimer: (...args: unknown[]) =>
    mockConfirmDeletionAndStart24hTimer(...args),
}))

import { NextRequest } from 'next/server'
import { GET, POST } from '../route'

const ENTITY_ID = 'a2907ffe-d574-4b3e-b56d-46c8db5f6d48'
const TOKEN = 'a'.repeat(64)

function getRequest() {
  const url = `http://localhost/api/governance/confirm-deletion?type=usecase&id=${ENTITY_ID}&token=${TOKEN}`
  return new NextRequest(url, { method: 'GET' })
}

describe('GET /api/governance/confirm-deletion', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('ne confirme pas la purge sur un GET (prefetch e-mail)', async () => {
    const res = await GET(getRequest())

    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toContain('text/html')
    const html = await res.text()
    expect(html).toContain('method="post"')
    expect(html).toContain(ENTITY_ID)
    expect(mockConfirmDeletionAndStart24hTimer).not.toHaveBeenCalled()
  })

  test('redirige si le jeton GET est invalide', async () => {
    const res = await GET(
      new NextRequest('http://localhost/api/governance/confirm-deletion?type=usecase', {
        method: 'GET',
      })
    )

    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toContain('purge_error=invalid_token')
    expect(mockConfirmDeletionAndStart24hTimer).not.toHaveBeenCalled()
  })
})

describe('POST /api/governance/confirm-deletion', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockConfirmDeletionAndStart24hTimer.mockResolvedValue({
      ok: true,
      status: 'purging_24h',
      purgeAvailableAt: new Date().toISOString(),
    })
  })

  test('confirme via JSON', async () => {
    const res = await POST(
      new NextRequest('http://localhost/api/governance/confirm-deletion', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ type: 'usecase', id: ENTITY_ID, token: TOKEN }),
      })
    )

    expect(res.status).toBe(200)
    expect(mockConfirmDeletionAndStart24hTimer).toHaveBeenCalledWith({
      entityType: 'usecase',
      entityId: ENTITY_ID,
      rawToken: TOKEN,
    })
    const body = await res.json()
    expect(body.status).toBe('purging_24h')
  })

  test('confirme via formulaire navigateur puis redirige', async () => {
    const res = await POST(
      new NextRequest('http://localhost/api/governance/confirm-deletion', {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: `type=usecase&id=${ENTITY_ID}&token=${TOKEN}`,
      })
    )

    expect(res.status).toBe(303)
    expect(res.headers.get('location')).toContain('purge_started=1')
    expect(mockConfirmDeletionAndStart24hTimer).toHaveBeenCalledTimes(1)
  })
})
