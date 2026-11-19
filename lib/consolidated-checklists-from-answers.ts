import {
  collectE5DeclaredOptionCodes,
  collectE6DeclaredOptionCodes,
} from '@/app/(saas)/usecases/[id]/utils/bpgv-transparency-checklist-save'

function extractOptionCodesFromAnswer(raw: unknown): string[] {
  if (typeof raw === 'string' && raw.length > 0) return [raw]
  if (Array.isArray(raw)) {
    return raw.filter((x): x is string => typeof x === 'string' && x.length > 0)
  }
  if (raw && typeof raw === 'object' && 'selected' in (raw as Record<string, unknown>)) {
    const s = (raw as { selected?: unknown }).selected
    if (typeof s === 'string' && s.length > 0) return [s]
  }
  return []
}

export function collectE4DeclaredOptionCodes(answers: Record<string, unknown>): string[] {
  const out = new Set<string>()
  for (const [qid, raw] of Object.entries(answers)) {
    if (!qid.startsWith('E4.')) continue
    for (const code of extractOptionCodesFromAnswer(raw)) {
      if (code.startsWith('E4.')) out.add(code)
    }
  }
  return [...out]
}

/** Même convention que `useEvaluation` : E5 → enterprise ; E4 + E6 → usecase. */
export function buildConsolidatedChecklistsFromAnswers(answers: Record<string, unknown>): {
  checklist_gov_enterprise: string[]
  checklist_gov_usecase: string[]
} {
  const e5 = collectE5DeclaredOptionCodes(answers)
  const e4 = collectE4DeclaredOptionCodes(answers)
  const e6 = collectE6DeclaredOptionCodes(answers)
  return {
    checklist_gov_enterprise: e5,
    checklist_gov_usecase: [...new Set([...e4, ...e6])],
  }
}
