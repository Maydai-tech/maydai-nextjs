'use client'

import type { RiskLevelCode } from '@/lib/risk-level'
import type { UseCaseNextSteps } from '@/lib/supabase'
import { buildReportCanonicalItemForSlot, type ReportCanonicalItem } from '@/lib/report-canonical-items'
import type { SlotStatusMap } from '@/lib/slot-statuses'
import { REPORT_STANDARD_SLOT_KEYS_ORDERED } from '@/lib/canonical-actions'
import { groupStandardPlanItemsByLegalCode } from '@/lib/report-plan-ors-ocru-bpgv'
import { ReportCanonicalItemRow } from './ReportCanonicalItemRow'

type DocumentStatuses = Record<string, { status: string }>

export interface ReportStandardPlanBlocksProps {
  nextSteps: UseCaseNextSteps
  slotStatuses: SlotStatusMap | null
  documentStatuses: DocumentStatuses
  maydaiAsRegistry?: boolean
  companyId: string
  useCaseId: string
  /** Niveau de risque qualifié (questionnaire) — fallback `minimal` si encore inconnu. */
  riskLevel: RiskLevelCode | null
}

export function ReportStandardPlanBlocks({
  nextSteps,
  slotStatuses,
  documentStatuses,
  maydaiAsRegistry,
  companyId,
  useCaseId,
  riskLevel,
}: ReportStandardPlanBlocksProps) {
  const riskResolved: RiskLevelCode = riskLevel ?? 'minimal'

  const isItem = (x: unknown): x is ReportCanonicalItem => !!x && typeof x === 'object'

  const items = REPORT_STANDARD_SLOT_KEYS_ORDERED.map(slotKey =>
    buildReportCanonicalItemForSlot({
      reportSlotKey: slotKey,
      riskLevel: riskResolved,
      nextSteps,
      slotStatuses,
      documentStatuses,
      maydaiAsRegistry,
      companyId,
      useCaseId,
    })
  ).filter(isItem)

  const groups = groupStandardPlanItemsByLegalCode(items)

  return (
    <>
      {groups.map(group => (
        <div key={group.code}>
          <div className="flex items-center gap-3 mb-3">
            <h3 className="text-xl font-semibold text-gray-900">{group.title}</h3>
          </div>
          <p className="text-sm text-gray-600 italic mb-4">{group.subtitle}</p>
          <ul className="space-y-4 mb-6 ml-4">
            {group.items.map(item => (
              <ReportCanonicalItemRow key={item.identity.report_slot_key} item={item} />
            ))}
          </ul>
        </div>
      ))}
    </>
  )
}
