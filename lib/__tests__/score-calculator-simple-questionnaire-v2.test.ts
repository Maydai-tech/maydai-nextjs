import { calculateBaseScore } from '@/lib/score-calculator-simple'

describe('calculateBaseScore — filtre V2', () => {
  test('sans activeQuestionCodes : toutes les réponses (V1)', () => {
    const r = calculateBaseScore([
      {
        question_code: 'E6.N10.Q1',
        single_value: 'E6.N10.Q1.B',
        multiple_codes: undefined,
        conditional_main: undefined
      }
    ])
    expect(r.score_base).toBe(87)
  })

  test('avec activeQuestionCodes : ignore les questions hors set', () => {
    const r = calculateBaseScore(
      [
        {
          question_code: 'E6.N10.Q1',
          single_value: 'E6.N10.Q1.B',
          multiple_codes: undefined,
          conditional_main: undefined
        }
      ],
      { activeQuestionCodes: new Set(['E4.N7.Q1']) }
    )
    expect(r.score_base).toBe(90)
    expect(r.is_eliminated).toBe(false)
  })
})
