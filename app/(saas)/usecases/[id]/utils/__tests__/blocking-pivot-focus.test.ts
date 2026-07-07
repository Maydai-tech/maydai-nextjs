import { getBlockingPivotId } from '../blocking-pivot-focus'

describe('getBlockingPivotId', () => {
  it('retourne le code question sans suffixe option pour E4.N7.Q5.C', () => {
    expect(
      getBlockingPivotId({
        checklist_gov_usecase: ['E4.N7.Q2.A', 'E4.N7.Q5.C'],
        checklist_gov_enterprise: [],
      })
    ).toBe('E4.N7.Q5')
  })

  it('retourne null sans pivot bloquant', () => {
    expect(
      getBlockingPivotId({
        checklist_gov_usecase: ['E4.N7.Q5.A'],
        checklist_gov_enterprise: [],
      })
    ).toBeNull()
  })
})
