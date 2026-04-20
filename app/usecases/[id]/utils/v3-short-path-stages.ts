/** Sélection brute d’une étape parcours court (codes d’options cochées). */
export function normalizeShortPathStageSelection(answer: unknown): string[] {
  if (!Array.isArray(answer)) return []
  return answer.filter((x): x is string => typeof x === 'string' && x.length > 0)
}

/**
 * Après l’étape Entreprise (parcours court) : littératie IA — plus de tag pack ; défaut = Non (`E4.N8.Q12.A`) si aucune pratique « Oui » (`E4.N8.Q12.B`) dérivée ailleurs.
 */
export function declarativeAnswersAfterEnterpriseStage(selection: string[]): Record<string, string> {
  const s = new Set(selection)
  return {
    'E4.N8.Q12': s.has('E4.N8.Q12.B') ? 'E4.N8.Q12.B' : 'E4.N8.Q12.A',
  }
}

/** Après l’étape Usage : uniquement les questions couvertes par les cases à cocher. */
export function declarativeAnswersAfterUsageStage(selection: string[]): Record<string, string> {
  const s = new Set(selection)
  return {
    /** Tag pack court = `E5.N9.Q3.A` (libellé pratique) ; la valeur conforme « Oui » est `E5.N9.Q3.B`. */
    'E5.N9.Q3': s.has('E5.N9.Q3.B') || s.has('E5.N9.Q3.A') ? 'E5.N9.Q3.B' : 'E5.N9.Q3.A',
    'E5.N9.Q4': s.has('E5.N9.Q4.A') ? 'E5.N9.Q4.A' : 'E5.N9.Q4.B',
    'E5.N9.Q6': s.has('E5.N9.Q6.B') ? 'E5.N9.Q6.B' : 'E5.N9.Q6.A',
    'E5.N9.Q8': s.has('E5.N9.Q8.B') ? 'E5.N9.Q8.B' : 'E5.N9.Q8.A',
    'E5.N9.Q9': s.has('E5.N9.Q9.B') ? 'E5.N9.Q9.B' : 'E5.N9.Q9.A',
  }
}

/**
 * Dernière étape transparence : cases alignées E6.N10.Q1, Q2 (marquage technique) et Q3 (étiquetage visible).
 * L’ancienne option unique `E6.N10.TRANSPARENCY_PACK.A` reste acceptée pour les réponses déjà enregistrées.
 */
export function declarativeAnswersAfterTransparenceStage(selection: string[]): Record<string, string> {
  const s = new Set(selection)
  const q1Yes =
    s.has('E6.N10.Q1.B') ||
    s.has('E6.N10.TRANSPARENCY_PACK.INTERACTION') ||
    s.has('E6.N10.TRANSPARENCY_PACK.A')
  const q2Yes =
    s.has('E6.N10.Q2.B') ||
    s.has('E6.N10.TRANSPARENCY_PACK.CONTENT') ||
    s.has('E6.N10.TRANSPARENCY_PACK.A')
  const q3Yes = s.has('E6.N10.Q3.B')
  const q3Exempt = s.has('E6.N10.Q3.C')
  let q3: string = 'E6.N10.Q3.A'
  if (q3Yes) q3 = 'E6.N10.Q3.B'
  else if (q3Exempt) q3 = 'E6.N10.Q3.C'
  return {
    'E6.N10.Q1': q1Yes ? 'E6.N10.Q1.B' : 'E6.N10.Q1.A',
    'E6.N10.Q2': q2Yes ? 'E6.N10.Q2.B' : 'E6.N10.Q2.A',
    'E6.N10.Q3': q3,
  }
}

/** Après le pack court E7 : alignement sur les radios longues `E7.N11.Q1` / `E7.N11.Q2` (Oui = B). */
export function declarativeAnswersAfterSocialEnvStage(selection: string[]): Record<string, string> {
  const s = new Set(selection)
  const ok = s.has('E7.N11.Q3.B')
  return {
    'E7.N11.Q1': ok ? 'E7.N11.Q1.B' : 'E7.N11.Q1.A',
    'E7.N11.Q2': ok ? 'E7.N11.Q2.B' : 'E7.N11.Q2.A',
  }
}
