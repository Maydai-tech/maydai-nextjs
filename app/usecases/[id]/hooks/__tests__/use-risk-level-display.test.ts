jest.mock('@/lib/auth', () => ({
  useAuth: () => ({ session: null }),
}))

import {
  mergeRiskDisplay,
  parseRiskFieldsFromUseCase,
  parseRiskPayload,
} from '../useRiskLevel'

describe('useRiskLevel — affichage unifié (merge / parse)', () => {
  describe('parseRiskPayload', () => {
    it('qualifie impossible quand classification_status vaut impossible', () => {
      const r = parseRiskPayload({
        risk_level: 'minimal',
        classification_status: 'impossible',
      })
      expect(r.classificationStatus).toBe('impossible')
      expect(r.riskLevel).toBe('minimal')
    })

    it('retourne qualified pour toute autre classification_status', () => {
      const r = parseRiskPayload({
        risk_level: 'high',
        classification_status: 'qualified',
      })
      expect(r.classificationStatus).toBe('qualified')
      expect(r.riskLevel).toBe('high')
    })
  })

  describe('parseRiskFieldsFromUseCase', () => {
    it('reflète impossible depuis le use case (snapshot page)', () => {
      const r = parseRiskFieldsFromUseCase({
        risk_level: '',
        classification_status: 'impossible',
      })
      expect(r?.classificationStatus).toBe('impossible')
      expect(r?.riskLevel).toBeNull()
    })
  })

  describe('mergeRiskDisplay', () => {
    const snapshot = {
      riskLevel: 'limited' as const,
      classificationStatus: 'qualified' as const,
    }

    it('priorise la réponse API une fois réponse OK', () => {
      const m = mergeRiskDisplay(snapshot, true, null, 'high', 'qualified')
      expect(m.riskLevel).toBe('high')
      expect(m.classificationStatus).toBe('qualified')
      expect(m.error).toBeNull()
    })

    it('en erreur API, conserve le snapshot si présent (pas de flash contradictoire)', () => {
      const m = mergeRiskDisplay(snapshot, true, 'network', null, null)
      expect(m.riskLevel).toBe('limited')
      expect(m.classificationStatus).toBe('qualified')
      expect(m.error).toBeNull()
    })

    it('sans snapshot, expose l’erreur API', () => {
      const m = mergeRiskDisplay(null, true, 'Failed', null, null)
      expect(m.error).toBe('Failed')
    })

    it('cas impossible : snapshot impossible conservé si API en erreur', () => {
      const snap = {
        riskLevel: null as const,
        classificationStatus: 'impossible' as const,
      }
      const m = mergeRiskDisplay(snap, true, 'Failed', null, null)
      expect(m.classificationStatus).toBe('impossible')
      expect(m.riskLevel).toBeNull()
      expect(m.error).toBeNull()
    })
  })
})
