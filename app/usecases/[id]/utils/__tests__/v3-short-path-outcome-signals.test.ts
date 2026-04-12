import { loadQuestions } from '../questions-loader'
import { getV3ShortPathOutcomeSignals } from '../v3-short-path-outcome-signals'

describe('getV3ShortPathOutcomeSignals', () => {
  const qs = loadQuestions()

  it('résume Q12 et E6 à partir des codes de réponse', () => {
    const signals = getV3ShortPathOutcomeSignals(
      {
        'E4.N8.Q12': 'E4.N8.Q12.A',
        'E6.N10.Q1': 'E6.N10.Q1.B',
        'E6.N10.Q2': 'E6.N10.Q2.A',
      },
      qs
    )
    expect(signals.map((s) => s.title)).toEqual([
      'Sensibilisation (formations IA Act)',
      'Transparence — information des utilisateurs',
      'Transparence — marquage des contenus',
    ])
    expect(signals[0].detail).toContain('Oui')
    expect(signals[1].detail).toContain('Non')
  })

  it('retourne une liste vide si aucune réponse Q12/E6', () => {
    expect(getV3ShortPathOutcomeSignals({}, qs)).toEqual([])
  })
})
