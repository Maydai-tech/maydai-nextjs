/** @jest-environment node */
// Parcours insert + relecture : client JWT pour usecases / user_companies,
// client service role pour evaluation_path_runs (mocké ici).

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(),
}))

jest.mock('@/lib/api-auth', () => ({
  getAuthenticatedSupabaseClient: jest.fn(),
}))

import { createClient } from '@supabase/supabase-js'
import { NextRequest } from 'next/server'
import { POST } from '../route'
import { getAuthenticatedSupabaseClient } from '@/lib/api-auth'

const USECASE_ID = 'a2907ffe-d574-4b3e-b56d-46c8db5f6d48'
const RUN_ID = '11111111-1111-4111-8111-111111111111'
const SERVICE_KEY = 'test-service-role-key'

function fluentSelectEnd(maybeSingleResult: Promise<{ data: unknown; error: unknown }>) {
  const b: Record<string, unknown> = {}
  b.select = () => b
  b.eq = () => b
  b.is = () => b
  b.order = () => b
  b.limit = () => b
  b.maybeSingle = () => maybeSingleResult
  return b
}

function usecaseChain() {
  const b: Record<string, unknown> = {}
  b.select = () => b
  b.eq = () => b
  b.single = () =>
    Promise.resolve({
      data: {
        id: USECASE_ID,
        company_id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
        questionnaire_version: 3,
        system_type: null,
      },
      error: null,
    })
  return b
}

function userCompanyChain() {
  const b: Record<string, unknown> = {}
  b.select = () => b
  b.eq = () => b
  b.single = () =>
    Promise.resolve({
      data: { company_id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc' },
      error: null,
    })
  return b
}

function usecaseServiceProbeChain(probeData: { id: string; company_id: string } | null) {
  const b: Record<string, unknown> = {}
  b.select = () => b
  b.eq = () => b
  b.maybeSingle = () => Promise.resolve({ data: probeData, error: null })
  return b
}

function makeRunsSupabase(opts?: { serviceRoleSeesUseCase: boolean }) {
  const serviceRoleSeesUseCase = opts?.serviceRoleSeesUseCase !== false
  let evaluationPathRunsFromCount = 0
  const insertMock = jest.fn().mockResolvedValue({ data: null, error: null })
  const supabaseRuns = {
    from: (table: string) => {
      if (table === 'usecases') {
        return usecaseServiceProbeChain(
          serviceRoleSeesUseCase
            ? { id: USECASE_ID, company_id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc' }
            : null
        )
      }
      if (table === 'evaluation_path_runs') {
        evaluationPathRunsFromCount += 1
        if (evaluationPathRunsFromCount === 1) {
          return fluentSelectEnd(Promise.resolve({ data: null, error: null }))
        }
        if (evaluationPathRunsFromCount === 2) {
          return { insert: insertMock }
        }
        return fluentSelectEnd(Promise.resolve({ data: { id: RUN_ID }, error: null }))
      }
      throw new Error(`runs client unexpected table ${table}`)
    },
  }
  return { supabaseRuns, insertMock, getEvaluationPathRunsFromCount: () => evaluationPathRunsFromCount }
}

describe('POST evaluation-runs/start insert + readback', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://test.supabase.local'
    process.env.SUPABASE_SERVICE_ROLE_KEY = SERVICE_KEY
  })

  test('JWT pour accès use case ; service role pour insert + relire id', async () => {
    const userSupabase = {
      from: (table: string) => {
        if (table === 'usecases') return usecaseChain()
        if (table === 'user_companies') return userCompanyChain()
        throw new Error(`JWT client must not query ${table}`)
      },
    }

    const { supabaseRuns, insertMock, getEvaluationPathRunsFromCount } = makeRunsSupabase()
    ;(createClient as jest.Mock).mockImplementation((_url: string, key: string) => {
      if (key === SERVICE_KEY) return supabaseRuns
      throw new Error(`unexpected createClient key`)
    })

    ;(getAuthenticatedSupabaseClient as jest.Mock).mockResolvedValue({
      supabase: userSupabase,
      user: { id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' },
    })

    const request = new NextRequest(`http://localhost/api/usecases/${USECASE_ID}/evaluation-runs/start`, {
      method: 'POST',
      body: JSON.stringify({
        path_mode: 'short',
        entry_surface: 'synthesis_v3_reeval_short',
        questionnaire_version: 3,
      }),
      headers: { 'content-type': 'application/json' },
    })

    const response = await POST(request, { params: Promise.resolve({ id: USECASE_ID }) })
    expect(response.status).toBe(200)
    const json = await response.json()
    expect(json).toEqual({ run_id: RUN_ID, reused: false })
    expect(insertMock).toHaveBeenCalledTimes(1)
    expect(getEvaluationPathRunsFromCount()).toBe(3)
    expect(createClient).toHaveBeenCalledWith('http://test.supabase.local', SERVICE_KEY)
  })

  test('200 skipped si le service role ne voit pas le use case (tracking best effort)', async () => {
    const userSupabase = {
      from: (table: string) => {
        if (table === 'usecases') return usecaseChain()
        if (table === 'user_companies') return userCompanyChain()
        throw new Error(`JWT client must not query ${table}`)
      },
    }

    const { supabaseRuns } = makeRunsSupabase({ serviceRoleSeesUseCase: false })
    ;(createClient as jest.Mock).mockImplementation((_url: string, key: string) => {
      if (key === SERVICE_KEY) return supabaseRuns
      throw new Error(`unexpected createClient key`)
    })

    ;(getAuthenticatedSupabaseClient as jest.Mock).mockResolvedValue({
      supabase: userSupabase,
      user: { id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' },
    })

    const request = new NextRequest(`http://localhost/api/usecases/${USECASE_ID}/evaluation-runs/start`, {
      method: 'POST',
      body: JSON.stringify({
        path_mode: 'short',
        entry_surface: 'synthesis_v3_reeval_short',
        questionnaire_version: 3,
      }),
      headers: { 'content-type': 'application/json' },
    })

    const response = await POST(request, { params: Promise.resolve({ id: USECASE_ID }) })
    expect(response.status).toBe(200)
    const json = await response.json()
    expect(json).toEqual({
      run_id: null,
      reused: false,
      skipped: true,
      reason: 'run_tracking_failed',
      step: 'service_role_probe',
    })
  })
})
