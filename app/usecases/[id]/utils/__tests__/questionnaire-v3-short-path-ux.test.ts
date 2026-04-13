import {
  V3_SHORT_PATH_SEGMENT_COUNT,
  getV3ShortPathProgressPercent,
  getV3ShortPathSegmentForQuestion,
  getV3ShortPathSegmentOrder,
} from '../questionnaire-v3-short-path-ux'

describe('questionnaire-v3-short-path-ux', () => {
  it('segmente les IDs de questions sur 6 blocs métier', () => {
    expect(getV3ShortPathSegmentOrder('E4.N7.Q1')).toBe(1)
    expect(getV3ShortPathSegmentOrder('E4.N7.Q3.1')).toBe(2)
    expect(getV3ShortPathSegmentOrder('E4.N7.Q2')).toBe(3)
    expect(getV3ShortPathSegmentOrder('E4.N8.Q11.T1E')).toBe(4)
    expect(getV3ShortPathSegmentOrder('E4.N8.Q10')).toBe(4)
    expect(getV3ShortPathSegmentOrder('V3._SHORT_CONSOLIDATED')).toBe(5)
    expect(getV3ShortPathSegmentOrder('E5.N9.Q1')).toBe(5)
    expect(getV3ShortPathSegmentOrder('E4.N8.Q12')).toBe(6)
    expect(getV3ShortPathSegmentOrder('E6.N10.Q1')).toBe(6)
  })

  it('retourne un segment avec titre et accroche', () => {
    const s = getV3ShortPathSegmentForQuestion('E4.N8.Q12')
    expect(s.order).toBe(6)
    expect(s.title).toContain('Sensibilisation')
    expect(s.tagline.length).toBeGreaterThan(10)
  })

  it('progression court : dernière question à 100 %', () => {
    expect(getV3ShortPathProgressPercent('E4.N8.Q10', true)).toBe(100)
  })

  it('progression court : plafond inférieur à 100 si pas dernière question', () => {
    const p = getV3ShortPathProgressPercent('E4.N8.Q12', false)
    expect(p).toBeLessThan(100)
    expect(p).toBeGreaterThan(0)
  })

  it('nombre de segments constant', () => {
    expect(V3_SHORT_PATH_SEGMENT_COUNT).toBe(6)
  })
})
