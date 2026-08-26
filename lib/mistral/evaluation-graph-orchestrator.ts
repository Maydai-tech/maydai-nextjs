import {
  getNextQuestionV3,
  isV3ShortPathCompositeQuestionId,
} from '@/app/(saas)/usecases/[id]/utils/questionnaire-v3-graph'
import { getQuestionById } from '@/app/(saas)/usecases/[id]/utils/questions-loader'
import {
  buildEngineInstruction,
  combinableEvaluationOptions,
  contextualizeEvaluationQuestion,
  EVALUATION_BOTH_OPTION_LABEL,
  isMultiSelectEvaluationQuestion,
  type EvaluationQuestionNode,
} from '@/lib/mistral/evaluation-tool'
import type { EvaluationProjectHint } from '@/lib/mistral/evaluation-question-examples'
import type { GraphAnswers } from '@/lib/mistral/persist-evaluation-answers'

export const CONVERSATIONAL_PATH_MODE = 'long' as const
export type ConversationalPathMode = 'long' | 'short'

export type NextEvaluationStep =
  | { type: 'question'; question: EvaluationQuestionNode; engineInstruction: string }
  | { type: 'complete' }

function isAnswerComplete(questionId: string, answer: unknown): boolean {
  const question = getQuestionById(questionId)
  if (question?.type === 'checkbox' || question?.type === 'tags') {
    return Array.isArray(answer) && answer.length > 0
  }
  if (typeof answer === 'string') return answer.trim().length > 0
  if (Array.isArray(answer)) return answer.length > 0
  return false
}

export function toEvaluationQuestionNode(questionId: string): EvaluationQuestionNode | null {
  const question = getQuestionById(questionId)
  if (!question) return null
  return {
    id: question.id,
    question: question.question,
    description: question.description ?? question.tooltip?.shortContent ?? null,
    type: question.type,
    options: question.options.map((option) => ({
      code: option.code,
      label: option.label,
      ...(option.unique_answer ? { unique_answer: true } : {}),
    })),
  }
}

/**
 * Chef d’orchestre V3 : Next.js choisit la prochaine question non répondue.
 * `pathMode` conversationnel = `long` par défaut.
 */
export function resolveNextEvaluationStep(
  answers: GraphAnswers,
  systemType: string | null | undefined,
  pathMode: ConversationalPathMode = CONVERSATIONAL_PATH_MODE,
  project?: EvaluationProjectHint | null
): NextEvaluationStep {
  let questionId: string | null = 'E4.N7.Q1'
  const seen = new Set<string>()

  while (questionId && !seen.has(questionId)) {
    seen.add(questionId)

    if (isV3ShortPathCompositeQuestionId(questionId)) {
      return { type: 'complete' }
    }

    if (!isAnswerComplete(questionId, answers[questionId])) {
      const question = toEvaluationQuestionNode(questionId)
      if (!question) return { type: 'complete' }
      const contextualized = contextualizeEvaluationQuestion(question, answers, project)
      return {
        type: 'question',
        question: contextualized,
        engineInstruction: buildEngineInstruction(contextualized),
      }
    }

    questionId = getNextQuestionV3(questionId, answers, systemType, pathMode)
  }

  return { type: 'complete' }
}

export function isValidOptionForQuestion(questionId: string, optionCode: string): boolean {
  const question = getQuestionById(questionId)
  if (!question) return false
  return question.options.some((option) => option.code === optionCode)
}

function normalizeEvaluationChoice(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')
}

function stripChoiceDecorations(value: string): string {
  return value
    .trim()
    .replace(/^[•●▪◦·*-]+\s*/, '')
    .replace(/^\d+[\).:-]\s*/, '')
    .trim()
}

function uniqueLongestLabel(
  matches: Array<{ code: string; label: string }>
): string | null {
  if (matches.length === 0) return null
  const longest = Math.max(...matches.map((item) => item.label.length))
  const tied = matches.filter((item) => item.label.length === longest)
  return tied.length === 1 ? tied[0].code : null
}

