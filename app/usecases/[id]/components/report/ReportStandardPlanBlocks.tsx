'use client'

import type { RiskLevelCode } from '@/lib/risk-level'
import type { UseCaseNextSteps } from '@/lib/supabase'
import { buildReportCanonicalItemForSlot, type ReportCanonicalItem } from '@/lib/report-canonical-items'
import type { SlotStatusMap } from '@/lib/slot-statuses'
import { REPORT_STANDARD_SLOT_KEYS_ORDERED } from '@/lib/canonical-actions'
import { groupStandardPlanItemsByLegalCode } from '@/lib/report-plan-ors-ocru-bpgv'
import { ReportCanonicalItemRow } from './ReportCanonicalItemRow'

type DocumentStatuses = Record<string, { status: string }>

const LEGAL_GROUP_ICON: Record<
  'ORS' | 'OCRU' | 'BPGV',
  { src: string; alt: string }
> = {
  // Mapping demandé:
  // - ORS = icône Priorités
  // - OCRU = icône Actions
  // - BPGV = icône Quickwins
  ORS: { src: '/icons/attention.png', alt: 'Priorités' },
  OCRU: { src: '/icons/schedule.png', alt: 'Actions' },
  BPGV: { src: '/icons/work-in-progress.png', alt: 'Quickwins' },
}

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
      {groups.map((group, idx) => {
        const icon = LEGAL_GROUP_ICON[group.code]
        return (
          <section
            key={group.code}
            className={[
              'pt-6',
              'border-t-2 border-[#0080a3]',
              idx === 0 ? 'mt-0' : 'mt-8',
            ].join(' ')}
            aria-label={group.title}
          >
            <div className="flex items-center gap-3 mb-3">
              {icon ? (
                <img
                  src={icon.src}
                  alt={icon.alt}
                  width={22}
                  height={22}
                  className="flex-shrink-0"
                />
              ) : null}
              <h3 className="text-xl font-semibold text-gray-900">{group.title}</h3>
            </div>
            <p className="text-sm text-gray-600 italic mb-4">{group.subtitle}</p>
            <ul className="space-y-4 mb-2 ml-4">
              {group.items.map(item => (
                <ReportCanonicalItemRow key={item.identity.report_slot_key} item={item} />
              ))}
            </ul>
          </section>
        )
      })}
    </>
  )
}
