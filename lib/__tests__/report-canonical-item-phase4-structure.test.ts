import { buildReportCanonicalItemForSlot, LEGAL_STATUS_BY_RISK } from '@/lib/report-canonical-items'
import { computeSlotStatuses } from '@/lib/slot-statuses'

describe('ReportCanonicalItem — structure phase 4 (piliers)', () => {
  it('expose identity, legal, declaration, evidence, governance, narrative, cta', () => {
    const item = buildReportCanonicalItemForSlot({
      reportSlotKey: 'priorite_1',
      riskLevel: 'high',
      nextSteps: {},
      slotStatuses: computeSlotStatuses([]),
      documentStatuses: {},
      maydaiAsRegistry: false,
      companyId: 'co',
      useCaseId: 'uc',
    })
    expect(item).not.toBeNull()
    expect(item!.identity.report_slot_key).toBe('priorite_1')
    expect(item!.identity.risk_level).toBe('high')
    expect(item!.legal.code).toBe(LEGAL_STATUS_BY_RISK.MAYDAI_TECHNICAL_DOCUMENTATION.high)
    expect(item!.legal.basis_primary.length).toBeGreaterThan(10)
    expect(item!.governance.rationale).toBeTruthy()
    expect(item!.declaration).toHaveProperty('status')
    expect(item!.evidence).toHaveProperty('status')
    expect(item!.narrative.source_slot_key).toBe('priorite_1')
    expect(item!.cta.label).toBeTruthy()
  })
})
