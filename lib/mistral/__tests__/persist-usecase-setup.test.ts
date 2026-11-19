/** @jest-environment node */

const getRegistryOwnerPlan = jest.fn()
const recordUseCaseHistory = jest.fn()

jest.mock('@/lib/subscription/user-plan', () => ({
  getRegistryOwnerPlan: (...args: unknown[]) => getRegistryOwnerPlan(...args),
}))

jest.mock('@/lib/usecase-history', () => ({
  recordUseCaseHistory: (...args: unknown[]) => recordUseCaseHistory(...args),
}))

import type { User } from '@supabase/supabase-js'
import { QUESTIONNAIRE_VERSION_V3 } from '@/lib/questionnaire-version'
import { parseCompanyId, persistUseCaseSetup } from '../persist-usecase-setup'
import type { UseCaseSetupInsert } from '../setup-tool'

const COMPANY_ID = '550e8400-e29b-41d4-a716-446655440000'
const USECASE_ID = '660e8400-e29b-41d4-a716-446655440000'
const user = { id: 'user-1' } as User

const setup: UseCaseSetupInsert = {
  name: 'Assistant RH',
  description: 'Tri de CV',
  deployment_phase: 'en_projet',
  responsible_service: 'Ressources Humaines (RH)',
  ai_category: 'Large Language Model (LLM)',
  system_type: 'Système autonome',
  deployment_countries: ['France'],
  technology_partner: 'Mistral',
  llm_model_version: 'Mistral Large',
}

function createSupabaseMock(options?: {
  userCompany?: { company_id: string; role: string } | null
  userCompanyError?: { message: string } | null
  count?: number
  countError?: { message: string } | null
  insertedId?: string | null
  insertError?: { message: string } | null
}) {
  const {
    userCompany = { company_id: COMPANY_ID, role: 'owner' },
    userCompanyError = null,
    count = 0,
    countError = null,
    insertedId = USECASE_ID,
    insertError = null,
  } = options ?? {}

  const insert = jest.fn()

  const supabase = {
    from: jest.fn((table: string) => {
      if (table === 'user_companies') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          maybeSingle: jest.fn().mockResolvedValue({
            data: userCompany,
            error: userCompanyError,
          }),
        }
      }

      if (table === 'usecases') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockResolvedValue({ count, error: countError }),
          insert: (payload: unknown) => {
            insert(payload)
            return {
              select: jest.fn().mockReturnThis(),
              single: jest.fn().mockResolvedValue({
                data: insertedId ? { id: insertedId } : null,
                error: insertError,
              }),
            }
          },
        }
      }

      throw new Error(`Table inattendue: ${table}`)
    }),
  }

  return { supabase, insert }
}

describe('parseCompanyId', () => {
  test('accepte un UUID valide', () => {
    expect(parseCompanyId(COMPANY_ID)).toBe(COMPANY_ID)
  })

  test('rejette une valeur invalide', () => {
    expect(parseCompanyId('not-a-uuid')).toBeNull()
    expect(parseCompanyId(null)).toBeNull()
    expect(parseCompanyId(undefined)).toBeNull()
  })
})

describe('persistUseCaseSetup', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    getRegistryOwnerPlan.mockResolvedValue({
      planInfo: { maxUseCasesPerRegistry: 3 },
    })
    recordUseCaseHistory.mockResolvedValue({ success: true })
  })

  test('insère un draft V3 avec company_id et retourne usecase_id', async () => {
    const { supabase, insert } = createSupabaseMock()

    const result = await persistUseCaseSetup(supabase as never, user, COMPANY_ID, setup)

    expect(result).toEqual({ ok: true, usecaseId: USECASE_ID })
    expect(insert).toHaveBeenCalledTimes(1)
    const payload = insert.mock.calls[0][0][0]
    expect(payload).toEqual(
      expect.objectContaining({
        ...setup,
        company_id: COMPANY_ID,
        status: 'draft',
        questionnaire_version: QUESTIONNAIRE_VERSION_V3,
        path_mode: null,
        updated_by: user.id,
      })
    )
    expect(recordUseCaseHistory).toHaveBeenCalledWith(
      supabase,
      USECASE_ID,
      user.id,
      'created'
    )
  })

  test('refuse un utilisateur sans accès au registre', async () => {
    const { supabase, insert } = createSupabaseMock({ userCompany: null })

    const result = await persistUseCaseSetup(supabase as never, user, COMPANY_ID, setup)

    expect(result).toEqual({
      ok: false,
      status: 403,
      error: 'Registre introuvable ou accès refusé',
      code: 'ACCESS_DENIED',
    })
    expect(insert).not.toHaveBeenCalled()
  })

  test('refuse si la limite du plan est atteinte', async () => {
    const { supabase, insert } = createSupabaseMock({ count: 3 })

    const result = await persistUseCaseSetup(supabase as never, user, COMPANY_ID, setup)

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.status).toBe(403)
    expect(result.code).toBe('PLAN_LIMIT_REACHED')
    expect(insert).not.toHaveBeenCalled()
  })
})
