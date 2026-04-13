import { formatReportGroundingForPrompt } from '@/lib/report-llm-grounding'

describe('report-llm-grounding — finition rapport (Lot finition)', () => {
  test('inacceptable + motifs Q3 : contraint tout le corps narratif à la liste', () => {
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
        bpgv_variant: null,
        ors_exit: null,
        active_question_codes: ['E4.N7.Q3'],
      },
    })
    expect(text).toContain('introduction_contextuelle, conclusion, impact_attendu, interdit_1')
    expect(text).toContain('aucune pratique prohibée')
    expect(text).toContain('ne pas élargir le récit')
  })

  test('minimal + T1.B : intérêt public avec contrôle éditorial, lien avec limited', () => {
    const text = formatReportGroundingForPrompt({
      responses: [{ question_code: 'E4.N8.Q11.T1', single_value: 'E4.N8.Q11.T1.B' }],
      riskLevelCode: 'minimal',
      classificationImpossible: false,
      questionnaireParcours: {
        questionnaire_version: 3,
        bpgv_variant: null,
        ors_exit: null,
        active_question_codes: [],
      },
    })
    expect(text).toContain('Volet texte public + contrôle éditorial')
    expect(text).toContain('validation ou relecture éditoriale humaine')
    expect(text.toLowerCase()).toContain('risque limité')
    expect(text).toContain('E4.N8.Q11.T1 = B')
  })

  test('limited + deepfake sans interaction : slots internes / pas utilisateur final', () => {
    const text = formatReportGroundingForPrompt({
      responses: [
        { question_code: 'E4.N8.Q11.M1', single_value: 'E4.N8.Q11.M1.A' },
        { question_code: 'E4.N8.Q9', single_value: 'E4.N8.Q9.B' },
      ],
      riskLevelCode: 'limited',
      classificationImpossible: false,
      questionnaireParcours: {
        questionnaire_version: 3,
        bpgv_variant: null,
        ors_exit: null,
        active_question_codes: [],
      },
    })
    expect(text).toContain('Recommandations (9 slots) — deepfake')
    expect(text).toContain('E4.N8.Q9 = Non')
    expect(text).toContain('utilisateur final')
  })

  test('limited + interaction : recommandations ancrées sur le canal', () => {
    const text = formatReportGroundingForPrompt({
      responses: [{ question_code: 'E4.N8.Q9', single_value: 'E4.N8.Q9.A' }],
      riskLevelCode: 'limited',
      classificationImpossible: false,
      questionnaireParcours: {
        questionnaire_version: 3,
        bpgv_variant: null,
        ors_exit: null,
        active_question_codes: [],
      },
    })
    expect(text).toContain('Recommandations (9 slots) — interaction directe')
    expect(text).toContain('canal réellement déclaré')
  })
})
