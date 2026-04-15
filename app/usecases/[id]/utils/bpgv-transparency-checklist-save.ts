import { isV3ShortSyntheticQuestionId, V3_SHORT_MINIPACK_ID } from './questionnaire-v3-graph'

/** Codes `question_code` côté API `/responses` pour persister les JSONB `usecases.checklist_gov_*`. */
export const CHECKLIST_GOV_ENTERPRISE_QUESTION_CODE = 'checklist_gov_enterprise' as const
export const CHECKLIST_GOV_USECASE_QUESTION_CODE = 'checklist_gov_usecase' as const
/** @deprecated Anciennes sentinelles — encore acceptées par l’API pour compatibilité clients. */
export const LEGACY_BPGV_CHECKLIST_SENTINEL = 'E5.N9._CHECKLIST' as const
export const LEGACY_TRANSPARENCY_CHECKLIST_SENTINEL = 'E6.N10._CHECKLIST' as const

export function isChecklistGovEnterpriseQuestionCode(code: string): boolean {
  return code === CHECKLIST_GOV_ENTERPRISE_QUESTION_CODE || code === LEGACY_BPGV_CHECKLIST_SENTINEL
}

export function isChecklistGovUsecaseQuestionCode(code: string): boolean {
  return code === CHECKLIST_GOV_USECASE_QUESTION_CODE || code === LEGACY_TRANSPARENCY_CHECKLIST_SENTINEL
}

/** Parcours court V3 : option « interaction » → legacy E6.N10.Q1.A */
export const E6_TRANSPARENCY_PACK_INTERACTION_CODE = 'E6.N10.TRANSPARENCY_PACK.INTERACTION' as const
/** Parcours court V3 : option « contenu » → legacy E6.N10.Q2.A */
export const E6_TRANSPARENCY_PACK_CONTENT_CODE = 'E6.N10.TRANSPARENCY_PACK.CONTENT' as const
/** @deprecated Ancienne option unique (les deux volets) ; conservée pour données historiques. */
export const E6_TRANSPARENCY_PACK_LEGACY_SINGLE_CODE = 'E6.N10.TRANSPARENCY_PACK.A' as const

/** @deprecated Utiliser les constantes INTERACTION / CONTENT / LEGACY_SINGLE. */
export const E6_TRANSPARENCY_PACK_YES_CODE = E6_TRANSPARENCY_PACK_LEGACY_SINGLE_CODE

/**
 * Transforme les codes synthétiques du pack transparence en codes d’options réels attendus
 * pour agrégation dans `checklist_gov_usecase` (parcours court V3).
 */
export function expandE6TransparencyPackToLegacyOptionCodes(code: string): string[] {
  if (code === E6_TRANSPARENCY_PACK_LEGACY_SINGLE_CODE) {
    return ['E6.N10.Q1.A', 'E6.N10.Q2.A']
  }
  if (code === E6_TRANSPARENCY_PACK_INTERACTION_CODE) {
    return ['E6.N10.Q1.A']
  }
  if (code === E6_TRANSPARENCY_PACK_CONTENT_CODE) {
    return ['E6.N10.Q2.A']
  }
  return [code]
}

/** Codes d’options E5.N9.* (hors ligne sentinelle) présents dans `answers`. */
export function collectE5DeclaredOptionCodes(answers: Record<string, unknown>): string[] {
  const out = new Set<string>()
  for (const [qid, raw] of Object.entries(answers)) {
    if (!qid.startsWith('E5.N9.') || qid.includes('_CHECKLIST')) continue
    if (!/^E5\.N9\.Q/.test(qid)) continue
    for (const code of extractOptionCodesFromValue(raw)) {
      if (code.startsWith('E5.N9.')) out.add(code)
    }
  }
  for (const code of extractOptionCodesFromValue(answers[V3_SHORT_MINIPACK_ID])) {
    if (code.startsWith('E5.N9.')) out.add(code)
  }
  for (const [k, raw] of Object.entries(answers)) {
    if (!isV3ShortSyntheticQuestionId(k)) continue
    for (const code of extractOptionCodesFromValue(raw)) {
      if (/^E5\.N9\.Q/.test(code)) out.add(code)
    }
  }
  return [...out]
}

/** Codes d’options E6.N10.* (hors sentinelle). */
export function collectE6DeclaredOptionCodes(answers: Record<string, unknown>): string[] {
  const out = new Set<string>()
  const addE6 = (code: string) => {
    if (!code.startsWith('E6.N10.')) return
    for (const expanded of expandE6TransparencyPackToLegacyOptionCodes(code)) {
      if (expanded.startsWith('E6.N10.')) out.add(expanded)
    }
  }
  for (const [qid, raw] of Object.entries(answers)) {
    if (!qid.startsWith('E6.N10.') || qid.includes('_CHECKLIST')) continue
    if (!/^E6\.N10\.Q/.test(qid)) continue
    for (const code of extractOptionCodesFromValue(raw)) {
      addE6(code)
    }
  }
  for (const code of extractOptionCodesFromValue(answers[V3_SHORT_MINIPACK_ID])) {
    addE6(code)
  }
  for (const [k, raw] of Object.entries(answers)) {
    if (!isV3ShortSyntheticQuestionId(k)) continue
    for (const code of extractOptionCodesFromValue(raw)) {
      if (
        code === E6_TRANSPARENCY_PACK_LEGACY_SINGLE_CODE ||
        code === E6_TRANSPARENCY_PACK_INTERACTION_CODE ||
        code === E6_TRANSPARENCY_PACK_CONTENT_CODE ||
        /^E6\.N10\.Q/.test(code)
      ) {
        addE6(code)
      }
    }
  }
  return [...out]
}

function extractOptionCodesFromValue(raw: unknown): string[] {
  if (typeof raw === 'string' && raw.length > 0) return [raw]
  if (Array.isArray(raw)) {
    return raw.filter((x): x is string => typeof x === 'string' && x.length > 0)
  }
  if (raw && typeof raw === 'object' && 'selected' in raw) {
    const s = (raw as { selected?: unknown }).selected
    if (typeof s === 'string' && s.length > 0) return [s]
  }
  return []
}

