import { deriveMissingPenaltiesForShortPath } from '@/lib/derive-missing-penalties-short-path'
import {
  E6_TRANSPARENCY_PACK_CONTENT_CODE,
  E6_TRANSPARENCY_PACK_INTERACTION_CODE,
} from '@/app/usecases/[id]/utils/bpgv-transparency-checklist-save'
import { V3_SHORT_TRANSPARENCE_ID, V3_SHORT_USAGE_ID } from '@/app/usecases/[id]/utils/questionnaire-v3-graph'

describe('deriveMissingPenaltiesForShortPath', () => {
  describe('V3_SHORT_USAGE', () => {
    it('injecte les malus lorsque ni la pratique positive ni le malus explicite ne sont présents', () => {
      const ghosts = deriveMissingPenaltiesForShortPath([], V3_SHORT_USAGE_ID)
      expect(ghosts).toEqual(
        expect.arrayContaining([
          'E5.N9.Q3.A',
          'E5.N9.Q8.A',
          'E5.N9.Q4.B',
          'E5.N9.Q9.A',
          'E5.N9.Q6.A',
        ])
      )
      expect(ghosts).toHaveLength(5)
    })

    it('n’injecte pas E5.N9.Q9.A si Q9.B est coché', () => {
      const ghosts = deriveMissingPenaltiesForShortPath(['E5.N9.Q9.B'], V3_SHORT_USAGE_ID)
      expect(ghosts).not.toContain('E5.N9.Q9.A')
    })

    it('n’injecte pas E5.N9.Q3.A si le tag pack court E5.N9.Q3.A est coché (pratique déclarée)', () => {
      const ghosts = deriveMissingPenaltiesForShortPath(['E5.N9.Q3.A'], V3_SHORT_USAGE_ID)
      expect(ghosts).not.toContain('E5.N9.Q3.A')
    })

    it('n’injecte pas de doublon si le malus est déjà dans la sélection', () => {
      const ghosts = deriveMissingPenaltiesForShortPath(['E5.N9.Q9.A'], V3_SHORT_USAGE_ID)
      expect(ghosts.filter((c) => c === 'E5.N9.Q9.A')).toHaveLength(0)
    })
  })

  describe('V3_SHORT_TRANSPARENCE', () => {
    it('injecte E6.N10.Q1.A si Q1.B absent et pas déjà A', () => {
      expect(deriveMissingPenaltiesForShortPath([], V3_SHORT_TRANSPARENCE_ID)).toContain('E6.N10.Q1.A')
    })

    it('n’injecte pas Q1.A si INTERACTION est coché (déploie en Q1.B)', () => {
      const ghosts = deriveMissingPenaltiesForShortPath(
        [E6_TRANSPARENCY_PACK_INTERACTION_CODE],
        V3_SHORT_TRANSPARENCE_ID
      )
      expect(ghosts).not.toContain('E6.N10.Q1.A')
    })

    it('fourche Q2/Q3 : injecte E6.N10.Q3.A si ni Q2.B, ni Q3.B, ni Q3.C', () => {
      const ghosts = deriveMissingPenaltiesForShortPath(
        [E6_TRANSPARENCY_PACK_INTERACTION_CODE],
        V3_SHORT_TRANSPARENCE_ID
      )
      expect(ghosts).toContain('E6.N10.Q3.A')
    })

    it('fourche satisfaite par CONTENT seul (Q2.B)', () => {
      const ghosts = deriveMissingPenaltiesForShortPath(
        [E6_TRANSPARENCY_PACK_CONTENT_CODE],
        V3_SHORT_TRANSPARENCE_ID
      )
      expect(ghosts).not.toContain('E6.N10.Q3.A')
    })

    it('fourche satisfaite par Q3.C', () => {
      const ghosts = deriveMissingPenaltiesForShortPath(['E6.N10.Q3.C'], V3_SHORT_TRANSPARENCE_ID)
      expect(ghosts).not.toContain('E6.N10.Q3.A')
    })
  })

  it('retourne [] pour un pack inconnu', () => {
    expect(deriveMissingPenaltiesForShortPath([], 'UNKNOWN')).toEqual([])
  })
})
