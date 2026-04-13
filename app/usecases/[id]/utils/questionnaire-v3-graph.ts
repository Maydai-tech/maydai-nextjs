/**
 * Graphe navigation questionnaire V3 (bloc contexte → qualification réordonnée → Q10/Q12 hors cœur).
 *
 * Spec lisible (Q10, E6, BPGV, produit/non-produit, texte/média, active_question_codes) :
 * @see docs/questionnaire-v3-parcours.md
 */

import type { BpgvVariant, OrsExit } from '@/lib/questionnaire-version'
import {
  BPGV_VARIANT_HIGH,
  BPGV_VARIANT_LIMITED,
  BPGV_VARIANT_MINIMAL,
  BPGV_VARIANT_UNACCEPTABLE,
  ORS_EXIT_N8_COMPLETED,
  ORS_EXIT_UNACCEPTABLE,
} from '@/lib/questionnaire-version'
import { deriveRiskLevelFromResponses, type RiskLevelResponseInput } from '@/lib/risk-level'
import { isOrsUnacceptableAtQ31 } from './questionnaire-v2-graph'
import questionsData from '@/app/usecases/[id]/data/questions-with-scores.json'
import { V3_PRODUCT_SYSTEM_TYPE } from '@/lib/qualification-v3-decision'

/** Étapes synthétiques parcours court V3 (séquentielles, sans E4.N8.Q12 — intégrée à l’étape entreprise). */
export const V3_SHORT_ENTREPRISE_ID = 'V3_SHORT_ENTREPRISE' as const
export const V3_SHORT_USAGE_ID = 'V3_SHORT_USAGE' as const
export const V3_SHORT_TRANSPARENCE_ID = 'V3_SHORT_TRANSPARENCE' as const

export const V3_SHORT_STAGE_IDS = [
  V3_SHORT_ENTREPRISE_ID,
  V3_SHORT_USAGE_ID,
  V3_SHORT_TRANSPARENCE_ID,
] as const

export function isV3ShortSyntheticQuestionId(questionId: string): boolean {
  return (V3_SHORT_STAGE_IDS as readonly string[]).includes(questionId)
}

/** @deprecated Utiliser les trois constantes V3_SHORT_* ; conservé pour migrations / anciennes données. */
export const V3_SHORT_MINIPACK_ID = 'V3._SHORT_CONSOLIDATED' as const

/** Étapes « pack » court V3 (3 écrans + ancien nœud consolidé) pour composite UI / tags. */
export function isV3ShortPathCompositeQuestionId(questionId: string): boolean {
  return questionId === V3_SHORT_MINIPACK_ID || isV3ShortSyntheticQuestionId(questionId)
}

type RawQuestion = {
  type?: string
  risk?: string
  options?: Array<{ code: string; risk?: string }>
}

const rawQuestions = questionsData as Record<string, RawQuestion>

function isN8ExcludedFromV2OrsBand(qid: string): boolean {
  return /^E4\.N8\.Q[2-8]$/.test(qid)
}

function hasQ111Text(answers: Record<string, unknown>): boolean {
  const v = answers['E4.N8.Q11.1']
  return Array.isArray(v) && v.includes('E4.N8.Q11.1.A')
}

function hasQ111Media(answers: Record<string, unknown>): boolean {
  const v = answers['E4.N8.Q11.1']
  return Array.isArray(v) && v.includes('E4.N8.Q11.1.B')
}

function hasSensitiveAnnexIII(answers: Record<string, unknown>): boolean {
  const v = answers['E4.N7.Q2']
  if (!Array.isArray(v) || v.length === 0) return false
  return v.some(c => c !== 'E4.N7.Q2.G')
}

function isProductSystemType(systemType: string | null | undefined): boolean {
  return (systemType ?? '').trim() === V3_PRODUCT_SYSTEM_TYPE
}

function interdictionResponses(answers: Record<string, unknown>): RiskLevelResponseInput[] {
  const out: RiskLevelResponseInput[] = []
  for (const [code, key] of [
    ['E4.N7.Q3', 'E4.N7.Q3'],
    ['E4.N7.Q3.1', 'E4.N7.Q3.1'],
    ['E4.N7.Q2.1', 'E4.N7.Q2.1'],
  ] as const) {
    const a = answers[key]
    if (Array.isArray(a) && a.length > 0) {
      out.push({ question_code: code, multiple_codes: a as string[] })
    }
  }
  return out
}

