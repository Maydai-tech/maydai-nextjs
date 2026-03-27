import {
  deriveRiskLevelFromResponses,
  normalizeEvaluationRisqueInReportText,
  riskLevelCodeToReportLabel,
} from '@/lib/risk-level'

describe('risk-level (source de vérité)', () => {
  describe('deriveRiskLevelFromResponses', () => {
    it('retourne high pour emploi / gestion des travailleurs (E4.N7.Q2.A)', () => {
      const level = deriveRiskLevelFromResponses([
        {
          question_code: 'E4.N7.Q2',
          multiple_codes: ['E4.N7.Q2.A'],
        },
      ])
      expect(level).toBe('high')
    })
  })

  describe('riskLevelCodeToReportLabel', () => {
    it('mappe high vers Risque élevé', () => {
      expect(riskLevelCodeToReportLabel('high')).toBe('Risque élevé')
    })

    it('mappe unacceptable vers Interdit (pas Risque inacceptable)', () => {
      expect(riskLevelCodeToReportLabel('unacceptable')).toBe('Interdit')
    })
  })

  describe('normalizeEvaluationRisqueInReportText', () => {
    it('remplace un niveau modèle erroné par le libellé autoritatif', () => {
      const raw = JSON.stringify({
        introduction_contextuelle: 'x',
        evaluation_risque: {
          niveau: 'Risque limité',
          justification: 'y',
        },
        quick_win_1: 'a',
        quick_win_2: 'b',
        quick_win_3: 'c',
        priorite_1: 'd',
        priorite_2: 'e',
        priorite_3: 'f',
        action_1: 'g',
        action_2: 'h',
        action_3: 'i',
        impact_attendu: 'j',
        conclusion: 'k',
      })

      const result = normalizeEvaluationRisqueInReportText(raw, 'high')
      expect(result.corrected).toBe(true)
      expect(result.previousNiveau).toBe('Risque limité')
      expect(result.wasStructuredJson).toBe(true)

      const parsed = JSON.parse(result.report) as { evaluation_risque: { niveau: string } }
      expect(parsed.evaluation_risque.niveau).toBe('Risque élevé')
    })

    it('ne modifie pas le texte si le JSON est introuvable ou invalide', () => {
      const broken = 'Pas un JSON {'
      const result = normalizeEvaluationRisqueInReportText(broken, 'minimal')
      expect(result.report).toBe(broken)
      expect(result.wasStructuredJson).toBe(false)
      expect(result.corrected).toBe(false)
    })
  })
})
