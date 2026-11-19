/**
 * Règles UI V3 (composite) — même graphe et mêmes codes réponses ;
 * regroupe seulement l’affichage / la validation « Suivant » sur une étape visuelle.
 */

import { isV3ShortPathCompositeQuestionId } from './questionnaire-v3-graph'

export type V3CompositeKind = 'entry-q1' | 'content-q11' | 'short-minipack' | null

export function getV3CompositeKind(currentQuestionId: string): V3CompositeKind {
  if (currentQuestionId === 'E4.N7.Q1') return 'entry-q1'
  if (currentQuestionId === 'E4.N8.Q11.0') return 'content-q11'
  if (isV3ShortPathCompositeQuestionId(currentQuestionId)) return 'short-minipack'
  return null
}

/**
 * @returns `null` si ce n’est pas une étape composite (utiliser checkCanProceed habituel).
 */
export function v3CompositeCanProceed(
  currentQuestionId: string,
  answers: Record<string, unknown>
): boolean | null {
  if (currentQuestionId === 'E4.N7.Q1') {
    const q1 = answers['E4.N7.Q1']
    if (typeof q1 !== 'string' || !q1) return false
    if (q1 === 'E4.N7.Q1.A' || q1 === 'E4.N7.Q1.C') {
      return typeof answers['E4.N7.Q1.1'] === 'string' && Boolean(answers['E4.N7.Q1.1'])
    }
    if (q1 === 'E4.N7.Q1.B') {
      return typeof answers['E4.N7.Q1.2'] === 'string' && Boolean(answers['E4.N7.Q1.2'])
    }
    return false
  }
  if (currentQuestionId === 'E4.N8.Q11.0') {
    const y = answers['E4.N8.Q11.0']
    if (typeof y !== 'string' || !y) return false
    if (y === 'E4.N8.Q11.0.A') {
      const m = answers['E4.N8.Q11.1']
      return Array.isArray(m) && m.length > 0
    }
    return true
  }
  if (isV3ShortPathCompositeQuestionId(currentQuestionId)) {
    return true
  }
  return null
}

export function v3EntryFollowUpQuestionId(answers: Record<string, unknown>): 'E4.N7.Q1.1' | 'E4.N7.Q1.2' | null {
  const q1 = answers['E4.N7.Q1']
  if (q1 === 'E4.N7.Q1.A' || q1 === 'E4.N7.Q1.C') return 'E4.N7.Q1.1'
  if (q1 === 'E4.N7.Q1.B') return 'E4.N7.Q1.2'
  return null
}
