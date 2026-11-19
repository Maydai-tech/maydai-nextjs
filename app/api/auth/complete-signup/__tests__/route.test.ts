/** @jest-environment node */

const mockGetAuthenticatedSupabaseClient = jest.fn()
const mockCalculateAndSaveProfileCompleteness = jest.fn()
const mockRevalidatePath = jest.fn()

jest.mock('@/lib/api-auth', () => ({
  getAuthenticatedSupabaseClient: (...args: unknown[]) =>
    mockGetAuthenticatedSupabaseClient(...args),
}))

jest.mock('@/lib/services/profileScoreService', () => {
  const actual = jest.requireActual('@/lib/services/profileScoreService')
  return {
    ...actual,
    calculateAndSaveProfileCompleteness: (...args: unknown[]) =>
      mockCalculateAndSaveProfileCompleteness(...args),
  }
})

jest.mock('next/cache', () => ({
  revalidatePath: (...args: unknown[]) => mockRevalidatePath(...args),
}))

import { NextRequest } from 'next/server'
import { POST } from '../route'

const USER_ID = '11111111-1111-4111-8111-111111111111'

function makeRequest(body: unknown) {
  return new NextRequest('http://localhost/api/auth/complete-signup', {
    method: 'POST',
    headers: {
      authorization: 'Bearer test-token',
      'content-type': 'application/json',
    },
    body: JSON.stringify(body),
  })
}

describe('POST /api/auth/complete-signup', () => {
  const upsert = jest.fn()
  const maybeSingle = jest.fn()
  const eq = jest.fn()
  const select = jest.fn()
  const from = jest.fn()
  const updateUser = jest.fn()

  const supabase = {
    from,
    auth: { updateUser },
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockGetAuthenticatedSupabaseClient.mockResolvedValue({
      user: { id: USER_ID },
      supabase,
    })
    mockCalculateAndSaveProfileCompleteness.mockResolvedValue(undefined)

    maybeSingle.mockResolvedValue({
      data: {
        first_name: 'Marie',
        last_name: 'Dupont',
        company_name: 'Acme',
        industry: 'tech_data',
        sub_category_id: 'saas',
        phone: '0612345678',
        siren: '732829320',
        gclid: 'old-gclid',
        utm_source: 'google',
        utm_medium: 'cpc',
        utm_campaign: 'brand',
      },
      error: null,
    })
    eq.mockReturnValue({ maybeSingle })
    select.mockImplementation(() => ({
      eq,
      single: jest.fn().mockResolvedValue({
        data: { id: USER_ID, first_name: 'Marie', siren: '732829320' },
        error: null,
      }),
    }))
    upsert.mockReturnValue({ select })
    from.mockReturnValue({ select, upsert })
  })

  test('ne nullifie pas le SIREN ni le téléphone d’un profil existant', async () => {
    const response = await POST(
      makeRequest({
        firstName: 'Marie',
        lastName: 'Dupont',
        companyName: 'Learning Gate Partner',
        mainIndustryId: 'tech_data',
        subCategoryId: 'saas',
        utm_source: 'learning_gate',
        utm_medium: 'partenariat',
      })
    )

    expect(response.status).toBe(200)
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        id: USER_ID,
        company_name: 'Learning Gate Partner',
        phone: '0612345678',
        siren: '732829320',
        gclid: 'old-gclid',
        utm_source: 'learning_gate',
        utm_medium: 'partenariat',
        utm_campaign: 'brand',
      }),
      { onConflict: 'id' }
    )
  })

  test('crée un profil partiel à nulls si aucune ligne n’existe encore', async () => {
    maybeSingle.mockResolvedValueOnce({ data: null, error: null })

    const response = await POST(makeRequest({ firstName: 'ArchitecteTest' }))

    expect(response.status).toBe(200)
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        id: USER_ID,
        first_name: 'ArchitecteTest',
        last_name: null,
        company_name: null,
        phone: null,
        siren: null,
      }),
      { onConflict: 'id' }
    )
  })
})
