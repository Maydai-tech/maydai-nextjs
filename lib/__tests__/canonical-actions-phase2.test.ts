import {
  getComplianceNormalizedPointsForDocType,
  getDirectBonusCanonicalDocTypes,
  getDossierDirectBonusRawPointsAmount,
  getDossierDirectBonusSupabaseQueryDocTypes,
  getRegistryNormalizedPointsFromCatalog,
  getRegistryTodoHelpExplanation,
  getRegistryTodoTitleForCase,
  getStandardTodoComplianceDocTypesOrdered,
} from '@/lib/canonical-actions'

describe('canonical-actions phase 2 — todo / score / registre', () => {
  test('bonus dossier : types et montant alignés catalogue', () => {
    expect(getDirectBonusCanonicalDocTypes().sort()).toEqual(['system_prompt', 'training_plan'].sort())
    expect(getDossierDirectBonusRawPointsAmount()).toBe(3)
    expect(getDossierDirectBonusSupabaseQueryDocTypes().sort()).toEqual(
      ['system_prompt', 'training_census', 'training_plan'].sort()
    )
  })

  test('points normalisés hors registre depuis le flux standard', () => {
    expect(getComplianceNormalizedPointsForDocType('technical_documentation')).toBe(2)
    expect(getComplianceNormalizedPointsForDocType('registry_proof')).toBe(0)
    expect(getComplianceNormalizedPointsForDocType('stopping_proof')).toBe(0)
  })

  test('points registre catalogue', () => {
    expect(getRegistryNormalizedPointsFromCatalog()).toBe(3)
  })

  test('titres et aide todo registre (cas C)', () => {
    expect(getRegistryTodoTitleForCase('C')).toContain('registre')
    expect(
      getRegistryTodoHelpExplanation('A', { hasRegistryProofDocument: false, maydaiAsRegistry: false })
    ).toContain('AI Act')
    expect(
      getRegistryTodoHelpExplanation('B', { hasRegistryProofDocument: false, maydaiAsRegistry: true })
    ).toContain('MaydAI')
  })

  test('ordre todo conformité = catalogue hors registre', () => {
    const o = getStandardTodoComplianceDocTypesOrdered()
    expect(o[0]).toBe('system_prompt')
    expect(o).toContain('training_plan')
    expect(o).not.toContain('registry_proof')
  })
})
