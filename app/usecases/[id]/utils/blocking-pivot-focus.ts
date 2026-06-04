import type { UseCase } from '../types/usecase'

/** Codes réponse V3 « Je ne sais pas » déclenchant classification_status = impossible. */
export const V3_BLOCKING_PIVOT_ANSWER_CODES = [
  'E4.N7.Q4.C',
  'E4.N7.Q5.C',
  'E4.N8.Q11.T1E.C',
] as const

type PivotSource = Pick<UseCase, 'checklist_gov_usecase' | 'checklist_gov_enterprise'> | null | undefined

/** Ex. `E4.N7.Q5.C` → `E4.N7.Q5` pour deep-link `?focus=`. */
export function getBlockingPivotId(useCase: PivotSource): string | null {
  if (!useCase) return null

  const lists = [useCase.checklist_gov_usecase, useCase.checklist_gov_enterprise]
  for (const list of lists) {
    if (!Array.isArray(list)) continue
    const found = list.find(
      (val): val is string =>
        typeof val === 'string' && (V3_BLOCKING_PIVOT_ANSWER_CODES as readonly string[]).includes(val)
    )
    if (found) {
      return found.substring(0, found.lastIndexOf('.'))
    }
  }
  return null
}

export function buildEvaluationFocusHref(useCaseId: string, focusId: string | null): string {
  const base = `/usecases/${useCaseId}/evaluation`
  return focusId ? `${base}?focus=${encodeURIComponent(focusId)}` : base
}