function hasInterdictionUnacceptable(answers: Record<string, unknown>): boolean {
  const inter = interdictionResponses(answers)
  if (inter.length === 0) return false
  return deriveRiskLevelFromResponses(inter) === 'unacceptable'
}

type Band = typeof BPGV_VARIANT_MINIMAL | typeof BPGV_VARIANT_LIMITED | typeof BPGV_VARIANT_HIGH

const bandOrder: Record<Band, number> = {
  [BPGV_VARIANT_MINIMAL]: 0,
  [BPGV_VARIANT_LIMITED]: 1,
  [BPGV_VARIANT_HIGH]: 2,
}

function maxBand(a: Band, b: Band): Band {
  return bandOrder[a] >= bandOrder[b] ? a : b
}

function normalizeOptionRiskToBand(r: string | undefined): Band {
  if (r === BPGV_VARIANT_UNACCEPTABLE || r === BPGV_VARIANT_HIGH) return BPGV_VARIANT_HIGH
  if (r === BPGV_VARIANT_LIMITED) return BPGV_VARIANT_LIMITED
  return BPGV_VARIANT_MINIMAL
}

function bandFromQuestionAnswer(qid: string, answer: unknown): Band {
  const q = rawQuestions[qid]
  if (!q || answer === undefined || answer === null) return BPGV_VARIANT_MINIMAL

  if (q.type === 'radio' && typeof answer === 'string') {
    const opt = q.options?.find(o => o.code === answer)
    return normalizeOptionRiskToBand(opt?.risk ?? q.risk)
  }

  if ((q.type === 'checkbox' || q.type === 'tags') && Array.isArray(answer)) {
    let m: Band = BPGV_VARIANT_MINIMAL
    for (const code of answer) {
      const opt = q.options?.find(o => o.code === code)
      m = maxBand(m, normalizeOptionRiskToBand(opt?.risk))
    }
    return m
  }

  return BPGV_VARIANT_MINIMAL
}

/**
 * Bande BPGV V3 : comme V2 mais sans Q10/Q12, sans Q2 si garde-fou 6.3 « oui ».
 */
export function deriveBpgvBandFromOrsAnswersV3(answers: Record<string, unknown>): Band {
  let m: Band = BPGV_VARIANT_MINIMAL
  const suppressQ2 =
    answers['E4.N7.Q5'] === 'E4.N7.Q5.A' && hasSensitiveAnnexIII(answers)

  for (const [qid, value] of Object.entries(answers)) {
    if (!qid.startsWith('E4.N7.') && !qid.startsWith('E4.N8.')) continue
    if (qid === 'E4.N8.Q12' || qid === 'E4.N8.Q10') continue
    if (isN8ExcludedFromV2OrsBand(qid)) continue
    if (qid === 'E4.N7.Q2' && suppressQ2) continue
    m = maxBand(m, bandFromQuestionAnswer(qid, value))
  }
  return m
}

/** Entrée BPGV après ORS : toujours Q1 (pas de raccourci « bande minimale → Q7 »). */
export function getFirstE5AfterOrsV3(_answers: Record<string, unknown>): string {
  return 'E5.N9.Q1'
}

/**
 * Après le bloc ORS (Q10 / T1 / M1) : en long → entrée E5 (Q1) ; en court → première étape synthétique entreprise.
 */
function nextAfterOrsV3(answers: Record<string, unknown>, pathMode: 'long' | 'short'): string | null {
  if (pathMode === 'short') return V3_SHORT_ENTREPRISE_ID
  return getFirstE5AfterOrsV3(answers)
}

function getNextAfterQ12(_answers: Record<string, unknown>, pathMode: 'long' | 'short'): string | null {
  if (pathMode === 'short') return null
  return 'E6.N10.Q1'
}

function getNextE6(
  current: string,
  _answers: Record<string, unknown>,
  pathMode: 'long' | 'short'
): string | null {
  if (pathMode === 'short') return null
  if (current === 'E6.N10.Q1') return 'E6.N10.Q2'
  if (current === 'E6.N10.Q2') return null
  return null
}

