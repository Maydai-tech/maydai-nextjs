/**
 * Résolution du rôle AI Act (Fournisseur / Déployeur / Intégrateur)
 * à partir des réponses questionnaire (`usecase_responses`).
 *
 * Question pivot : E4.N7.Q1 — « Quel est le rôle de votre organisation ? »
 */

import { extractEffectiveSingleValue, type DbResponseRow } from '@/lib/todo-action-sync'

export type AiActRole = 'fournisseur' | 'deployeur' | 'integrateur'

const E4_N7_Q1 = 'E4.N7.Q1' as const

const ROLE_BY_ANSWER_CODE: Record<string, AiActRole> = {
  'E4.N7.Q1.A': 'fournisseur',
  'E4.N7.Q1.B': 'deployeur',
  'E4.N7.Q1.C': 'integrateur',
}

/**
 * Déduit le rôle AI Act à partir du tableau de réponses (lignes `usecase_responses`
 * ou réponses fusionnées avec checklists).
 *
 * Fallback sécurisé : `deployeur` si la question E4.N7.Q1 est absente ou non reconnue.
 */
export function getAiActRoleFromResponses(responses: unknown[]): AiActRole {
  if (!Array.isArray(responses) || responses.length === 0) {
    return 'deployeur'
  }

  const row = responses.find(
    (r) =>
      typeof r === 'object' &&
      r !== null &&
      (r as { question_code?: string }).question_code === E4_N7_Q1
  )

  // Type guard de sécurité stricte
  if (!row || !(row as { question_code?: string }).question_code) {
    return 'deployeur'
  }

  // Cast sécurisé vers DbResponseRow puisque nous avons vérifié la présence du question_code
  const answerCode = extractEffectiveSingleValue(row as DbResponseRow)
  if (!answerCode) {
    return 'deployeur'
  }

  return ROLE_BY_ANSWER_CODE[answerCode] ?? 'deployeur'
}
