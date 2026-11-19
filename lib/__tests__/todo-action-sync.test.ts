import { SupabaseClient } from '@supabase/supabase-js'
import {
  getTodoActionMapping,
  reverseTodoActionResponse,
  syncTodoActionToResponse,
} from '../todo-action-sync'

const mapping = getTodoActionMapping('technical_documentation')

if (!mapping?.negativeAnswerCode) {
  throw new Error('Fixture technical_documentation : mapping négatif requis pour P0.2')
}

/** Code option « Oui » (E5.N9.Q4.A). */
const USER_OUI = mapping.positiveAnswerCode
/** Code option « Non » (E5.N9.Q4.B). */
const USER_NON = mapping.negativeAnswerCode
const QUESTION_CODE = mapping.questionCode
const USECASE_ID = '00000000-0000-4000-8000-000000000001'
const USER_EMAIL = 'lead@maydai.io'
const TODO_ACTION = 'technical_documentation'

type MockSupabaseOptions = {
  initialSingleValue: string | null
  initialMetadata?: Record<string, unknown> | null
}

type MockSupabaseHarness = {
  supabase: SupabaseClient
  upsertCalls: Array<Record<string, unknown>>
}

function createMockSupabase(options: MockSupabaseOptions): MockSupabaseHarness {
  const upsertCalls: Array<Record<string, unknown>> = []

  let singleValue = options.initialSingleValue
  let metadata: Record<string, unknown> | null = options.initialMetadata ?? null

  const initialChecklistEnterprise =
    singleValue && singleValue.startsWith('E5.') ? [singleValue] : []

  let checklistEnterprise = [...initialChecklistEnterprise]

  const buildResponsesSelectChain = (fields: string) => {
    const chain: Record<string, jest.Mock> = {}

    chain.eq = jest.fn((column: string, value: unknown) => {
      if (column === 'usecase_id' && value === USECASE_ID) {
        return {
          eq: jest.fn((innerColumn: string, innerValue: unknown) => ({
            maybeSingle: jest.fn(async () => {
              if (innerColumn !== 'question_code' || innerValue !== QUESTION_CODE) {
                return { data: null, error: null }
              }
              if (fields === 'metadata') {
                return { data: { metadata }, error: null }
              }
              return { data: null, error: null }
            }),
          })),
          in: jest.fn(async (_innerColumn: string, codes: string[]) => {
            if (fields.includes('question_code') && fields.includes('metadata')) {
              return {
                data: codes.map((question_code) => ({
                  question_code,
                  metadata,
                })),
                error: null,
              }
            }

            if (fields.includes('single_value')) {
              if (singleValue === null) {
                return { data: [], error: null }
              }
              return {
                data: codes.map((question_code) => ({
                  question_code,
                  single_value: singleValue,
                  multiple_codes: null,
                  multiple_labels: null,
                  conditional_main: null,
                  conditional_keys: null,
                  conditional_values: null,
                })),
                error: null,
              }
            }

            return { data: [], error: null }
          }),
        }
      }

      return {
        eq: jest.fn(() => ({
          maybeSingle: jest.fn(async () => ({ data: null, error: null })),
        })),
        in: jest.fn(async () => ({ data: [], error: null })),
      }
    })

    return chain
  }

  const supabase = {
    from: jest.fn((table: string) => {
      if (table === 'usecases') {
        return {
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              single: jest.fn(async () => ({
                data: {
                  checklist_gov_enterprise: checklistEnterprise,
                  checklist_gov_usecase: [],
                },
                error: null,
              })),
            })),
          })),
          update: jest.fn((payload: Record<string, unknown>) => ({
            eq: jest.fn(async () => {
              if (Array.isArray(payload.checklist_gov_enterprise)) {
                checklistEnterprise = payload.checklist_gov_enterprise as string[]
              }
              return { error: null }
            }),
          })),
        }
      }

      if (table === 'usecase_responses') {
        return {
          select: jest.fn((fields: string) => buildResponsesSelectChain(fields)),
          upsert: jest.fn(async (payload: Record<string, unknown>) => {
            upsertCalls.push(payload)
            if ('single_value' in payload) {
              singleValue = payload.single_value as string | null
            }
            metadata = (payload.metadata as Record<string, unknown> | null) ?? null
            if (typeof singleValue === 'string' && singleValue.startsWith('E5.')) {
              checklistEnterprise = [singleValue]
            }
            return { error: null }
          }),
        }
      }

      return {}
    }),
  } as unknown as SupabaseClient

  return { supabase, upsertCalls }
}

