import {
  responsesToGraphAnswers,
  toPersistableResponse,
} from '@/lib/mistral/persist-evaluation-answers'

describe('toPersistableResponse', () => {
  test('radio → single_value', () => {
    expect(toPersistableResponse('E4.N7.Q1', 'E4.N7.Q1.B')).toEqual({
      question_code: 'E4.N7.Q1',
      single_value: 'E4.N7.Q1.B',
      multiple_codes: null,
      multiple_labels: null,
    })
  })

  test('checkbox → multiple_codes', () => {
    const row = toPersistableResponse('E4.N7.Q3', ['E4.N7.Q3.E'])
    expect(row?.multiple_codes).toEqual(['E4.N7.Q3.E'])
    expect(row?.single_value).toBeNull()
  })
})

describe('responsesToGraphAnswers', () => {
  test('reconstruit le format graphe depuis les lignes SQL', () => {
    expect(
      responsesToGraphAnswers([
        { question_code: 'E4.N7.Q1', single_value: 'E4.N7.Q1.B' },
        { question_code: 'E4.N7.Q3', multiple_codes: ['E4.N7.Q3.E'] },
      ])
    ).toEqual({
      'E4.N7.Q1': 'E4.N7.Q1.B',
      'E4.N7.Q3': ['E4.N7.Q3.E'],
    })
  })
})
