import {
  validateDeploymentDateDDMMYYYY,
  validateDeploymentDateFlexible,
  validateDraft,
  validateFinalClosedFieldsAgainstReferentials,
} from '../validators'
import type { GuidedChatDraft } from '../../types'

function makeValidDraft(overrides: Partial<GuidedChatDraft> = {}): GuidedChatDraft {
  return {
    name: 'Mon cas d\'usage',
    deployment_phase: 'En production',
    deployment_date: '15/06/2025',
    responsible_service: 'Ressources Humaines (RH)',
    technology_partner: 'OpenAI',
    technology_partner_id: 1,
    llm_model_version: 'GPT-4o',
    primary_model_id: 'uuid-123',
    ai_category: 'Large Language Model (LLM)',
    system_type: 'Système autonome',
    deployment_countries: ['FR', 'DE'],
    description: 'Un système IA pour le traitement des candidatures.',
    ...overrides,
  }
}

describe('validateDeploymentDateDDMMYYYY', () => {
  test('accepts empty string (optional field)', () => {
    expect(validateDeploymentDateDDMMYYYY('')).toEqual({ isValid: true })
  })

  test('accepts valid date 15/06/2025', () => {
    expect(validateDeploymentDateDDMMYYYY('15/06/2025')).toEqual({ isValid: true })
  })

  test('accepts valid date 01/01/2020', () => {
    expect(validateDeploymentDateDDMMYYYY('01/01/2020')).toEqual({ isValid: true })
  })

  test('accepts leap year date 29/02/2024', () => {
    expect(validateDeploymentDateDDMMYYYY('29/02/2024')).toEqual({ isValid: true })
  })

  test('rejects non-leap year 29/02/2025', () => {
    const result = validateDeploymentDateDDMMYYYY('29/02/2025')
    expect(result.isValid).toBe(false)
    expect(result.error).toBeDefined()
  })

  test('rejects invalid day 32/01/2025', () => {
    const result = validateDeploymentDateDDMMYYYY('32/01/2025')
    expect(result.isValid).toBe(false)
  })

  test('rejects invalid month 15/13/2025', () => {
    const result = validateDeploymentDateDDMMYYYY('15/13/2025')
    expect(result.isValid).toBe(false)
  })

  test('rejects non-date string "abc"', () => {
    const result = validateDeploymentDateDDMMYYYY('abc')
    expect(result.isValid).toBe(false)
    expect(result.error).toContain('Format de date invalide')
  })

  test('rejects partial date "15/06"', () => {
    const result = validateDeploymentDateDDMMYYYY('15/06')
    expect(result.isValid).toBe(false)
  })

  test('rejects wrong separator "15-06-2025"', () => {
    const result = validateDeploymentDateDDMMYYYY('15-06-2025')
    expect(result.isValid).toBe(false)
  })
})

describe('validateDeploymentDateFlexible', () => {
  test('accepts valid ISO date', () => {
    expect(validateDeploymentDateFlexible('2025-06-15')).toEqual({ isValid: true })
  })

  test('rejects invalid ISO calendar date', () => {
    const result = validateDeploymentDateFlexible('2025-02-30')
    expect(result.isValid).toBe(false)
  })
})

