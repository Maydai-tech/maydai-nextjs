import { getPdfCanonicalDescription, getPdfReportDateIso } from '../pdf-content-utils'

function makePdfData(partialUseCase: any) {
  return {
    useCase: partialUseCase,
    riskLevel: { risk_level: 'limited' },
    score: { score: 42, is_eliminated: false, category_scores: [] },
    nextSteps: null,
    profile: { email: 'test@example.com' },
    generatedDate: '2026-01-01T00:00:00.000Z',
    canonicalPlanItems: [],
  } as any
}

describe('pdf-content-utils', () => {
  describe('getPdfCanonicalDescription', () => {
    test('retourne useCase.description (trim) quand présent', () => {
      const data = makePdfData({ description: '  Ma description.  ' })
      expect(getPdfCanonicalDescription(data)).toBe('Ma description.')
    })

    test('retourne un placeholder stable quand vide', () => {
      const data = makePdfData({ description: '   ' })
      expect(getPdfCanonicalDescription(data)).toBe("[Description du cas d'usage]")
    })
  })

  describe('getPdfReportDateIso', () => {
    test('priorise last_calculation_date (align front)', () => {
      const data = makePdfData({
        last_calculation_date: '2026-02-03T10:11:12.000Z',
        updated_at: '2026-02-01T00:00:00.000Z',
      })
      expect(getPdfReportDateIso(data)).toBe('2026-02-03T10:11:12.000Z')
    })

    test('fallback updated_at puis generatedDate', () => {
      const data1 = makePdfData({ updated_at: '2026-03-04T05:06:07.000Z' })
      expect(getPdfReportDateIso(data1)).toBe('2026-03-04T05:06:07.000Z')

      const data2 = makePdfData({})
      expect(getPdfReportDateIso(data2)).toBe('2026-01-01T00:00:00.000Z')
    })
  })
})

