/**
 * Source unique de vérité pour le niveau de risque AI Act (qualification questionnaire).
 * Hiérarchie : minimal < limited < high < unacceptable
 */

import questionsData from '@/app/usecases/[id]/data/questions-with-scores.json'

export type RiskLevelCode = 'minimal' | 'limited' | 'high' | 'unacceptable'

const RISK_HIERARCHY: RiskLevelCode[] = ['minimal', 'limited', 'high', 'unacceptable']

/** Réponses minimales attendues (ex. lignes `usecase_responses`) */
export interface RiskLevelResponseInput {
  question_code: string
  single_value?: string | null
  multiple_codes?: string[] | null
  conditional_main?: string | null
}

type QuestionsData = Record<
  string,
  {
    options?: Array<{ code?: string; label?: string; risk?: string }>
  }
>

const QUESTIONS: QuestionsData = questionsData as QuestionsData

export function isRiskLevelCode(value: string): value is RiskLevelCode {
  return (RISK_HIERARCHY as string[]).includes(value)
}

/**
 * Normalise une valeur stockée ou saisie vers un code interne si possible.
 */
export function normalizeToRiskLevelCode(value: string | null | undefined): RiskLevelCode | null {
  if (!value || typeof value !== 'string') return null
  const v = value.trim().toLowerCase()
  if (isRiskLevelCode(v)) return v
  const labelMap: Record<string, RiskLevelCode> = {
    'risque minimal': 'minimal',
    'risque limité': 'limited',
    'risque limite': 'limited',
    'risque élevé': 'high',
    'risque eleve': 'high',
    interdit: 'unacceptable',
    'risque inacceptable': 'unacceptable',
  }
  return labelMap[v] ?? null
}

/**
 * Libellé français du rapport MaydAI (contrat produit).
 */
export function riskLevelCodeToReportLabel(code: RiskLevelCode): string {
  switch (code) {
    case 'minimal':
      return 'Risque minimal'
    case 'limited':
      return 'Risque limité'
    case 'high':
      return 'Risque élevé'
    case 'unacceptable':
      return 'Interdit'
    default:
      return 'Risque minimal'
  }
}

/**
 * Dérive le niveau de risque le plus élevé à partir des réponses et du questionnaire JSON.
 * Même logique que l’API `/api/use-cases/[id]/risk-level` (pas d’héritage du `risk` au niveau question seule).
 */
export function deriveRiskLevelFromResponses(responses: RiskLevelResponseInput[]): RiskLevelCode {
  if (!responses?.length) {
    return 'minimal'
  }

  let highestRiskLevel: RiskLevelCode = 'minimal'

  for (const response of responses) {
    const questionCode = response.question_code
    const question = QUESTIONS[questionCode]
    if (!question) continue

    let selectedRiskLevel: RiskLevelCode | undefined

    if (response.single_value) {
      const option = question.options?.find(
        (opt: { code?: string; label?: string }) =>
          opt.code === response.single_value || opt.label === response.single_value
      )
      if (option && 'risk' in option && option.risk && isRiskLevelCode(option.risk)) {
        selectedRiskLevel = option.risk as RiskLevelCode
      }
    } else if (response.multiple_codes && Array.isArray(response.multiple_codes)) {
      for (const code of response.multiple_codes) {
        const option = question.options?.find((opt: { code?: string }) => opt.code === code)
        if (option && 'risk' in option && option.risk && isRiskLevelCode(option.risk)) {
          const optionRisk = option.risk as RiskLevelCode
          const currentIndex = RISK_HIERARCHY.indexOf(selectedRiskLevel || 'minimal')
          const optionIndex = RISK_HIERARCHY.indexOf(optionRisk)
          if (optionIndex > currentIndex) {
            selectedRiskLevel = optionRisk
          }
        }
      }
    } else if (response.conditional_main) {
      const option = question.options?.find(
        (opt: { code?: string; label?: string }) =>
          opt.code === response.conditional_main || opt.label === response.conditional_main
      )
      if (option && 'risk' in option && option.risk && isRiskLevelCode(option.risk)) {
        selectedRiskLevel = option.risk as RiskLevelCode
      }
    }

    if (selectedRiskLevel) {
      const currentIndex = RISK_HIERARCHY.indexOf(highestRiskLevel)
      const selectedIndex = RISK_HIERARCHY.indexOf(selectedRiskLevel)
      if (selectedIndex > currentIndex) {
        highestRiskLevel = selectedRiskLevel
      }
      if (highestRiskLevel === 'unacceptable') {
        break
      }
    }
  }

  return highestRiskLevel
}

export interface NormalizeReportRiskResult {
  /** Texte rapport à persister (identique à l’entrée si pas de correction JSON) */
  report: string
  /** Un objet JSON valide avec `evaluation_risque` a été trouvé et traité */
  wasStructuredJson: boolean
  /** `evaluation_risque.niveau` a été remplacé */
  corrected: boolean
  /** Valeur avant correction (si correction) */
  previousNiveau?: string
}

/**
 * Si le rapport est un JSON (ou contient un JSON) avec `evaluation_risque.niveau`,
 * force ce champ au libellé autoritatif. Sinon renvoie le texte inchangé.
 */
export function normalizeEvaluationRisqueInReportText(
  rawReport: string,
  authoritativeCode: RiskLevelCode
): NormalizeReportRiskResult {
  const expectedLabel = riskLevelCodeToReportLabel(authoritativeCode)
  const trimmed = rawReport.trim()

  let parsed: Record<string, unknown>
  let usedSlice = trimmed

  try {
    parsed = JSON.parse(trimmed) as Record<string, unknown>
  } catch {
    const match = trimmed.match(/\{[\s\S]*\}/)
    if (!match) {
      return { report: rawReport, wasStructuredJson: false, corrected: false }
    }
    try {
      parsed = JSON.parse(match[0]) as Record<string, unknown>
      usedSlice = match[0]
    } catch {
      return { report: rawReport, wasStructuredJson: false, corrected: false }
    }
  }

  const evaluation = parsed.evaluation_risque
  if (!evaluation || typeof evaluation !== 'object' || Array.isArray(evaluation)) {
    return { report: rawReport, wasStructuredJson: true, corrected: false }
  }

  const evalObj = evaluation as Record<string, unknown>
  const currentRaw = evalObj.niveau
  const current = currentRaw != null ? String(currentRaw).trim() : ''

  if (current === expectedLabel) {
    return { report: rawReport, wasStructuredJson: true, corrected: false }
  }

  evalObj.niveau = expectedLabel
  const newReport =
    usedSlice === trimmed ? JSON.stringify(parsed) : rawReport.replace(usedSlice, JSON.stringify(parsed))

  return {
    report: newReport,
    wasStructuredJson: true,
    corrected: true,
    previousNiveau: current || undefined,
  }
}
