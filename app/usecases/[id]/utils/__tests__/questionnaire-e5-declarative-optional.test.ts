import { checkCanProceed } from '../questionnaire'
import { loadQuestions } from '../questions-loader'
import type { Question } from '../../types/usecase'

describe('E5 — conditional_detail_optional (déclaratif vs preuve)', () => {
  const questions = loadQuestions()

  it('expose conditional_detail_optional sur E5.N9.Q6 à Q9', () => {
    for (const id of ['E5.N9.Q6', 'E5.N9.Q7', 'E5.N9.Q8', 'E5.N9.Q9'] as const) {
      expect(questions[id]?.conditional_detail_optional).toBe(true)
    }
  })

  it('autorise « Oui » (.B) sans champs conditionnels remplis pour Q6–Q9', () => {
    const cases = [
      ['E5.N9.Q6', 'E5.N9.Q6.B'],
      ['E5.N9.Q7', 'E5.N9.Q7.B'],
      ['E5.N9.Q8', 'E5.N9.Q8.B'],
      ['E5.N9.Q9', 'E5.N9.Q9.B'],
    ] as const
    for (const [qid, sel] of cases) {
      const q = questions[qid]!
      expect(checkCanProceed(q, { selected: sel, conditionalValues: {} })).toBe(true)
    }
  })

  it('autorise toujours « Oui » avec des détails partiels ou complets', () => {
    const q7 = questions['E5.N9.Q7']!
    expect(
      checkCanProceed(q7, {
        selected: 'E5.N9.Q7.B',
        conditionalValues: { registry_type: 'Interne', system_name: '' },
      })
    ).toBe(true)
    expect(
      checkCanProceed(q7, {
        selected: 'E5.N9.Q7.B',
        conditionalValues: { registry_type: 'Interne', system_name: 'MaydAI' },
      })
    ).toBe(true)
  })

  it('sans conditional_detail_optional, « Oui » + champs exige encore au moins une valeur', () => {
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
