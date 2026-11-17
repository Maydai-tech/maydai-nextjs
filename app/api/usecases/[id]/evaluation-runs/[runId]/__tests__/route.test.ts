/** @jest-environment node */

const mockGetAuthenticatedSupabaseClient = jest.fn()
const mockGetServiceRoleClient = jest.fn()
const mockCalculateAndPersistAuditIntegrityScore = jest.fn()
const mockCalculateAndPersistEngagementScore = jest.fn()

jest.mock('@/lib/api-auth', () => ({
  getAuthenticatedSupabaseClient: (...args: unknown[]) =>
    mockGetAuthenticatedSupabaseClient(...args),
}))

jest.mock('@/lib/maydai-calculator', () => ({
  getServiceRoleClient: (...args: unknown[]) => mockGetServiceRoleClient(...args),
}))

jest.mock('@/lib/services/governanceScoreService', () => ({
  calculateAndPersistAuditIntegrityScore: (...args: unknown[]) =>
    mockCalculateAndPersistAuditIntegrityScore(...args),
  calculateAndPersistEngagementScore: (...args: unknown[]) =>
    mockCalculateAndPersistEngagementScore(...args),
}))

import { NextRequest } from 'next/server'
import { PATCH } from '../route'

const USECASE_ID = 'a2907ffe-d574-4b3e-b56d-46c8db5f6d48'
const OTHER_USECASE_ID = 'd1111111-1111-4111-8111-111111111111'
const RUN_ID = '11111111-1111-4111-8111-111111111111'
const COMPANY_ID = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'
const USER_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'

const TELEMETRY = {
  keystrokes_count: 0,
  paste_events_count: 1,
  pasted_chars_count: 80,
  total_chars_count: 100,
}

function request(body: unknown) {
  return new NextRequest(
    `http://localhost/api/usecases/${USECASE_ID}/evaluation-runs/${RUN_ID}`,
    {
      method: 'PATCH',
      headers: {
        authorization: 'Bearer test-token',
        'content-type': 'application/json',
      },
      body: JSON.stringify(body),
    }
  )
}

const params = Promise.resolve({ id: USECASE_ID, runId: RUN_ID })

function makeUserClient(options: {
  run?: { data: unknown; error: unknown }
  membership?: { data: unknown; error: unknown }
}) {
  const runResult = options.run ?? {
    data: null,
    error: { code: 'PGRST116' },
  }
  const membershipResult = options.membership ?? {
    data: null,
    error: { code: 'PGRST116' },
  }
  const runUpdateIs = jest.fn().mockResolvedValue({ error: null })

  return {
    from: (table: string) => {
      if (table === 'evaluation_path_runs') {
        return {
          select: () => ({
            eq: () => ({
              single: () => Promise.resolve(runResult),
            }),
          }),
          update: () => ({
            eq: () => ({
              is: runUpdateIs,
            }),
          }),
        }
      }
      if (table === 'user_companies') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                single: () => Promise.resolve(membershipResult),
              }),
            }),
          }),
        }
      }
      if (table === 'usecases') {
        return {
          select: () => ({
            eq: () => ({
              single: () =>
                Promise.resolve({
                  data: { classification_status: 'qualified', risk_level: 'high' },
                  error: null,
                }),
            }),
          }),
        }
      }
      throw new Error(`unexpected table ${table}`)
    },
    runUpdateIs,
  }
}

describe('PATCH /api/usecases/[id]/evaluation-runs/[runId]', () => {
  const telemetryEq = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    telemetryEq.mockResolvedValue({ error: null })
    mockGetServiceRoleClient.mockReturnValue({
      from: (table: string) => {
        if (table !== 'usecases') throw new Error(`unexpected service table ${table}`)
        return {
          update: () => ({
            eq: telemetryEq,
          }),
        }
      },
    })
    mockCalculateAndPersistAuditIntegrityScore.mockResolvedValue(undefined)
    mockCalculateAndPersistEngagementScore.mockResolvedValue(undefined)
  })

  test('refuse sans authentification et n’écrit pas la télémétrie', async () => {
    mockGetAuthenticatedSupabaseClient.mockRejectedValue(new Error('No authorization header'))

    const res = await PATCH(request({ input_telemetry: TELEMETRY }), { params })

    expect(res.status).toBe(401)
    expect(telemetryEq).not.toHaveBeenCalled()
  })

  test('n’écrit pas la télémétrie si le run est introuvable (IDOR)', async () => {
    mockGetAuthenticatedSupabaseClient.mockResolvedValue({
      user: { id: USER_ID },
      supabase: makeUserClient({}),
    })

    const res = await PATCH(request({ input_telemetry: TELEMETRY }), { params })

    expect(res.status).toBe(404)
    expect(telemetryEq).not.toHaveBeenCalled()
  })

  test('n’écrit pas la télémétrie si le run appartient à un autre cas', async () => {
    mockGetAuthenticatedSupabaseClient.mockResolvedValue({
      user: { id: USER_ID },
      supabase: makeUserClient({
        run: {
          data: {
            id: RUN_ID,
            usecase_id: OTHER_USECASE_ID,
            company_id: COMPANY_ID,
            started_at: new Date().toISOString(),
            completed_at: null,
          },
          error: null,
        },
      }),
    })

    const res = await PATCH(request({ input_telemetry: TELEMETRY }), { params })

    expect(res.status).toBe(400)
    expect(telemetryEq).not.toHaveBeenCalled()
  })

  test('n’écrit pas la télémétrie si l’utilisateur n’a pas accès à l’entreprise', async () => {
    mockGetAuthenticatedSupabaseClient.mockResolvedValue({
      user: { id: USER_ID },
      supabase: makeUserClient({
        run: {
          data: {
            id: RUN_ID,
            usecase_id: USECASE_ID,
            company_id: COMPANY_ID,
            started_at: new Date().toISOString(),
            completed_at: null,
          },
          error: null,
        },
        membership: { data: null, error: { message: 'not found' } },
      }),
    })

    const res = await PATCH(request({ input_telemetry: TELEMETRY }), { params })

    expect(res.status).toBe(403)
    expect(telemetryEq).not.toHaveBeenCalled()
  })

  test('écrit la télémétrie après l’ACL pour un membre du registre', async () => {
    mockGetAuthenticatedSupabaseClient.mockResolvedValue({
      user: { id: USER_ID },
      supabase: makeUserClient({
        run: {
          data: {
            id: RUN_ID,
            usecase_id: USECASE_ID,
            company_id: COMPANY_ID,
            started_at: new Date(Date.now() - 60_000).toISOString(),
            completed_at: null,
          },
          error: null,
        },
        membership: { data: { company_id: COMPANY_ID }, error: null },
      }),
    })

    const res = await PATCH(request({ input_telemetry: TELEMETRY }), { params })

    expect(res.status).toBe(200)
    expect(telemetryEq).toHaveBeenCalledWith('id', USECASE_ID)
    expect(mockCalculateAndPersistAuditIntegrityScore).toHaveBeenCalledWith(USECASE_ID)
  })
})
