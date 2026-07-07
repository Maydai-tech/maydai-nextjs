import {
  PDF_RISK_JUSTIFICATION_UNAVAILABLE,
  pdfRiskJustificationText,
  resolveAuthoritativeRiskCodeForPdf,
  resolvePdfRiskTierOrUnavailable,
} from '../pdf-risk-logic'

describe('pdf-risk-logic', () => {
  describe('resolveAuthoritativeRiskCodeForPdf', () => {
    test('null / vide → null (pas de minimal implicite)', () => {
      expect(resolveAuthoritativeRiskCodeForPdf(null)).toBeNull()
      expect(resolveAuthoritativeRiskCodeForPdf(undefined)).toBeNull()
      expect(resolveAuthoritativeRiskCodeForPdf('')).toBeNull()
      expect(resolveAuthoritativeRiskCodeForPdf('   ')).toBeNull()
    })

    test('code canonique accepté', () => {
      expect(resolveAuthoritativeRiskCodeForPdf('high')).toBe('high')
      expect(resolveAuthoritativeRiskCodeForPdf('minimal')).toBe('minimal')
    })
  })

  describe('resolvePdfRiskTierOrUnavailable', () => {
    test('null → unavailable (affichage neutre côté PDF)', () => {
      expect(resolvePdfRiskTierOrUnavailable(null)).toBe('unavailable')
      expect(resolvePdfRiskTierOrUnavailable(undefined)).toBe('unavailable')
    })

    test('code connu → palier', () => {
      expect(resolvePdfRiskTierOrUnavailable('limited')).toBe('limited')
    })
  })

  describe('pdfRiskJustificationText', () => {
    test('sans code → texte défensif sans palier fictif', () => {
      const t = pdfRiskJustificationText(null)
      expect(t).toBe(PDF_RISK_JUSTIFICATION_UNAVAILABLE)
      expect(t).not.toMatch(/Risque minimal/i)
      expect(t).not.toMatch(/Risque limité/i)
    })

    test('minimal → justification métier habituelle', () => {
      const t = pdfRiskJustificationText('minimal')
      expect(t.length).toBeGreaterThan(50)
      expect(t).not.toBe(PDF_RISK_JUSTIFICATION_UNAVAILABLE)
    })
  })
})
