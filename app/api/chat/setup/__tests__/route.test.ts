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

import { NextRequest } from 'next/server'
import { getAuthenticatedSupabaseClient } from '@/lib/api-auth'
import { persistUseCaseSetup } from '@/lib/mistral/persist-usecase-setup'
import { DEFAULT_CONVERSATION_AGENT_ID } from '@/lib/mistral/agents'
import { SAVE_USECASE_SETUP_TOOL_NAME } from '@/lib/mistral/setup-tool'
import { POST } from '../route'

const COMPANY_ID = '550e8400-e29b-41d4-a716-446655440000'
const USECASE_ID = '660e8400-e29b-41d4-a716-446655440000'

const validSetup = {
  name: 'Assistant RH',
  description: 'Aide au tri des candidatures',
  deployment_phase: 'en_projet',
  responsible_service: 'Ressources Humaines (RH)',
  ai_category: 'Large Language Model (LLM)',
  system_type: 'Système autonome',
  deployment_countries: ['France'],
  technology_partner: 'Mistral',
  llm_model_version: 'Mistral Large',
}

function makeRequest(body: unknown, withAuth = true) {
  const headers: Record<string, string> = { 'content-type': 'application/json' }
  if (withAuth) headers.authorization = 'Bearer test-token'
  return new NextRequest('http://localhost/api/chat/setup', {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })
}

function mockToolCall(argumentsPayload: unknown) {
  agentsComplete.mockResolvedValue({
    choices: [
      {
        message: {
          content: '',
          toolCalls: [
            {
              function: {
                name: SAVE_USECASE_SETUP_TOOL_NAME,
                arguments:
                  typeof argumentsPayload === 'string'
                    ? argumentsPayload
                    : JSON.stringify(argumentsPayload),
              },
            },
          ],
        },
      },
    ],
  })
}

describe('POST /api/chat/setup', () => {
  const supabase = {}
  const user = { id: 'user-1' }

  beforeEach(() => {
    jest.clearAllMocks()
    ;(getAuthenticatedSupabaseClient as jest.Mock).mockResolvedValue({
      user,
      supabase,
    })
    ;(persistUseCaseSetup as jest.Mock).mockResolvedValue({ ok: true, usecaseId: USECASE_ID })
  })

  test('refuse une requête non authentifiée', async () => {
    ;(getAuthenticatedSupabaseClient as jest.Mock).mockRejectedValue(new Error('Unauthorized'))
    const response = await POST(
      makeRequest({ messages: [{ role: 'user', content: 'Bonjour' }] }, false)
    )
    expect(response.status).toBe(401)
    expect(agentsComplete).not.toHaveBeenCalled()
  })

  test('renvoie MESSAGE si l’agent répond en texte', async () => {
    agentsComplete.mockResolvedValue({
      choices: [{ message: { content: 'Quel est le nom du système ?', toolCalls: [] } }],
    })

    const response = await POST(
      makeRequest({
        company_id: COMPANY_ID,
        messages: [{ role: 'user', content: 'Je veux un outil RH' }],
      })
    )
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload).toEqual({ type: 'MESSAGE', content: 'Quel est le nom du système ?' })
    expect(persistUseCaseSetup).not.toHaveBeenCalled()
    expect(agentsComplete).toHaveBeenCalledWith(
      expect.objectContaining({
        agentId: DEFAULT_CONVERSATION_AGENT_ID,
        toolChoice: 'auto',
        tools: [
          expect.objectContaining({
            type: 'function',
            function: expect.objectContaining({ name: SAVE_USECASE_SETUP_TOOL_NAME }),
          }),
        ],
      })
    )
  })

  test('insère le cas d’usage et renvoie usecase_id au TOOL_CALL', async () => {
    mockToolCall(validSetup)

    const response = await POST(
      makeRequest({
        company_id: COMPANY_ID,
        messages: [{ role: 'user', content: 'Voici toutes les infos.' }],
      })
    )
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.type).toBe('TOOL_CALL')
    expect(payload.setupComplete).toBe(true)
    expect(payload.tool).toBe(SAVE_USECASE_SETUP_TOOL_NAME)
    expect(payload.data).toEqual(validSetup)
    expect(payload.usecase_id).toBe(USECASE_ID)
    expect(persistUseCaseSetup).toHaveBeenCalledWith(supabase, user, COMPANY_ID, validSetup)
  })

  test('retourne 400 si le TOOL_CALL n’a pas de company_id', async () => {
    mockToolCall(validSetup)

    const response = await POST(
      makeRequest({
        messages: [{ role: 'user', content: 'Voici toutes les infos.' }],
      })
    )
    expect(response.status).toBe(400)
    expect(persistUseCaseSetup).not.toHaveBeenCalled()
  })

  test('propage l’erreur d’insertion (accès refusé)', async () => {
    mockToolCall(validSetup)
    ;(persistUseCaseSetup as jest.Mock).mockResolvedValue({
      ok: false,
      status: 403,
      error: 'Registre introuvable ou accès refusé',
      code: 'ACCESS_DENIED',
    })

    const response = await POST(
      makeRequest({
        company_id: COMPANY_ID,
        messages: [{ role: 'user', content: 'Terminé' }],
      })
    )
    const payload = await response.json()

    expect(response.status).toBe(403)
    expect(payload.code).toBe('ACCESS_DENIED')
  })

  test('retourne 422 si le tool_call a des enums invalides', async () => {
    mockToolCall({ ...validSetup, system_type: 'Pas un enum' })

    const response = await POST(
      makeRequest({
        company_id: COMPANY_ID,
        messages: [{ role: 'user', content: 'Terminé' }],
      })
    )
    expect(response.status).toBe(422)
    expect(persistUseCaseSetup).not.toHaveBeenCalled()
  })
})
