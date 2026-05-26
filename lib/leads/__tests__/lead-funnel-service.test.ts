import type { SupabaseClient } from '@supabase/supabase-js'
import {
  LEAD_FUNNEL_STAGE,
  updateLeadFunnelStage,
} from '../lead-funnel-service'

const USER_ID = '11111111-1111-4111-8111-111111111111'
const LEAD_ID = '22222222-2222-4222-8222-222222222222'

function mockSupabaseAdmin(options: {
  leadsByUserId?: { id: string; funnel_stage: number | null; email: string | null }[]
  leadsByEmail?: { id: string; funnel_stage: number | null; email: string | null }[]
  authEmail?: string | null
  updateError?: string
}) {
  const updates: { id: string; funnel_stage: number }[] = []

  const from = jest.fn((table: string) => {
    if (table !== 'leads') {
      throw new Error(`Unexpected table: ${table}`)
    }
    return {
      select: jest.fn(() => ({
        eq: jest.fn((col: string, val: string) => {
          if (col === 'converted_to_user_id') {
            return Promise.resolve({
              data: options.leadsByUserId ?? [],
              error: null,
            })
          }
          if (col === 'email') {
            return {
              is: jest.fn(() =>
                Promise.resolve({
                  data: options.leadsByEmail ?? [],
                  error: null,
                })
              ),
            }
          }
          return Promise.resolve({ data: [], error: null })
        }),
      })),
      update: jest.fn((payload: { funnel_stage: number }) => ({
        eq: jest.fn((col: string, id: string) => {
          if (options.updateError) {
            return Promise.resolve({ error: { message: options.updateError } })
          }
          updates.push({ id, funnel_stage: payload.funnel_stage })
          return Promise.resolve({ error: null })
        }),
      })),
    }
  })

  const client = {
    from,
    auth: {
      admin: {
        getUserById: jest.fn(() =>
          Promise.resolve({
            data: {
              user: options.authEmail
                ? { email: options.authEmail }
                : null,
            },
            error: null,
          })
        ),
      },
    },
  } as unknown as SupabaseClient

  return { client, updates }
}

describe('updateLeadFunnelStage', () => {
  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => {})
    jest.spyOn(console, 'warn').mockImplementation(() => {})
    jest.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  test('avance le stage quand current < target', async () => {
    const { client, updates } = mockSupabaseAdmin({
      leadsByUserId: [
        { id: LEAD_ID, funnel_stage: 1, email: 'a@example.com' },
      ],
    })

    const result = await updateLeadFunnelStage(
      USER_ID,
      LEAD_FUNNEL_STAGE.REGISTRY,
      client
    )

    expect(result).toEqual({
      ok: true,
      updated: true,
      leadIds: [LEAD_ID],
      previousStages: [1],
      targetStage: LEAD_FUNNEL_STAGE.REGISTRY,
    })
    expect(updates).toEqual([
      { id: LEAD_ID, funnel_stage: LEAD_FUNNEL_STAGE.REGISTRY },
    ])
  })

  test('ne régresse pas quand current >= target', async () => {
    const { client, updates } = mockSupabaseAdmin({
      leadsByUserId: [
        { id: LEAD_ID, funnel_stage: 4, email: 'a@example.com' },
      ],
    })

    const result = await updateLeadFunnelStage(
      USER_ID,
      LEAD_FUNNEL_STAGE.USE_CASE,
      client
    )

    expect(result).toMatchObject({
      ok: true,
      updated: false,
      reason: 'already_at_or_beyond_target',
      leadIds: [LEAD_ID],
    })
    expect(updates).toHaveLength(0)
  })

  test('fallback email si pas de converted_to_user_id', async () => {
    const { client, updates } = mockSupabaseAdmin({
      leadsByUserId: [],
      leadsByEmail: [
        { id: LEAD_ID, funnel_stage: 0, email: 'lead@example.com' },
      ],
      authEmail: 'lead@example.com',
    })

    const result = await updateLeadFunnelStage(
      USER_ID,
      LEAD_FUNNEL_STAGE.SIGNED_UP,
      client
    )

    expect(result.ok).toBe(true)
    if (result.ok && result.updated) {
      expect(result.leadIds).toEqual([LEAD_ID])
    }
    expect(updates).toEqual([
      { id: LEAD_ID, funnel_stage: LEAD_FUNNEL_STAGE.SIGNED_UP },
    ])
  })

  test('rejette un targetStage invalide', async () => {
    const { client, updates } = mockSupabaseAdmin({})

    const result = await updateLeadFunnelStage(USER_ID, 99, client)

    expect(result).toMatchObject({ ok: false, targetStage: 99 })
    expect(updates).toHaveLength(0)
  })
})
