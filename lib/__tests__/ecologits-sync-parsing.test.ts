import {
  ecoImpactMidpointFromApi,
  extractArchitectureParametersBillionsFromCatalog,
  normalizeArchitectureParametersBillions
} from '../ecologits-sync-parsing'

describe('normalizeArchitectureParametersBillions', () => {
  test('nombre entier ou décimal', () => {
    expect(normalizeArchitectureParametersBillions(123)).toBe(123)
    expect(normalizeArchitectureParametersBillions(7.3)).toBe(7.3)
  })

  test('chaîne numérique', () => {
    expect(normalizeArchitectureParametersBillions('12.5')).toBe(12.5)
    expect(normalizeArchitectureParametersBillions('')).toBeNull()
  })

  test('objet min/max', () => {
    expect(normalizeArchitectureParametersBillions({ min: 70, max: 120 })).toBe(95)
  })

  test('objet total/active (MoE)', () => {
    expect(normalizeArchitectureParametersBillions({ total: 119, active: 8 })).toBe(8)
  })

  test('total seul', () => {
    expect(normalizeArchitectureParametersBillions({ total: 50 })).toBe(50)
  })

  test('valeurs invalides', () => {
    expect(normalizeArchitectureParametersBillions(null)).toBeNull()
    expect(normalizeArchitectureParametersBillions(undefined)).toBeNull()
    expect(normalizeArchitectureParametersBillions(NaN)).toBeNull()
    expect(normalizeArchitectureParametersBillions({})).toBeNull()
    expect(normalizeArchitectureParametersBillions([])).toBeNull()
  })
})

describe('extractArchitectureParametersBillionsFromCatalog', () => {
  test('lit architecture.parameters', () => {
    expect(
      extractArchitectureParametersBillionsFromCatalog({
        type: 'dense',
        parameters: 22.2
      })
    ).toBe(22.2)
    expect(extractArchitectureParametersBillionsFromCatalog(null)).toBeNull()
  })
})

describe('ecoImpactMidpointFromApi', () => {
  test('min/max classique', () => {
    expect(ecoImpactMidpointFromApi({ value: { min: 10, max: 20 } })).toBe(15)
  })

  test('valeur scalaire', () => {
    expect(ecoImpactMidpointFromApi({ value: 42 })).toBe(42)
  })

  test('min ou max seul', () => {
    expect(ecoImpactMidpointFromApi({ value: { min: 3 } })).toBe(3)
    expect(ecoImpactMidpointFromApi({ value: { max: 9 } })).toBe(9)
  })

  test('absent ou NaN-safe', () => {
    expect(ecoImpactMidpointFromApi(undefined)).toBeNull()
    expect(ecoImpactMidpointFromApi({ value: { min: NaN, max: 1 } })).toBe(1)
    expect(ecoImpactMidpointFromApi({ value: {} })).toBeNull()
  })
})
