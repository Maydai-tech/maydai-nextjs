import { normalizeDeploymentCountriesToArray, buildCreateUseCasePayload } from '../payload-builder'
import type { GuidedChatDraft, ModelOption, ModelProviderOption } from '../../types'

describe('normalizeDeploymentCountriesToArray', () => {
  test('converts ISO codes array to French names', () => {
    const result = normalizeDeploymentCountriesToArray(['FR', 'DE', 'US'])
    expect(result).toContain('France')
    expect(result).toContain('Allemagne')
    expect(result).toContain('États-Unis')
  })

  test('handles comma-separated string of names', () => {
    const result = normalizeDeploymentCountriesToArray('France, Allemagne')
    expect(result).toEqual(['France', 'Allemagne'])
  })

  test('handles comma-separated string of ISO codes', () => {
    const result = normalizeDeploymentCountriesToArray('FR, DE')
    expect(result).toContain('France')
    expect(result).toContain('Allemagne')
  })

  test('deduplicates entries', () => {
    const result = normalizeDeploymentCountriesToArray(['FR', 'FR', 'DE'])
    expect(result).toHaveLength(2)
  })

  test('filters empty strings', () => {
    const result = normalizeDeploymentCountriesToArray(['FR', '', 'DE'])
    expect(result).toHaveLength(2)
  })

  test('returns empty array for empty input', () => {
    expect(normalizeDeploymentCountriesToArray([])).toEqual([])
    expect(normalizeDeploymentCountriesToArray('')).toEqual([])
  })

  test('passes through non-ISO names unchanged', () => {
    const result = normalizeDeploymentCountriesToArray(['France', 'Custom Country'])
    expect(result).toEqual(['France', 'Custom Country'])
  })
})

describe('buildCreateUseCasePayload', () => {
  const draft: GuidedChatDraft = {
    name: 'Test Use Case',
    deployment_phase: 'En production',
    deployment_date: '15/06/2025',
    responsible_service: 'Ressources Humaines (RH)',
    technology_partner: 'OpenAI',
    technology_partner_id: 1,
    llm_model_version: 'GPT-4o',
    primary_model_id: null,
    ai_category: 'Large Language Model (LLM)',
    system_type: 'Système autonome',
    deployment_countries: ['FR', 'DE'],
    description: 'Description test',
  }

  const models: ModelOption[] = [
    { id: 'model-uuid-1', model_name: 'GPT-4o' },
    { id: 'model-uuid-2', model_name: 'GPT-3.5' },
  ]

  const partners: ModelProviderOption[] = [
    { id: 1, name: 'OpenAI' },
    { id: 2, name: 'Google' },
  ]

  test('builds a complete payload with status draft', () => {
    const payload = buildCreateUseCasePayload(draft, 'company-123', models, partners)
    expect(payload.status).toBe('draft')
    expect(payload.company_id).toBe('company-123')
    expect(payload.name).toBe('Test Use Case')
  })

  test('resolves primary_model_id for known partner', () => {
    const payload = buildCreateUseCasePayload(draft, 'company-123', models, partners)
    expect(payload.primary_model_id).toBe('model-uuid-1')
  })

  test('sets primary_model_id to null for custom partner', () => {
    const customDraft: GuidedChatDraft = {
      ...draft,
      technology_partner: 'Mon Partenaire',
      technology_partner_id: undefined,
    }
    const payload = buildCreateUseCasePayload(customDraft, 'company-123', models, partners)
    expect(payload.primary_model_id).toBeNull()
  })

  test('normalizes deployment_countries to French names', () => {
    const payload = buildCreateUseCasePayload(draft, 'company-123', models, partners)
    expect(payload.deployment_countries).toContain('France')
    expect(payload.deployment_countries).toContain('Allemagne')
  })

  test('preserves all fields from draft', () => {
    const payload = buildCreateUseCasePayload(draft, 'company-123', models, partners)
    expect(payload.deployment_phase).toBe('En production')
    expect(payload.deployment_date).toBe('15/06/2025')
    expect(payload.responsible_service).toBe('Ressources Humaines (RH)')
    expect(payload.technology_partner).toBe('OpenAI')
    expect(payload.llm_model_version).toBe('GPT-4o')
    expect(payload.ai_category).toBe('Large Language Model (LLM)')
    expect(payload.system_type).toBe('Système autonome')
    expect(payload.description).toBe('Description test')
  })
})
