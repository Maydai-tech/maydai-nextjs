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
import { persistUseCaseSetup } from '../persist-usecase-setup'
import type { UseCaseSetupInsert } from '../setup-tool'

const COMPANY_ID = '550e8400-e29b-41d4-a716-446655440000'
const USECASE_ID = '660e8400-e29b-41d4-a716-446655440000'
const MODEL_ID = '770e8400-e29b-41d4-a716-446655440000'
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
  deployment_date: '24/08/2026',
}

function createSupabaseMock(matchedModelId: string | null) {
  const insert = jest.fn()
  let modelLookups = 0

  const supabase = {
    from: jest.fn((table: string) => {
      if (table === 'user_companies') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          maybeSingle: jest.fn().mockResolvedValue({
            data: { company_id: COMPANY_ID, role: 'owner' },
            error: null,
          }),
        }
      }

      if (table === 'compl_ai_models') {
        modelLookups += 1
        return {
          select: jest.fn().mockReturnThis(),
          ilike: jest.fn().mockReturnThis(),
          limit: jest.fn().mockReturnThis(),
          maybeSingle: jest.fn().mockResolvedValue({
            data: matchedModelId && modelLookups === 1 ? { id: matchedModelId } : null,
            error: null,
          }),
        }
      }

      if (table === 'usecases') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockResolvedValue({ count: 0, error: null }),
          insert: (payload: unknown) => {
            insert(payload)
            return {
              select: jest.fn().mockReturnThis(),
              single: jest.fn().mockResolvedValue({
                data: { id: USECASE_ID },
                error: null,
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

describe('persistUseCaseSetup — date et modèle catalogue', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    getRegistryOwnerPlan.mockResolvedValue({
      planInfo: { maxUseCasesPerRegistry: 3 },
    })
    recordUseCaseHistory.mockResolvedValue({ success: true })
  })

  test('persiste deployment_date et primary_model_id si le modèle catalogue matche', async () => {
    const { supabase, insert } = createSupabaseMock(MODEL_ID)

    const result = await persistUseCaseSetup(supabase as never, user, COMPANY_ID, setup)

    expect(result).toEqual({ ok: true, usecaseId: USECASE_ID })
    const payload = insert.mock.calls[0][0][0]
    expect(payload.deployment_date).toBe('2026-08-24')
    expect(payload.primary_model_id).toBe(MODEL_ID)
  })

  test('laisse primary_model_id null sans correspondance catalogue', async () => {
    const { supabase, insert } = createSupabaseMock(null)

    const result = await persistUseCaseSetup(supabase as never, user, COMPANY_ID, {
      ...setup,
      llm_model_version: 'Modèle maison',
      deployment_date: null,
    })

    expect(result).toEqual({ ok: true, usecaseId: USECASE_ID })
    const payload = insert.mock.calls[0][0][0]
    expect(payload.deployment_date).toBeNull()
    expect(payload.primary_model_id).toBeNull()
  })
})
