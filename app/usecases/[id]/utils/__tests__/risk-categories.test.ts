import { 
  RISK_CATEGORIES, 
  QUESTION_RISK_CATEGORY_MAPPING, 
  getRiskCategoryForQuestion 
} from '../risk-categories'

describe('Risk Categories', () => {
  describe('RISK_CATEGORIES', () => {
    test('should have correct number of categories', () => {
      expect(Object.keys(RISK_CATEGORIES)).toHaveLength(7)
    })

    test('should have all required categories', () => {
      const expectedCategories = [
        'transparency',
        'technical_robustness',
        'human_agency',
        'privacy_data',
        'social_environmental',
        'diversity_fairness',
        'prohibited_practices'
      ]

      expectedCategories.forEach(category => {
        expect(RISK_CATEGORIES).toHaveProperty(category)
      })
    })

    test('should have weights that sum to 1.0', () => {
      const totalWeight = Object.values(RISK_CATEGORIES)
        .reduce((sum, category) => sum + category.weight, 0)
      
      expect(totalWeight).toBeCloseTo(1.0, 2)
    })

    test('should have valid weight distribution', () => {
      expect(RISK_CATEGORIES.transparency.weight).toBe(0.15)
      expect(RISK_CATEGORIES.technical_robustness.weight).toBe(0.20)
      expect(RISK_CATEGORIES.human_agency.weight).toBe(0.18)
      expect(RISK_CATEGORIES.privacy_data.weight).toBe(0.17)
      expect(RISK_CATEGORIES.social_environmental.weight).toBe(0.10)
      expect(RISK_CATEGORIES.diversity_fairness.weight).toBe(0.15)
      expect(RISK_CATEGORIES.prohibited_practices.weight).toBe(0.05)
    })

    test('should have required properties for each category', () => {
      Object.values(RISK_CATEGORIES).forEach(category => {
        expect(category).toHaveProperty('id')
        expect(category).toHaveProperty('name')
        expect(category).toHaveProperty('shortName')
        expect(category).toHaveProperty('description')
        expect(category).toHaveProperty('color')
        expect(category).toHaveProperty('icon')
        expect(category).toHaveProperty('weight')
        expect(typeof category.weight).toBe('number')
        expect(category.weight).toBeGreaterThan(0)
        expect(category.weight).toBeLessThanOrEqual(1)
      })
    })
  })

  describe('QUESTION_RISK_CATEGORY_MAPPING', () => {
    test('should map all questions to valid categories', () => {
      Object.values(QUESTION_RISK_CATEGORY_MAPPING).forEach(categoryId => {
        expect(RISK_CATEGORIES).toHaveProperty(categoryId)
      })
    })

    test('should have mappings for key questions', () => {
      expect(QUESTION_RISK_CATEGORY_MAPPING['E6.N10.Q2']).toBe('transparency')
      expect(QUESTION_RISK_CATEGORY_MAPPING['E5.N9.Q9']).toBe('technical_robustness')
      expect(QUESTION_RISK_CATEGORY_MAPPING['E5.N9.Q8']).toBe('human_agency')
      expect(QUESTION_RISK_CATEGORY_MAPPING['E5.N9.Q6']).toBe('privacy_data')
      expect(QUESTION_RISK_CATEGORY_MAPPING['E4.N8.Q6']).toBe('social_environmental')
      expect(QUESTION_RISK_CATEGORY_MAPPING['E4.N8.Q5']).toBe('diversity_fairness')
      expect(QUESTION_RISK_CATEGORY_MAPPING['E4.N7.Q3']).toBe('prohibited_practices')
    })

    test('should have adequate coverage per category', () => {
      const categoryCounts: Record<string, number> = {}
      
      Object.values(QUESTION_RISK_CATEGORY_MAPPING).forEach(categoryId => {
        categoryCounts[categoryId] = (categoryCounts[categoryId] || 0) + 1
      })

      // Vérifier que chaque catégorie a au moins une question
      Object.keys(RISK_CATEGORIES).forEach(categoryId => {
        expect(categoryCounts[categoryId]).toBeGreaterThan(0)
      })
    })
  })

  describe('getRiskCategoryForQuestion', () => {
    test('should return correct category for valid question codes', () => {
      const category = getRiskCategoryForQuestion('E6.N10.Q2')
      expect(category).not.toBeNull()
      expect(category?.id).toBe('transparency')
      expect(category?.shortName).toBe('Transparence')
    })

    test('should return null for invalid question codes', () => {
      expect(getRiskCategoryForQuestion('INVALID.Q')).toBeNull()
      expect(getRiskCategoryForQuestion('')).toBeNull()
      expect(getRiskCategoryForQuestion('E999.N999.Q999')).toBeNull()
    })

    test('should return complete category object', () => {
      const category = getRiskCategoryForQuestion('E5.N9.Q9')
      expect(category).not.toBeNull()
      
      if (category) {
        expect(category).toHaveProperty('id')
        expect(category).toHaveProperty('name')
        expect(category).toHaveProperty('shortName')
        expect(category).toHaveProperty('description')
        expect(category).toHaveProperty('color')
        expect(category).toHaveProperty('icon')
        expect(category).toHaveProperty('weight')
      }
    })
  })
}) 