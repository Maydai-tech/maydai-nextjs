/** @jest-environment node */

const agentsComplete = jest.fn()

jest.mock('@/lib/mistral/client', () => ({
  getMistralClient: () => ({
    agents: { complete: agentsComplete },
  }),
}))

jest.mock('@/lib/api-auth', () => ({
  getAuthenticatedSupabaseClient: jest.fn(),
}))

jest.mock('@/lib/mistral/persist-usecase-setup', () => ({
  parseCompanyId: jest.requireActual('@/lib/mistral/persist-usecase-setup').parseCompanyId,
  persistUseCaseSetup: jest.fn(),
}))

jest.mock('@/lib/mistral/persist-company-profile', () => ({
  loadCompanyProfile: jest.fn(),
  persistCompanyProfile: jest.fn(),
}))

import { NextRequest } from 'next/server'
import { getAuthenticatedSupabaseClient } from '@/lib/api-auth'
import { loadCompanyProfile, persistCompanyProfile } from '@/lib/mistral/persist-company-profile'
import { CONFIRM_COMPANY_PROFILE_TOOL_NAME } from '@/lib/mistral/company-profile-tool'
import { POST } from '../route'

const COMPANY_ID = '550e8400-e29b-41d4-a716-446655440000'

function makeRequest(body: unknown) {
  return new NextRequest('http://localhost/api/chat/setup', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: 'Bearer test-token',
    },
    body: JSON.stringify(body),
  })
}

describe('POST /api/chat/setup phase welcome', () => {
  const supabase = {}
  const user = { id: 'user-1' }

  beforeEach(() => {
    jest.clearAllMocks()
    ;(getAuthenticatedSupabaseClient as jest.Mock).mockResolvedValue({ user, supabase })
    ;(loadCompanyProfile as jest.Mock).mockResolvedValue({
      ok: true,
      profile: {
        name: 'MaydAI',
        industry: null,
        sub_category_id: null,
        country: null,
        street_address: null,
        postal_code: null,
        city: null,
      },
    })
    ;(persistCompanyProfile as jest.Mock).mockResolvedValue({
      ok: true,
      profile: {
        name: 'MaydAI',
        industry: 'tech_data',
        sub_category_id: 'ai_data',
        country: 'France',
        street_address: '10 rue de la Paix',
        postal_code: '75002',
        city: 'Paris',
      },
    })
  })

  test('injecte le profil et le tool confirm_company_profile', async () => {
    agentsComplete.mockResolvedValue({
      choices: [{ message: { content: 'Quel est votre secteur ?', toolCalls: [] } }],
    })

    const response = await POST(
      makeRequest({
        phase: 'welcome',
        company_id: COMPANY_ID,
        messages: [{ role: 'user', content: 'Bonjour' }],
      })
    )
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload).toEqual({ type: 'MESSAGE', content: 'Quel est votre secteur ?' })
    expect(agentsComplete).toHaveBeenCalledWith(
      expect.objectContaining({
        tools: [
          expect.objectContaining({
            function: expect.objectContaining({ name: CONFIRM_COMPANY_PROFILE_TOOL_NAME }),
          }),
        ],
      })
    )
    const sentMessages = agentsComplete.mock.calls[0][0].messages as Array<{
      role: string
      content: string
    }>
    expect(sentMessages[0].role).toBe('system')
    expect(sentMessages[0].content).toContain('NON_RENSEIGNE')
  })

  test('met à jour companies et renvoie profileConfirmed', async () => {
    agentsComplete.mockResolvedValue({
      choices: [
        {
          message: {
            content: '',
            toolCalls: [
              {
                function: {
                  name: CONFIRM_COMPANY_PROFILE_TOOL_NAME,
                  arguments: JSON.stringify({
                    is_confirmed: true,
                    industry: 'tech_data',
                    sub_category_id: 'ai_data',
                    country: 'France',
                    street_address: '10 rue de la Paix',
                    postal_code: '75002',
                    city: 'Paris',
                  }),
                },
              },
            ],
          },
        },
      ],
    })

    const response = await POST(
      makeRequest({
        phase: 'welcome',
        company_id: COMPANY_ID,
        messages: [{ role: 'user', content: 'Oui c’est exact' }],
      })
    )
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.type).toBe('TOOL_CALL')
    expect(payload.profileConfirmed).toBe(true)
    expect(payload.tool).toBe(CONFIRM_COMPANY_PROFILE_TOOL_NAME)
    expect(payload.savedProfile.street_address).toBe('10 rue de la Paix')
    expect(persistCompanyProfile).toHaveBeenCalledWith(
      supabase,
      user,
      COMPANY_ID,
      expect.objectContaining({
        is_confirmed: true,
        industry: 'tech_data',
        country: 'France',
        city: 'Paris',
      })
    )
  })

  test('ne persiste pas si l’adresse exacte manque encore', async () => {
    agentsComplete.mockResolvedValue({
      choices: [
        {
          message: {
            content: '',
            toolCalls: [
              {
                function: {
                  name: CONFIRM_COMPANY_PROFILE_TOOL_NAME,
                  arguments: JSON.stringify({
                    is_confirmed: true,
                    industry: 'tech_data',
                    sub_category_id: 'ai_data',
                    country: 'France',
                    street_address: '',
                    postal_code: '',
                    city: 'Paris',
                  }),
                },
              },
            ],
          },
        },
      ],
    })

    const response = await POST(
      makeRequest({
        phase: 'welcome',
        company_id: COMPANY_ID,
        messages: [{ role: 'user', content: 'Je confirme' }],
      })
    )
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.type).toBe('MESSAGE')
    expect(payload.content).toContain('Rue')
    expect(persistCompanyProfile).not.toHaveBeenCalled()
  })

  test('refuse un welcome sans company_id', async () => {
    const response = await POST(
      makeRequest({
        phase: 'welcome',
        messages: [{ role: 'user', content: 'Bonjour' }],
      })
    )
    expect(response.status).toBe(400)
    expect(agentsComplete).not.toHaveBeenCalled()
  })
})

describe('POST /api/chat/setup phase setup — profil déjà validé', () => {
  const supabase = {}
  const user = { id: 'user-1' }

  beforeEach(() => {
    jest.clearAllMocks()
    ;(getAuthenticatedSupabaseClient as jest.Mock).mockResolvedValue({ user, supabase })
    ;(loadCompanyProfile as jest.Mock).mockResolvedValue({
      ok: true,
      profile: {
        name: 'Registre MaydAI SAS',
        industry: 'tech_data',
        sub_category_id: 'ai_data',
        country: 'France',
        street_address: '10 rue de la Paix',
        postal_code: '75002',
        city: 'Paris',
      },
    })
  })

  test('injecte le profil confirmé et interdit de le redemander', async () => {
    agentsComplete.mockResolvedValue({
      choices: [{ message: { content: 'Quel est le nom du cas d’usage ?', toolCalls: [] } }],
    })

    const response = await POST(
      makeRequest({
        phase: 'setup',
        company_id: COMPANY_ID,
        messages: [{ role: 'user', content: 'commençons par le nom du cas d’usage' }],
      })
    )
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.content).toBe('Quel est le nom du cas d’usage ?')
    const sentMessages = agentsComplete.mock.calls[0][0].messages as Array<{
      role: string
      content: string
    }>
    expect(sentMessages[0].role).toBe('system')
    expect(sentMessages[0].content).toContain('DÉJÀ validé')
    expect(sentMessages[0].content).toContain('Registre MaydAI SAS')
    expect(sentMessages[0].content).toContain('10 rue de la Paix')
  })
})
