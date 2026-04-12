import type { Question } from '../types/usecase'

export type V3ShortPathOutcomeSignal = { title: string; detail: string }

/**
 * Résumé lisible des réponses Q12 / E6 pour l’écran de fin du parcours court V3 (sans nouvel appel API).
 */
export function getV3ShortPathOutcomeSignals(
  answers: Record<string, unknown> | undefined,
  questionsById: Record<string, Question>
): V3ShortPathOutcomeSignal[] {
  if (!answers) return []

  const out: V3ShortPathOutcomeSignal[] = []

  const q12Code = answers['E4.N8.Q12']
  if (typeof q12Code === 'string' && q12Code.length > 0) {
    const q = questionsById['E4.N8.Q12']
    const label = q?.options?.find((o) => o.code === q12Code)?.label
    out.push({
      title: 'Sensibilisation (formations IA Act)',
      detail: label ? `Réponse enregistrée : ${label}.` : 'Réponse enregistrée.',
    })
  }

  const e61 = answers['E6.N10.Q1']
  if (typeof e61 === 'string' && e61.length > 0) {
    const label = questionsById['E6.N10.Q1']?.options?.find((o) => o.code === e61)?.label
    out.push({
      title: 'Transparence — information des utilisateurs',
      detail: label ? `Réponse enregistrée : ${label}.` : 'Réponse enregistrée.',
    })
  }

  const e62 = answers['E6.N10.Q2']
  if (typeof e62 === 'string' && e62.length > 0) {
    const label = questionsById['E6.N10.Q2']?.options?.find((o) => o.code === e62)?.label
    out.push({
      title: 'Transparence — marquage des contenus',
      detail: label ? `Réponse enregistrée : ${label}.` : 'Réponse enregistrée.',
    })
  }

  return out
}