describe('validateDraft', () => {
  test('validates a complete valid draft', () => {
    const result = validateDraft(makeValidDraft())
    expect(result.isValid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  test('reports missing name', () => {
    const result = validateDraft(makeValidDraft({ name: '' }))
    expect(result.isValid).toBe(false)
    expect(result.errors).toContainEqual(
      expect.objectContaining({ field: 'name' })
    )
  })

  test('reports name too long', () => {
    const result = validateDraft(makeValidDraft({ name: 'a'.repeat(51) }))
    expect(result.isValid).toBe(false)
    expect(result.errors).toContainEqual(
      expect.objectContaining({ field: 'name', message: expect.stringContaining('50') })
    )
  })

  test('reports missing description', () => {
    const result = validateDraft(makeValidDraft({ description: '' }))
    expect(result.isValid).toBe(false)
    expect(result.errors).toContainEqual(
      expect.objectContaining({ field: 'description' })
    )
  })

  test('reports missing ai_category', () => {
    const result = validateDraft(makeValidDraft({ ai_category: '' }))
    expect(result.isValid).toBe(false)
    expect(result.errors).toContainEqual(
      expect.objectContaining({ field: 'ai_category' })
    )
  })

  test('reports missing responsible_service', () => {
    const result = validateDraft(makeValidDraft({ responsible_service: '' }))
    expect(result.isValid).toBe(false)
    expect(result.errors).toContainEqual(
      expect.objectContaining({ field: 'responsible_service' })
    )
  })

  test('reports invalid deployment_date format', () => {
    const result = validateDraft(
      makeValidDraft({ deployment_date: 'ceci-n-est-pas-une-date', deployment_phase: 'En production' })
    )
    expect(result.isValid).toBe(false)
    expect(result.errors).toContainEqual(
      expect.objectContaining({ field: 'deployment_date' })
    )
  })

  test('accepts ISO deployment_date when phase is set', () => {
    const result = validateDraft(
      makeValidDraft({ deployment_date: '2025-06-15', deployment_phase: 'En production' })
    )
    expect(result.isValid).toBe(true)
  })

  test('accepts empty deployment_date', () => {
    const result = validateDraft(makeValidDraft({ deployment_date: '', deployment_phase: '' }))
    expect(result.isValid).toBe(true)
  })

  test('reports empty deployment_countries', () => {
    const result = validateDraft(makeValidDraft({ deployment_countries: [] }))
    expect(result.isValid).toBe(false)
    expect(result.errors).toContainEqual(
      expect.objectContaining({ field: 'deployment_countries' })
    )
  })

  test('reports multiple errors at once', () => {
    const result = validateDraft(makeValidDraft({
      name: '',
      description: '',
      ai_category: '',
    }))
    expect(result.isValid).toBe(false)
    expect(result.errors.length).toBeGreaterThanOrEqual(3)
  })
})

describe('validateFinalClosedFieldsAgainstReferentials', () => {
  const referentials = {
    responsibleServices: ['Ressources Humaines (RH)', 'Commercial / Ventes'],
    aiCategories: ['Large Language Model (LLM)', 'Vision par ordinateur'],
    systemTypes: ['Système autonome', 'Produit'],
    providerNames: ['OpenAI', 'Google', 'Anthropic'],
  }

  test('passes when all closed fields match referentials', () => {
    const result = validateFinalClosedFieldsAgainstReferentials(
      makeValidDraft(),
      referentials
    )
    expect(result.isValid).toBe(true)
  })

  test('fails when responsible_service is not in referential', () => {
    const result = validateFinalClosedFieldsAgainstReferentials(
      makeValidDraft({ responsible_service: 'Service Inconnu' }),
      referentials
    )
    expect(result.isValid).toBe(false)
    expect(result.errors).toContainEqual(
      expect.objectContaining({ field: 'responsible_service' })
    )
  })

  test('fails when ai_category is not in referential', () => {
    const result = validateFinalClosedFieldsAgainstReferentials(
      makeValidDraft({ ai_category: 'Quantum Computing' }),
      referentials
    )
    expect(result.isValid).toBe(false)
    expect(result.errors).toContainEqual(
      expect.objectContaining({ field: 'ai_category' })
    )
  })

  test('fails when system_type is not in referential', () => {
    const result = validateFinalClosedFieldsAgainstReferentials(
      makeValidDraft({ system_type: 'Hybride' }),
      referentials
    )
    expect(result.isValid).toBe(false)
    expect(result.errors).toContainEqual(
      expect.objectContaining({ field: 'system_type' })
    )
  })

  test('allows custom technology_partner (no technology_partner_id)', () => {
    const result = validateFinalClosedFieldsAgainstReferentials(
      makeValidDraft({
        technology_partner: 'Mon Partenaire Custom',
        technology_partner_id: undefined,
      }),
      referentials
    )
    expect(result.isValid).toBe(true)
  })
})
