import {
  computeRiskPyramidCounts,
  getClassificationRiskDisplayLabel,
  getListRiskBadgeStyle,
  getRiskPyramidBucket,
  matchesAdminRiskLevelFilter,
} from '@/lib/classification-risk-display'

describe('classification-risk-display', () => {
  describe('getClassificationRiskDisplayLabel', () => {
    test('impossible : libellé dédié même si risk_level null', () => {
      expect(getClassificationRiskDisplayLabel('impossible', null)).toBe('Classification impossible')
      expect(getClassificationRiskDisplayLabel('impossible', 'minimal')).toBe('Classification impossible')
    })

    test('qualified + niveau : libellé métier', () => {
      expect(getClassificationRiskDisplayLabel('qualified', 'minimal')).toBe('Minimal')
      expect(getClassificationRiskDisplayLabel('qualified', 'unacceptable')).toBe('Inacceptable')
    })

    test('qualified sans niveau : Non évalué', () => {
      expect(getClassificationRiskDisplayLabel('qualified', null)).toBe('Non évalué')
      expect(getClassificationRiskDisplayLabel('qualified', '')).toBe('Non évalué')
    })

    test('V1/V2 : sans classification_status mais risk_level présent', () => {
      expect(getClassificationRiskDisplayLabel(null, 'unacceptable')).toBe('Inacceptable')
      expect(getClassificationRiskDisplayLabel(undefined, 'high')).toBe('Élevé')
    })

    test('absence de données : Non évalué', () => {
      expect(getClassificationRiskDisplayLabel(null, null)).toBe('Non évalué')
      expect(getClassificationRiskDisplayLabel(undefined, undefined)).toBe('Non évalué')
    })
  })

  describe('matchesAdminRiskLevelFilter', () => {
    test('filtre minimal exclut impossible', () => {
      expect(matchesAdminRiskLevelFilter('minimal', 'impossible', null)).toBe(false)
      expect(matchesAdminRiskLevelFilter('minimal', 'impossible', 'minimal')).toBe(false)
    })

    test('filtre minimal accepte qualified + minimal', () => {
      expect(matchesAdminRiskLevelFilter('minimal', 'qualified', 'minimal')).toBe(true)
    })

    test('filtre impossible', () => {
      expect(matchesAdminRiskLevelFilter('impossible', 'impossible', null)).toBe(true)
      expect(matchesAdminRiskLevelFilter('impossible', 'qualified', 'minimal')).toBe(false)
    })

    test('filtre unevaluated', () => {
      expect(matchesAdminRiskLevelFilter('unevaluated', 'qualified', null)).toBe(true)
      expect(matchesAdminRiskLevelFilter('unevaluated', null, null)).toBe(true)
      expect(matchesAdminRiskLevelFilter('unevaluated', 'qualified', 'minimal')).toBe(false)
    })

    test('unacceptable inchangé pour la logique filtre niveau', () => {
      expect(matchesAdminRiskLevelFilter('unacceptable', 'qualified', 'unacceptable')).toBe(true)
      expect(matchesAdminRiskLevelFilter('unacceptable', null, 'unacceptable')).toBe(true)
    })
  })

  describe('getListRiskBadgeStyle / unacceptable', () => {
    test('inacceptable reste rouge (régression)', () => {
      const s = getListRiskBadgeStyle('qualified', 'unacceptable')
      expect(s.label).toBe('Inacceptable')
      expect(s.bg).toContain('red')
    })
  })

  describe('getRiskPyramidBucket / computeRiskPyramidCounts', () => {
    test('impossible séparé de unevaluated', () => {
      expect(getRiskPyramidBucket('impossible', null)).toBe('impossible')
      expect(getRiskPyramidBucket(null, null)).toBe('unevaluated')
    })

    test('comptage pyramide', () => {
      const c = computeRiskPyramidCounts([
        { classification_status: 'impossible', risk_level: null },
        { classification_status: null, risk_level: null },
        { classification_status: 'qualified', risk_level: 'minimal' },
        { classification_status: 'qualified', risk_level: 'unacceptable' },
      ])
      expect(c.impossible).toBe(1)
      expect(c.unevaluated).toBe(1)
      expect(c.minimal).toBe(1)
      expect(c.unacceptable).toBe(1)
    })
  })
})
