import { isRiskLevelCode, normalizeToRiskLevelCode, type RiskLevelCode } from '@/lib/risk-level'
import { getRiskLevelJustification } from '@/app/usecases/[id]/utils/company-status'

export const PDF_RISK_JUSTIFICATION_UNAVAILABLE =
  "Le niveau de risque au sens de l'AI Act n'est pas établi de manière fiable dans ce rapport PDF (donnée absente ou non normalisable). Aucun palier « minimal », « limité », « élevé » ou « interdit » ne doit être déduit du seul score de conformité ou du présent document : vérifiez le cas d'usage dans MaydAI après recalcul du score si nécessaire."

export type PdfRiskTierResolved = RiskLevelCode | 'unavailable'

/**
 * Code de risque exploitable pour le PDF (même logique que la route generate-pdf).
 */
export function resolveAuthoritativeRiskCodeForPdf(
  raw: string | null | undefined
): RiskLevelCode | null {
  if (raw == null) return null
  const s = String(raw).trim()
  if (!s) return null
  return normalizeToRiskLevelCode(s)
}

export function resolvePdfRiskTierOrUnavailable(
  riskLevelCode: string | null | undefined
): PdfRiskTierResolved {
  if (riskLevelCode != null && isRiskLevelCode(riskLevelCode)) {
    return riskLevelCode
  }
  return 'unavailable'
}

export function pdfRiskJustificationText(riskLevelCode: string | null | undefined): string {
  if (riskLevelCode != null && isRiskLevelCode(riskLevelCode)) {
    return getRiskLevelJustification(riskLevelCode)
  }
  return PDF_RISK_JUSTIFICATION_UNAVAILABLE
}
