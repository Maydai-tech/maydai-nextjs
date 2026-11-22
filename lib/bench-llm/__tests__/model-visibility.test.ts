import { isModelProposedToUser } from '../model-visibility'

const visible = {
  providerInQuestionnaire: true,
  role: 'base' as string | null,
  lifecycleStatus: 'active' as string | null,
  mergedIntoId: null as string | null,
  visibilityOverride: null as boolean | null,
  licenseClass: 'proprietary' as string | null,
}

describe('visibilité du sélecteur', () => {
  test('un modèle retiré sous licence libre est visible', () => {
    expect(isModelProposedToUser({
      ...visible,
      lifecycleStatus: 'retired',
      licenseClass: 'open_free',
    })).toBe(true)
  })

  test('un modèle retiré sous licence commerciale sous conditions est visible', () => {
    expect(isModelProposedToUser({
      ...visible,
      lifecycleStatus: 'retired',
      licenseClass: 'open_conditional',
    })).toBe(true)
  })

  test('un modèle retiré propriétaire est masqué', () => {
    expect(isModelProposedToUser({
      ...visible,
      lifecycleStatus: 'retired',
      licenseClass: 'proprietary',
    })).toBe(false)
  })

  test('un modèle retiré non renseigné est masqué', () => {
    expect(isModelProposedToUser({
      ...visible,
      lifecycleStatus: 'retired',
      licenseClass: 'unknown',
    })).toBe(false)
  })

  test('un modèle fusionné est masqué, quel que soit son type', () => {
    expect(isModelProposedToUser({
      ...visible,
      lifecycleStatus: 'retired',
      licenseClass: 'open_free',
      mergedIntoId: 'other',
    })).toBe(false)
    expect(isModelProposedToUser({
      ...visible,
      licenseClass: 'open_conditional',
      mergedIntoId: 'other',
    })).toBe(false)
  })

  test('un visibility_override prime toujours', () => {
    expect(isModelProposedToUser({
      ...visible,
      lifecycleStatus: 'retired',
      licenseClass: 'proprietary',
      mergedIntoId: 'other',
      visibilityOverride: true,
    })).toBe(true)
    expect(isModelProposedToUser({
      ...visible,
      lifecycleStatus: 'active',
      licenseClass: 'open_free',
      visibilityOverride: false,
    })).toBe(false)
  })
})
