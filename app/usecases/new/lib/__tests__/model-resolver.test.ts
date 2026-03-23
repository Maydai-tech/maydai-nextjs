import { resolvePrimaryModelId, isCustomPartner } from '../model-resolver'
import type { ModelOption, ModelProviderOption } from '../../types'

describe('resolvePrimaryModelId', () => {
  const models: ModelOption[] = [
    { id: 'uuid-1', model_name: 'GPT-4o' },
    { id: 'uuid-2', model_name: 'GPT-3.5 Turbo' },
    { id: 'uuid-3', model_name: 'Claude 3.5 Sonnet' },
  ]

  test('returns model id for exact match', () => {
    expect(resolvePrimaryModelId('GPT-4o', models)).toBe('uuid-1')
  })

  test('returns null for unknown model name', () => {
    expect(resolvePrimaryModelId('GPT-5', models)).toBeNull()
  })

  test('returns null for empty model name', () => {
    expect(resolvePrimaryModelId('', models)).toBeNull()
  })

  test('returns null for empty models list', () => {
    expect(resolvePrimaryModelId('GPT-4o', [])).toBeNull()
  })
})

describe('isCustomPartner', () => {
  const partners: ModelProviderOption[] = [
    { id: 1, name: 'OpenAI' },
    { id: 2, name: 'Google' },
    { id: 3, name: 'Anthropic' },
  ]

  test('returns false for known partner', () => {
    expect(isCustomPartner('OpenAI', partners)).toBe(false)
  })

  test('returns true for unknown partner', () => {
    expect(isCustomPartner('Mon Partenaire Custom', partners)).toBe(true)
  })

  test('returns false for empty string', () => {
    expect(isCustomPartner('', partners)).toBe(false)
  })

  test('returns false for whitespace-only string', () => {
    expect(isCustomPartner('   ', partners)).toBe(false)
  })

  test('is case-sensitive', () => {
    expect(isCustomPartner('openai', partners)).toBe(true)
  })
})
