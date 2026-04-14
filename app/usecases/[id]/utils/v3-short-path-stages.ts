/** Sélection brute d’une étape parcours court (codes d’options cochées). */
export function normalizeShortPathStageSelection(answer: unknown): string[] {
  if (!Array.isArray(answer)) return []
  return answer.filter((x): x is string => typeof x === 'string' && x.length > 0)
}

/** Après l’étape Entreprise : radios déclaratives (Q12 intégrée ici, plus d’écran E4.N8.Q12). */
export function declarativeAnswersAfterEnterpriseStage(selection: string[]): Record<string, string> {
  const s = new Set(selection)
  const sgrYes = s.has('E5.N9.Q1.A')
  return {
    'E4.N8.Q12': s.has('E4.N8.Q12.A') ? 'E4.N8.Q12.A' : 'E4.N8.Q12.B',
    'E5.N9.Q1': sgrYes ? 'E5.N9.Q1.A' : 'E5.N9.Q1.B',
    'E5.N9.Q2': sgrYes ? 'E5.N9.Q2.A' : 'E5.N9.Q2.B',
    'E5.N9.Q7': s.has('E5.N9.Q7.B') ? 'E5.N9.Q7.B' : 'E5.N9.Q7.A',
  }
}

/** Après l’étape Usage : uniquement les questions couvertes par les cases à cocher. */
export function declarativeAnswersAfterUsageStage(selection: string[]): Record<string, string> {
  const s = new Set(selection)
  return {
    'E5.N9.Q3': s.has('E5.N9.Q3.A') ? 'E5.N9.Q3.A' : 'E5.N9.Q3.B',
    'E5.N9.Q4': s.has('E5.N9.Q4.A') ? 'E5.N9.Q4.A' : 'E5.N9.Q4.B',
    'E5.N9.Q6': s.has('E5.N9.Q6.B') ? 'E5.N9.Q6.B' : 'E5.N9.Q6.A',
    'E5.N9.Q8': s.has('E5.N9.Q8.B') ? 'E5.N9.Q8.B' : 'E5.N9.Q8.A',
    'E5.N9.Q9': s.has('E5.N9.Q9.B') ? 'E5.N9.Q9.B' : 'E5.N9.Q9.A',
  }
}

/**
 * Dernière étape transparence : deux cases (interaction / marquage contenu), alignées E6.N10.Q1 et Q2.
 * L’ancienne option unique `E6.N10.TRANSPARENCY_PACK.A` reste acceptée pour les réponses déjà enregistrées.
 */
export function declarativeAnswersAfterTransparenceStage(selection: string[]): Record<string, string> {
  const s = new Set(selection)
  const q1Yes =
    s.has('E6.N10.TRANSPARENCY_PACK.INTERACTION') || s.has('E6.N10.TRANSPARENCY_PACK.A')
  const q2Yes =
    s.has('E6.N10.TRANSPARENCY_PACK.CONTENT') || s.has('E6.N10.TRANSPARENCY_PACK.A')
  return {
    'E6.N10.Q1': q1Yes ? 'E6.N10.Q1.A' : 'E6.N10.Q1.B',
    'E6.N10.Q2': q2Yes ? 'E6.N10.Q2.A' : 'E6.N10.Q2.B',
  }
}
