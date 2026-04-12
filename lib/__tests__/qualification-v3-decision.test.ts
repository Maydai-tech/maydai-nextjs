import { deriveRiskLevelFromResponses } from '@/lib/risk-level'
import {
  resolveQualificationOutcomeV3,
  V3_ANNEX1_JNS,
  V3_ART63_JNS,
  V3_EDITORIAL_JNS,
  V3_PRODUCT_SYSTEM_TYPE,
} from '@/lib/qualification-v3-decision'

describe('resolveQualificationOutcomeV3', () => {
  test('sans réponses utiles → qualified minimal', () => {
    expect(resolveQualificationOutcomeV3({}, null)).toEqual({
      classification_status: 'qualified',
      risk_level: 'minimal',
    })
  })

  test('Annexe I : Je ne sais pas → classification impossible', () => {
    expect(
      resolveQualificationOutcomeV3({ 'E4.N7.Q4': V3_ANNEX1_JNS }, V3_PRODUCT_SYSTEM_TYPE)
    ).toEqual({
      classification_status: 'impossible',
      risk_level: null,
    })
  })

  test('Article 6.3 : Je ne sais pas → classification impossible', () => {
    expect(resolveQualificationOutcomeV3({ 'E4.N7.Q5': V3_ART63_JNS }, null)).toEqual({
      classification_status: 'impossible',
      risk_level: null,
    })
  })

  test('Contrôle éditorial : Je ne sais pas sur T1E → classification impossible', () => {
    expect(
      resolveQualificationOutcomeV3(
        {
          'E4.N8.Q11.T1': 'E4.N8.Q11.T1.A',
          'E4.N8.Q11.T1E': V3_EDITORIAL_JNS,
        } as Record<string, unknown>,
        null
      )
    ).toEqual({
      classification_status: 'impossible',
      risk_level: null,
    })
  })

  test('interdit (Q3) → qualified unacceptable', () => {
    expect(
      resolveQualificationOutcomeV3(
        { 'E4.N7.Q3': ['E4.N7.Q3.A'] },
        null
      )
    ).toEqual({
      classification_status: 'qualified',
      risk_level: 'unacceptable',
    })
  })

  test('produit + Annexe I oui → high', () => {
    const out = resolveQualificationOutcomeV3(
      { 'E4.N7.Q4': 'E4.N7.Q4.A' },
      V3_PRODUCT_SYSTEM_TYPE
    )
    expect(out).toEqual({
      classification_status: 'qualified',
      risk_level: 'high',
    })
  })

  test('Annexe III sensible + garde-fou 6.3 Oui → ne pas conclure high sur le domaine seul', () => {
    const out = resolveQualificationOutcomeV3(
      {
        'E4.N7.Q2': ['E4.N7.Q2.A'],
        'E4.N7.Q5': 'E4.N7.Q5.A',
      },
      null
    )
    expect(out.classification_status).toBe('qualified')
    expect(out.risk_level).toBe('minimal')
  })

  test('Annexe III sensible + 6.3 Non → high', () => {
    const out = resolveQualificationOutcomeV3(
      {
        'E4.N7.Q2': ['E4.N7.Q2.A'],
        'E4.N7.Q5': 'E4.N7.Q5.B',
      },
      null
    )
    expect(out).toEqual({
      classification_status: 'qualified',
      risk_level: 'high',
    })
  })

  test('E4.N8.Q9.1 conservée : Oui → limited', () => {
    const out = resolveQualificationOutcomeV3(
      { 'E4.N8.Q9.1': 'E4.N8.Q9.1.A' },
      null
    )
    expect(out).toEqual({
      classification_status: 'qualified',
      risk_level: 'limited',
    })
  })

  test('E4.N8.Q10 seule ne qualifie pas le risque (hors cœur V3)', () => {
    const out = resolveQualificationOutcomeV3(
      { 'E4.N8.Q10': 'E4.N8.Q10.E' },
      null
    )
    expect(out).toEqual({
      classification_status: 'qualified',
      risk_level: 'minimal',
    })
  })
})

describe('Moteur deriveRiskLevelFromResponses (non-régression V1/V2)', () => {
  test('entrée interdit biométrique → unacceptable', () => {
    expect(
      deriveRiskLevelFromResponses([
        { question_code: 'E4.N7.Q3', multiple_codes: ['E4.N7.Q3.A'] },
      ])
    ).toBe('unacceptable')
  })
})