function getNextE5V3(currentQuestionId: string, answers: Record<string, unknown>): string | null {
  switch (currentQuestionId) {
    case 'E5.N9.Q1':
      return 'E5.N9.Q2'
    case 'E5.N9.Q2':
      return 'E5.N9.Q3'
    case 'E5.N9.Q3':
      return 'E5.N9.Q4'
    case 'E5.N9.Q4':
      return 'E5.N9.Q5'
    case 'E5.N9.Q5':
      return 'E5.N9.Q6'
    case 'E5.N9.Q6':
      return 'E5.N9.Q7'
    case 'E5.N9.Q7':
      if (!answers['E5.N9.Q6']) return 'E4.N8.Q12'
      return 'E5.N9.Q8'
    case 'E5.N9.Q8':
      return 'E5.N9.Q9'
    case 'E5.N9.Q9':
      return 'E4.N8.Q12'
    default:
      return null
  }
}

/**
 * Navigation V3. `systemType` = usecases.system_type (ex. « Produit »).
 */
export function getNextQuestionV3(
  currentQuestionId: string,
  answers: Record<string, unknown>,
  systemType: string | null | undefined,
  pathMode: 'long' | 'short' = 'long'
): string | null {
  switch (currentQuestionId) {
    case 'E4.N7.Q1': {
      const q1 = answers['E4.N7.Q1']
      if (q1 === 'E4.N7.Q1.A' || q1 === 'E4.N7.Q1.C') return 'E4.N7.Q1.1'
      if (q1 === 'E4.N7.Q1.B') return 'E4.N7.Q1.2'
      return null
    }
    case 'E4.N7.Q1.1':
    case 'E4.N7.Q1.2':
      return 'E4.N7.Q3'
    case 'E4.N7.Q3':
      return 'E4.N7.Q3.1'
    case 'E4.N7.Q3.1':
      // Parcours court : pas d’arrêt anticipé sur ORS « inacceptable » — enchaînement obligatoire sur les 3 étapes pack.
      if (isOrsUnacceptableAtQ31(answers))
        return pathMode === 'short' ? V3_SHORT_ENTREPRISE_ID : 'E5.N9.Q1'
      return 'E4.N7.Q2.1'
    case 'E4.N7.Q2.1':
      if (hasInterdictionUnacceptable(answers))
        return pathMode === 'short' ? V3_SHORT_ENTREPRISE_ID : 'E5.N9.Q1'
      if (isProductSystemType(systemType)) return 'E4.N7.Q4'
      return 'E4.N7.Q2'
    case 'E4.N7.Q4':
      return 'E4.N7.Q2'
    case 'E4.N7.Q2':
      if (hasSensitiveAnnexIII(answers)) return 'E4.N7.Q5'
      return 'E4.N8.Q9'
    case 'E4.N7.Q5':
      return 'E4.N8.Q9'

    case 'E4.N8.Q9':
      return 'E4.N8.Q9.1'
    case 'E4.N8.Q9.1':
      return 'E4.N8.Q11.0'

    case 'E4.N8.Q11.0': {
      const y = answers['E4.N8.Q11.0']
      if (y === 'E4.N8.Q11.0.A') return 'E4.N8.Q11.1'
      if (y === 'E4.N8.Q11.0.B') return 'E4.N8.Q10'
      return null
    }

    case 'E4.N8.Q11.1': {
      if (hasQ111Text(answers)) return 'E4.N8.Q11.T1'
      if (hasQ111Media(answers)) return 'E4.N8.Q11.M1'
      return 'E4.N8.Q10'
    }

    case 'E4.N8.Q11.T1': {
      if (hasQ111Media(answers)) return 'E4.N8.Q11.M1'
      return nextAfterOrsV3(answers, pathMode)
    }

    case 'E4.N8.Q11.M1': {
      if (answers['E4.N8.Q11.M1'] === 'E4.N8.Q11.M1.A') return 'E4.N8.Q11.M2'
      return nextAfterOrsV3(answers, pathMode)
    }

    case 'E4.N8.Q11.M2':
      return 'E4.N8.Q10'

    case 'E4.N8.Q10':
      return nextAfterOrsV3(answers, pathMode)

    case 'E5.N9.Q4':
    case 'E5.N9.Q1':
    case 'E5.N9.Q2':
    case 'E5.N9.Q3':
    case 'E5.N9.Q9':
    case 'E5.N9.Q5':
    case 'E5.N9.Q6':
    case 'E5.N9.Q7':
    case 'E5.N9.Q8':
      if (pathMode === 'short') return null
      return getNextE5V3(currentQuestionId, answers)

    case 'E4.N8.Q12':
      return getNextAfterQ12(answers, pathMode)

    case V3_SHORT_ENTREPRISE_ID:
      return V3_SHORT_USAGE_ID
    case V3_SHORT_USAGE_ID:
      return V3_SHORT_TRANSPARENCE_ID
    case V3_SHORT_TRANSPARENCE_ID:
      return null

    /** Ancien nœud unique : renvoie vers la première étape (les réponses agrégées ne sont plus utilisées). */
    case V3_SHORT_MINIPACK_ID:
      return V3_SHORT_ENTREPRISE_ID

    case 'E6.N10.Q1':
    case 'E6.N10.Q2':
      return getNextE6(currentQuestionId, answers, pathMode)

    default:
      return null
  }
}

