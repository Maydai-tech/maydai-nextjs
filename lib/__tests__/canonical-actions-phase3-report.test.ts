import {
  REPORT_STANDARD_SLOT_KEYS_ORDERED,
  buildDashboardDossierDeepLink,
  buildDashboardTodoListDeepLink,
  getCanonicalDocTypeForReportSlot,
} from '@/lib/canonical-actions'

describe('phase 3 — slots rapport & deep links', () => {
  test('REPORT_STANDARD_SLOT_KEYS_ORDERED aligné 9 slots', () => {
    expect(REPORT_STANDARD_SLOT_KEYS_ORDERED).toHaveLength(9)
    expect(getCanonicalDocTypeForReportSlot('quick_win_1')).toBe('registry_proof')
    expect(getCanonicalDocTypeForReportSlot('action_3')).toBe('training_plan')
  })

  test('deep links encodent le doc_type canonique', () => {
    expect(buildDashboardDossierDeepLink('c1', 'u1', 'registry_action')).toContain('doc=registry_proof')
    expect(buildDashboardTodoListDeepLink('c1', 'u1', 'training_census')).toContain('action=training_plan')
  })
})
