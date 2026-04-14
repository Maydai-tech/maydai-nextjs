import {
  collectE6DeclaredOptionCodes,
  E6_TRANSPARENCY_PACK_CONTENT_CODE,
  E6_TRANSPARENCY_PACK_INTERACTION_CODE,
  E6_TRANSPARENCY_PACK_LEGACY_SINGLE_CODE,
  expandE6TransparencyPackToLegacyOptionCodes,
} from '../bpgv-transparency-checklist-save'
import { V3_SHORT_TRANSPARENCE_ID } from '../questionnaire-v3-graph'

describe('expandE6TransparencyPackToLegacyOptionCodes', () => {
  it('mappe l’ancienne option unique vers Q1.A et Q2.A', () => {
    expect(expandE6TransparencyPackToLegacyOptionCodes(E6_TRANSPARENCY_PACK_LEGACY_SINGLE_CODE)).toEqual([
      'E6.N10.Q1.A',
      'E6.N10.Q2.A',
    ])
  })

  it('mappe INTERACTION → Q1.A', () => {
    expect(expandE6TransparencyPackToLegacyOptionCodes(E6_TRANSPARENCY_PACK_INTERACTION_CODE)).toEqual([
      'E6.N10.Q1.A',
    ])
  })

  it('mappe CONTENT → Q2.A', () => {
    expect(expandE6TransparencyPackToLegacyOptionCodes(E6_TRANSPARENCY_PACK_CONTENT_CODE)).toEqual([
      'E6.N10.Q2.A',
    ])
  })

  it('laisse inchangés les codes d’options E6 déjà au format Q*', () => {
    expect(expandE6TransparencyPackToLegacyOptionCodes('E6.N10.Q1.B')).toEqual(['E6.N10.Q1.B'])
  })
})

describe('collectE6DeclaredOptionCodes — pack transparence parcours court', () => {
  it('agrège INTERACTION + CONTENT en codes legacy pour la ligne E6.N10._CHECKLIST', () => {
    const codes = collectE6DeclaredOptionCodes({
      [V3_SHORT_TRANSPARENCE_ID]: [
        E6_TRANSPARENCY_PACK_INTERACTION_CODE,
        E6_TRANSPARENCY_PACK_CONTENT_CODE,
      ],
    })
    expect(codes).toEqual(expect.arrayContaining(['E6.N10.Q1.A', 'E6.N10.Q2.A']))
    expect(codes).toHaveLength(2)
  })

  it('agrège l’ancien code unique en Q1.A + Q2.A', () => {
    const codes = collectE6DeclaredOptionCodes({
      [V3_SHORT_TRANSPARENCE_ID]: [E6_TRANSPARENCY_PACK_LEGACY_SINGLE_CODE],
    })
    expect(codes).toEqual(expect.arrayContaining(['E6.N10.Q1.A', 'E6.N10.Q2.A']))
    expect(codes).toHaveLength(2)
  })

  it('fusionne codes synthétiques et réponses E6.N10.Q* déjà présentes', () => {
    const codes = collectE6DeclaredOptionCodes({
      [V3_SHORT_TRANSPARENCE_ID]: [E6_TRANSPARENCY_PACK_INTERACTION_CODE],
      'E6.N10.Q1': 'E6.N10.Q1.A',
      'E6.N10.Q2': 'E6.N10.Q2.B',
    })
    expect(codes).toEqual(expect.arrayContaining(['E6.N10.Q1.A', 'E6.N10.Q2.B']))
    expect(codes).toHaveLength(2)
  })
})