export function collectV3ActiveQuestionCodes(
  answers: Record<string, unknown>,
  systemType: string | null | undefined,
  pathMode: 'long' | 'short' = 'long'
): string[] {
  const codes: string[] = []
  let q: string | null = 'E4.N7.Q1'
  const seen = new Set<string>()
  while (q && !seen.has(q)) {
    seen.add(q)
    codes.push(q)
    const ans = answers[q]
    const shortStagePending =
      pathMode === 'short' &&
      isV3ShortPathCompositeQuestionId(q) &&
      (ans === undefined || ans === null)
    if ((ans === undefined || ans === null) && !shortStagePending) break
    const next = getNextQuestionV3(q, answers, systemType, pathMode)
    if (!next) break
    q = next
  }
  return codes
}

export function buildQuestionPathV3(
  targetQuestionId: string,
  answers: Record<string, unknown>,
  systemType: string | null | undefined,
  pathMode: 'long' | 'short' = 'long'
): string[] {
  const path: string[] = []
  let questionId: string | null = 'E4.N7.Q1'
  while (questionId && questionId !== targetQuestionId) {
    path.push(questionId)
    questionId = getNextQuestionV3(questionId, answers, systemType, pathMode)
  }
  if (questionId === targetQuestionId) {
    path.push(targetQuestionId)
  }
  return path
}

export function getResumeQuestionIdV3(
  answers: Record<string, unknown>,
  systemType: string | null | undefined,
  isComplete: (questionId: string, answer: unknown) => boolean,
  pathMode: 'long' | 'short' = 'long'
): string {
  let q: string | null = 'E4.N7.Q1'
  while (q) {
    const ans = answers[q]
    if (ans === undefined || ans === null || !isComplete(q, ans)) return q
    const next = getNextQuestionV3(q, answers, systemType, pathMode)
    if (!next) return q
    q = next
  }
  return 'E4.N7.Q1'
}

export function computeV3UsecaseQuestionnaireFields(
  answers: Record<string, unknown>,
  systemType: string | null | undefined,
  pathMode: 'long' | 'short' = 'long'
): {
  bpgv_variant: BpgvVariant | null
  ors_exit: OrsExit | null
  active_question_codes: string[]
} {
  const active_question_codes = collectV3ActiveQuestionCodes(answers, systemType, pathMode)

  const hasN8 = Object.keys(answers).some(
    k => /^E4\.N8\.(?!Q12$)(?!Q10$)/.test(k) && !isN8ExcludedFromV2OrsBand(k)
  )
  const touchedBpgv = Object.keys(answers).some(k => /^E5\.N9\.Q/.test(k))

  let ors_exit: OrsExit | null = null
  if (isOrsUnacceptableAtQ31(answers) || hasInterdictionUnacceptable(answers)) {
    ors_exit = ORS_EXIT_UNACCEPTABLE
  } else if (hasN8 && touchedBpgv) {
    ors_exit = ORS_EXIT_N8_COMPLETED
  }

  let bpgv_variant: BpgvVariant | null = null
  if (isOrsUnacceptableAtQ31(answers) || hasInterdictionUnacceptable(answers)) {
    bpgv_variant = BPGV_VARIANT_UNACCEPTABLE
  } else if (touchedBpgv) {
    bpgv_variant = deriveBpgvBandFromOrsAnswersV3(answers)
  }

  return { bpgv_variant, ors_exit, active_question_codes }
}

export { V3_PRODUCT_SYSTEM_TYPE }
