import type { BpgvVariant, OrsExit } from '@/lib/questionnaire-version'
import {
  BPGV_VARIANT_HIGH,
  BPGV_VARIANT_LIMITED,
  BPGV_VARIANT_MINIMAL,
  BPGV_VARIANT_UNACCEPTABLE,
  ORS_EXIT_N8_COMPLETED,
  ORS_EXIT_UNACCEPTABLE
} from '@/lib/questionnaire-version'
import questionsData from '@/app/usecases/[id]/data/questions-with-scores.json'

type RawQuestion = {
  type?: string
  risk?: string
  options?: Array<{ code: string; risk?: string }>
}

const rawQuestions = questionsData as Record<string, RawQuestion>

/** N8 V2 : hors périmètre ORS (Q2–Q8 ne font pas partie du parcours V2). */
function isN8ExcludedFromV2OrsBand(qid: string): boolean {
  return /^E4\.N8\.Q[2-8]$/.test(qid)
}

/** Réponse Q3.1 : sortie « unacceptable » ORS (au moins une situation autre que « aucune »). */
export function isOrsUnacceptableAtQ31(answers: Record<string, unknown>): boolean {
  const v = answers['E4.N7.Q3.1']
  if (!Array.isArray(v) || v.length === 0) return false
  return v.some(code => code !== 'E4.N7.Q3.1.E')
}

function hasQ111Text(answers: Record<string, unknown>): boolean {
  const v = answers['E4.N8.Q11.1']
  return Array.isArray(v) && v.includes('E4.N8.Q11.1.A')
}

function hasQ111Media(answers: Record<string, unknown>): boolean {
  const v = answers['E4.N8.Q11.1']
  return Array.isArray(v) && v.includes('E4.N8.Q11.1.B')
}

type Band = typeof BPGV_VARIANT_MINIMAL | typeof BPGV_VARIANT_LIMITED | typeof BPGV_VARIANT_HIGH

const bandOrder: Record<Band, number> = {
  [BPGV_VARIANT_MINIMAL]: 0,
  [BPGV_VARIANT_LIMITED]: 1,
  [BPGV_VARIANT_HIGH]: 2
}

function maxBand(a: Band, b: Band): Band {
  return bandOrder[a] >= bandOrder[b] ? a : b
}

/** Mappe un risk option JSON vers une bande BPGV (hors variante unacceptable réservée à la sortie N7). */
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

  if (q.type === 'conditional' && typeof answer === 'object' && answer !== null && 'selected' in answer) {
    const sel = (answer as { selected?: string }).selected
    if (typeof sel === 'string') {
      const opt = q.options?.find(o => o.code === sel)
      return normalizeOptionRiskToBand(opt?.risk)
    }
  }

  return BPGV_VARIANT_MINIMAL
}

/**
 * Bande BPGV après fin de l’ORS (N7 + N8), dérivée des option.risk déjà répondues.
 * Ne couvre pas la sortie rapide unacceptable (gérée à part).
 */
export function deriveBpgvBandFromOrsAnswers(answers: Record<string, unknown>): Band {
  let m: Band = BPGV_VARIANT_MINIMAL
  for (const [qid, value] of Object.entries(answers)) {
    if (!qid.startsWith('E4.N7.') && !qid.startsWith('E4.N8.')) continue
    if (qid === 'E4.N8.Q12') continue
    if (isN8ExcludedFromV2OrsBand(qid)) continue
    m = maxBand(m, bandFromQuestionAnswer(qid, value))
  }
  return m
}

export function getFirstE5AfterOrs(answers: Record<string, unknown>): string {
  const band = deriveBpgvBandFromOrsAnswers(answers)
  if (band === BPGV_VARIANT_MINIMAL) return 'E5.N9.Q7'
  return 'E5.N9.Q1'
}

function getNextAfterQ12(answers: Record<string, unknown>): string | null {
  if (isOrsUnacceptableAtQ31(answers)) return null
  if (answers['E4.N8.Q9'] === 'E4.N8.Q9.A') return 'E6.N10.Q1'
  if (answers['E4.N8.Q11.0'] === 'E4.N8.Q11.0.A') return 'E6.N10.Q2'
  return null
}

function getNextE6(current: string, answers: Record<string, unknown>): string | null {
  if (current === 'E6.N10.Q1') {
    if (answers['E4.N8.Q11.0'] === 'E4.N8.Q11.0.A') return 'E6.N10.Q2'
    return null
  }
  if (current === 'E6.N10.Q2') return null
  return null
}

/**
 * BPGV V2 : ordre validé Q1→…→Q9 puis E4.N8.Q12.
 * Branche courte (minimal / unacceptable) : arrivée directe sur Q7 sans Q6 → Q12.
 */
