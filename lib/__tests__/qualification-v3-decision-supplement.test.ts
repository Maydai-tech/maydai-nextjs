import { resolveQualificationOutcomeV3, V3_PRODUCT_SYSTEM_TYPE } from '@/lib/qualification-v3-decision'

/**
 * Complète `qualification-v3-decision.test.ts` : chemins limited, éditorial, deepfake, ordre des pivots.
 */
describe('resolveQualificationOutcomeV3 — chemins limited & médias', () => {
  it('interaction directe (E4.N8.Q9.A) → limited', () => {
    expect(resolveQualificationOutcomeV3({ 'E4.N8.Q9': 'E4.N8.Q9.A' }, null)).toEqual({
      classification_status: 'qualified',
      risk_level: 'limited',
    })
  })

  it('texte intérêt public (T1.A) sans contrôle éditorial (T1E.B) → limited', () => {
    const out = resolveQualificationOutcomeV3(
      {
        'E4.N8.Q11.1': ['E4.N8.Q11.1.A'],
        'E4.N8.Q11.T1': 'E4.N8.Q11.T1.A',
        'E4.N8.Q11.T1E': 'E4.N8.Q11.T1E.B',
      },
      null
    )
    expect(out).toEqual({ classification_status: 'qualified', risk_level: 'limited' })
  })

  it('contrôle éditorial humain (T1.A + T1E.A) : ne pas retenir le limited du volet texte T1', () => {
    const out = resolveQualificationOutcomeV3(
      {
        'E4.N8.Q11.1': ['E4.N8.Q11.1.A'],
        'E4.N8.Q11.T1': 'E4.N8.Q11.T1.A',
        'E4.N8.Q11.T1E': 'E4.N8.Q11.T1E.A',
      },
      null
    )
    expect(out.classification_status).toBe('qualified')
    expect(out.risk_level).toBe('minimal')
  })

  it('contenu média réaliste / deepfake (M1.A) → limited', () => {
    const out = resolveQualificationOutcomeV3(
      {
        'E4.N8.Q11.1': ['E4.N8.Q11.1.B'],
        'E4.N8.Q11.M1': 'E4.N8.Q11.M1.A',
      },
      null
    )
    expect(out).toEqual({ classification_status: 'qualified', risk_level: 'limited' })
  })
})

describe('resolveQualificationOutcomeV3 — pivots & hiérarchie', () => {
  it('pivot Annexe I (JNS) prioritaire sur une réponse interdiction dans le même objet', () => {
    const out = resolveQualificationOutcomeV3(
      {
        'E4.N7.Q4': 'E4.N7.Q4.C',
        'E4.N7.Q3': ['E4.N7.Q3.A'],
      },
      V3_PRODUCT_SYSTEM_TYPE
    )
    expect(out.classification_status).toBe('impossible')
    expect(out.risk_level).toBeNull()
  })

  it('sans réponse exploitable : qualified minimal (pas d’impossible implicite)', () => {
    expect(resolveQualificationOutcomeV3({ 'E4.N7.Q1': 'E4.N7.Q1.B' }, null)).toEqual({
      classification_status: 'qualified',
      risk_level: 'minimal',
    })
  })
})
