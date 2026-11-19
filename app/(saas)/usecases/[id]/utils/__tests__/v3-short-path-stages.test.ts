import {
  V3_SHORT_ENTREPRISE_ID,
  V3_SHORT_SOCIAL_ENV_ID,
  V3_SHORT_TRANSPARENCE_ID,
  V3_SHORT_USAGE_ID,
} from '../questionnaire-v3-graph'
import {
  buildShortPathLongAnswerPatches,
  collectEarlyE4PivotAnswers,
  EARLY_E4_PIVOT_QUESTION_IDS,
  unfoldShortPathPackToLongAnswers,
} from '../v3-short-path-stages'

describe('v3-short-path-stages — dépliage court → long', () => {
  test('V3_SHORT_ENTREPRISE — matrice E5.N9.Q7, E5.N9.Q1, E4.N8.Q12', () => {
    expect(
      unfoldShortPathPackToLongAnswers(V3_SHORT_ENTREPRISE_ID, [
        'E5.N9.Q7.B',
        'E5.N9.Q1.A',
        'E4.N8.Q12.B',
      ])
    ).toEqual({
      'E5.N9.Q7': 'E5.N9.Q7.B',
      'E5.N9.Q1': 'E5.N9.Q1.A',
      'E4.N8.Q12': 'E4.N8.Q12.B',
    })
    expect(unfoldShortPathPackToLongAnswers(V3_SHORT_ENTREPRISE_ID, [])).toEqual({
      'E5.N9.Q7': 'E5.N9.Q7.A',
      'E5.N9.Q1': 'E5.N9.Q1.B',
      'E4.N8.Q12': 'E4.N8.Q12.A',
    })
  })

  test('V3_SHORT_USAGE — E5.N9.Q3 via tag E5.N9.Q3.A uniquement', () => {
    expect(unfoldShortPathPackToLongAnswers(V3_SHORT_USAGE_ID, ['E5.N9.Q3.A'])).toMatchObject({
      'E5.N9.Q3': 'E5.N9.Q3.B',
    })
    expect(unfoldShortPathPackToLongAnswers(V3_SHORT_USAGE_ID, [])).toMatchObject({
      'E5.N9.Q3': 'E5.N9.Q3.A',
    })
    expect(unfoldShortPathPackToLongAnswers(V3_SHORT_USAGE_ID, ['E5.N9.Q3.B'])).toMatchObject({
      'E5.N9.Q3': 'E5.N9.Q3.A',
    })
  })

  test('V3_SHORT_TRANSPARENCE — E6.N10.Q1 (chatbot), Q2, Q3', () => {
    expect(unfoldShortPathPackToLongAnswers(V3_SHORT_TRANSPARENCE_ID, ['E6.N10.Q1.B'])).toEqual({
      'E6.N10.Q1': 'E6.N10.Q1.B',
      'E6.N10.Q2': 'E6.N10.Q2.A',
      'E6.N10.Q3': 'E6.N10.Q3.A',
    })
    expect(
      unfoldShortPathPackToLongAnswers(V3_SHORT_TRANSPARENCE_ID, ['E6.N10.Q3.C'])
    ).toMatchObject({
      'E6.N10.Q3': 'E6.N10.Q3.C',
    })
  })

  test('collectEarlyE4PivotAnswers — pivots E4.N7.Q1, Q2, Q3, Q3.1', () => {
    expect(
      collectEarlyE4PivotAnswers({
        'E4.N7.Q1': 'E4.N7.Q1.B',
        'E4.N7.Q3': ['E4.N7.Q3.A'],
        'E4.N7.Q3.1': 'E4.N7.Q3.1.A',
        'E4.N7.Q2': ['E4.N7.Q2.A'],
        [V3_SHORT_ENTREPRISE_ID]: ['E5.N9.Q7.B'],
      })
    ).toEqual({
      'E4.N7.Q1': 'E4.N7.Q1.B',
      'E4.N7.Q3': ['E4.N7.Q3.A'],
      'E4.N7.Q3.1': 'E4.N7.Q3.1.A',
      'E4.N7.Q2': ['E4.N7.Q2.A'],
    })
  })

  test('buildShortPathLongAnswerPatches — pivots E4.N7.* jamais perdus', () => {
    const patches = buildShortPathLongAnswerPatches({
      'E4.N7.Q1': 'E4.N7.Q1.B',
      'E4.N7.Q3': ['E4.N7.Q3.A'],
      [V3_SHORT_ENTREPRISE_ID]: [],
    })
    expect(patches['E4.N7.Q1']).toBe('E4.N7.Q1.B')
    expect(patches['E4.N7.Q3']).toEqual(['E4.N7.Q3.A'])
    expect(patches['E5.N9.Q7']).toBe('E5.N9.Q7.A')
    expect(patches['E4.N8.Q12']).toBe('E4.N8.Q12.A')
  })

  test('buildShortPathLongAnswerPatches — fusion packs + pivots', () => {
    const patches = buildShortPathLongAnswerPatches(
      {
        'E4.N7.Q1': 'E4.N7.Q1.B',
        [V3_SHORT_ENTREPRISE_ID]: ['E5.N9.Q7.B'],
        [V3_SHORT_USAGE_ID]: ['E5.N9.Q8.B'],
      },
      { packId: V3_SHORT_TRANSPARENCE_ID, selection: ['E6.N10.Q1.B'] }
    )
    expect(patches['E4.N7.Q1']).toBe('E4.N7.Q1.B')
    expect(patches['E5.N9.Q7']).toBe('E5.N9.Q7.B')
    expect(patches['E5.N9.Q8']).toBe('E5.N9.Q8.B')
    expect(patches['E6.N10.Q1']).toBe('E6.N10.Q1.B')
  })

  test('V3_SHORT_SOCIAL_ENV → E7.N11.Q1 / Q2', () => {
    expect(unfoldShortPathPackToLongAnswers(V3_SHORT_SOCIAL_ENV_ID, ['E7.N11.Q3.B'])).toEqual({
      'E7.N11.Q1': 'E7.N11.Q1.B',
      'E7.N11.Q2': 'E7.N11.Q2.B',
    })
    expect(unfoldShortPathPackToLongAnswers(V3_SHORT_SOCIAL_ENV_ID, [])).toEqual({
      'E7.N11.Q1': 'E7.N11.Q1.A',
      'E7.N11.Q2': 'E7.N11.Q2.A',
    })
  })

  test('EARLY_E4_PIVOT_QUESTION_IDS couvre les pivots critiques', () => {
    expect(EARLY_E4_PIVOT_QUESTION_IDS).toEqual(
      expect.arrayContaining(['E4.N7.Q1', 'E4.N7.Q2', 'E4.N7.Q3', 'E4.N7.Q3.1'])
    )
  })
})
