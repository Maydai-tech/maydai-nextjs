import { formatEvaluationQuestionForChat, isPersonaQuestionId } from '@/lib/mistral/evaluation-tool'
import type { EvaluationQuestionNode } from '@/lib/mistral/evaluation-tool'

export type EvaluationChatRole = 'user' | 'assistant' | 'system'

export type EvaluationChatMessage = {
  id: string
  role: EvaluationChatRole
  content: string
}

export type EvaluationResumeStep =
  | { type: 'not_started' }
  | { type: 'question'; question: EvaluationQuestionNode }
  | { type: 'complete' }

const STORAGE_PREFIX = 'maydai-eval-chat:'

export function evaluationChatStorageKey(usecaseId: string): string {
  return `${STORAGE_PREFIX}${usecaseId}`
}

export function parseStoredEvaluationMessages(raw: string | null): EvaluationChatMessage[] | null {
  if (!raw) return null
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed) || parsed.length === 0) return null
    const messages: EvaluationChatMessage[] = []
    for (const item of parsed) {
      if (!item || typeof item !== 'object') continue
      const role = (item as { role?: unknown }).role
      const content = (item as { content?: unknown }).content
      const id = (item as { id?: unknown }).id
      if (role !== 'user' && role !== 'assistant' && role !== 'system') continue
      if (typeof content !== 'string' || !content.trim()) continue
      messages.push({
        id: typeof id === 'string' && id.trim() ? id : `stored-${messages.length}`,
        role,
        content,
      })
    }
    return messages.length > 0 ? messages : null
  } catch {
    return null
  }
}

export function serializeStoredEvaluationMessages(messages: EvaluationChatMessage[]): string {
  return JSON.stringify(
    messages
      .filter((message) => message.role !== 'system')
      .slice(-80)
      .map((message) => ({
        id: message.id,
        role: message.role,
        content: message.content,
      }))
  )
}

export type EvaluationWelcomeContext = {
  industryLabel: string
  name?: string | null
  description?: string | null
}

const GENERIC_INTERACTION_WELCOME =
  "Pourriez-vous m'expliquer concrètement comment les utilisateurs finaux vont interagir avec cette IA"

function trimToNull(raw: string | null | undefined): string | null {
  if (typeof raw !== 'string') return null
  const trimmed = raw.trim()
  return trimmed ? trimmed : null
}

