import {
  adpeKgToNanograms,
  computeEquivalenceMetrics,
  computeImpactForModel,
  computeImpactForModelWithCompatibility,
  computeRelativeBarMetrics,
  computeSavingsEquivalences,
  formatAdpeNanograms,
  isModelIncompatibleWithUseCase,
  modelSupportsMultimodalMedia,
  USE_CASE_DEFINITIONS,
} from '../impact-environnemental'

const baseModel = {
  id: 'test-id',
  modelName: 'Test LLM',
  modelProvider: 'OpenAI',
  isMultimodal: false,
  energyWhPer1kTokens: 10,
  adpePer1kTokens: 0.001,
}

const multimodalModel = {
  ...baseModel,
  id: 'multi-id',
  modelName: 'GPT-4 Vision',
  isMultimodal: true,
}

describe('impact-environnemental', () => {
  describe('computeImpactForModel', () => {
    test('email applique le multiplicateur 0.5', () => {
      const useCase = USE_CASE_DEFINITIONS.find((u) => u.id === 'email')!
      const result = computeImpactForModel(baseModel, useCase)
      expect(result.energyWh).toBe(5)
      expect(result.adpe).toBe(0.0005)
    })

    test('article standard applique le multiplicateur 2', () => {
      const useCase = USE_CASE_DEFINITIONS.find((u) => u.id === 'article')!
      const result = computeImpactForModel(baseModel, useCase)
      expect(result.energyWh).toBe(20)
      expect(result.adpe).toBe(0.002)
    })

    test('vision applique le multiplicateur 1.5 (proportionnalité tokens)', () => {
      const useCase = USE_CASE_DEFINITIONS.find((u) => u.id === 'vision')!
      const result = computeImpactForModel(multimodalModel, useCase)
      expect(result.energyWh).toBe(15)
      expect(result.adpe).toBe(0.0015)
    })
  })

  describe('compatibilité Vision', () => {
    test('isMultimodal détermine le support Vision', () => {
      expect(modelSupportsMultimodalMedia({ isMultimodal: false })).toBe(false)
      expect(modelSupportsMultimodalMedia({ isMultimodal: true })).toBe(true)
    })

    test('LLM texte incompatible avec le cas Vision', () => {
      expect(isModelIncompatibleWithUseCase(baseModel, 'vision')).toBe(true)
      expect(isModelIncompatibleWithUseCase(baseModel, 'email')).toBe(false)
    })

    test('computeImpactForModelWithCompatibility bloque le calcul pour texte-only', () => {
      const useCase = USE_CASE_DEFINITIONS.find((u) => u.id === 'vision')!
      const result = computeImpactForModelWithCompatibility(baseModel, useCase)
      expect(result.status).toBe('incompatible_multimodal')
      expect(result.energyWh).toBe(0)
      expect(result.adpe).toBe(0)
    })

    test('computeImpactForModelWithCompatibility conserve le calcul pour modèle Vision', () => {
      const useCase = USE_CASE_DEFINITIONS.find((u) => u.id === 'vision')!
      const result = computeImpactForModelWithCompatibility(multimodalModel, useCase)
      expect(result.status).toBe('ok')
      expect(result.energyWh).toBe(15)
      expect(result.adpe).toBe(0.0015)
    })
  })

  describe('computeRelativeBarMetrics', () => {
    test('barre B à 50% quand B vaut la moitié de A', () => {
      const m = computeRelativeBarMetrics(100, 50)
      expect(m.barBWidthPercent).toBe(50)
      expect(m.reductionPercent).toBe(50)
    })

    test('largeur minimale 2% pour visibilité', () => {
      const m = computeRelativeBarMetrics(100, 0.5)
      expect(m.barBWidthPercent).toBe(2)
    })
  })

  describe('computeSavingsEquivalences', () => {
    test('calcule sur la différence A - B', () => {
      const eq = computeSavingsEquivalences(120, 60)
      expect(eq.smartphoneRecharges).toBe(5)
    })
  })

  describe('computeEquivalenceMetrics', () => {
    test('calcule les trois équivalences', () => {
      const eq = computeEquivalenceMetrics(120)
      expect(eq.smartphoneRecharges).toBe(10)
      expect(eq.ledMinutes).toBe(800)
      expect(eq.netflixMinutes).toBe(72)
    })

    test('ne retourne pas de valeurs négatives', () => {
      const eq = computeEquivalenceMetrics(-5)
      expect(eq.smartphoneRecharges).toBe(0)
      expect(eq.ledMinutes).toBe(0)
      expect(eq.netflixMinutes).toBe(0)
    })
  })

  describe('adpeKgToNanograms', () => {
    test('convertit des micro-valeurs kg en ng lisibles pour Recharts', () => {
      expect(adpeKgToNanograms(2.33e-9)).toBeCloseTo(2.33, 5)
      expect(adpeKgToNanograms(4.37e-10)).toBeCloseTo(0.437, 5)
    })

    test('formatAdpeNanograms affiche la valeur en ng', () => {
      expect(formatAdpeNanograms(2.33e-9)).toBe('2.33')
      expect(formatAdpeNanograms(4.37e-10)).toBe('0.437')
    })
  })
})
