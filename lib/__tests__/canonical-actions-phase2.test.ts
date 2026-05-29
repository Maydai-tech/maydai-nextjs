import {
  getRegistryTodoHelpExplanation,
  getRegistryTodoTitleForCase,
  getStandardTodoComplianceDocTypesOrdered,
} from '@/lib/canonical-actions'

describe('canonical-actions phase 2 — todo / score / registre', () => {
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
