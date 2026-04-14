import {
  annexIiiSelectedCodes,
  resolveQualificationOutcomeV3,
} from '@/lib/qualification-v3-decision'

describe('resolveQualificationOutcomeV3 — Annexe III P0 (faux négatif)', () => {
  it('Annexe III sensible sans Q5 tranché → high (court-circuit légal)', () => {
    expect(
      resolveQualificationOutcomeV3({ 'E4.N7.Q2': ['E4.N7.Q2.A'] }, null)
    ).toEqual({
      classification_status: 'qualified',
      risk_level: 'high',
    })
  })

  it('Annexe III sensible avec E4.N7.Q2 en chaîne → high sans Q5', () => {
    expect(
      resolveQualificationOutcomeV3({ 'E4.N7.Q2': 'E4.N7.Q2.A' }, null)
    ).toEqual({
      classification_status: 'qualified',
      risk_level: 'high',
    })
  })
})

describe('annexIiiSelectedCodes', () => {
  it('extrait depuis un tableau', () => {
    expect(annexIiiSelectedCodes({ 'E4.N7.Q2': ['E4.N7.Q2.A', 'E4.N7.Q2.B'] })).toEqual([
      'E4.N7.Q2.A',
      'E4.N7.Q2.B',
    ])
  })

  it('extrait depuis une chaîne', () => {
    expect(annexIiiSelectedCodes({ 'E4.N7.Q2': 'E4.N7.Q2.A' })).toEqual(['E4.N7.Q2.A'])
  })

  it('ignore les entrées non string dans le tableau', () => {
    expect(
      annexIiiSelectedCodes({ 'E4.N7.Q2': ['E4.N7.Q2.A', 1 as unknown as string] })
    ).toEqual(['E4.N7.Q2.A'])
  })
})
