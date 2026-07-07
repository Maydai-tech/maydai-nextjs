import { checkCanProceed } from '../questionnaire'
import { loadQuestions } from '../questions-loader'

describe('E5 — N9 Q3 & Q6 à Q9 (+ Q7 registre) radio, sans champs conditionnels', () => {
  const questions = loadQuestions()

  it('déclare Q3 et Q6 à Q9 comme questions radio standard', () => {
    for (const id of ['E5.N9.Q3', 'E5.N9.Q6', 'E5.N9.Q7', 'E5.N9.Q8', 'E5.N9.Q9'] as const) {
      const q = questions[id]!
      expect(q.type).toBe('radio')
    }
  })

  it('autorise une réponse radio (chaîne) pour Q3 et Q6–Q9', () => {
    const cases = [
      ['E5.N9.Q3', 'E5.N9.Q3.B'],
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

  it('accepte une réponse objet legacy { selected } pour le contrôle « peut continuer »', () => {
    const q = questions['E5.N9.Q3']!
    expect(checkCanProceed(q, { selected: 'E5.N9.Q3.B' })).toBe(true)
  })
})
