/** @jest-environment node */

import type { User } from '@supabase/supabase-js'
import { loadCompanyProfile, persistCompanyProfile } from '../persist-company-profile'

const COMPANY_ID = '550e8400-e29b-41d4-a716-446655440000'
const user = { id: 'user-1' } as User

function createSupabaseMock(options?: {
  userCompany?: { company_id: string } | null
  company?: Record<string, unknown> | null
  account?: Record<string, unknown> | null
  updateError?: { message: string } | null
}) {
  const {
    userCompany = { company_id: COMPANY_ID },
    company = {
      name: 'MaydAI',
      industry: 'tech_data',
      sub_category_id: 'ai_data',
      country: null,
      street_address: null,
      postal_code: null,
      city: 'Paris',
    },
    account = null,
    updateError = null,
  } = options ?? {}

  const update = jest.fn().mockReturnValue({
    eq: jest.fn().mockResolvedValue({ error: updateError }),
  })

  const supabase = {
    from: jest.fn((table: string) => {
      if (table === 'user_companies') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          maybeSingle: jest.fn().mockResolvedValue({
            data: userCompany,
            error: null,
          }),
        }
      }

      if (table === 'companies') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          maybeSingle: jest.fn().mockResolvedValue({ data: company, error: null }),
          update,
        }
      }

      if (table === 'profiles') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          maybeSingle: jest.fn().mockResolvedValue({ data: account, error: null }),
        }
      }

      throw new Error(`Table inattendue: ${table}`)
    }),
  }

  return { supabase, update }
}

describe('loadCompanyProfile', () => {
  test('retourne les champs entreprise après contrôle d’accès', async () => {
    const { supabase } = createSupabaseMock()
    const result = await loadCompanyProfile(supabase as never, user, COMPANY_ID)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.profile.name).toBe('MaydAI')
    expect(result.profile.country).toBeNull()
    expect(result.profile.city).toBe('Paris')
  })

  test('complète le secteur depuis le compte si le registre est vide', async () => {
    const { supabase } = createSupabaseMock({
      company: {
        name: 'Filiale Lyon',
        industry: null,
        sub_category_id: null,
        country: null,
        street_address: null,
        postal_code: null,
        city: null,
      },
      account: {
        company_name: 'MaydAI SAS',
        industry: 'tech_data',
        sub_category_id: 'ai_data',
      },
    })
    const result = await loadCompanyProfile(supabase as never, user, COMPANY_ID)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.profile.industry).toBe('tech_data')
    expect(result.profile.sub_category_id).toBe('ai_data')
    expect(result.sources.industry).toBe('account')
  })

  test('refuse un utilisateur sans accès', async () => {
    const { supabase } = createSupabaseMock({ userCompany: null })
    const result = await loadCompanyProfile(supabase as never, user, COMPANY_ID)
    expect(result).toEqual({
      ok: false,
      status: 403,
      error: 'Registre introuvable ou accès refusé',
      code: 'ACCESS_DENIED',
    })
  })
})

describe('persistCompanyProfile', () => {
  test('met à jour le registre avec les champs confirmés', async () => {
    const { supabase, update } = createSupabaseMock()
    const result = await persistCompanyProfile(supabase as never, user, COMPANY_ID, {
      is_confirmed: true,
      industry: 'tech_data',
      sub_category_id: 'ai_data',
      country: 'France',
      street_address: '10 rue de la Paix',
      postal_code: '75002',
      city: 'Paris',
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.profile.street_address).toBe('10 rue de la Paix')
    expect(result.profile.sub_category_id).toBe('ai_data')
    expect(result.profile.city).toBe('Paris')
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        industry: 'tech_data',
        sub_category_id: 'ai_data',
        country: 'France',
        street_address: '10 rue de la Paix',
        postal_code: '75002',
        city: 'Paris',
      })
    )
  })

  test('conserve l’adresse déjà en base si le tool envoie un champ vide', async () => {
    const { supabase, update } = createSupabaseMock({
      company: {
        name: 'MaydAI',
        industry: 'tech_data',
        sub_category_id: 'ai_data',
        country: 'France',
        street_address: '10 rue de la Paix',
        postal_code: '75002',
        city: 'Paris',
      },
    })
    const result = await persistCompanyProfile(supabase as never, user, COMPANY_ID, {
      is_confirmed: true,
      industry: 'tech_data',
      sub_category_id: null,
      country: 'France',
      street_address: null,
      postal_code: null,
      city: 'Paris',
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.profile.street_address).toBe('10 rue de la Paix')
    expect(result.profile.sub_category_id).toBe('ai_data')
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        street_address: '10 rue de la Paix',
        postal_code: '75002',
        sub_category_id: 'ai_data',
      })
    )
  })
})
