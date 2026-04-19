import { expandE6TransparencyPackToLegacyOptionCodes } from '@/app/usecases/[id]/utils/bpgv-transparency-checklist-save'
import {
  V3_SHORT_TRANSPARENCE_ID,
  V3_SHORT_USAGE_ID,
} from '@/app/usecases/[id]/utils/questionnaire-v3-graph'

/** Codes « pratique positive » du pack court USAGE (tags) + code pénalité implicite si aucune option de la question n’est déclarée. */
const V3_SHORT_USAGE_IMPLICIT_RULES: ReadonlyArray<{
  positiveCodes: readonly string[]
  penaltyIfUnsettled: string
}> = [
  {
    positiveCodes: ['E5.N9.Q3.B', 'E5.N9.Q3.A'],
    penaltyIfUnsettled: 'E5.N9.Q3.A',
  },
  { positiveCodes: ['E5.N9.Q8.B'], penaltyIfUnsettled: 'E5.N9.Q8.A' },
  { positiveCodes: ['E5.N9.Q4.A'], penaltyIfUnsettled: 'E5.N9.Q4.B' },
  { positiveCodes: ['E5.N9.Q9.B'], penaltyIfUnsettled: 'E5.N9.Q9.A' },
  { positiveCodes: ['E5.N9.Q6.B'], penaltyIfUnsettled: 'E5.N9.Q6.A' },
]

function expandSubmittedE6Codes(submittedCodes: readonly string[]): Set<string> {
  const expanded = new Set<string>()
  for (const c of submittedCodes) {
    for (const x of expandE6TransparencyPackToLegacyOptionCodes(c)) {
      expanded.add(x)
    }
  }
  return expanded
}

/**
 * Parcours court V3 : déduit des codes d’options « malus » (fantômes) lorsque la pratique
 * positive attendue n’est pas présente dans la sélection soumise — alignement avec un « Non »
 * explicite du parcours long.
 *
 * @param submittedCodes Codes cochés côté client pour le pack (tags / synthétiques inclus).
 * @param packId `V3_SHORT_USAGE` ou `V3_SHORT_TRANSPARENCE`.
 * @returns Liste de codes pénalité à fusionner (sans doublons avec l’explicite déjà présent).
 */
export function deriveMissingPenaltiesForShortPath(
  submittedCodes: readonly string[],
  packId: string
): string[] {
  const raw = new Set<string>()
  for (const c of submittedCodes) {
    if (typeof c === 'string' && c.trim()) raw.add(c.trim())
  }

  if (packId === V3_SHORT_USAGE_ID) {
    const out: string[] = []
    for (const { positiveCodes, penaltyIfUnsettled } of V3_SHORT_USAGE_IMPLICIT_RULES) {
      const hasPositive = positiveCodes.some((p) => raw.has(p))
      const hasPenalty = raw.has(penaltyIfUnsettled)
      if (!hasPositive && !hasPenalty) out.push(penaltyIfUnsettled)
    }
    return out
  }

  if (packId === V3_SHORT_TRANSPARENCE_ID) {
    const e6 = expandSubmittedE6Codes(submittedCodes)
    const out: string[] = []
    if (!e6.has('E6.N10.Q1.B') && !e6.has('E6.N10.Q1.A')) {
      out.push('E6.N10.Q1.A')
    }
    const forkSatisfied =
      e6.has('E6.N10.Q2.B') || e6.has('E6.N10.Q3.B') || e6.has('E6.N10.Q3.C')
    if (!forkSatisfied && !e6.has('E6.N10.Q3.A')) {
      out.push('E6.N10.Q3.A')
    }
    return out
  }

  return []
}

export function mergeSubmittedCodesWithGhostPenalties(
  submittedCodes: readonly string[],
  packId: string
): string[] {
  const ghosts = deriveMissingPenaltiesForShortPath(submittedCodes, packId)
  return [...new Set([...submittedCodes.filter((c) => typeof c === 'string' && c.trim()), ...ghosts])]
}
