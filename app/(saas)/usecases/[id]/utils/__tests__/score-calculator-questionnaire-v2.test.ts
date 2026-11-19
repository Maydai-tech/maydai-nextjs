// Mock Supabase (identique aux tests score-calculator V1)
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(() => Promise.resolve({ data: null, error: null }))
        }))
      }))
    })),
    auth: {
      getSession: jest.fn(() => Promise.resolve({ data: { session: null }, error: null }))
    }
  },
  createSupabaseClient: jest.fn()
}))

import { calculateScore } from '../score-calculator'
import { QUESTIONNAIRE_VERSION_V1, QUESTIONNAIRE_VERSION_V2 } from '@/lib/questionnaire-version'

function row(
  question_code: string,
  opts: {
    single_value?: string | null
    multiple_codes?: string[] | null
    conditional_main?: string | null
  } = {}
) {
  return {
    question_code,
    single_value: opts.single_value ?? null,
    multiple_codes: opts.multiple_codes ?? null,
    conditional_main: opts.conditional_main ?? null,
    conditional_keys: null,
    conditional_values: null
  }
}

/** ORS minimal jusqu’à E4.N8.Q9 (sans Q9.1), chemin V2 valide. */
function orsUpToQ9() {
  return [
    row('E4.N7.Q1', { single_value: 'E4.N7.Q1.B' }),
    row('E4.N7.Q1.2', { single_value: 'E4.N7.Q1.2.A' }),
    row('E4.N7.Q2', { multiple_codes: ['E4.N7.Q2.G'] }),
    row('E4.N7.Q2.1', { multiple_codes: ['E4.N7.Q2.1.E'] }),
    row('E4.N7.Q3', { multiple_codes: ['E4.N7.Q3.E'] }),
    row('E4.N7.Q3.1', { multiple_codes: ['E4.N7.Q3.1.E'] }),
    row('E4.N8.Q9', { single_value: 'E4.N8.Q9.B' })
  ]
}

/** ORS N8 complet jusqu’à la déclaration Q12 (requis pour `bpgv_variant` en V2). */
function orsThroughQ12Declaration(opts: {
  n7HighRiskDomain?: boolean
  q9: 'E4.N8.Q9.A' | 'E4.N8.Q9.B'
}) {
  const n7q2 = opts.n7HighRiskDomain ? ['E4.N7.Q2.A'] : ['E4.N7.Q2.G']
  return [
    row('E4.N7.Q1', { single_value: 'E4.N7.Q1.B' }),
    row('E4.N7.Q1.2', { single_value: 'E4.N7.Q1.2.A' }),
    row('E4.N7.Q2', { multiple_codes: n7q2 }),
    row('E4.N7.Q2.1', { multiple_codes: ['E4.N7.Q2.1.E'] }),
    row('E4.N7.Q3', { multiple_codes: ['E4.N7.Q3.E'] }),
    row('E4.N7.Q3.1', { multiple_codes: ['E4.N7.Q3.1.E'] }),
    row('E4.N8.Q9', { single_value: opts.q9 }),
    row('E4.N8.Q9.1', { single_value: 'E4.N8.Q9.1.B' }),
    row('E4.N8.Q10', { single_value: 'E4.N8.Q10.A' }),
    row('E4.N8.Q11.0', { single_value: 'E4.N8.Q11.0.B' }),
    row('E4.N8.Q12', { single_value: 'E4.N8.Q12.B' })
  ]
}

