import {
  SAVE_USECASE_SETUP_TOOL_NAME,
  buildSaveUsecaseSetupTool,
  parseUseCaseSetupInsert,
} from '@/lib/mistral/setup-tool'

describe('save_usecase_setup tool schema', () => {
  test('expose les 9 champs requis et les enums métier', () => {
    const tool = buildSaveUsecaseSetupTool()
    expect(tool.function.name).toBe(SAVE_USECASE_SETUP_TOOL_NAME)
    const params = tool.function.parameters as {
      required: string[]
      properties: Record<string, { enum?: string[] }>
    }
    expect(params.required).toEqual([
      'name',
      'description',
      'deployment_phase',
      'responsible_service',
      'ai_category',
      'system_type',
      'deployment_countries',
      'technology_partner',
      'llm_model_version',
    ])
    expect(params.properties.deployment_phase.enum).toEqual([
      'en_projet',
      'en_production',
      'en_test',
    ])
    expect(params.properties.system_type.enum).toContain('Produit')
    expect(params.properties.system_type.enum).toContain('Système autonome')
    expect(params.properties.ai_category.enum).toContain('Large Language Model (LLM)')
  })

  test('parseUseCaseSetupInsert accepte un payload valide', () => {
    const data = parseUseCaseSetupInsert({
      name: 'Assistant RH',
      description: 'Tri de CV',
      deployment_phase: 'en_test',
      responsible_service: 'Ressources Humaines (RH)',
      ai_category: 'Large Language Model (LLM)',
      system_type: 'Produit',
      deployment_countries: ['France', 'Belgique'],
      technology_partner: 'Mistral',
      llm_model_version: 'Mistral Large',
    })
    expect(data?.system_type).toBe('Produit')
    expect(data?.deployment_countries).toHaveLength(2)
  })
})
