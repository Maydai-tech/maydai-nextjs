import { getMistralClient } from '@/lib/mistral/client'
import {
  extractAgentTextContent,
  getReportAgentId,
  type MistralAgentMessage,
} from '@/lib/mistral/agents'
import { getChatReportResponseFormat } from '@/lib/mistral/report-json-schema'
import { logger } from '@/lib/secure-logger'

export function parseJsonObjectFromAgentText(text: string): Record<string, unknown> {
  const trimmed = text.trim()
  const withoutFence = trimmed.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
  const start = withoutFence.indexOf('{')
  const end = withoutFence.lastIndexOf('}')
  if (start < 0 || end <= start) {
    throw new Error('La réponse de l’agent rapport n’est pas un objet JSON')
  }

  const parsed: unknown = JSON.parse(withoutFence.slice(start, end + 1))
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('La réponse de l’agent rapport n’est pas un objet JSON')
  }
  return parsed as Record<string, unknown>
}

export function stringifyReportJson(report: Record<string, unknown>): string {
  return JSON.stringify(report)
}

/**
 * Appelle l’agent rapport Mistral en Structured Output (json_schema).
 */
export async function completeReportAgent(options: {
  messages: MistralAgentMessage[]
  isUnacceptable: boolean
}): Promise<string> {
  if (options.messages.length === 0) {
    throw new Error('Au moins un message est requis pour l’agent rapport Mistral')
  }

  const agentId = getReportAgentId()
  const client = getMistralClient()
  const responseFormat = getChatReportResponseFormat(options.isUnacceptable)

  try {
    const response = await client.agents.complete({
      agentId,
      messages: options.messages.map((message) => ({
        role: message.role,
        content: message.content,
      })),
      responseFormat,
    })

    const text = extractAgentTextContent(response.choices?.[0]?.message?.content)
    if (!text) {
      throw new Error('Réponse vide de l’agent rapport Mistral')
    }

    return stringifyReportJson(parseJsonObjectFromAgentText(text))
  } catch (error) {
    logger.error('Erreur agent Mistral (rapport)', undefined, {
      agentId,
      details: error instanceof Error ? error.message : String(error),
    })
    throw error instanceof Error ? error : new Error('Erreur agent rapport Mistral')
  }
}
