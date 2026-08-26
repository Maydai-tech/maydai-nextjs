import { getMistralClient } from '@/lib/mistral/client'
import { logger } from '@/lib/secure-logger'

/** Agent conversationnel Setup cas d’usage (Le Chat / Agents API). Surcharge : `MISTRAL_CONVERSATION_AGENT_ID`. */
export const DEFAULT_CONVERSATION_AGENT_ID = 'ag_01a01a3cde77754c83c3cf55366858d8'

/** Agent évaluateur AI Act (Chantier 3). Surcharge : `MISTRAL_EVALUATION_AGENT_ID`. */
export const DEFAULT_EVALUATION_AGENT_ID = 'ag_01a01a725c2a768192011ff9cbed2c8a'

/** Agent génération rapport AI Act. Surcharge : `MISTRAL_REPORT_AGENT_ID`. */
export const DEFAULT_REPORT_AGENT_ID = 'ag_01a01a87fd80764da399c641001c764e'

export type MistralAgentRole = 'user' | 'assistant' | 'system'

export type MistralAgentMessage = {
  role: MistralAgentRole
  content: string
}

export function getConversationAgentId(): string {
  const fromEnv = process.env.MISTRAL_CONVERSATION_AGENT_ID?.trim()
  return fromEnv || DEFAULT_CONVERSATION_AGENT_ID
}

export function getEvaluationAgentId(): string {
  const fromEnv = process.env.MISTRAL_EVALUATION_AGENT_ID?.trim()
  return fromEnv || DEFAULT_EVALUATION_AGENT_ID
}

export function getReportAgentId(): string {
  const fromEnv = process.env.MISTRAL_REPORT_AGENT_ID?.trim()
  return fromEnv || DEFAULT_REPORT_AGENT_ID
}

export function extractAgentTextContent(content: unknown): string {
  if (typeof content === 'string') return content.trim()
  if (!Array.isArray(content)) return ''

  return content
    .map((part) => {
      if (typeof part === 'string') return part
      if (part && typeof part === 'object' && 'text' in part) {
        return typeof part.text === 'string' ? part.text : ''
      }
      return ''
    })
    .join('')
    .trim()
}

/**
 * Complétion via un agent Mistral (pas un modèle `chat.complete`).
 * @see https://docs.mistral.ai/agents
 */
export async function completeMistralAgent(
  messages: MistralAgentMessage[],
  options?: { agentId?: string }
): Promise<string> {
  if (messages.length === 0) {
    throw new Error('Au moins un message est requis pour l’agent Mistral')
  }

  const agentId = options?.agentId?.trim() || getConversationAgentId()
  const client = getMistralClient()

  try {
    const response = await client.agents.complete({
      agentId,
      messages: messages.map((message) => ({
        role: message.role,
        content: message.content,
      })),
    })

    const text = extractAgentTextContent(response.choices?.[0]?.message?.content)
    if (!text) {
      throw new Error('Réponse vide de l’agent Mistral')
    }
    return text
  } catch (error) {
    logger.error('Erreur agent Mistral (conversation)', undefined, {
      agentId,
      details: error instanceof Error ? error.message : String(error),
    })
    throw error instanceof Error ? error : new Error('Erreur agent Mistral')
  }
}
