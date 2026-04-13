import {
  getV3CompositeKind,
  v3CompositeCanProceed,
  v3EntryFollowUpQuestionId,
} from '../questionnaire-v3-ui'
import {
  V3_SHORT_ENTREPRISE_ID,
  V3_SHORT_MINIPACK_ID,
  V3_SHORT_TRANSPARENCE_ID,
  V3_SHORT_USAGE_ID,
} from '../questionnaire-v3-graph'

describe('questionnaire-v3-ui', () => {
  describe('getV3CompositeKind', () => {
    test('retourne entry-q1 pour E4.N7.Q1', () => {
      expect(getV3CompositeKind('E4.N7.Q1')).toBe('entry-q1')
    })
    test('retourne content-q11 pour E4.N8.Q11.0', () => {
      expect(getV3CompositeKind('E4.N8.Q11.0')).toBe('content-q11')
    })
    test('retourne short-minipack pour le nœud consolidé parcours court (legacy)', () => {
      expect(getV3CompositeKind(V3_SHORT_MINIPACK_ID)).toBe('short-minipack')
    })
    test('retourne short-minipack pour les trois étapes synthétiques courtes', () => {
      expect(getV3CompositeKind(V3_SHORT_ENTREPRISE_ID)).toBe('short-minipack')
      expect(getV3CompositeKind(V3_SHORT_USAGE_ID)).toBe('short-minipack')
      expect(getV3CompositeKind(V3_SHORT_TRANSPARENCE_ID)).toBe('short-minipack')
    })
    test('retourne null pour les autres codes', () => {
      expect(getV3CompositeKind('E4.N7.Q2')).toBeNull()
      expect(getV3CompositeKind('E4.N8.Q11.1')).toBeNull()
    })
  })

  describe('v3EntryFollowUpQuestionId', () => {
    test('mappe la branche A vers Q1.1', () => {
      expect(v3EntryFollowUpQuestionId({ 'E4.N7.Q1': 'E4.N7.Q1.A' })).toBe('E4.N7.Q1.1')
    })
    test('mappe la branche B vers Q1.2', () => {
      expect(v3EntryFollowUpQuestionId({ 'E4.N7.Q1': 'E4.N7.Q1.B' })).toBe('E4.N7.Q1.2')
    })
    test('retourne null sans choix Q1', () => {
      expect(v3EntryFollowUpQuestionId({})).toBeNull()
    })
  })

  describe('v3CompositeCanProceed', () => {
    describe('E4.N7.Q1', () => {
      test('refuse sans réponse Q1', () => {
        expect(v3CompositeCanProceed('E4.N7.Q1', {})).toBe(false)
      })
      test('exige Q1.1 remplie sur branche A', () => {
        expect(
          v3CompositeCanProceed('E4.N7.Q1', {
            'E4.N7.Q1': 'E4.N7.Q1.A',
            'E4.N7.Q1.1': 'E4.N7.Q1.1.A',
          })
        ).toBe(true)
        expect(
          v3CompositeCanProceed('E4.N7.Q1', {
            'E4.N7.Q1': 'E4.N7.Q1.A',
          })
        ).toBe(false)
      })
      test('exige Q1.2 remplie sur branche B', () => {
        expect(
          v3CompositeCanProceed('E4.N7.Q1', {
            'E4.N7.Q1': 'E4.N7.Q1.B',
            'E4.N7.Q1.2': 'E4.N7.Q1.2.A',
          })
        ).toBe(true)
        expect(
          v3CompositeCanProceed('E4.N7.Q1', {
            'E4.N7.Q1': 'E4.N7.Q1.B',
          })
        ).toBe(false)
      })
    })

    describe('E4.N8.Q11.0', () => {
      test('refuse sans réponse', () => {
        expect(v3CompositeCanProceed('E4.N8.Q11.0', {})).toBe(false)
      })
      test('accepte Non sans Q11.1', () => {
        expect(
          v3CompositeCanProceed('E4.N8.Q11.0', {
            'E4.N8.Q11.0': 'E4.N8.Q11.0.B',
          })
        ).toBe(true)
      })
      test('exige Q11.1 non vide si Oui', () => {
        expect(
          v3CompositeCanProceed('E4.N8.Q11.0', {
            'E4.N8.Q11.0': 'E4.N8.Q11.0.A',
            'E4.N8.Q11.1': [],
          })
        ).toBe(false)
        expect(
          v3CompositeCanProceed('E4.N8.Q11.0', {
            'E4.N8.Q11.0': 'E4.N8.Q11.0.A',
            'E4.N8.Q11.1': ['E4.N8.Q11.1.A'],
          })
        ).toBe(true)
      })
    })

    test('retourne null pour une question non composite', () => {
      expect(v3CompositeCanProceed('E4.N7.Q2', { 'E4.N7.Q2': [] })).toBeNull()
    })

    test('mini-pack court : autorise Suivant même sans réponse (défaut pénalités)', () => {
      expect(v3CompositeCanProceed(V3_SHORT_MINIPACK_ID, {})).toBe(true)
      expect(v3CompositeCanProceed(V3_SHORT_ENTREPRISE_ID, {})).toBe(true)
      expect(v3CompositeCanProceed(V3_SHORT_USAGE_ID, {})).toBe(true)
      expect(v3CompositeCanProceed(V3_SHORT_TRANSPARENCE_ID, {})).toBe(true)
    })
  })
})
