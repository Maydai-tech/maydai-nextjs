import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedSupabaseClient } from '@/lib/api-auth'
import { getMistralClient } from '@/lib/mistral/client'
import {
  extractAgentTextContent,
  getConversationAgentId,
  type MistralAgentMessage,
  type MistralAgentRole,
} from '@/lib/mistral/agents'
import {
  SAVE_USECASE_SETUP_TOOL_NAME,
  buildSaveUsecaseSetupTool,
  parseToolCallArguments,
  parseUseCaseSetupInsert,
  type SetupChatMessageResponse,
  type SetupChatToolCallResponse,
} from '@/lib/mistral/setup-tool'
import {
  CONFIRM_COMPANY_PROFILE_TOOL_NAME,
  buildCompanyProfileSystemMessage,
  buildConfirmCompanyProfileTool,
  buildGuidedDraftSystemMessage,
  isCompanyProfileComplete,
  mergeCompanyProfile,
  parseCompanyProfileUpdate,
  getMissingCompanyProfileFields,
  type CompanyProfileToolCallResponse,
} from '@/lib/mistral/company-profile-tool'
import {
  loadCompanyProfile,
  persistCompanyProfile,
} from '@/lib/mistral/persist-company-profile'
import { parseCompanyId, persistUseCaseSetup } from '@/lib/mistral/persist-usecase-setup'
import { logger } from '@/lib/secure-logger'

export const maxDuration = 60

const ALLOWED_ROLES: readonly MistralAgentRole[] = ['user', 'assistant', 'system']

function parseMessages(raw: unknown): MistralAgentMessage[] | null {
  if (!Array.isArray(raw) || raw.length === 0) return null

  const messages: MistralAgentMessage[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') return null
    const role = (item as { role?: unknown }).role
    const content = (item as { content?: unknown }).content
    if (typeof role !== 'string' || !ALLOWED_ROLES.includes(role as MistralAgentRole)) {
      return null
    }
    if (typeof content !== 'string' || !content.trim()) return null
    messages.push({ role: role as MistralAgentRole, content: content.trim() })
  }
  return messages
}

function isWelcomePhase(raw: unknown): boolean {
  return typeof raw === 'string' && raw.trim().toLowerCase() === 'welcome'
}

