import {
  followUpQuestionCodesToClear,
  responsesToGraphAnswers,
  toPersistableResponse,
  upsertUsecaseGraphAnswers,
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

describe('followUpQuestionCodesToClear', () => {
  test('retire Q5 (art. 6.3) quand Annexe III est posée à Aucun', () => {
    expect(followUpQuestionCodesToClear({ 'E4.N7.Q2': ['E4.N7.Q2.G'] })).toEqual(['E4.N7.Q5'])
    expect(followUpQuestionCodesToClear({ 'E4.N7.Q2': 'E4.N7.Q2.G' })).toEqual(['E4.N7.Q5'])
  })

  test('ne touche pas Q5 si Q2 n’est pas dans le patch ou reste un domaine sensible', () => {
    expect(followUpQuestionCodesToClear({ 'E4.N7.Q1': 'E4.N7.Q1.B' })).toEqual([])
    expect(followUpQuestionCodesToClear({ 'E4.N7.Q2': ['E4.N7.Q2.A'] })).toEqual([])
  })
})

describe('upsertUsecaseGraphAnswers', () => {
  test('supprime Q5 en base quand le patch pose Annexe III à Aucun', async () => {
    const deleted: { usecaseId?: string; questionCodes?: string[] } = {}
    const supabase = {
      from: jest.fn((table: string) => {
        expect(table).toBe('usecase_responses')
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: async () => ({ data: null, error: null }),
              }),
            }),
          }),
          insert: async () => ({ error: null }),
          delete: () => ({
            eq: (_column: string, usecaseId: string) => ({
              in: async (_column: string, questionCodes: string[]) => {
                deleted.usecaseId = usecaseId
                deleted.questionCodes = questionCodes
                return { error: null }
              },
            }),
          }),
        }
      }),
    }

    await upsertUsecaseGraphAnswers(
      supabase as never,
      { id: 'user-1', email: 'user@example.com' } as never,
      '660e8400-e29b-41d4-a716-446655440000',
      { 'E4.N7.Q2': ['E4.N7.Q2.G'] }
    )

    expect(deleted).toEqual({
      usecaseId: '660e8400-e29b-41d4-a716-446655440000',
      questionCodes: ['E4.N7.Q5'],
    })
  })
})