/**
 * Relie la réponse de l’agent (code catalogue, libellé « Non », ou code d’une autre question)
 * à une option de la question actuellement posée par le graphe.
 */
export function resolveOptionCodeForQuestion(
  question: EvaluationQuestionNode,
  selected: string
): string | null {
  const trimmed = stripChoiceDecorations(selected)
  if (!trimmed) return null

  const exact = question.options.find((option) => option.code === trimmed)
  if (exact) return exact.code

  const sameCode = question.options.find(
    (option) => option.code.toLowerCase() === trimmed.toLowerCase()
  )
  if (sameCode) return sameCode.code

  const wanted = normalizeEvaluationChoice(trimmed)
  if (!wanted) return null

  const normalizedOptions = question.options
    .map((option) => ({
      code: option.code,
      label: normalizeEvaluationChoice(option.label),
    }))
    .filter((option) => option.label)

  const exactLabel = normalizedOptions.filter((option) => option.label === wanted)
  if (exactLabel.length === 1) return exactLabel[0].code

  const labelPrefixOfWanted = uniqueLongestLabel(
    normalizedOptions.filter((option) => wanted.startsWith(`${option.label} `))
  )
  if (labelPrefixOfWanted) return labelPrefixOfWanted

  const wantedPrefixOfLabel = uniqueLongestLabel(
    normalizedOptions.filter((option) => option.label.startsWith(`${wanted} `))
  )
  if (wantedPrefixOfLabel) return wantedPrefixOfLabel

  const wantedTokens = wanted.split(' ')
  if (wantedTokens.length === 1) {
    const firstWord = normalizedOptions.filter(
      (option) => option.label.split(' ')[0] === wanted
    )
    if (firstWord.length === 1) return firstWord[0].code
  }

  const wantedFirst = wantedTokens[0]
  if (wantedFirst === 'oui' || wantedFirst === 'non') {
    const polarityMatches = normalizedOptions.filter(
      (option) => option.label.split(' ')[0] === wantedFirst
    )
    if (polarityMatches.length === 1) return polarityMatches[0].code
  }

  const letter = trimmed.match(/\.([A-Za-z])$/)
  if (letter) {
    const suffix = `.${letter[1].toUpperCase()}`
    const matches = question.options.filter((option) => option.code.endsWith(suffix))
    if (matches.length === 1) return matches[0].code
  }

  return null
}

function isBothChoiceText(value: string): boolean {
  const wanted = normalizeEvaluationChoice(value)
  return (
    wanted === normalizeEvaluationChoice(EVALUATION_BOTH_OPTION_LABEL) ||
    wanted === 'les 2' ||
    wanted === 'both' ||
    wanted === 'texte et media' ||
    wanted === 'texte et medias'
  )
}

/**
 * Relie une réponse (une option, « Les deux », ou plusieurs libellés séparés par `;`)
 * aux codes catalogue. Pour une radio, un seul code.
 */
export function resolveOptionCodesForQuestion(
  question: EvaluationQuestionNode,
  selected: string
): string[] | null {
  const trimmed = selected.trim()
  if (!trimmed) return null

  if (isMultiSelectEvaluationQuestion(question) && isBothChoiceText(trimmed)) {
    const combinable = combinableEvaluationOptions(question)
    return combinable.length >= 2 ? combinable.map((option) => option.code) : null
  }

  const parts = trimmed
    .split(/\s*;\s*|\n+/)
    .map((part) => part.trim())
    .filter(Boolean)

  if (parts.length > 1) {
    const codes: string[] = []
    for (const part of parts) {
      const code = resolveOptionCodeForQuestion(question, part)
      if (!code) return null
      if (!codes.includes(code)) codes.push(code)
    }
    return codes
  }

  const single = resolveOptionCodeForQuestion(question, trimmed)
  return single ? [single] : null
}

