'use client'

import type { RiskLevelCode } from '@/lib/risk-level'
import type { UseCaseNextSteps } from '@/lib/supabase'
import { buildReportCanonicalItemForSlot } from '@/lib/report-canonical-items'
import { REPORT_STANDARD_PLAN_GROUPS } from '@/lib/report-standard-plan-ui'
import type { SlotStatusMap } from '@/lib/slot-statuses'
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

  return (
    <>
      {REPORT_STANDARD_PLAN_GROUPS.map(group => (
        <div key={group.heading}>
          <div className="flex items-center gap-3 mb-4">
            <img src={group.iconSrc} alt={group.iconAlt} width={24} height={24} className="flex-shrink-0" />
            <h3 className="text-xl font-semibold text-gray-900">{group.heading}</h3>
          </div>
          <h4 className="text-lg font-medium text-gray-700 mb-3 italic">{group.subheading}</h4>
          <ul className="space-y-4 mb-4 ml-4">
            {group.slotKeys.map(slotKey => {
              const item = buildReportCanonicalItemForSlot({
                reportSlotKey: slotKey,
                riskLevel: riskResolved,
                nextSteps,
                slotStatuses,
                documentStatuses,
                maydaiAsRegistry,
                companyId,
                useCaseId,
              })
              if (!item) return null
              return <ReportCanonicalItemRow key={slotKey} item={item} />
            })}
          </ul>
        </div>
      ))}
    </>
  )
}
