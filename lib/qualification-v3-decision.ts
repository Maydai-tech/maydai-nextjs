/**
 * Qualification V3 : décision ordonnée (Annexe I, art. 6.3, contrôle éditorial, JNS).
 * Ne remplace pas deriveRiskLevelFromResponses pour V1/V2.
 */

import type { RiskLevelCode } from '@/lib/risk-level'
import { deriveRiskLevelFromResponses, type RiskLevelResponseInput } from '@/lib/risk-level'

export const V3_PRODUCT_SYSTEM_TYPE = 'Produit'

export type ClassificationStatus = 'qualified' | 'impossible'

export interface QualificationOutcomeV3 {
  classification_status: ClassificationStatus
  /** NULL si classification impossible ou aucune réponse utile */
  risk_level: RiskLevelCode | null
}

/** Codes pivots « Je ne sais pas » (V3). */
export const V3_ANNEX1_JNS = 'E4.N7.Q4.C'
export const V3_ART63_JNS = 'E4.N7.Q5.C'
export const V3_EDITORIAL_JNS = 'E4.N8.Q11.T1E.C'

function isProductSystemType(systemType: string | null | undefined): boolean {
  return (systemType ?? '').trim() === V3_PRODUCT_SYSTEM_TYPE
}

function checkboxToResponses(
  questionCode: string,
  answer: unknown
): RiskLevelResponseInput[] {
  if (!Array.isArray(answer) || answer.length === 0) return []
  return [{ question_code: questionCode, multiple_codes: answer as string[] }]
}

function radioToResponse(questionCode: string, answer: unknown): RiskLevelResponseInput[] {
  if (typeof answer !== 'string' || !answer) return []
  return [{ question_code: questionCode, single_value: answer }]
}

/** Codes E4.N7.Q2 déclarés (tableau normalisé ou chaîne isolée). */
export function annexIiiSelectedCodes(answers: Record<string, unknown>): string[] {
  const raw = answers['E4.N7.Q2']
  if (Array.isArray(raw)) {
    return raw.filter((c): c is string => typeof c === 'string')
  }
  if (typeof raw === 'string' && raw.trim()) {
    return [raw.trim()]
  }
  return []
}

function hasSensitiveAnnexIII(answers: Record<string, unknown>): boolean {
  const codes = annexIiiSelectedCodes(answers)
  return codes.length > 0 && codes.some((c) => c !== 'E4.N7.Q2.G')
}

function interdictionResponses(answers: Record<string, unknown>): RiskLevelResponseInput[] {
  const out: RiskLevelResponseInput[] = []
  out.push(...checkboxToResponses('E4.N7.Q3', answers['E4.N7.Q3']))
  out.push(...checkboxToResponses('E4.N7.Q3.1', answers['E4.N7.Q3.1']))
  out.push(...checkboxToResponses('E4.N7.Q2.1', answers['E4.N7.Q2.1']))
  return out.filter(r => {
    if (r.multiple_codes && r.multiple_codes.length > 0) return true
    return false
  })
}

function n8ResponsesForOrderedDerive(
  answers: Record<string, unknown>
): RiskLevelResponseInput[] {
  const out: RiskLevelResponseInput[] = []
  const skip = new Set<string>(['E4.N8.Q10', 'E4.N8.Q12'])

  const t1 = answers['E4.N8.Q11.T1']
  const t1e = answers['E4.N8.Q11.T1E']
  const skipT1Limited =
    t1 === 'E4.N8.Q11.T1.A' &&
    typeof t1e === 'string' &&
    t1e === 'E4.N8.Q11.T1E.A'

  const ordered = [
    'E4.N8.Q9',
    'E4.N8.Q9.1',
    'E4.N8.Q11.0',
    'E4.N8.Q11.1',
    'E4.N8.Q11.T1',
    'E4.N8.Q11.T1E',
    'E4.N8.Q11.T2',
    'E4.N8.Q11.M1',
    'E4.N8.Q11.M2',
  ] as const

  for (const qid of ordered) {
    if (skip.has(qid)) continue
    if (qid === 'E4.N8.Q11.T1' && skipT1Limited) continue

    const a = answers[qid]
    if (a === undefined || a === null) continue

    if (qid === 'E4.N8.Q11.1') {
      out.push(...checkboxToResponses(qid, a))
      continue
    }
    if (typeof a === 'string') {
      out.push(...radioToResponse(qid, a))
    }
  }

  return out
}

/**
 * Résout la qualification V3 à partir des réponses formatées (même format que scoring).
 */
export function resolveQualificationOutcomeV3(
  answers: Record<string, unknown>,
  systemType: string | null | undefined
): QualificationOutcomeV3 {
  const q4 = answers['E4.N7.Q4']
  if (typeof q4 === 'string' && q4 === V3_ANNEX1_JNS) {
    return { classification_status: 'impossible', risk_level: null }
  }

  const q5 = answers['E4.N7.Q5']
  if (typeof q5 === 'string' && q5 === V3_ART63_JNS) {
    return { classification_status: 'impossible', risk_level: null }
  }

  const t1e = answers['E4.N8.Q11.T1E']
  if (typeof t1e === 'string' && t1e === V3_EDITORIAL_JNS) {
    return { classification_status: 'impossible', risk_level: null }
  }

  const inter = interdictionResponses(answers)
  const interRisk = inter.length > 0 ? deriveRiskLevelFromResponses(inter) : ('minimal' as RiskLevelCode)
  if (interRisk === 'unacceptable') {
    return { classification_status: 'qualified', risk_level: 'unacceptable' }
  }

  const pieces: RiskLevelResponseInput[] = [...inter]

  if (isProductSystemType(systemType) && answers['E4.N7.Q4'] === 'E4.N7.Q4.A') {
    pieces.push(...radioToResponse('E4.N7.Q4', answers['E4.N7.Q4']))
  }

  if (hasSensitiveAnnexIII(answers)) {
    const q5v = answers['E4.N7.Q5']
    if (q5v === 'E4.N7.Q5.B') {
      pieces.push(...checkboxToResponses('E4.N7.Q2', annexIiiSelectedCodes(answers)))
    } else if (q5v === 'E4.N7.Q5.A') {
      /* garde-fou 6.3 : ne pas retenir le « high » des domaines sensibles */
    } else {
      /* Q5 absent ou valeur inattendue : pas de 6.3 tranché — plafond légal conservateur */
      return { classification_status: 'qualified', risk_level: 'high' }
    }
  }

  pieces.push(...n8ResponsesForOrderedDerive(answers))

  if (pieces.length === 0) {
    return { classification_status: 'qualified', risk_level: 'minimal' }
  }

  const risk = deriveRiskLevelFromResponses(pieces)
  return { classification_status: 'qualified', risk_level: risk }
}
