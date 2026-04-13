import {
  getNextQuestion,
  type QuestionnaireNavOptions,
} from './questionnaire'
import type { QuestionnaireVersion } from '@/lib/questionnaire-version'

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
  return [...out]
}

/** Codes d’options E6.N10.* (hors sentinelle). */
export function collectE6DeclaredOptionCodes(answers: Record<string, unknown>): string[] {
  const out = new Set<string>()
  for (const [qid, raw] of Object.entries(answers)) {
    if (!qid.startsWith('E6.N10.') || qid.includes('_CHECKLIST')) continue
    if (!/^E6\.N10\.Q/.test(qid)) continue
    for (const code of extractOptionCodesFromValue(raw)) {
      if (code.startsWith('E6.N10.')) out.add(code)
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

/**
 * Prochaine question hors du préfixe E5.N9 (réponses fusionnées incluant le pas courant).
 * Ne modifie pas la navigation : sert uniquement à détecter la sortie du bloc BPGV pour persister la ligne sentinelle.
 */
export function isLeavingE5Block(
  currentQuestionId: string,
  mergedAnswers: Record<string, unknown>,
  questionnaireVersion: QuestionnaireVersion,
  navOptions?: QuestionnaireNavOptions
): boolean {
  if (!currentQuestionId.startsWith('E5.N9.')) return false
  const next = getNextQuestion(
    currentQuestionId,
    mergedAnswers as Record<string, any>,
    questionnaireVersion,
    navOptions
  )
  if (!next) return false
  return !next.startsWith('E5.N9.')
}

/** Sortie du bloc transparence (dernière question E6 ou enchaînement hors E6.N10). */
export function isLeavingE6Block(
  currentQuestionId: string,
  mergedAnswers: Record<string, unknown>,
  questionnaireVersion: QuestionnaireVersion,
  navOptions?: QuestionnaireNavOptions
): boolean {
  if (!currentQuestionId.startsWith('E6.N10.')) return false
  const next = getNextQuestion(
    currentQuestionId,
    mergedAnswers as Record<string, any>,
    questionnaireVersion,
    navOptions
  )
  if (next === null) return true
  return !next.startsWith('E6.N10.')
}
