import { resolveCanonicalDocType } from '@/lib/canonical-actions'
import { DECLARATION_PROOF_FLOW_COPY } from '@/lib/declaration-proof-flow-copy'
import {
  buildReportCanonicalItemForSlot,
  declarationStatusPdfLabel,
  evidenceStatusPdfLabel,
  flattenReportCanonicalItem,
  getLegalTaxonomyForAction,
  STANDARD_PLAN_SLOT_KEYS_ORDERED,
} from '@/lib/report-canonical-items'
import { computeSlotStatuses } from '@/lib/slot-statuses'

describe('report-canonical-items (phase 5)', () => {
  describe('getLegalTaxonomyForAction / matrice juridique', () => {
    it('MAYDAI_TRAINING_COMPLIANCE : ORS pour minimal / limited / high, NAD si interdit', () => {
      expect(getLegalTaxonomyForAction('MAYDAI_TRAINING_COMPLIANCE', 'minimal')).toBe('ORS')
      expect(getLegalTaxonomyForAction('MAYDAI_TRAINING_COMPLIANCE', 'limited')).toBe('ORS')
      expect(getLegalTaxonomyForAction('MAYDAI_TRAINING_COMPLIANCE', 'high')).toBe('ORS')
      expect(getLegalTaxonomyForAction('MAYDAI_TRAINING_COMPLIANCE', 'unacceptable')).toBe('NAD')
    })

    it('MAYDAI_SYSTEM_INSTRUCTIONS : ORS uniquement si cas interdit', () => {
      expect(getLegalTaxonomyForAction('MAYDAI_SYSTEM_INSTRUCTIONS', 'high')).toBe('OCRU')
      expect(getLegalTaxonomyForAction('MAYDAI_SYSTEM_INSTRUCTIONS', 'unacceptable')).toBe('ORS')
    })

    it('MAYDAI_STOPPING_PROOF : NAD sauf interdit → ORS', () => {
      expect(getLegalTaxonomyForAction('MAYDAI_STOPPING_PROOF', 'high')).toBe('NAD')
      expect(getLegalTaxonomyForAction('MAYDAI_STOPPING_PROOF', 'unacceptable')).toBe('ORS')
    })

    it('MAYDAI_TRANSPARENCY_MARKING : OCRU dès limited', () => {
      expect(getLegalTaxonomyForAction('MAYDAI_TRANSPARENCY_MARKING', 'minimal')).toBe('BPGV')
      expect(getLegalTaxonomyForAction('MAYDAI_TRANSPARENCY_MARKING', 'limited')).toBe('OCRU')
    })
  })

  describe('STANDARD_PLAN_SLOT_KEYS_ORDERED', () => {
    it('contient 9 clés uniques dans l’ordre quick wins → priorités → actions', () => {
      expect(STANDARD_PLAN_SLOT_KEYS_ORDERED).toHaveLength(9)
      expect(new Set(STANDARD_PLAN_SLOT_KEYS_ORDERED).size).toBe(9)
      expect(STANDARD_PLAN_SLOT_KEYS_ORDERED.slice(0, 3).every(k => k.startsWith('quick_win'))).toBe(true)
      expect(STANDARD_PLAN_SLOT_KEYS_ORDERED.slice(3, 6).every(k => k.startsWith('priorite'))).toBe(true)
      expect(STANDARD_PLAN_SLOT_KEYS_ORDERED.slice(6, 9).every(k => k.startsWith('action'))).toBe(true)
    })
  })

  describe('buildReportCanonicalItemForSlot', () => {
    it('construit un item avec narrative (fallback) sans texte LLM', () => {
      const slotStatuses = computeSlotStatuses([])
      const item = buildReportCanonicalItemForSlot({
        reportSlotKey: 'quick_win_1',
        riskLevel: 'limited',
        nextSteps: {},
        slotStatuses,
        documentStatuses: {},
        maydaiAsRegistry: false,
        companyId: 'company-x',
        useCaseId: 'usecase-y',
      })
      expect(item).not.toBeNull()
      expect(item!.identity.canonical_action_code).toBe('MAYDAI_REGISTRY')
      expect(item!.identity.doc_type_canonique).toBe('registry_proof')
      expect(item!.narrative.text.length).toBeGreaterThan(20)
      expect(item!.cta.todoUrl).toContain('/todo-list?usecase=usecase-y')
      expect(item!.cta.dossierUrl).toContain('/dossiers/usecase-y?doc=registry_proof')

      const flat = flattenReportCanonicalItem(item!)
      expect(flat.legal_status).toBe(item!.legal.code)
      expect(flat.narrative_text).toBe(item!.narrative.text)
    })
  })

  describe('Libellés PDF', () => {
    it('declarationStatusPdfLabel couvre les cas principaux', () => {
      expect(declarationStatusPdfLabel('OUI')).toBe(DECLARATION_PROOF_FLOW_COPY.declarativeYes)
      expect(declarationStatusPdfLabel('NON')).toBe(DECLARATION_PROOF_FLOW_COPY.declarativeNo)
      expect(declarationStatusPdfLabel('Information insuffisante')).toBe(
        DECLARATION_PROOF_FLOW_COPY.declarativeInsufficient
      )
      expect(declarationStatusPdfLabel(null)).toBe(DECLARATION_PROOF_FLOW_COPY.declarativePdfNull)
    })

    it('evidenceStatusPdfLabel couvre les statuts de preuve', () => {
      expect(evidenceStatusPdfLabel('complete')).toBe(DECLARATION_PROOF_FLOW_COPY.evidenceShortComplete)
      expect(evidenceStatusPdfLabel('not_applicable')).toBe(DECLARATION_PROOF_FLOW_COPY.evidenceShortNa)
    })
  })
})

describe('resolveCanonicalDocType (alias critiques)', () => {
  it('training_census → training_plan', () => {
    expect(resolveCanonicalDocType('training_census')).toBe('training_plan')
  })

  it('registry_action → registry_proof', () => {
    expect(resolveCanonicalDocType('registry_action')).toBe('registry_proof')
  })
})
