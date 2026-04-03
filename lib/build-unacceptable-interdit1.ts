import questionsData from '@/app/usecases/[id]/data/questions-with-scores.json'
import {
  UNACCEPTABLE_INTERDIT1_FALLBACK,
  UNACCEPTABLE_INTERDIT1_INTRO,
  UNACCEPTABLE_INTERDIT1_SECTION_LABELS,
} from '@/lib/unacceptable-case-copy'

/** Ligne renvoyée par GET /api/usecases/[id]/responses */
export type UsecaseResponseRow = {
  question_code: string
  multiple_codes?: string[] | null
  multiple_labels?: string[] | null
  answered_at?: string | null
  created_at?: string | null
}

type QuestionEntry = {
  options?: Array<{ code: string; label: string }>
}

/** Codes questionnaire utilisés pour interdit_1 (API filtrable, builder). */
export const UNACCEPTABLE_INTERDIT1_QUESTION_CODES = [
  'E4.N7.Q2.1',
  'E4.N7.Q3',
  'E4.N7.Q3.1',
] as const

type ProhibitedQuestionCode =
  (typeof UNACCEPTABLE_INTERDIT1_QUESTION_CODES)[number]

/** Query string pour GET /api/usecases/[id]/responses (perf : ne charge que E4.N7.*). */
export function getUnacceptableInterdit1ResponsesSearchParams(): string {
  return `question_codes=${encodeURIComponent(
    UNACCEPTABLE_INTERDIT1_QUESTION_CODES.join(','),
  )}`
}

/** Option « aucun de ces cas » à exclure du motif affiché. */
const NONE_OPTION_CODE: Record<ProhibitedQuestionCode, string> = {
  'E4.N7.Q2.1': 'E4.N7.Q2.1.E',
  'E4.N7.Q3': 'E4.N7.Q3.E',
  'E4.N7.Q3.1': 'E4.N7.Q3.1.E',
}

/**
 * En cas de doublons (historique), garde la réponse la plus récente par question_code.
 */
export function pickLatestResponseByQuestion(
  rows: UsecaseResponseRow[]
): Map<string, UsecaseResponseRow> {
  const sorted = [...rows].sort((a, b) => {
    const ta = Date.parse(a.answered_at || a.created_at || '') || 0
    const tb = Date.parse(b.answered_at || b.created_at || '') || 0
    return tb - ta
  })
  const map = new Map<string, UsecaseResponseRow>()
  for (const r of sorted) {
    if (r.question_code && !map.has(r.question_code)) {
      map.set(r.question_code, r)
    }
  }
  return map
}

function getQuestionEntry(
  questionCode: ProhibitedQuestionCode
): QuestionEntry | undefined {
  const raw = (questionsData as Record<string, unknown>)[questionCode]
  if (!raw || typeof raw !== 'object') return undefined
  return raw as QuestionEntry
}

/**
 * Libellés depuis questions-with-scores.json (source de vérité).
 * Si un code est inconnu, on conserve le code brut.
 */
export function resolveOptionLabels(
  questionCode: ProhibitedQuestionCode,
  optionCodes: string[]
): string[] {
  const q = getQuestionEntry(questionCode)
  if (!q?.options?.length) return optionCodes
  const byCode = new Map(q.options.map((o) => [o.code, o.label]))
  return optionCodes.map((c) => byCode.get(c) ?? c)
}

export function getSelectedProhibitedCodes(
  row: UsecaseResponseRow | undefined,
  questionCode: ProhibitedQuestionCode
): string[] {
  if (!row?.multiple_codes?.length) return []
  const none = NONE_OPTION_CODE[questionCode]
  return row.multiple_codes.filter((c) => !!c && c !== none)
}

function getNoneOptionLabel(
  questionCode: ProhibitedQuestionCode,
): string | undefined {
  const noneCode = NONE_OPTION_CODE[questionCode]
  return getQuestionEntry(questionCode)?.options?.find(
    (o) => o.code === noneCode,
  )?.label
}

/**
 * Repli si multiple_codes est vide mais multiple_labels est renseigné (ex. données atypiques).
 * Exclut le libellé de l'option « aucun » définie dans questions-with-scores.json.
 */
function getProhibitedLabelsFromLabelsColumn(
  row: UsecaseResponseRow | undefined,
  questionCode: ProhibitedQuestionCode,
): string[] {
  if (!row?.multiple_labels?.length) return []
  const noneLabel = getNoneOptionLabel(questionCode)?.trim()
  return row.multiple_labels
    .filter((l): l is string => typeof l === 'string' && l.trim().length > 0)
    .map((l) => l.trim())
    .filter((l) => !noneLabel || l !== noneLabel)
}

/** Libellés à afficher pour une question E4.N7.* : priorité à multiple_codes. */
export function getDisplayedProhibitedLabelsForQuestion(
  row: UsecaseResponseRow | undefined,
  questionCode: ProhibitedQuestionCode,
): string[] {
  const fromCodes = getSelectedProhibitedCodes(row, questionCode)
  if (fromCodes.length > 0) {
    return resolveOptionLabels(questionCode, fromCodes)
  }
  return getProhibitedLabelsFromLabelsColumn(row, questionCode)
}

/**
 * Construit le texte du motif (interdit_1) uniquement à partir des réponses E4.N7.Q2.1, E4.N7.Q3, E4.N7.Q3.1.
 */
export function buildUnacceptableInterdit1(rows: UsecaseResponseRow[]): string {
  const byQ = pickLatestResponseByQuestion(rows)
  const blocks: string[] = []
  let hasProhibitedSelection = false

  for (const code of UNACCEPTABLE_INTERDIT1_QUESTION_CODES) {
    const row = byQ.get(code)
    const labels = getDisplayedProhibitedLabelsForQuestion(row, code)
    if (labels.length === 0) continue
    hasProhibitedSelection = true
    const header = UNACCEPTABLE_INTERDIT1_SECTION_LABELS[code]
    const bullets = labels.map((l) => `• ${l}`).join('\n')
    blocks.push(`${header} :\n${bullets}`)
  }

  if (!hasProhibitedSelection) {
    return UNACCEPTABLE_INTERDIT1_FALLBACK
  }

  return [UNACCEPTABLE_INTERDIT1_INTRO, ...blocks].join('\n\n')
}