describe('Score Calculator — questionnaire V2', () => {
  const mockUsecaseId = 'test-v2-usecase'

  test('recalcul admin / GET score : V1 explicite vs V2 explicite ne partagent pas la même branche', async () => {
    const responses = [...orsUpToQ9(), row('E6.N10.Q1', { single_value: 'E6.N10.Q1.B' })]
    const v1 = await calculateScore(mockUsecaseId, responses, undefined, {
      questionnaireVersion: QUESTIONNAIRE_VERSION_V1
    })
    const v2 = await calculateScore(mockUsecaseId, responses, undefined, {
      questionnaireVersion: QUESTIONNAIRE_VERSION_V2
    })
    expect(v1.questionnaire_version).toBe(QUESTIONNAIRE_VERSION_V1)
    expect(v2.questionnaire_version).toBe(QUESTIONNAIRE_VERSION_V2)
    expect(v2.active_question_codes?.includes('E6.N10.Q1')).toBe(false)
    expect(v1.score).toBe(v2.score)
  })

  test('V1 inchangé : réponses inchangées sans option explicite (version implicite V1)', async () => {
    const responses = [
      row('E6.N10.Q1', { single_value: 'E6.N10.Q1.B' }),
      row('E5.N9.Q9', { single_value: 'E5.N9.Q9.B' })
    ]
    const result = await calculateScore(mockUsecaseId, responses)
    expect(result.score).toBe(90)
    expect(result.questionnaire_version).toBe(QUESTIONNAIRE_VERSION_V1)
    expect(result.category_scores.every(c => c.evaluation_status !== 'not_evaluated')).toBe(true)
  })

  test('V2 : ignore les réponses hors chemin actif (ex. E6 non atteint)', async () => {
    const responses = [
      ...orsUpToQ9(),
      row('E6.N10.Q1', { single_value: 'E6.N10.Q1.B' })
    ]
    const v1 = await calculateScore(mockUsecaseId, responses, undefined, {
      questionnaireVersion: QUESTIONNAIRE_VERSION_V1
    })
    const v2 = await calculateScore(mockUsecaseId, responses, undefined, {
      questionnaireVersion: QUESTIONNAIRE_VERSION_V2
    })
    expect(v1.score).toBe(90)
    expect(v2.score).toBe(90)
    expect(v2.questionnaire_version).toBe(QUESTIONNAIRE_VERSION_V2)
    expect(v2.active_question_codes?.length).toBeGreaterThan(0)
    expect(v2.active_question_codes?.includes('E6.N10.Q1')).toBe(false)
  })

  test('V2 unacceptable : élimination conservée (Q3.1 éliminatoire)', async () => {
    const responses = [
      row('E4.N7.Q1', { single_value: 'E4.N7.Q1.B' }),
      row('E4.N7.Q1.2', { single_value: 'E4.N7.Q1.2.A' }),
      row('E4.N7.Q2', { multiple_codes: ['E4.N7.Q2.G'] }),
      row('E4.N7.Q2.1', { multiple_codes: ['E4.N7.Q2.1.E'] }),
      row('E4.N7.Q3', { multiple_codes: ['E4.N7.Q3.E'] }),
      row('E4.N7.Q3.1', { multiple_codes: ['E4.N7.Q3.1.A'] })
    ]
    const v2 = await calculateScore(mockUsecaseId, responses, undefined, {
      questionnaireVersion: QUESTIONNAIRE_VERSION_V2
    })
    expect(v2.is_eliminated).toBe(true)
    expect(v2.score).toBe(0)
    expect(v2.bpgv_variant).toBe('unacceptable')
    expect(v2.ors_exit).toBe('unacceptable')
  })

  test('V2 : catégories sans question active = non évalué (pas de 100 % implicite)', async () => {
    const responses = orsUpToQ9()
    const v2 = await calculateScore(mockUsecaseId, responses, undefined, {
      questionnaireVersion: QUESTIONNAIRE_VERSION_V2
    })
    const notEvaluated = v2.category_scores.filter(c => c.evaluation_status === 'not_evaluated')
    expect(notEvaluated.length).toBeGreaterThan(0)
    for (const c of notEvaluated) {
      expect(c.percentage).toBe(0)
      expect(c.max_score).toBe(0)
    }
  })

  test('V2 limited : bande BPGV dérivée des réponses ORS (Q9.A risk limited)', async () => {
    const responses = orsThroughQ12Declaration({ q9: 'E4.N8.Q9.A' })
    const v2 = await calculateScore(mockUsecaseId, responses, undefined, {
      questionnaireVersion: QUESTIONNAIRE_VERSION_V2
    })
    expect(v2.bpgv_variant).toBe('limited')
  })

  test('V2 high : option ORS avec risk high sur N7', async () => {
    const responses = orsThroughQ12Declaration({ n7HighRiskDomain: true, q9: 'E4.N8.Q9.B' })
    const v2 = await calculateScore(mockUsecaseId, responses, undefined, {
      questionnaireVersion: QUESTIONNAIRE_VERSION_V2
    })
    expect(v2.bpgv_variant).toBe('high')
  })

  test('V2 minimal : parcours BPGV court (Q7 sans Q6) après ORS', async () => {
    const responses = [
      row('E4.N7.Q1', { single_value: 'E4.N7.Q1.B' }),
      row('E4.N7.Q1.2', { single_value: 'E4.N7.Q1.2.A' }),
      row('E4.N7.Q2', { multiple_codes: ['E4.N7.Q2.G'] }),
      row('E4.N7.Q2.1', { multiple_codes: ['E4.N7.Q2.1.E'] }),
      row('E4.N7.Q3', { multiple_codes: ['E4.N7.Q3.E'] }),
      row('E4.N7.Q3.1', { multiple_codes: ['E4.N7.Q3.1.E'] }),
      row('E4.N8.Q9', { single_value: 'E4.N8.Q9.B' }),
      row('E4.N8.Q9.1', { single_value: 'E4.N8.Q9.1.B' }),
      row('E4.N8.Q10', { single_value: 'E4.N8.Q10.A' }),
      row('E4.N8.Q11.0', { single_value: 'E4.N8.Q11.0.B' }),
      row('E5.N9.Q7', { single_value: 'E5.N9.Q7.B' }),
      row('E4.N8.Q12', { single_value: 'E4.N8.Q12.B' })
    ]
    const v2 = await calculateScore(mockUsecaseId, responses, undefined, {
      questionnaireVersion: QUESTIONNAIRE_VERSION_V2
    })
    expect(v2.bpgv_variant).toBe('minimal')
    expect(v2.ors_exit).toBe('n8_completed')
  })
})
