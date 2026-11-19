import {
  mapAnnexe3ToOptionCode,
  mapEvaluationNodesToAnswers,
  looksLikePhysicalAccessControl,
  withAnnexIiiAccessControlGuard,
} from '@/lib/mistral/map-evaluation-nodes'
import type { EvaluationNodes } from '@/lib/mistral/evaluation-tool'

describe('mapAnnexe3ToOptionCode', () => {
  test('mappe Aucun vers E4.N7.Q2.G (catalogue, pas Q2.H)', () => {
    expect(mapAnnexe3ToOptionCode('Aucun')).toBe('E4.N7.Q2.G')
    expect(mapAnnexe3ToOptionCode('aucun domaine')).toBe('E4.N7.Q2.G')
  })

  test('ne mappe pas un contrôle d’accès « travailleurs » vers Emploi', () => {
    expect(mapAnnexe3ToOptionCode('travailleurs à l’entrée du bâtiment')).toBeNull()
  })

  test('laisse vide un domaine non mappable (le graphe redemandera Q2)', () => {
    expect(mapAnnexe3ToOptionCode('Santé')).toBeNull()
    expect(mapAnnexe3ToOptionCode('InconnuXYZ')).toBeNull()
  })
})

describe('mapEvaluationNodesToAnswers', () => {
  test('déployeur sans Art. 5 : Q1.B, Q3.E, Q3.1.E, Q2.1.E et Annexe III', () => {
    const nodes: EvaluationNodes = {
      role_deduit: 'deployeur',
      is_art5_interdit: false,
      domaine_annexe3: 'Emploi',
      explication_courte: 'Usage RH sans modification.',
    }
    expect(mapEvaluationNodesToAnswers(nodes)).toEqual({
      'E4.N7.Q1': 'E4.N7.Q1.B',
      'E4.N7.Q3': ['E4.N7.Q3.E'],
      'E4.N7.Q3.1': ['E4.N7.Q3.1.E'],
      'E4.N7.Q2.1': ['E4.N7.Q2.1.E'],
      'E4.N7.Q2': ['E4.N7.Q2.A'],
    })
  })

  test('fournisseur : Q1.A + Q1.1', () => {
    const nodes: EvaluationNodes = {
      role_deduit: 'fournisseur',
      is_art5_interdit: false,
      domaine_annexe3: 'Aucun',
      explication_courte: 'Éditeur du système.',
    }
    const answers = mapEvaluationNodesToAnswers(nodes)
    expect(answers['E4.N7.Q1']).toBe('E4.N7.Q1.A')
    expect(answers['E4.N7.Q1.1']).toBe('E4.N7.Q1.1.E')
    expect(answers['E4.N7.Q2']).toEqual(['E4.N7.Q2.G'])
  })

  test('Art. 5 true : ne mappe pas Q3 pour que le graphe fasse préciser', () => {
    const nodes: EvaluationNodes = {
      role_deduit: 'deployeur',
      is_art5_interdit: true,
      domaine_annexe3: 'Aucun',
      explication_courte: 'Risque biométrie.',
    }
    const answers = mapEvaluationNodesToAnswers(nodes)
    expect(answers['E4.N7.Q3']).toBeUndefined()
    expect(answers['E4.N7.Q3.1']).toBeUndefined()
    expect(answers['E4.N7.Q1']).toBe('E4.N7.Q1.B')
  })

  test('rôle indéterminé : pas de Q1', () => {
    const nodes: EvaluationNodes = {
      role_deduit: 'indetermine',
      is_art5_interdit: false,
      domaine_annexe3: 'Aucun',
      explication_courte: 'Doute.',
    }
    const answers = mapEvaluationNodesToAnswers(nodes)
    expect(answers['E4.N7.Q1']).toBeUndefined()
  })
})

describe('withAnnexIiiAccessControlGuard', () => {
  test('détecte un sas / badge sans décision RH', () => {
    expect(
      looksLikePhysicalAccessControl('Sas biométrique porte entrée entreprise')
    ).toBe(true)
    expect(looksLikePhysicalAccessControl('Assistant RH — tri des candidatures')).toBe(false)
  })

  test('retire Emploi si le projet n’est qu’un contrôle d’accès', () => {
    const guarded = withAnnexIiiAccessControlGuard(
      { 'E4.N7.Q2': ['E4.N7.Q2.A'], 'E4.N7.Q5': 'E4.N7.Q5.B' },
      'Sas biométrique porte entrée entreprise'
    )
    expect(guarded['E4.N7.Q2']).toEqual(['E4.N7.Q2.G'])
    expect(guarded['E4.N7.Q5']).toBeUndefined()
  })
})
