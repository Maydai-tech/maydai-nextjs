import {
  CLASSIFICATION_IMPOSSIBLE_EVALUATION_NIVEAU,
  normalizeEvaluationRisqueForImpossibleClassification,
  normalizeEvaluationRisqueInReportText,
} from '@/lib/risk-level'

describe('normalizeEvaluationRisqueForImpossibleClassification', () => {
  it('remplace un faux palier AI Act par le libellé qualification impossible', () => {
    const raw = JSON.stringify({
      introduction_contextuelle: 'Intro',
      evaluation_risque: {
        niveau: 'Risque minimal',
        justification: 'Le score est bon.',
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

    const result = normalizeEvaluationRisqueForImpossibleClassification(raw)
    expect(result.corrected).toBe(true)
    expect(result.previousNiveau).toBe('Risque minimal')
    expect(result.wasStructuredJson).toBe(true)

    const parsed = JSON.parse(result.report) as { evaluation_risque: { niveau: string } }
    expect(parsed.evaluation_risque.niveau).toBe(CLASSIFICATION_IMPOSSIBLE_EVALUATION_NIVEAU)
  })

  it('laisse inchangé si le niveau est déjà correct', () => {
    const raw = JSON.stringify({
      evaluation_risque: {
        niveau: CLASSIFICATION_IMPOSSIBLE_EVALUATION_NIVEAU,
        justification: 'Pivot non tranché.',
      },
    })
    const result = normalizeEvaluationRisqueForImpossibleClassification(raw)
    expect(result.corrected).toBe(false)
    expect(JSON.parse(result.report).evaluation_risque.niveau).toBe(
      CLASSIFICATION_IMPOSSIBLE_EVALUATION_NIVEAU
    )
  })
})

describe('non-régression V1/V2 qualifiés — normalizeEvaluationRisqueInReportText', () => {
  it('conserve la correction vers le libellé du code autoritatif', () => {
    const raw = JSON.stringify({
      evaluation_risque: { niveau: 'Risque limité', justification: 'x' },
    })
    const result = normalizeEvaluationRisqueInReportText(raw, 'minimal')
    const parsed = JSON.parse(result.report) as { evaluation_risque: { niveau: string } }
    expect(parsed.evaluation_risque.niveau).toBe('Risque minimal')
    expect(result.corrected).toBe(true)
  })
})
