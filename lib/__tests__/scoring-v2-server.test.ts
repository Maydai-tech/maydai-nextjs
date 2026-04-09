import { buildV2ScoringContextFromDbResponses } from '@/lib/scoring-v2-server'
import { QUESTIONNAIRE_VERSION_V2 } from '@/lib/questionnaire-version'

describe('scoring-v2-server', () => {
  test('retourne null pour questionnaire V1', () => {
    expect(buildV2ScoringContextFromDbResponses(1, [])).toBeNull()
    expect(buildV2ScoringContextFromDbResponses(null, [])).toBeNull()
  })

  test('scoringActiveQuestionCodes = intersection chemin V2 × réponses enregistrées', () => {
    const responses = [
      {
        question_code: 'E4.N7.Q1',
        single_value: 'E4.N7.Q1.B',
        multiple_codes: null,
        conditional_main: null,
        conditional_keys: null,
        conditional_values: null
      },
      {
        question_code: 'E4.N7.Q1.2',
        single_value: 'E4.N7.Q1.2.A',
        multiple_codes: null,
        conditional_main: null,
        conditional_keys: null,
        conditional_values: null
      },
      {
        question_code: 'E6.N10.Q1',
        single_value: 'E6.N10.Q1.B',
        multiple_codes: null,
        conditional_main: null,
        conditional_keys: null,
        conditional_values: null
      }
    ]
    const ctx = buildV2ScoringContextFromDbResponses(QUESTIONNAIRE_VERSION_V2, responses)
    expect(ctx).not.toBeNull()
    expect(ctx!.active_question_codes.length).toBeGreaterThanOrEqual(2)
    expect(ctx!.scoringActiveQuestionCodes.has('E4.N7.Q1')).toBe(true)
    expect(ctx!.scoringActiveQuestionCodes.has('E4.N7.Q1.2')).toBe(true)
    expect(ctx!.scoringActiveQuestionCodes.has('E6.N10.Q1')).toBe(false)
  })
})