function getNextE5V2(currentQuestionId: string, answers: Record<string, unknown>): string | null {
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
 * Navigation questionnaire V2 : ORS N7 → (sortie unacceptable) ou ORS N8 (E4.N8.Q9→…→Q11.* uniquement) ;
 * puis BPGV ; E6 uniquement après E4.N8.Q12 si non unacceptable.
 */
export function getNextQuestionV2(
  currentQuestionId: string,
  answers: Record<string, unknown>
): string | null {
  switch (currentQuestionId) {
    case 'E4.N7.Q1': {
      const q1 = answers['E4.N7.Q1']
      if (q1 === 'E4.N7.Q1.A') return 'E4.N7.Q1.1'
      if (q1 === 'E4.N7.Q1.B') return 'E4.N7.Q1.2'
      return null
    }
    case 'E4.N7.Q1.1':
      return 'E4.N7.Q2'
    case 'E4.N7.Q1.2':
      return 'E4.N7.Q2'
    case 'E4.N7.Q2':
      return 'E4.N7.Q2.1'
    case 'E4.N7.Q2.1':
      return 'E4.N7.Q3'
    case 'E4.N7.Q3':
      return 'E4.N7.Q3.1'
    case 'E4.N7.Q3.1':
      if (isOrsUnacceptableAtQ31(answers)) return 'E5.N9.Q7'
      return 'E4.N8.Q9'

    case 'E4.N8.Q9':
      return 'E4.N8.Q9.1'
    case 'E4.N8.Q9.1':
      return 'E4.N8.Q10'
    case 'E4.N8.Q10':
      return 'E4.N8.Q11.0'

    case 'E4.N8.Q11.0': {
      const y = answers['E4.N8.Q11.0']
      if (y === 'E4.N8.Q11.0.A') return 'E4.N8.Q11.1'
      if (y === 'E4.N8.Q11.0.B') return getFirstE5AfterOrs(answers)
      return null
    }

    case 'E4.N8.Q11.1': {
      if (hasQ111Text(answers)) return 'E4.N8.Q11.T1'
      if (hasQ111Media(answers)) return 'E4.N8.Q11.M1'
      return getFirstE5AfterOrs(answers)
    }

    case 'E4.N8.Q11.T1': {
      if (answers['E4.N8.Q11.T1'] === 'E4.N8.Q11.T1.B') return 'E4.N8.Q11.T2'
      if (hasQ111Media(answers)) return 'E4.N8.Q11.M1'
      return getFirstE5AfterOrs(answers)
    }

    case 'E4.N8.Q11.T2': {
      if (hasQ111Media(answers)) return 'E4.N8.Q11.M1'
      return getFirstE5AfterOrs(answers)
    }

    case 'E4.N8.Q11.M1': {
      if (answers['E4.N8.Q11.M1'] === 'E4.N8.Q11.M1.A') return 'E4.N8.Q11.M2'
      return getFirstE5AfterOrs(answers)
    }

    case 'E4.N8.Q11.M2':
      return getFirstE5AfterOrs(answers)

    case 'E5.N9.Q4':
    case 'E5.N9.Q1':
    case 'E5.N9.Q2':
    case 'E5.N9.Q3':
    case 'E5.N9.Q9':
    case 'E5.N9.Q5':
    case 'E5.N9.Q6':
    case 'E5.N9.Q7':
    case 'E5.N9.Q8':
      return getNextE5V2(currentQuestionId, answers)

    case 'E4.N8.Q12':
      return getNextAfterQ12(answers)

    case 'E6.N10.Q1':
    case 'E6.N10.Q2':
      return getNextE6(currentQuestionId, answers)

    default:
      return null
  }
}

/**
 * Liste ordonnée des codes de questions sur le chemin V2 effectif (ORS + BPGV + E6 si applicable).
 * S’arrête à la première question sans réponse (questionnaire incomplet). Source de vérité scoring V2.
 */
export function collectV2ActiveQuestionCodes(answers: Record<string, unknown>): string[] {
  const codes: string[] = []
  let q: string | null = 'E4.N7.Q1'
  const seen = new Set<string>()
  while (q && !seen.has(q)) {
    seen.add(q)
    codes.push(q)
    const ans = answers[q]
    if (ans === undefined || ans === null) break
    const next = getNextQuestionV2(q, answers)
    if (!next) break
    q = next
  }
  return codes
}

export function buildQuestionPathV2(
  targetQuestionId: string,
  answers: Record<string, unknown>
): string[] {
  const path: string[] = []
  let questionId: string | null = 'E4.N7.Q1'
  while (questionId && questionId !== targetQuestionId) {
    path.push(questionId)
    questionId = getNextQuestionV2(questionId, answers)
  }
  if (questionId === targetQuestionId) {
    path.push(targetQuestionId)
  }
  return path
}

/** Première question à afficher : avance tant que la réponse est déjà renseignée et complète. */
export function getResumeQuestionIdV2(
  answers: Record<string, unknown>,
  isComplete: (questionId: string, answer: unknown) => boolean
): string {
  let q: string | null = 'E4.N7.Q1'
  while (q) {
    const ans = answers[q]
    if (ans === undefined || ans === null || !isComplete(q, ans)) return q
    const next = getNextQuestionV2(q, answers)
    if (!next) return q
    q = next
  }
  return 'E4.N7.Q1'
}

export function computeV2UsecaseQuestionnaireFields(answers: Record<string, unknown>): {
  bpgv_variant: BpgvVariant | null
  ors_exit: OrsExit | null
  active_question_codes: string[]
} {
  const active_question_codes = collectV2ActiveQuestionCodes(answers)

  const hasN8 = Object.keys(answers).some(
    k => /^E4\.N8\.(?!Q12$)/.test(k) && !isN8ExcludedFromV2OrsBand(k)
  )
  const touchedBpgv = Object.keys(answers).some(k => k.startsWith('E5.N9.'))

  let ors_exit: OrsExit | null = null
  if (isOrsUnacceptableAtQ31(answers)) {
    ors_exit = ORS_EXIT_UNACCEPTABLE
  } else if (hasN8 && touchedBpgv) {
    ors_exit = ORS_EXIT_N8_COMPLETED
  }

  let bpgv_variant: BpgvVariant | null = null
  if (isOrsUnacceptableAtQ31(answers)) {
    bpgv_variant = BPGV_VARIANT_UNACCEPTABLE
  } else if (touchedBpgv) {
    bpgv_variant = deriveBpgvBandFromOrsAnswers(answers)
  }

  return { bpgv_variant, ors_exit, active_question_codes }
}
