import { extractEffectiveSingleValue, getTodoActionMappings } from '@/lib/todo-action-sync'
import {
  DOC_TYPE_TO_PILLAR_CODE,
  type SystemCardDocType,
} from '@/lib/validations/system-card'

/** Plafond questionnaire, aligné sur `BASE_SCORE` de `score-calculator-simple`. */
export const SYSTEM_CARD_SCORE_BASE_CAP = 90

export interface SystemCardScoreBonusDoc {
  doc_type: string
  maydai_prefill_applied?: boolean | null
  user_completion_applied?: boolean | null
}

export interface SystemCardScoreBonusResponse {
  question_code: string
  single_value?: string | null
  multiple_codes?: string[] | null
  conditional_main?: string | null
}

function isSystemCardPillarDocType(docType: string): docType is SystemCardDocType {
  return docType in DOC_TYPE_TO_PILLAR_CODE
}

/**
 * Une exigence dossier est à 100 % si toutes les questions déclaratives
 * associées sont déjà sur la réponse positive (ex. `E5.N9.Q4.A`).
 */
export function isDeclarativeQuestionFullyValidated(
  responses: SystemCardScoreBonusResponse[],
  docType: string
): boolean {
  const mappings = getTodoActionMappings(docType)
  if (mappings.length === 0) return false

  return mappings.every((mapping) => {
    const row = responses.find((response) => response.question_code === mapping.questionCode)
    if (!row) return false
    return extractEffectiveSingleValue(row) === mapping.positiveAnswerCode
  })
}

/**
 * Bonus partiel System Card : +50 % des points de l’action par flag,
 * si la question n’est pas encore validée à 100 % (évite le double comptage après sync).
 */
export function computeSystemCardPrefillBonus(
  docs: SystemCardScoreBonusDoc[],
  responses: SystemCardScoreBonusResponse[]
): number {
  let bonus = 0

  for (const doc of docs) {
    if (!isSystemCardPillarDocType(doc.doc_type)) continue
    if (isDeclarativeQuestionFullyValidated(responses, doc.doc_type)) continue

    const mappings = getTodoActionMappings(doc.doc_type)
    const maxPoints = mappings.reduce((sum, m) => sum + (m.expectedPointsGained || 0), 0)
    const halfPoints = maxPoints / 2

    if (doc.maydai_prefill_applied) {
      bonus += halfPoints
    }
    if (doc.user_completion_applied) {
      bonus += halfPoints
    }
  }

  return bonus
}

/**
 * Prime absolue sur `score_final` (échelle 100).
 * Ne touche pas `score_base` : le bonus ne doit pas passer par la pondération modèle.
 */
export function applySystemCardBonusToScores(params: {
  scoreBase: number
  scoreFinal: number
  bonus: number
  theoreticalMaxFinal: number
}): { scoreBase: number; scoreFinal: number } {
  let rawScoreFinal = params.scoreFinal + params.bonus
  if (rawScoreFinal > params.theoreticalMaxFinal) {
    rawScoreFinal = params.theoreticalMaxFinal
  }

  return {
    scoreBase: params.scoreBase,
    scoreFinal: Math.round(Number(rawScoreFinal) * 10) / 10,
  }
}
