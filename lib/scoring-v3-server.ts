/**
 * Scoring V3 : chemin actif + métadonnées (comme V2, avec system_type pour le graphe).
 */

import {
  collectV3ActiveQuestionCodes,
  computeV3UsecaseQuestionnaireFields,
} from '@/app/usecases/[id]/utils/questionnaire-v3-graph'
import { calculateMaxCategoryScoresForActiveQuestionCodes } from '@/lib/score-category-max'
import { QUESTIONNAIRE_VERSION_V3, normalizeQuestionnaireVersion } from '@/lib/questionnaire-version'
import { dbResponsesToQuestionnaireAnswers } from '@/lib/scoring-v2-server'

export type V3ServerScoringContext = {
  active_question_codes: string[]
  scoringActiveQuestionCodes: Set<string>
  categoryMaxScores: Record<string, number>
  bpgv_variant: string | null
  ors_exit: string | null
}

export function buildV3ScoringContextFromDbResponses(
  questionnaireVersion: number | null | undefined,
  responses: Parameters<typeof dbResponsesToQuestionnaireAnswers>[0],
  systemType: string | null | undefined,
  questionnairePathMode: 'long' | 'short' = 'long'
): V3ServerScoringContext | null {
  if (normalizeQuestionnaireVersion(questionnaireVersion) !== QUESTIONNAIRE_VERSION_V3) {
    return null
  }

  const answers = dbResponsesToQuestionnaireAnswers(responses)
  const active_question_codes = collectV3ActiveQuestionCodes(answers, systemType, questionnairePathMode)
  const pathSet = new Set(active_question_codes)
  const scoringActiveQuestionCodes = new Set(
    responses.map(r => r.question_code).filter(code => pathSet.has(code))
  )
  /**
   * Parcours court : le graphe s’arrête sur `V3_SHORT_TRANSPARENCE` (pas E6.N10.Q1/Q2),
   * mais les réponses dérivées E6 sont persistées pour le legacy / slots.
   * Les inclure dans le périmètre de scoring évite d’ignorer les malus transparence.
   */
  if (questionnairePathMode === 'short') {
    const rowCodes = new Set(responses.map(r => r.question_code))
    for (const qid of ['E6.N10.Q1', 'E6.N10.Q2'] as const) {
      if (rowCodes.has(qid)) scoringActiveQuestionCodes.add(qid)
    }
  }
  const meta = computeV3UsecaseQuestionnaireFields(answers, systemType, questionnairePathMode)
  const categoryMaxScores =
    calculateMaxCategoryScoresForActiveQuestionCodes(scoringActiveQuestionCodes)

  return {
    active_question_codes,
    scoringActiveQuestionCodes,
    categoryMaxScores,
    bpgv_variant: meta.bpgv_variant,
    ors_exit: meta.ors_exit,
  }
}
