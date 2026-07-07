import { getAbsoluteQuestionProgressV3, resetProgressCacheV3 } from '../questionnaire-v3-progress'

describe('questionnaire-v3-progress', () => {
  beforeEach(() => {
    resetProgressCacheV3()
  })

  it('progression absolue : current ≤ total et pourcentage dans [0, 100]', () => {
    const p1 = getAbsoluteQuestionProgressV3('E4.N7.Q1')
    expect(p1.current).toBeGreaterThanOrEqual(1)
    expect(p1.current).toBeLessThanOrEqual(p1.total)
    expect(p1.percentage).toBeGreaterThanOrEqual(0)
    expect(p1.percentage).toBeLessThanOrEqual(100)
  })

  it('en profondeur du graphe : position ≥ départ', () => {
    const start = getAbsoluteQuestionProgressV3('E4.N7.Q1')
    const deeper = getAbsoluteQuestionProgressV3('E5.N9.Q1')
    expect(deeper.current).toBeGreaterThanOrEqual(start.current)
  })
})
