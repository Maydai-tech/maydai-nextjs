export type EquivalenceFormatKind = 'recharge' | 'minutes'

export interface FormattedEquivalence {
  value: string
  unit: string
}

/** Formate une équivalence brute en libellé lisible (recharges ou durée). */
export function formatEquivalence(
  rawValue: number,
  kind: EquivalenceFormatKind
): FormattedEquivalence {
  if (kind === 'recharge') {
    if (rawValue < 1) {
      return { value: (rawValue * 100).toFixed(1), unit: '% de batterie' }
    }
    return { value: rawValue.toFixed(1), unit: 'recharges complètes' }
  }

  if (rawValue < 1) {
    return { value: String(Math.round(rawValue * 60)), unit: 'secondes' }
  }
  return { value: rawValue.toFixed(1), unit: 'minutes' }
}