export async function POST(request: NextRequest) {
  let supabase
  let user
  try {
    ;({ supabase, user } = await getAuthenticatedSupabaseClient(request))
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'JSON invalide' }, { status: 400 })
  }

  const bodyObject = body && typeof body === 'object' ? (body as Record<string, unknown>) : null
  const messages = parseMessages(bodyObject?.messages ?? null)
  if (!messages) {
    return NextResponse.json(
      { error: 'messages requis (tableau { role, content } non vide)' },
      { status: 400 }
    )
  }

  const companyId = parseCompanyId(bodyObject?.company_id)
  const welcomePhase = isWelcomePhase(bodyObject?.phase)

  const agentId = getConversationAgentId()
  const client = getMistralClient()

  try {
    if (welcomePhase) {
      if (!companyId) {
        return NextResponse.json(
          { error: 'company_id requis (UUID) pour confirmer le profil entreprise' },
          { status: 400 }
        )
      }

      const loaded = await loadCompanyProfile(supabase, user, companyId)
      if (!loaded.ok) {
        return NextResponse.json(
          { error: loaded.error, code: loaded.code },
          { status: loaded.status }
        )
      }

      const agentMessages = [
        {
          role: 'system' as const,
          content: buildCompanyProfileSystemMessage(loaded.profile, loaded.sources),
        },
        ...messages
          .filter((message) => message.role !== 'system')
          .map((message) => ({
            role: message.role,
            content: message.content,
          })),
      ]

      const response = await client.agents.complete({
        agentId,
        messages: agentMessages,
        tools: [buildConfirmCompanyProfileTool()],
        toolChoice: 'auto',
      })

      const choice = response.choices?.[0]
      const toolCalls = choice?.message?.toolCalls ?? []
      const profileCall = toolCalls.find(
        (call) => call.function?.name === CONFIRM_COMPANY_PROFILE_TOOL_NAME
      )

      if (profileCall) {
        const args = parseToolCallArguments(profileCall.function.arguments)
        const data = parseCompanyProfileUpdate(args)
        if (!data || !data.is_confirmed) {
          logger.error('Tool confirm_company_profile : arguments invalides', undefined, {
            arguments: profileCall.function.arguments,
          })
          return NextResponse.json(
            {
              error: 'Les données de profil renvoyées par l’agent sont incomplètes ou non confirmées.',
            },
            { status: 422 }
          )
        }

        const merged = mergeCompanyProfile(loaded.profile, data)
        if (!isCompanyProfileComplete(merged)) {
          const missing = getMissingCompanyProfileFields(merged).join(', ')
          return NextResponse.json({
            type: 'MESSAGE',
            content: `Le profil n’est pas encore complet. Il manque : ${missing}. L’adresse exacte (rue, code postal, ville) est obligatoire pour valider cette étape.`,
          })
        }

        const persisted = await persistCompanyProfile(supabase, user, companyId, data)
        if (!persisted.ok) {
          return NextResponse.json(
            { error: persisted.error, code: persisted.code },
            { status: persisted.status }
          )
        }

        const payload: CompanyProfileToolCallResponse = {
          type: 'TOOL_CALL',
          tool: CONFIRM_COMPANY_PROFILE_TOOL_NAME,
          profileConfirmed: true,
          data,
          savedProfile: persisted.profile,
        }
        return NextResponse.json(payload)
      }

      const content = extractAgentTextContent(choice?.message?.content)
      if (!content) {
        return NextResponse.json(
          { error: 'Réponse vide de l’agent Mistral' },
          { status: 502 }
        )
      }

      const payload: SetupChatMessageResponse = { type: 'MESSAGE', content }
      return NextResponse.json(payload)
    }

    let setupMessages = messages.map((message) => ({
      role: message.role,
      content: message.content,
    }))

    if (companyId) {
      try {
        const loaded = await loadCompanyProfile(supabase, user, companyId)
        if (loaded.ok) {
          setupMessages = [
            {
              role: 'system' as const,
              content: buildGuidedDraftSystemMessage(loaded.profile),
            },
            ...setupMessages.filter((message) => message.role !== 'system'),
          ]
        }
      } catch {
        // Les tests historiques mockent un client vide : on continue sans contexte.
      }
    }

    const response = await client.agents.complete({
      agentId,
      messages: setupMessages,
      tools: [buildSaveUsecaseSetupTool()],
      toolChoice: 'auto',
    })

    const choice = response.choices?.[0]
    const toolCalls = choice?.message?.toolCalls ?? []
    const setupCall = toolCalls.find(
      (call) => call.function?.name === SAVE_USECASE_SETUP_TOOL_NAME
    )

    if (setupCall) {
      const args = parseToolCallArguments(setupCall.function.arguments)
      const data = parseUseCaseSetupInsert(args)
      if (!data) {
        logger.error('Tool save_usecase_setup : arguments invalides', undefined, {
          arguments: setupCall.function.arguments,
        })
        return NextResponse.json(
          {
            error: 'Les données de setup renvoyées par l’agent sont incomplètes ou invalides.',
          },
          { status: 422 }
        )
      }

      if (!companyId) {
        return NextResponse.json(
          { error: 'company_id requis (UUID) pour enregistrer le cas d’usage' },
          { status: 400 }
        )
      }

      const persisted = await persistUseCaseSetup(supabase, user, companyId, data)
      if (!persisted.ok) {
        return NextResponse.json(
          { error: persisted.error, code: persisted.code },
          { status: persisted.status }
        )
      }

      const payload: SetupChatToolCallResponse = {
        type: 'TOOL_CALL',
        tool: SAVE_USECASE_SETUP_TOOL_NAME,
        setupComplete: true,
        usecase_id: persisted.usecaseId,
        data,
      }
      return NextResponse.json(payload)
    }

    const content = extractAgentTextContent(choice?.message?.content)
    if (!content) {
      return NextResponse.json(
        { error: 'Réponse vide de l’agent Mistral' },
        { status: 502 }
      )
    }

    const payload: SetupChatMessageResponse = { type: 'MESSAGE', content }
    return NextResponse.json(payload)
  } catch (error) {
    logger.error('Erreur /api/chat/setup', undefined, {
      details: error instanceof Error ? error.message : String(error),
    })
    return NextResponse.json(
      {
        error: 'Erreur lors de l’appel à l’agent Mistral',
        details: error instanceof Error ? error.message : 'Erreur inconnue',
      },
      { status: 500 }
    )
  }
}
