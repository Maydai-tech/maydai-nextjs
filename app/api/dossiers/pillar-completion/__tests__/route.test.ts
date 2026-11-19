/** @jest-environment node */

process.env.NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321'
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'anon-key'

const mockGetAuthenticatedSupabaseClient = jest.fn()
const mockUpdateDossierPillarCompletion = jest.fn()

jest.mock('@/lib/api-auth', () => ({
  getAuthenticatedSupabaseClient: (...args: unknown[]) => mockGetAuthenticatedSupabaseClient(...args),
}))

jest.mock('@/lib/services/system-card-service', () => ({
  updateDossierPillarCompletion: (...args: unknown[]) => mockUpdateDossierPillarCompletion(...args),
}))

import { NextRequest } from 'next/server'
import { POST } from '../route'

const USECASE_ID = '33333333-3333-4333-8333-333333333333'
const DOSSIER_ID = '44444444-4444-4444-8444-444444444444'
const COMPANY_ID = '55555555-5555-4555-8555-555555555555'

function makeRequest(body: unknown, withAuth = true) {
  const headers: Record<string, string> = { 'content-type': 'application/json' }
  if (withAuth) headers.authorization = 'Bearer test-token'
  return new NextRequest('http://localhost/api/dossiers/pillar-completion', {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })
}

function createSupabaseMock() {
  return {
    from: jest.fn((table: string) => {
      const chain: Record<string, jest.Mock> = {}
      chain.select = jest.fn(() => chain)
      chain.eq = jest.fn(() => chain)
      chain.insert = jest.fn(() => chain)
      chain.update = jest.fn(() => chain)
      chain.single = jest.fn(async () => ({ data: { id: DOSSIER_ID }, error: null }))
      chain.maybeSingle = jest.fn(async () => {
        if (table === 'usecases') {
          return { data: { id: USECASE_ID, company_id: COMPANY_ID }, error: null }
        }
        if (table === 'user_companies') {
          return { data: { user_id: 'user-1' }, error: null }
        }
        if (table === 'dossiers') {
          return { data: { id: DOSSIER_ID, company_id: COMPANY_ID, usecase_id: USECASE_ID }, error: null }
        }
        return { data: { id: 'doc-1', form_data: {} }, error: null }
      })
      return chain
    }),
  }
}

describe('POST /api/dossiers/pillar-completion', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockUpdateDossierPillarCompletion.mockResolvedValue({ success: true, newStatus: 'incomplete' })
  })

  test('renvoie 401 si non authentifié', async () => {
    mockGetAuthenticatedSupabaseClient.mockRejectedValue(new Error('No authorization header'))
    const res = await POST(
      makeRequest({
        usecaseId: USECASE_ID,
        pillarCode: 'doc_technique',
        applyMaydaiPrefill: true,
      })
    )
    expect(res.status).toBe(401)
  })

  test('renvoie 400 si le payload est invalide', async () => {
    mockGetAuthenticatedSupabaseClient.mockResolvedValue({
      supabase: createSupabaseMock(),
      user: { id: 'user-1' },
    })
    const res = await POST(makeRequest({ usecaseId: USECASE_ID }))
    expect(res.status).toBe(400)
    expect(mockUpdateDossierPillarCompletion).not.toHaveBeenCalled()
  })

  test('applique le préremplissage MaydAI', async () => {
    mockGetAuthenticatedSupabaseClient.mockResolvedValue({
      supabase: createSupabaseMock(),
      user: { id: 'user-1' },
    })

    const res = await POST(
      makeRequest({
        usecaseId: USECASE_ID,
        dossierId: DOSSIER_ID,
        pillarCode: 'doc_technique',
        applyMaydaiPrefill: true,
        pillarId: '11111111-1111-4111-8111-111111111111',
      })
    )

    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({
      success: true,
      newStatus: 'incomplete',
      dossierId: DOSSIER_ID,
    })
    expect(mockUpdateDossierPillarCompletion).toHaveBeenCalledWith({
      usecaseId: USECASE_ID,
      dossierId: DOSSIER_ID,
      pillarCode: 'doc_technique',
      applyMaydaiPrefill: true,
      applyUserCompletion: undefined,
      pillarId: '11111111-1111-4111-8111-111111111111',
    })
  })

  test('accepte applyMaydaiPrefill: false pour un rollback', async () => {
    mockGetAuthenticatedSupabaseClient.mockResolvedValue({
      supabase: createSupabaseMock(),
      user: { id: 'user-1' },
    })

    const res = await POST(
      makeRequest({
        usecaseId: USECASE_ID,
        dossierId: DOSSIER_ID,
        pillarCode: 'doc_technique',
        applyMaydaiPrefill: false,
      })
    )

    expect(res.status).toBe(200)
    expect(mockUpdateDossierPillarCompletion).toHaveBeenCalledWith({
      usecaseId: USECASE_ID,
      dossierId: DOSSIER_ID,
      pillarCode: 'doc_technique',
      applyMaydaiPrefill: false,
      applyUserCompletion: undefined,
      pillarId: undefined,
    })
  })
})
