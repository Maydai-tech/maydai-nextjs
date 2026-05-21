import { transformToOpenAIFormatComplete } from '@/lib/openai-data-transformer'

const baseUsecase = {
  id: 'uc-short',
  name: 'Cas parcours court',
  description: 'd',
  deployment_date: '2024-01-01',
  status: 'completed',
  risk_level: 'minimal',
  ai_category: 'a',
  system_type: 's',
  responsible_service: 'r',
  deployment_countries: [] as string[],
  company_status: 'utilisateur',
  technology_partner: 't',
  llm_model_version: 'v',
  primary_model_id: undefined,
  checklist_gov_enterprise: [] as string[],
  checklist_gov_usecase: [] as string[],
  score_base: 70,
  score_model: null as number | null,
  score_final: 70,
  is_eliminated: false,
  elimination_reason: '',
}

describe('transformToOpenAIFormatComplete — dépliage parcours court (grounding OpenAI)', () => {
  test('déplie V3_SHORT_ENTREPRISE en questions canoniques E5/E4', () => {
    const out = transformToOpenAIFormatComplete(
      baseUsecase,
      { name: 'C', industry: 'i', city: 'x', country: 'FR' },
      null,
      [
        {
          question_code: 'V3_SHORT_ENTREPRISE',
          multiple_codes: ['E5.N9.Q7.B', 'E5.N9.Q1.A'],
        },
      ],
      'a@b.c'
    )

    const q7 = out.questionnaire_questions['E5.N9.Q7']
    const q1 = out.questionnaire_questions['E5.N9.Q1']
    const q12 = out.questionnaire_questions['E4.N8.Q12']

    expect(q7?.user_response?.answered).toBe(true)
    expect(q7?.user_response?.single_value).toBe('E5.N9.Q7.B')
    expect(q7?.user_response?.single_label).toBe('Oui')

    expect(q1?.user_response?.single_value).toBe('E5.N9.Q1.A')

    expect(q12?.user_response?.answered).toBe(true)
    expect(q12?.user_response?.single_value).toBe('E4.N8.Q12.A')
  })

  test('ne remplace pas un pivot E4.N7 déjà présent', () => {
    const out = transformToOpenAIFormatComplete(
      baseUsecase,
      { name: 'C', industry: 'i', city: 'x', country: 'FR' },
      null,
      [
        { question_code: 'E4.N7.Q1', single_value: 'E4.N7.Q1.B' },
        {
          question_code: 'V3_SHORT_ENTREPRISE',
          multiple_codes: ['E5.N9.Q7.B'],
        },
      ],
      'a@b.c'
    )

    expect(out.questionnaire_questions['E4.N7.Q1']?.user_response?.single_value).toBe('E4.N7.Q1.B')
    expect(out.questionnaire_questions['E5.N9.Q7']?.user_response?.single_value).toBe('E5.N9.Q7.B')
  })
})