export function formatUsecaseRecapForWelcome(description: string | null | undefined): string | null {
  const cleaned = trimToNull(description)
    ?.replace(/À noter\s*:[^.]*\./gi, '')
    .replace(/\s+/g, ' ')
    .trim()
  if (!cleaned || /^description non renseignée$/i.test(cleaned)) return null

  const objective = cleaned.match(/L['’]objectif principal est[^.]+/i)
  if (objective) {
    const sentence = objective[0].trim()
    return sentence.endsWith('.') ? sentence : `${sentence}.`
  }

  if (cleaned.length <= 320) return cleaned
  const cut = cleaned.slice(0, 320)
  const lastPeriod = cut.lastIndexOf('.')
  return lastPeriod > 80 ? cut.slice(0, lastPeriod + 1) : `${cut.trim()}…`
}

function looksLikeTranslationUsecase(name: string, recap: string): boolean {
  const haystack = `${name} ${recap}`.toLowerCase()
  return /traduct|html|contenu web|page web|page html/.test(haystack)
}

function interactionPrompt(name: string, recap: string): string {
  if (looksLikeTranslationUsecase(name, recap)) {
    return `Pour cadrer l’interaction avec l’IA, pouvez-vous confirmer ou préciser le déroulé concret ?

Par exemple : l’équipe marketing lance-t-elle une traduction automatique d’une page HTML (anglais → français) ? Le visiteur voit-il seulement le texte traduit, ou la page d’origine est-elle citée en référence en dessous ? L’utilisateur final sait-il qu’une IA a produit cette traduction ?`
  }

  return `Pour cadrer l’interaction avec l’IA, pouvez-vous préciser le déroulé concret — pas seulement l’intention métier ?

Par exemple :
• Qui utilise le système, et à quel moment ?
• Que voit ou que reçoit la personne à la fin (texte, score, ouverture d’une porte, etc.) ?
• Cette personne sait-elle qu’une IA a produit le résultat, et une source ou une page d’origine est-elle indiquée ?`
}

export function welcomeEvaluationMessage(context: EvaluationWelcomeContext): string {
  const industry = trimToNull(context.industryLabel) || 'non renseigné'
  const name = trimToNull(context.name)
  const recap = formatUsecaseRecapForWelcome(context.description)
  const usableName = name && name !== 'Sans nom' ? name : null

  if (usableName && recap) {
    return `Bonjour. Nous évaluons le cas d’usage « ${usableName} » (secteur ${industry}).

Ce que nous avons retenu : ${recap}

${interactionPrompt(usableName, recap)}`
  }

  if (usableName) {
    return `Bonjour. Nous évaluons le cas d’usage « ${usableName} » (secteur ${industry}).

${interactionPrompt(usableName, '')}`
  }

  return `Bonjour. Nous évaluons un cas d’usage dans le secteur ${industry}.

${interactionPrompt('', recap || '')}`
}

function shouldReplaceStoredWelcome(stored: EvaluationChatMessage[] | null): boolean {
  if (!stored || stored.length !== 1) return false
  const first = stored[0]
  if (first.role !== 'assistant') return false
  return first.content.includes(GENERIC_INTERACTION_WELCOME)
}

export function buildResumedEvaluationMessages(options: {
  stored: EvaluationChatMessage[] | null
  industryLabel: string
  name?: string | null
  description?: string | null
  step: EvaluationResumeStep
}): { messages: EvaluationChatMessage[]; pathComplete: boolean } {
  if (options.step.type === 'complete') {
    return {
      pathComplete: true,
      messages: options.stored?.length
        ? options.stored
        : [
            {
              id: 'path-complete',
              role: 'assistant',
              content: 'Le moteur de conformité a toutes les réponses de cette étape. Merci.',
            },
          ],
    }
  }

  if (options.step.type === 'not_started') {
    const stored = shouldReplaceStoredWelcome(options.stored) ? null : options.stored
    return {
      pathComplete: false,
      messages: stored?.length
        ? stored
        : [
            {
              id: 'welcome',
              role: 'assistant',
              content: welcomeEvaluationMessage({
                industryLabel: options.industryLabel,
                name: options.name,
                description: options.description,
              }),
            },
          ],
    }
  }

  const questionContent = formatEvaluationQuestionForChat(options.step.question)
  const questionMessage: EvaluationChatMessage = {
    id: 'current-question',
    role: 'assistant',
    content: questionContent,
  }

  if (isPersonaQuestionId(options.step.question.id)) {
    if (options.stored && options.stored.length > 0) {
      return { pathComplete: false, messages: options.stored }
    }
    return {
      pathComplete: false,
      messages: [
        {
          id: 'resume',
          role: 'assistant',
          content: 'Nous reprenons l’évaluation là où vous vous êtes arrêté.',
        },
      ],
    }
  }

  if (options.stored && options.stored.length > 0) {
    const lastAssistant = [...options.stored]
      .reverse()
      .find((message) => message.role === 'assistant')
    if (lastAssistant?.content === questionContent) {
      return { pathComplete: false, messages: options.stored }
    }
    return { pathComplete: false, messages: [...options.stored, questionMessage] }
  }

  return {
    pathComplete: false,
    messages: [
      {
        id: 'resume',
        role: 'assistant',
        content: 'Nous reprenons l’évaluation là où vous vous êtes arrêté.',
      },
      questionMessage,
    ],
  }
}
