import { deriveMissingPenaltiesForShortPath } from '@/lib/derive-missing-penalties-short-path'
import { E6_TRANSPARENCY_PACK_INTERACTION_CODE } from '@/app/usecases/[id]/utils/bpgv-transparency-checklist-save'
import {
  V3_SHORT_ENTREPRISE_ID,
  V3_SHORT_SOCIAL_ENV_ID,
  V3_SHORT_TRANSPARENCE_ID,
  V3_SHORT_USAGE_ID,
} from '@/app/usecases/[id]/utils/questionnaire-v3-graph'

describe('deriveMissingPenaltiesForShortPath', () => {
  describe('V3_SHORT_ENTREPRISE', () => {
    it('injecte les trois malus si la sélection est vide', () => {
      const ghosts = deriveMissingPenaltiesForShortPath([], V3_SHORT_ENTREPRISE_ID)
      expect(ghosts).toEqual(
        expect.arrayContaining(['E5.N9.Q1.B', 'E5.N9.Q7.A', 'E4.N8.Q12.A'])
      )
      expect(ghosts).toHaveLength(3)
    })

    it('n’injecte pas E5.N9.Q1.B si E5.N9.Q1.A est coché', () => {
      expect(deriveMissingPenaltiesForShortPath(['E5.N9.Q1.A'], V3_SHORT_ENTREPRISE_ID)).not.toContain('E5.N9.Q1.B')
    })

    it('n’injecte pas E5.N9.Q7.A si E5.N9.Q7.B est coché', () => {
      expect(deriveMissingPenaltiesForShortPath(['E5.N9.Q7.B'], V3_SHORT_ENTREPRISE_ID)).not.toContain('E5.N9.Q7.A')
    })

    it('n’injecte pas E4.N8.Q12.A si E4.N8.Q12.B est coché', () => {
      expect(deriveMissingPenaltiesForShortPath(['E4.N8.Q12.B'], V3_SHORT_ENTREPRISE_ID)).not.toContain('E4.N8.Q12.A')
    })

    it('n’injecte pas de doublon si le malus est déjà dans la sélection', () => {
      const ghosts = deriveMissingPenaltiesForShortPath(['E5.N9.Q1.B'], V3_SHORT_ENTREPRISE_ID)
      expect(ghosts.filter((c) => c === 'E5.N9.Q1.B')).toHaveLength(0)
    })
  })

  describe('V3_SHORT_USAGE', () => {
    it('injecte uniquement E5.N9.Q8.A et E5.N9.Q9.A si packs vides (élagage Q3/Q4/Q6)', () => {
      const ghosts = deriveMissingPenaltiesForShortPath([], V3_SHORT_USAGE_ID)
      expect(ghosts.sort()).toEqual(['E5.N9.Q8.A', 'E5.N9.Q9.A'].sort())
      expect(ghosts).toHaveLength(2)
    })

    it('n’injecte pas E5.N9.Q9.A si Q9.B est coché', () => {
      const ghosts = deriveMissingPenaltiesForShortPath(['E5.N9.Q9.B'], V3_SHORT_USAGE_ID)
      expect(ghosts).not.toContain('E5.N9.Q9.A')
    })

    it('n’injecte pas E5.N9.Q8.A si Q8.B est coché', () => {
      expect(deriveMissingPenaltiesForShortPath(['E5.N9.Q8.B'], V3_SHORT_USAGE_ID)).not.toContain('E5.N9.Q8.A')
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

    it('n’injecte plus E6.N10.Q3.A (élagage fourche Q2/Q3)', () => {
      const ghosts = deriveMissingPenaltiesForShortPath(
        [E6_TRANSPARENCY_PACK_INTERACTION_CODE],
        V3_SHORT_TRANSPARENCE_ID
      )
      expect(ghosts).not.toContain('E6.N10.Q3.A')
    })
  })

  describe('V3_SHORT_SOCIAL_ENV', () => {
    it('injecte uniquement E7.N11.Q1.A si E7.N11.Q3.B absent (élagage Q2)', () => {
      const ghosts = deriveMissingPenaltiesForShortPath([], V3_SHORT_SOCIAL_ENV_ID)
      expect(ghosts).toEqual(['E7.N11.Q1.A'])
    })

    it('n’injecte pas les malus E7 si E7.N11.Q3.B est coché', () => {
      expect(deriveMissingPenaltiesForShortPath(['E7.N11.Q3.B'], V3_SHORT_SOCIAL_ENV_ID)).toEqual([])
    })
  })

  it('retourne [] pour un pack inconnu', () => {
    expect(deriveMissingPenaltiesForShortPath([], 'UNKNOWN')).toEqual([])
  })
})
