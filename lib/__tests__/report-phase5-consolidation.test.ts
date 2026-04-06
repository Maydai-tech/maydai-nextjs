import { REPORT_STANDARD_SLOT_KEYS_ORDERED } from '@/lib/canonical-actions'
import type { ReportCanonicalItem } from '@/lib/report-canonical-items'
import {
  LEGAL_STATUS_BY_RISK,
  buildAllStandardPlanCanonicalItems,
  flattenReportCanonicalItem,
  getLegalTaxonomyForAction,
  partitionStandardPlanCanonicalItems,
} from '@/lib/report-canonical-items'
import { REPORT_STANDARD_PLAN_GROUPS } from '@/lib/report-standard-plan-ui'
import type { RiskLevelCode } from '@/lib/risk-level'
import { computeSlotStatuses } from '@/lib/slot-statuses'

const RISK_LEVELS: RiskLevelCode[] = ['minimal', 'limited', 'high', 'unacceptable']
const TAXONOMY = ['ORS', 'OCRU', 'BPGV', 'NAD'] as const

describe('phase 5 — consolidation plan web/PDF', () => {
  test('REPORT_STANDARD_PLAN_GROUPS couvre les 9 slots dans le même ordre que le catalogue', () => {
    const flat = REPORT_STANDARD_PLAN_GROUPS.flatMap(g => [...g.slotKeys])
    expect(flat).toEqual([...REPORT_STANDARD_SLOT_KEYS_ORDERED])
  })

  test('partitionStandardPlanCanonicalItems découpe en 3×3', () => {
    const mock = Array.from({ length: 9 }, () => ({})) as ReportCanonicalItem[]
    const [a, b, c] = partitionStandardPlanCanonicalItems(mock)
    expect(a).toHaveLength(3)
    expect(b).toHaveLength(3)
    expect(c).toHaveLength(3)
  })

  test('buildAllStandardPlanCanonicalItems produit 9 items pour les 9 slots standard', () => {
    const items = buildAllStandardPlanCanonicalItems({
      slotKeysOrdered: [...REPORT_STANDARD_SLOT_KEYS_ORDERED],
      riskLevel: 'limited',
      nextSteps: {},
      slotStatuses: computeSlotStatuses([]),
      documentStatuses: {},
      maydaiAsRegistry: false,
      companyId: 'c1',
      useCaseId: 'u1',
    })
    expect(items).toHaveLength(9)
    expect(items[0]!.identity.report_slot_key).toBe(REPORT_STANDARD_SLOT_KEYS_ORDERED[0])
    expect(items[8]!.identity.report_slot_key).toBe(REPORT_STANDARD_SLOT_KEYS_ORDERED[8])
  })

  test('flattenReportCanonicalItem expose les champs attendus pour sortie plate', () => {
    const items = buildAllStandardPlanCanonicalItems({
      slotKeysOrdered: [...REPORT_STANDARD_SLOT_KEYS_ORDERED],
      riskLevel: 'high',
      nextSteps: {},
      slotStatuses: computeSlotStatuses([]),
      documentStatuses: {},
      maydaiAsRegistry: false,
      companyId: 'c1',
      useCaseId: 'u1',
    })
    const flat = flattenReportCanonicalItem(items[4]!)
    expect(flat.canonical_action_code).toBe(items[4]!.identity.canonical_action_code)
    expect(flat.legal_status).toBe(items[4]!.legal.code)
    expect(flat.declaration_status).toBe(items[4]!.declaration.status)
    expect(flat.evidence_status).toBe(items[4]!.evidence.status)
    expect(flat.cta).toEqual(items[4]!.cta)
  })
})

describe('phase 5 — matrice juridique (LEGAL_STATUS_BY_RISK)', () => {
  test.each(Object.keys(LEGAL_STATUS_BY_RISK))(
    'chaque action de la matrice a les 4 niveaux de risque (%s)',
    actionCode => {
      const row = LEGAL_STATUS_BY_RISK[actionCode]
      expect(row).toBeDefined()
      for (const rl of RISK_LEVELS) {
        const v = getLegalTaxonomyForAction(actionCode, rl)
        expect(TAXONOMY).toContain(v)
      }
    }
  )

  test('référence métier : formation = ORS hors interdit', () => {
    expect(getLegalTaxonomyForAction('MAYDAI_TRAINING_COMPLIANCE', 'minimal')).toBe('ORS')
    expect(getLegalTaxonomyForAction('MAYDAI_TRAINING_COMPLIANCE', 'unacceptable')).toBe('NAD')
  })
})
