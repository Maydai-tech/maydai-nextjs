import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedSupabaseClient } from '@/lib/api-auth'
import { getMistralClient } from '@/lib/mistral/client'
import {
  extractAgentTextContent,
  getEvaluationAgentId,
  type MistralAgentMessage,
  type MistralAgentRole,
} from '@/lib/mistral/agents'
import { parseToolCallArguments } from '@/lib/mistral/setup-tool'
import {
  SAVE_EVALUATION_NODES_TOOL_NAME,
  SAVE_SINGLE_ANSWER_TOOL_NAME,
  ANNEX_DOMAIN_MISMATCH_CODE,
  buildSaveEvaluationNodesTool,
  buildSaveSingleAnswerTool,
  parseEvaluationNodes,
  parseSingleAnswer,
  isStallingEvaluationMessage,
  isAnnexDomainMismatchSelection,
  type EvaluationChatMessageResponse,
  type EvaluationNewQuestionNodeResponse,
  type EvaluationNodes,
  type EvaluationNotStartedResponse,
  type EvaluationPathCompleteResponse,
} from '@/lib/mistral/evaluation-tool'
import {
  buildEvaluationContextSystemMessage,
  loadEvaluationContext,
  parseUsecaseId,
  type EvaluationProjectContext,
} from '@/lib/mistral/load-evaluation-context'
import { inferInitialEvaluationNodesFromReply } from '@/lib/mistral/infer-evaluation-nodes'
import { mapEvaluationNodesToAnswers, withAnnexIiiAccessControlGuard } from '@/lib/mistral/map-evaluation-nodes'
import {
  loadUsecaseGraphAnswers,
  upsertUsecaseGraphAnswers,
  type GraphAnswers,
} from '@/lib/mistral/persist-evaluation-answers'
import {
  CONVERSATIONAL_PATH_MODE,
  resolveNextEvaluationStep,
  resolveOptionCodesForQuestion,
} from '@/lib/mistral/evaluation-graph-orchestrator'
import { logger } from '@/lib/secure-logger'

function graphStep(answers: GraphAnswers, context: EvaluationProjectContext) {
  return resolveNextEvaluationStep(answers, context.system_type, CONVERSATIONAL_PATH_MODE, {
    name: context.name,
    description: context.description,
  })
}

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

function stepToResponse(
  step: ReturnType<typeof resolveNextEvaluationStep>,
  nodes?: EvaluationNodes
): EvaluationNewQuestionNodeResponse | EvaluationPathCompleteResponse {
  if (step.type === 'complete') {
    return { type: 'PATH_COMPLETE', ...(nodes ? { data: nodes } : {}) }
  }
  return {
    type: 'NEW_QUESTION_NODE',
    question: step.question,
    engineInstruction: step.engineInstruction,
    ...(nodes ? { data: nodes } : {}),
  }
}

function lastUserMessage(messages: MistralAgentMessage[]): string | null {
  const last = [...messages].reverse().find((message) => message.role === 'user')
  return last?.content ?? null
}

function persistableOptionValue(
  question: { type: string },
  code: string
): string | string[] {
  return question.type === 'checkbox' || question.type === 'tags' ? [code] : code
}

function persistableResolvedValue(
  question: { type: string },
  codes: string[]
): string | string[] {
  if (question.type === 'checkbox' || question.type === 'tags') return codes
  return persistableOptionValue(question, codes[0])
}

function projectText(context: EvaluationProjectContext): string {
  return `${context.name} ${context.description}`
}

function isQ5DomainMismatch(
  question: { id: string },
  userText: string | null,
  resolvedCode: string | null
): boolean {
  if (question.id !== 'E4.N7.Q5') return false
  if (resolvedCode === ANNEX_DOMAIN_MISMATCH_CODE) return true
  if (resolvedCode) return false
  return Boolean(userText && isAnnexDomainMismatchSelection(userText))
}

