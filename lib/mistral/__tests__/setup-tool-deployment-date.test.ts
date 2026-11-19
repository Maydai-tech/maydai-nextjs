import { parseUseCaseSetupInsert } from '@/lib/mistral/setup-tool'

describe('parseUseCaseSetupInsert — deployment_date', () => {
  const base = {
    name: 'Assistant RH',
    description: 'Tri de CV',
    deployment_phase: 'en_test',
    responsible_service: 'Ressources Humaines (RH)',
    ai_category: 'Large Language Model (LLM)',
    system_type: 'Produit',
    deployment_countries: ['France'],
    technology_partner: 'Mistral',
    llm_model_version: 'Mistral Large',
  }

  test('accepte une date optionnelle', () => {
    const data = parseUseCaseSetupInsert({ ...base, deployment_date: '2026-08-24' })
    expect(data?.deployment_date).toBe('2026-08-24')
  })

  test('reste omise si absente du payload', () => {
    const data = parseUseCaseSetupInsert(base)
    expect(data?.deployment_date).toBeUndefined()
  })
})
