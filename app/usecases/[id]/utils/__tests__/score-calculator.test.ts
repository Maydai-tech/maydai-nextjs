// Mock Supabase avant les imports pour éviter l'erreur de variables d'environnement
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(() => Promise.resolve({ data: null, error: null }))
        }))
      }))
    })),
    auth: {
      getSession: jest.fn(() => Promise.resolve({ data: { session: null }, error: null }))
    }
  },
  createSupabaseClient: jest.fn()
}))

import { calculateScore } from '../score-calculator'

describe('Score Calculator', () => {
  const mockUsecaseId = 'test-usecase-123'

  describe('calculateScore', () => {
    test('should return base score for no responses', async () => {
      const result = await calculateScore(mockUsecaseId, [])

      expect(result.score).toBe(90) // Base score sans COMPL-AI
      expect(result.max_score).toBe(120)
      expect(result.usecase_id).toBe(mockUsecaseId)
      expect(result.score_breakdown).toHaveLength(0)
      expect(result.category_scores).toHaveLength(8) // 8 catégories incluant prohibited_practices
      expect(result.version).toBe(1)
    })

    test('should calculate score with simple radio responses', async () => {
      const responses = [
        {
          question_code: 'E6.N10.Q1',
          single_value: 'E6.N10.Q1.B', // NON = -3 (mis à jour selon CSV)
          multiple_codes: null,
          conditional_main: null
        },
        {
          question_code: 'E5.N9.Q9',
          single_value: 'E5.N9.Q9.A', // OUI = 0
          multiple_codes: null,
          conditional_main: null
        }
      ]

      const result = await calculateScore(mockUsecaseId, responses)

      expect(result.score).toBe(87) // 90 - 3
      expect(result.score_breakdown).toHaveLength(1) // Seul l'impact non nul
      expect(result.score_breakdown[0].score_impact).toBe(-3)
      expect(result.score_breakdown[0].question_id).toBe('E6.N10.Q1')
    })

    test('should handle multiple choice responses with cumulative impacts', async () => {
      const responses = [
        {
          question_code: 'E4.N7.Q3',
          single_value: null,
          multiple_codes: ['E4.N7.Q3.A', 'E4.N7.Q3.B'], // -40 + -40 = -80 (cumul)
          conditional_main: null
        }
      ]

      const result = await calculateScore(mockUsecaseId, responses)

      // E4.N7.Q3.A et B sont éliminatoires, pas des impacts
      expect(result.is_eliminated).toBe(true)
      expect(result.score).toBe(0)
    })

    test('should handle conditional responses', async () => {
      const responses = [
        {
          question_code: 'E5.N9.Q4',
          single_value: 'E5.N9.Q4.B', // NON = -3 (utiliser single_value pour les questions conditional radio)
          multiple_codes: null,
          conditional_main: null
        }
      ]

      const result = await calculateScore(mockUsecaseId, responses)

      expect(result.score).toBe(87) // 90 - 3
      expect(result.score_breakdown).toHaveLength(1)
      expect(result.score_breakdown[0].score_impact).toBe(-3)
    })

    test('should calculate category scores correctly', async () => {
      const responses = [
        {
          question_code: 'E4.N7.Q2', // Has category_impacts
          single_value: null,
          multiple_codes: ['E4.N7.Q2.A'], // score_impact: -30
          conditional_main: null
        }
      ]

      const result = await calculateScore(mockUsecaseId, responses)

      expect(result.score).toBe(60) // 90 - 30
      expect(result.is_eliminated).toBe(false)
    })

    test('should ensure score never goes below 0', async () => {
      const responses = [
        {
          question_code: 'E4.N7.Q2',
          single_value: null,
          multiple_codes: ['E4.N7.Q2.A', 'E4.N7.Q2.B', 'E4.N7.Q2.C', 'E4.N7.Q2.D'], // Multiple -30 impacts
          conditional_main: null
        }
      ]

      const result = await calculateScore(mockUsecaseId, responses)

      expect(result.score).toBeGreaterThanOrEqual(0) // Should not go below 0
    })

    test('should handle negative impact questions correctly', async () => {
      const responses = [
        {
          question_code: 'E4.N8.Q12',
          single_value: 'E4.N8.Q12.B', // NON = -0.8 (mis à jour selon CSV)
          multiple_codes: null,
          conditional_main: null
        }
      ]

      const result = await calculateScore(mockUsecaseId, responses)

      expect(result.score).toBe(89.2) // 90 - 0.8
      expect(result.score_breakdown[0].score_impact).toBe(-0.8)
    })

    test('should have all category scores with correct structure', async () => {
      const result = await calculateScore(mockUsecaseId, [])

      expect(result.category_scores).toHaveLength(8) // 8 catégories incluant prohibited_practices

      result.category_scores.forEach(category => {
        expect(category).toHaveProperty('category_id')
        expect(category).toHaveProperty('category_name')
        expect(category).toHaveProperty('score')
        expect(category).toHaveProperty('max_score')
        expect(category).toHaveProperty('percentage')
        expect(category).toHaveProperty('question_count')
        expect(category).toHaveProperty('color')
        expect(category).toHaveProperty('icon')

        expect(typeof category.score).toBe('number')
        expect(typeof category.max_score).toBe('number')
        expect(typeof category.percentage).toBe('number')
        expect(category.percentage).toBeGreaterThanOrEqual(0)
        expect(category.percentage).toBeLessThanOrEqual(100)
      })
    })
  })

  describe('Edge cases', () => {
    test('should handle unknown question codes gracefully', async () => {
      const responses = [
        {
          question_code: 'UNKNOWN.Q',
          single_value: 'UNKNOWN.A',
          multiple_codes: null,
          conditional_main: null
        }
      ]

      const result = await calculateScore(mockUsecaseId, responses)

      expect(result.score).toBe(90) // No impact, base score
      expect(result.score_breakdown).toHaveLength(0)
    })

    test('should handle malformed response data', async () => {
      const responses = [
        {
          question_code: 'E6.N10.Q1',
          single_value: null,
          multiple_codes: null,
          conditional_main: null
        }
      ]

      const result = await calculateScore(mockUsecaseId, responses)

      expect(result.score).toBe(90) // No impact, base score
      expect(result.score_breakdown).toHaveLength(0)
    })

    test('should handle empty arrays in multiple_codes', async () => {
      const responses = [
        {
          question_code: 'E4.N7.Q3',
          single_value: null,
          multiple_codes: [],
          conditional_main: null
        }
      ]

      const result = await calculateScore(mockUsecaseId, responses)

      expect(result.score).toBe(90) // No impact, base score
      expect(result.score_breakdown).toHaveLength(0)
    })

    test('should return valid structure even on error', async () => {
      // Test avec des données qui pourraient causer une erreur
      const result = await calculateScore('', null as any)

      expect(result).toHaveProperty('usecase_id')
      expect(result).toHaveProperty('score')
      expect(result).toHaveProperty('max_score')
      expect(result).toHaveProperty('score_breakdown')
      expect(result).toHaveProperty('category_scores')
      expect(result).toHaveProperty('calculated_at')
      expect(result).toHaveProperty('version')
    })
  })

  describe('Complex scenarios', () => {
    test('should handle eliminatory responses', async () => {
      const responses = [
        {
          question_code: 'E4.N7.Q3',
          single_value: null,
          multiple_codes: ['E4.N7.Q3.A'], // Eliminatory option
          conditional_main: null
        }
      ]

      const result = await calculateScore(mockUsecaseId, responses)

      expect(result.is_eliminated).toBe(true)
      expect(result.score).toBe(0)
    })

    test('should handle mixed response types correctly', async () => {
      const responses = [
        {
          question_code: 'E6.N10.Q1',
          single_value: 'E6.N10.Q1.B', // Radio: -3 (mis à jour selon CSV)
          multiple_codes: null,
          conditional_main: null
        },
        {
          question_code: 'E4.N7.Q2',
          single_value: null,
          multiple_codes: ['E4.N7.Q2.G'], // Checkbox: Aucun = 0
          conditional_main: null
        },
        {
          question_code: 'E5.N9.Q4',
          single_value: null,
          multiple_codes: null,
          conditional_main: 'E5.N9.Q4.A', // Conditional: OUI = 0
        }
      ]

      const result = await calculateScore(mockUsecaseId, responses)

      expect(result.score).toBe(87) // 90 - 3
      expect(result.score_breakdown).toHaveLength(1) // Seul l'impact non nul
    })

    test('should correctly distribute impacts across categories using category_impacts', async () => {
      const responses = [
        {
          question_code: 'E5.N9.Q1', // Has category_impacts
          single_value: 'E5.N9.Q1.B', // NON = score -3, technical_robustness -3 (mis à jour selon CSV)
          multiple_codes: null,
          conditional_main: null
        }
      ]

      const result = await calculateScore(mockUsecaseId, responses)

      expect(result.score).toBe(87) // 90 - 3 = 87
      expect(result.score_breakdown).toHaveLength(1)

      const technicalCategory = result.category_scores.find(cat => cat.category_id === 'technical_robustness')

      expect(technicalCategory).toBeDefined()
      expect(technicalCategory!.question_count).toBe(1) // 1 question a impacté cette catégorie
    })
  })
})
