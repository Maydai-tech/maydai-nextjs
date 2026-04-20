import {
  transformToOpenAIFormatComplete,
  CLASSIFICATION_IMPOSSIBLE_RISK_LABEL_FR,
} from '@/lib/openai-data-transformer'

const baseUsecase = {
  id: 'uc-1',
  name: 'Cas test',
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
  score_base: 0,
  score_model: null as number | null,
  score_final: 50,
  is_eliminated: false,
  elimination_reason: '',
}

describe('transformToOpenAIFormatComplete — classification impossible (V3)', () => {
  test('ne dérive pas un palier minimal : risk_level_code null et libellé dédié', () => {
    const out = transformToOpenAIFormatComplete(
      {
        ...baseUsecase,
        risk_level: 'minimal',
        classification_status: 'impossible',
      },
      { name: 'C', industry: 'i', city: 'x', country: 'FR' },
      null,
      [],
      'a@b.c'
    )

    expect(out.usecase_context_fields.cas_usage.classification_status).toBe('impossible')
    expect(out.usecase_context_fields.cas_usage.risk_level_code).toBeNull()
    expect(out.usecase_context_fields.cas_usage.risk_level_label_fr).toBe(
      CLASSIFICATION_IMPOSSIBLE_RISK_LABEL_FR
    )
    expect(out.report_grounding_block).toContain('IMPOSSIBLE')
    expect(out.usecase_context_fields.cas_usage.risk_level).toBe(CLASSIFICATION_IMPOSSIBLE_RISK_LABEL_FR)
  })

  test('qualified : comportement inchangé quand risk_level minimal en base', () => {
    const out = transformToOpenAIFormatComplete(
      {
        ...baseUsecase,
        risk_level: 'minimal',
        classification_status: 'qualified',
      },
      { name: 'C', industry: 'i', city: 'x', country: 'FR' },
      null,
      [],
      'a@b.c'
    )

    expect(out.usecase_context_fields.cas_usage.risk_level_code).toBe('minimal')
    expect(out.usecase_context_fields.cas_usage.risk_level_label_fr).toBe('Risque minimal')
  })

  test('sans classification_status : dérivation habituelle (V1/V2)', () => {
    const out = transformToOpenAIFormatComplete(
      {
        ...baseUsecase,
        risk_level: 'high',
      },
      { name: 'C', industry: 'i', city: 'x', country: 'FR' },
      null,
      [],
      'a@b.c'
    )

    expect(out.usecase_context_fields.cas_usage.risk_level_code).toBe('high')
    expect(out.usecase_context_fields.cas_usage.classification_status ?? null).toBeNull()
  })
})
