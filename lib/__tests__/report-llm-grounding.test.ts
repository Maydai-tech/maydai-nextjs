import {
  collectCheckedForbiddenMotifs,
  collectAnnexIiiDomains,
  formatReportGroundingForPrompt,
  buildMap,
  type ReportGroundingDbResponse,
} from '@/lib/report-llm-grounding'

function mapFrom(rows: ReportGroundingDbResponse[]) {
  return buildMap(rows)
}

describe('report-llm-grounding', () => {
  test('collectCheckedForbiddenMotifs — Q3 et Q3.1', () => {
    const m = mapFrom([
      {
        question_code: 'E4.N7.Q3',
        multiple_codes: ['E4.N7.Q3.B', 'E4.N7.Q3.E'],
      },
      {
        question_code: 'E4.N7.Q3.1',
        multiple_codes: ['E4.N7.Q3.1.C'],
      },
    ])
    const motifs = collectCheckedForbiddenMotifs(m)
    expect(motifs.some((x) => x.includes('caractéristiques sensibles'))).toBe(true)
    expect(motifs.some((x) => x.includes('Notation sociale'))).toBe(true)
  })

  test('collectAnnexIiiDomains', () => {
    const m = mapFrom([
      {
        question_code: 'E4.N7.Q2.1',
        multiple_codes: ['E4.N7.Q2.1.A'],
      },
    ])
    const d = collectAnnexIiiDomains(m)
    expect(d.length).toBeGreaterThanOrEqual(1)
  })

  test('formatReportGroundingForPrompt — inacceptable liste les motifs cochés', () => {
    const text = formatReportGroundingForPrompt({
      responses: [
        {
          question_code: 'E4.N7.Q3',
          multiple_codes: ['E4.N7.Q3.D'],
        },
      ],
      riskLevelCode: 'unacceptable',
      classificationImpossible: false,
      questionnaireParcours: {
        questionnaire_version: 3,
        bpgv_variant: 'LONG',
        ors_exit: null,
        active_question_codes: ['E4.N7.Q3'],
      },
    })
    expect(text).toContain('Motifs d\'interdiction')
    expect(text).toContain('émotions')
    expect(text).toContain('Le classement Interdit est fondé')
  })

  test('formatReportGroundingForPrompt — impossible : formule fixe', () => {
    const text = formatReportGroundingForPrompt({
      responses: [],
      riskLevelCode: null,
      classificationImpossible: true,
      questionnaireParcours: null,
    })
    expect(text).toContain('IMPOSSIBLE')
    expect(text).toContain('MaydAI ne conclut pas à un palier AI Act définitif')
  })

  test('formatReportGroundingForPrompt — limited deepfake avant interaction dans la liste des causes', () => {
    const text = formatReportGroundingForPrompt({
      responses: [
        { question_code: 'E4.N8.Q11.M1', single_value: 'E4.N8.Q11.M1.A' },
        { question_code: 'E4.N8.Q9', single_value: 'E4.N8.Q9.A' },
      ],
      riskLevelCode: 'limited',
      classificationImpossible: false,
      questionnaireParcours: { questionnaire_version: 3, bpgv_variant: null, ors_exit: null, active_question_codes: [] },
    })
    const causesIdx = text.indexOf('Cause(s) limited déclarée(s)')
    expect(causesIdx).toBeGreaterThan(-1)
    const slice = text.slice(causesIdx)
    const idxDeep = slice.indexOf('deepfake')
    const idxInteract = slice.indexOf('interaction directe')
    expect(idxDeep).toBeGreaterThan(-1)
    expect(idxInteract).toBeGreaterThan(-1)
    expect(idxDeep).toBeLessThan(idxInteract)
  })
})