describe('P0.2 - Sync & Reverse History Preservation', () => {
  test('Scénario 1 — utilisateur avait répondu « Oui » : préservation du score déclaré', async () => {
    /**
     * Valeur déclarée « Oui » distincte du code posé par le dossier (sync force le code canonique).
     * Simule une réponse utilisateur antérieure à conserver lors du reset.
     */
    const declaredOui = 'OUI'
    const { supabase, upsertCalls } = createMockSupabase({
      initialSingleValue: declaredOui,
    })

    await syncTodoActionToResponse(supabase, USECASE_ID, TODO_ACTION, USER_EMAIL)

    expect(upsertCalls).toHaveLength(1)
    expect(upsertCalls[0]).toEqual(
      expect.objectContaining({
        question_code: QUESTION_CODE,
        single_value: USER_OUI,
        metadata: { original_value: declaredOui },
      })
    )

    await reverseTodoActionResponse(supabase, USECASE_ID, TODO_ACTION, USER_EMAIL)

    expect(upsertCalls).toHaveLength(2)
    expect(upsertCalls[1]).toEqual(
      expect.objectContaining({
        question_code: QUESTION_CODE,
        single_value: declaredOui,
        metadata: {},
      })
    )
    expect(upsertCalls[1]?.single_value).not.toBe(USER_NON)
  })

  test('Scénario 2 — utilisateur avait répondu « Non » : restauration du malus légitime', async () => {
    const { supabase, upsertCalls } = createMockSupabase({
      initialSingleValue: USER_NON,
    })

    await syncTodoActionToResponse(supabase, USECASE_ID, TODO_ACTION, USER_EMAIL)

    expect(upsertCalls).toHaveLength(1)
    expect(upsertCalls[0]).toEqual(
      expect.objectContaining({
        question_code: QUESTION_CODE,
        single_value: USER_OUI,
        metadata: { original_value: USER_NON },
      })
    )

    await reverseTodoActionResponse(supabase, USECASE_ID, TODO_ACTION, USER_EMAIL)

    expect(upsertCalls).toHaveLength(2)
    expect(upsertCalls[1]).toEqual(
      expect.objectContaining({
        question_code: QUESTION_CODE,
        single_value: USER_NON,
        metadata: {},
      })
    )
  })

  test('Scénario 3 — utilisateur n’avait rien répondu : sanction par défaut (fallback Non)', async () => {
    const { supabase, upsertCalls } = createMockSupabase({
      initialSingleValue: null,
    })

    await syncTodoActionToResponse(supabase, USECASE_ID, TODO_ACTION, USER_EMAIL)

    expect(upsertCalls).toHaveLength(1)
    expect(upsertCalls[0]).toEqual(
      expect.objectContaining({
        question_code: QUESTION_CODE,
        single_value: USER_OUI,
        metadata: { original_value: USER_NON },
      })
    )

    await reverseTodoActionResponse(supabase, USECASE_ID, TODO_ACTION, USER_EMAIL)

    expect(upsertCalls).toHaveLength(2)
    expect(upsertCalls[1]).toEqual(
      expect.objectContaining({
        question_code: QUESTION_CODE,
        single_value: USER_NON,
        metadata: {},
      })
    )
  })
})
