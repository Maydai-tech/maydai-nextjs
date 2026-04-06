import { RISK_CATEGORIES } from '../risk-categories'

describe('Risk Categories', () => {
  describe('RISK_CATEGORIES', () => {
    test('définit les catégories attendues pour le tableau de bord', () => {
      expect(Object.keys(RISK_CATEGORIES)).toHaveLength(8)
      expect(RISK_CATEGORIES).toHaveProperty('risk_level')
      expect(RISK_CATEGORIES).toHaveProperty('transparency')
      expect(RISK_CATEGORIES).toHaveProperty('prohibited_practices')
    })

    test('chaque catégorie a id, name, shortName, description, color', () => {
      Object.values(RISK_CATEGORIES).forEach(category => {
        expect(category).toHaveProperty('id')
        expect(category).toHaveProperty('name')
        expect(category).toHaveProperty('shortName')
        expect(category).toHaveProperty('description')
        expect(category).toHaveProperty('color')
      })
    })

    test('icône optionnelle (risk_level sans icon dans le JSON)', () => {
      expect(RISK_CATEGORIES.risk_level.icon).toBeUndefined()
      expect(RISK_CATEGORIES.transparency.icon).toBeDefined()
    })
  })
})
