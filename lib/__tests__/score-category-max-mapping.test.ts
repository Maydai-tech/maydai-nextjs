import { mapCategoryFromJson } from '@/lib/score-category-max'

describe('mapCategoryFromJson', () => {
  it('fusionne human_oversight et governance vers human_agency', () => {
    expect(mapCategoryFromJson('human_oversight')).toBe('human_agency')
    expect(mapCategoryFromJson('governance')).toBe('human_agency')
  })

  it('laisse les autres clés inchangées', () => {
    expect(mapCategoryFromJson('risk_level')).toBe('risk_level')
    expect(mapCategoryFromJson('transparency')).toBe('transparency')
  })
})
