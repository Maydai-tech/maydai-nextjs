import { checkCanProceed } from '../questionnaire'
import { loadQuestions } from '../questions-loader'
import type { Question } from '../../types/usecase'

describe('E5 — N9 Q6 à Q9 (radio, sans champs conditionnels)', () => {
  const questions = loadQuestions()

  it('déclare Q6 à Q9 comme questions radio sans conditional_detail_optional', () => {
    for (const id of ['E5.N9.Q6', 'E5.N9.Q7', 'E5.N9.Q8', 'E5.N9.Q9'] as const) {
      const q = questions[id]!
      expect(q.type).toBe('radio')
      expect(q.conditional_detail_optional).toBeUndefined()
      expect(q.conditionalFields).toBeUndefined()
    }
  })

  it('autorise une réponse radio (chaîne) pour Q6–Q9', () => {
    const cases = [
      ['E5.N9.Q6', 'E5.N9.Q6.B'],
      ['E5.N9.Q7', 'E5.N9.Q7.B'],
      ['E5.N9.Q8', 'E5.N9.Q8.B'],
      ['E5.N9.Q9', 'E5.N9.Q9.B'],
    ] as const
    for (const [qid, sel] of cases) {
      const q = questions[qid]!
      expect(checkCanProceed(q, sel)).toBe(true)
    }
  })

  it('sans conditional_detail_optional, « Oui » + champs exige encore au moins une valeur (question conditional synthétique)', () => {
    const synthetic: Question = {
      id: 'TEST.Q1',
      question: 'test',
      type: 'conditional',
      required: true,
      options: [
        { code: 'TEST.Q1.B', label: 'Oui', score_impact: 0 },
        { code: 'TEST.Q1.A', label: 'Non', score_impact: 0 },
      ],
      conditionalFields: [{ key: 'x', label: 'X' }],
    }
    expect(checkCanProceed(synthetic, { selected: 'TEST.Q1.B', conditionalValues: {} })).toBe(false)
    expect(checkCanProceed(synthetic, { selected: 'TEST.Q1.B', conditionalValues: { x: 'a' } })).toBe(true)
  })
})
