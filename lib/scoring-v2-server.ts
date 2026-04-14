/**
 * Scoring V2 : construction du contexte côté serveur (réponses DB → chemin actif + métadonnées).
 * La persistance finale sur `usecases` doit s’appuyer sur ce module, pas sur le client.
 */

import {
  collectV2ActiveQuestionCodes,
  computeV2UsecaseQuestionnaireFields
} from '@/app/usecases/[id]/utils/questionnaire-v2-graph'
import { calculateMaxCategoryScoresForActiveQuestionCodes } from '@/lib/score-category-max'
import { QUESTIONNAIRE_VERSION_V2, normalizeQuestionnaireVersion } from '@/lib/questionnaire-version'

/** Questions checkbox : lecture rétrocompatible `single_value` → tableau (lignes DB hétérogènes). */
export const CHECKBOX_QUESTION_CODES = new Set<string>([
  'E4.N7.Q2',
  'E4.N7.Q2.1',
  'E4.N7.Q3',
  'E4.N7.Q3.1',
])

/**
 * Priorise `multiple_codes` ; pour les codes checkbox connus, promeut un `single_value` seul en tableau.
 */
export function toCheckboxCodes(
  questionCode: string,
  multiple_codes: string[] | null | undefined,
  single_value: string | null | undefined,
  cleanValue: (value: string) => string
): string[] | null {
  if (multiple_codes && multiple_codes.length > 0) {
    return multiple_codes.map((code) => cleanValue(code))
  }
  if (CHECKBOX_QUESTION_CODES.has(questionCode) && single_value) {
    const v = cleanValue(single_value)
    if (v) return [v]
  }
  return null
}

/** Même logique que `useQuestionnaireResponses` (formattedAnswers). */
export function dbResponsesToQuestionnaireAnswers(
  responses: Array<{
    question_code: string
    single_value?: string | null
    multiple_codes?: string[] | null
    conditional_main?: string | null
    conditional_keys?: string[] | null
    conditional_values?: string[] | null
  }>
): Record<string, unknown> {
  const cleanValue = (value: string): string => {
    if (!value) return value
    if (value.startsWith('"') && value.endsWith('"')) return value.slice(1, -1)
    return value
  }

  const formatted: Record<string, unknown> = {}
  for (const response of responses) {
    const {
      question_code,
      single_value,
      multiple_codes,
      conditional_main,
      conditional_keys,
      conditional_values
    } = response

    const checkboxCodes = toCheckboxCodes(
      question_code,
      multiple_codes,
      single_value,
      cleanValue
    )
    if (checkboxCodes) {
      formatted[question_code] = checkboxCodes
    } else if (conditional_main) {
      const conditionalVals: Record<string, string> = {}
      if (conditional_keys && conditional_values) {
        conditional_keys.forEach((key, index) => {
          conditionalVals[key] = conditional_values[index] || ''
        })
      }
      formatted[question_code] = {
        selected: cleanValue(conditional_main),
        conditionalValues: conditionalVals
      }
    } else if (single_value) {
      formatted[question_code] = cleanValue(single_value)
    }
  }
  return formatted
}

export type V2ServerScoringContext = {
  /** Chemin V2 effectif (y compris la première question sans réponse), pour persistance / analytics. */
  active_question_codes: string[]
  /** Intersection chemin × lignes `usecase_responses` : périmètre réel du scoring (dénominateur dynamique). */
  scoringActiveQuestionCodes: Set<string>
  categoryMaxScores: Record<string, number>
  bpgv_variant: string | null
  ors_exit: string | null
}

/**
 * Contexte scoring questionnaire V2 à partir des lignes `usecase_responses`.
 * Retourne `null` si ce n’est pas un cas V2.
 */
export function buildV2ScoringContextFromDbResponses(
  questionnaireVersion: number | null | undefined,
  responses: Parameters<typeof dbResponsesToQuestionnaireAnswers>[0]
): V2ServerScoringContext | null {
  if (normalizeQuestionnaireVersion(questionnaireVersion) !== QUESTIONNAIRE_VERSION_V2) {
    return null
  }

  const answers = dbResponsesToQuestionnaireAnswers(responses)
  const active_question_codes = collectV2ActiveQuestionCodes(answers)
  const pathSet = new Set(active_question_codes)
  const scoringActiveQuestionCodes = new Set(
    responses.map(r => r.question_code).filter(code => pathSet.has(code))
  )
  const meta = computeV2UsecaseQuestionnaireFields(answers)
  const categoryMaxScores =
    calculateMaxCategoryScoresForActiveQuestionCodes(scoringActiveQuestionCodes)

  return {
    active_question_codes,
    scoringActiveQuestionCodes,
    categoryMaxScores,
    bpgv_variant: meta.bpgv_variant,
    ors_exit: meta.ors_exit
  }
}