function answersAfterAnnexMismatch(answers: GraphAnswers): GraphAnswers {
  const next: GraphAnswers = { ...answers, 'E4.N7.Q2': ['E4.N7.Q2.G'] }
  delete next['E4.N7.Q5']
  return next
}

export async function GET(request: NextRequest) {
  let supabase
  let user
  try {
    ;({ supabase, user } = await getAuthenticatedSupabaseClient(request))
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const usecaseId = parseUsecaseId(new URL(request.url).searchParams.get('usecase_id'))
  if (!usecaseId) {
    return NextResponse.json({ error: 'usecase_id requis (UUID)' }, { status: 400 })
  }

  const loaded = await loadEvaluationContext(supabase, user, usecaseId)
  if (!loaded.ok) {
    return NextResponse.json(
      { error: loaded.error, code: loaded.code },
      { status: loaded.status }
    )
  }

  try {
    const answers = await loadUsecaseGraphAnswers(supabase, usecaseId)
    if (Object.keys(answers).length === 0) {
      const payload: EvaluationNotStartedResponse = { type: 'NOT_STARTED' }
      return NextResponse.json(payload)
    }

    const guarded = withAnnexIiiAccessControlGuard(
      answers,
      projectText(loaded.context)
    )
    if (guarded !== answers) {
      await upsertUsecaseGraphAnswers(supabase, user, usecaseId, {
        'E4.N7.Q2': guarded['E4.N7.Q2'],
      })
    }

    const step = graphStep(guarded, loaded.context)
    return NextResponse.json(stepToResponse(step))
  } catch (error) {
    logger.error('Erreur GET /api/chat/evaluation', undefined, {
      details: error instanceof Error ? error.message : String(error),
    })
    return NextResponse.json(
      { error: 'Impossible de reprendre l’évaluation' },
      { status: 500 }
    )
  }
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
  const usecaseId = parseUsecaseId(bodyObject?.usecase_id)
  if (!usecaseId) {
    return NextResponse.json({ error: 'usecase_id requis (UUID)' }, { status: 400 })
  }

  const messages = parseMessages(bodyObject?.messages ?? null)
  if (!messages) {
    return NextResponse.json(
      { error: 'messages requis (tableau { role, content } non vide)' },
      { status: 400 }
    )
  }

  const loaded = await loadEvaluationContext(supabase, user, usecaseId)
  if (!loaded.ok) {
    return NextResponse.json(
      { error: loaded.error, code: loaded.code },
      { status: loaded.status }
    )
  }

  const agentId = getEvaluationAgentId()
  const client = getMistralClient()

  try {
    const currentAnswersRaw = (await loadUsecaseGraphAnswers(supabase, usecaseId)) ?? {}
    const currentAnswers = withAnnexIiiAccessControlGuard(
      currentAnswersRaw,
      projectText(loaded.context)
    )
    const systemMessage: MistralAgentMessage = {
      role: 'system',
      content: buildEvaluationContextSystemMessage(loaded.context, currentAnswers),
    }
    if (currentAnswers !== currentAnswersRaw) {
      await upsertUsecaseGraphAnswers(supabase, user, usecaseId, {
        'E4.N7.Q2': currentAnswers['E4.N7.Q2'],
      })
    }
    const currentStep = graphStep(currentAnswers, loaded.context)
    const lastUser = lastUserMessage(messages)
    if (currentStep.type === 'question' && lastUser) {
      const resolvedCodes = resolveOptionCodesForQuestion(currentStep.question, lastUser)
      const resolvedFromUser = resolvedCodes?.[0] ?? null
      if (isQ5DomainMismatch(currentStep.question, lastUser, resolvedFromUser)) {
        const nextAnswers = answersAfterAnnexMismatch(currentAnswers)
        await upsertUsecaseGraphAnswers(supabase, user, usecaseId, {
          'E4.N7.Q2': nextAnswers['E4.N7.Q2'],
        })
        const nextStep = graphStep(nextAnswers, loaded.context)
        return NextResponse.json(stepToResponse(nextStep))
      }
      if (
        resolvedCodes &&
        resolvedCodes.length > 0 &&
        !resolvedCodes.includes(ANNEX_DOMAIN_MISMATCH_CODE)
      ) {
        const value = persistableResolvedValue(currentStep.question, resolvedCodes)
        await upsertUsecaseGraphAnswers(supabase, user, usecaseId, {
          [currentStep.question.id]: value,
        })
        const nextStep = graphStep(
          { ...currentAnswers, [currentStep.question.id]: value },
          loaded.context
        )
        return NextResponse.json(stepToResponse(nextStep))
      }

      if (!currentAnswers['E4.N7.Q1']) {
        const inferred = inferInitialEvaluationNodesFromReply(lastUser)
        if (inferred) {
          const mapped = withAnnexIiiAccessControlGuard(
            mapEvaluationNodesToAnswers(inferred),
            projectText(loaded.context)
          )
          await upsertUsecaseGraphAnswers(supabase, user, usecaseId, mapped)
          const nextStep = graphStep({ ...currentAnswers, ...mapped }, loaded.context)
          return NextResponse.json(stepToResponse(nextStep, inferred))
        }
      }
    }

    const response = await client.agents.complete({
      agentId,
      messages: [systemMessage, ...messages].map((message) => ({
        role: message.role,
        content: message.content,
      })),
      tools: [buildSaveEvaluationNodesTool(), buildSaveSingleAnswerTool()],
      toolChoice: 'auto',
    })

    const choice = response.choices?.[0]
    const toolCalls = choice?.message?.toolCalls ?? []
    const evaluationCall = toolCalls.find(
      (call) => call.function?.name === SAVE_EVALUATION_NODES_TOOL_NAME
    )
    const singleAnswerCall = toolCalls.find(
      (call) => call.function?.name === SAVE_SINGLE_ANSWER_TOOL_NAME
    )

    if (evaluationCall) {
      const args = parseToolCallArguments(evaluationCall.function.arguments)
      const data = parseEvaluationNodes(args)
      if (!data) {
        logger.error('Tool save_evaluation_nodes : arguments invalides', undefined, {
          arguments: evaluationCall.function.arguments,
        })
        return NextResponse.json(
          {
            error: 'Les nœuds d’évaluation renvoyés par l’agent sont incomplets ou invalides.',
          },
          { status: 422 }
        )
      }

      const mapped = withAnnexIiiAccessControlGuard(
        mapEvaluationNodesToAnswers(data),
        projectText(loaded.context)
      )
      await upsertUsecaseGraphAnswers(supabase, user, usecaseId, mapped)
      const answers = {
        ...currentAnswers,
        ...((await loadUsecaseGraphAnswers(supabase, usecaseId)) ?? {}),
        ...mapped,
      }
      let step = graphStep(answers, loaded.context)
      const hadAnswersBefore = Object.keys(currentAnswers).length > 0
      const lastUserAfterNodes = lastUserMessage(messages)
      if (hadAnswersBefore && step.type === 'question' && lastUserAfterNodes) {
        const resolvedAfterCodes = resolveOptionCodesForQuestion(
          step.question,
          lastUserAfterNodes
        )
        const resolvedAfterNodes = resolvedAfterCodes?.[0] ?? null
        if (isQ5DomainMismatch(step.question, lastUserAfterNodes, resolvedAfterNodes)) {
          const nextAnswers = answersAfterAnnexMismatch(answers)
          await upsertUsecaseGraphAnswers(supabase, user, usecaseId, {
            'E4.N7.Q2': nextAnswers['E4.N7.Q2'],
          })
          step = graphStep(nextAnswers, loaded.context)
        } else if (
          resolvedAfterCodes &&
          resolvedAfterCodes.length > 0 &&
          !resolvedAfterCodes.includes(ANNEX_DOMAIN_MISMATCH_CODE)
        ) {
          const value = persistableResolvedValue(step.question, resolvedAfterCodes)
          await upsertUsecaseGraphAnswers(supabase, user, usecaseId, {
            [step.question.id]: value,
          })
          step = graphStep({ ...answers, [step.question.id]: value }, loaded.context)
        }
      }
      return NextResponse.json(stepToResponse(step, data))
    }

    if (singleAnswerCall) {
      const args = parseToolCallArguments(singleAnswerCall.function.arguments)
      const parsed = parseSingleAnswer(args)
      const currentAnswers = await loadUsecaseGraphAnswers(supabase, usecaseId)
      const currentStep = graphStep(currentAnswers, loaded.context)
      if (currentStep.type !== 'question') {
        return NextResponse.json(stepToResponse(currentStep))
      }

      const lastUser = [...messages].reverse().find((message) => message.role === 'user')
      const resolvedCodes =
        (parsed
          ? resolveOptionCodesForQuestion(currentStep.question, parsed.selected_option_code)
          : null) ||
        (lastUser ? resolveOptionCodesForQuestion(currentStep.question, lastUser.content) : null)
      const resolvedCode = resolvedCodes?.[0] ?? null

      if (isQ5DomainMismatch(currentStep.question, lastUser?.content ?? null, resolvedCode)) {
        const nextAnswers = answersAfterAnnexMismatch(currentAnswers)
        await upsertUsecaseGraphAnswers(supabase, user, usecaseId, {
          'E4.N7.Q2': nextAnswers['E4.N7.Q2'],
        })
        const step = graphStep(nextAnswers, loaded.context)
        return NextResponse.json(stepToResponse(step))
      }

      if (
        !resolvedCodes ||
        resolvedCodes.length === 0 ||
        resolvedCodes.includes(ANNEX_DOMAIN_MISMATCH_CODE)
      ) {
        logger.error('Tool save_single_answer : arguments invalides', undefined, {
          arguments: singleAnswerCall.function.arguments,
          expected_question_id: currentStep.question.id,
        })
        return NextResponse.json(
          { error: 'La réponse catalogue renvoyée par l’agent est invalide.' },
          { status: 422 }
        )
      }

      const value = persistableResolvedValue(currentStep.question, resolvedCodes)

      await upsertUsecaseGraphAnswers(supabase, user, usecaseId, {
        [currentStep.question.id]: value,
      })
      const answers = await loadUsecaseGraphAnswers(supabase, usecaseId)
      const step = graphStep(answers, loaded.context)
      return NextResponse.json(stepToResponse(step))
    }

    const content = extractAgentTextContent(choice?.message?.content)
    const answers = (await loadUsecaseGraphAnswers(supabase, usecaseId)) ?? {}
    const step = graphStep(answers, loaded.context)
    const hasGraphAnswers = Object.keys(answers).length > 0
    const lastUserText = lastUserMessage(messages)

    if (hasGraphAnswers && step.type === 'question' && lastUserText) {
      const resolvedCodes = resolveOptionCodesForQuestion(step.question, lastUserText)
      if (resolvedCodes && resolvedCodes.length > 0) {
        const value = persistableResolvedValue(step.question, resolvedCodes)
        await upsertUsecaseGraphAnswers(supabase, user, usecaseId, {
          [step.question.id]: value,
        })
        const nextAnswers = await loadUsecaseGraphAnswers(supabase, usecaseId)
        const nextStep = graphStep(nextAnswers, loaded.context)
        return NextResponse.json(stepToResponse(nextStep))
      }
    }

    const stalling = !content || isStallingEvaluationMessage(content)

    if (stalling) {
      return NextResponse.json(stepToResponse(step))
    }

    if (!content) {
      return NextResponse.json(
        { error: 'Réponse vide de l’agent Mistral' },
        { status: 502 }
      )
    }

    const payload: EvaluationChatMessageResponse = { type: 'MESSAGE', content }
    return NextResponse.json(payload)
  } catch (error) {
    logger.error('Erreur /api/chat/evaluation', undefined, {
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
