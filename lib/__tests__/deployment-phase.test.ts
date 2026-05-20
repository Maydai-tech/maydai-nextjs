import { CreateUsecaseSchema } from '@/lib/validations/usecase'
import {
  getDeploymentPhaseLabel,
  normalizeDeploymentPhaseKey,
} from '@/lib/deployment-phase'

describe('deployment-phase', () => {
  describe('normalizeDeploymentPhaseKey', () => {
    test('should map French legacy labels to technical keys', () => {
      expect(normalizeDeploymentPhaseKey('En production')).toBe('en_production')
      expect(normalizeDeploymentPhaseKey('En projet (Non déployé)')).toBe('en_projet')
      expect(normalizeDeploymentPhaseKey('En phase de test / Expérimentation')).toBe(
        'en_test'
      )
    })

    test('should keep technical keys unchanged', () => {
      expect(normalizeDeploymentPhaseKey('en_test')).toBe('en_test')
    })

    test('should fallback unknown DB values to en_projet for safe display', () => {
      expect(normalizeDeploymentPhaseKey('valeur inconnue')).toBe('en_projet')
    })
  })

  describe('getDeploymentPhaseLabel', () => {
    test('should return French label for technical key', () => {
      expect(getDeploymentPhaseLabel('en_production')).toBe('En production')
    })
  })

  describe('CreateUsecaseSchema deployment_phase', () => {
    const basePayload = {
      name: 'Test',
      description: 'Desc',
      ai_category: 'LLM',
      responsible_service: 'IT',
      company_id: '550e8400-e29b-41d4-a716-446655440000',
    }

    test('should default missing deployment_phase to en_projet', () => {
      const result = CreateUsecaseSchema.safeParse(basePayload)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.deployment_phase).toBe('en_projet')
      }
    })

    test('should accept technical keys', () => {
      const result = CreateUsecaseSchema.safeParse({
        ...basePayload,
        deployment_phase: 'en_test',
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.deployment_phase).toBe('en_test')
      }
    })

    test('should map legacy French label on API input', () => {
      const result = CreateUsecaseSchema.safeParse({
        ...basePayload,
        deployment_phase: 'En production',
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.deployment_phase).toBe('en_production')
      }
    })

    test('should reject invalid deployment_phase', () => {
      const result = CreateUsecaseSchema.safeParse({
        ...basePayload,
        deployment_phase: 'phase_invalide',
      })
      expect(result.success).toBe(false)
    })
  })
})
