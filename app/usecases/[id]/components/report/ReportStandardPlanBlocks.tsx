'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import type { RiskLevelCode } from '@/lib/risk-level'
import type { UseCaseNextSteps } from '@/lib/supabase'
import { buildReportCanonicalItemForSlot, type ReportCanonicalItem } from '@/lib/report-canonical-items'
import type { SlotStatusMap } from '@/lib/slot-statuses'
import { REPORT_STANDARD_SLOT_KEYS_ORDERED } from '@/lib/canonical-actions'
import {
  groupStandardPlanItemsByLegalCode,
  type ReportLegalGroupCode,
} from '@/lib/report-plan-ors-ocru-bpgv'
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

function borderClassForLegalGroup(code: ReportLegalGroupCode): string {
  switch (code) {
    case 'ORS':
      return 'border-[#ffab5a]'
    case 'OCRU':
      return 'border-[#F5E6C2]'
    case 'BPGV':
      return 'border-[#0080a3]'
  }
}

export type PlanClassificationStatus = 'qualified' | 'impossible'

export interface ReportStandardPlanBlocksProps {
  nextSteps: UseCaseNextSteps
  slotStatuses: SlotStatusMap | null
  documentStatuses: DocumentStatuses
  maydaiAsRegistry?: boolean
  companyId: string
  useCaseId: string
  /** Réponses questionnaire — alignement points avec la todo dashboard. */
  questionnaireResponses?: unknown[]
  /** Niveau de risque qualifié — requis si classificationStatus === 'qualified'. */
  riskLevel: RiskLevelCode | null
  /** qualified = niveau fiable attendu ; impossible géré en amont si le parent filtre correctement. */
  classificationStatus: PlanClassificationStatus
}

export function ReportStandardPlanBlocks({
  nextSteps,
  slotStatuses,
  documentStatuses,
  maydaiAsRegistry,
  companyId,
  useCaseId,
  questionnaireResponses = [],
  riskLevel,
  classificationStatus,
}: ReportStandardPlanBlocksProps) {
  const [groupExpanded, setGroupExpanded] = useState<Record<ReportLegalGroupCode, boolean>>({
    ORS: true,
    OCRU: false,
    BPGV: false,
  })

  if (classificationStatus === 'impossible') {
    return (
      <div className="rounded-lg border border-violet-200 bg-violet-50/80 p-4 text-sm text-violet-900">
        <p className="font-semibold mb-1">Plan d&apos;action structuré non affiché</p>
        <p className="text-violet-800/95 leading-relaxed">
          La qualification réglementaire n&apos;est pas tranchée (réponses « Je ne sais pas » sur un pivot
          juridique). Complétez le questionnaire pour obtenir un niveau IA Act fiable et les blocs ORS / OCRU /
          BPGV.
        </p>
      </div>
    )
  }

  if (riskLevel == null) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50/90 p-4 text-sm text-amber-950">
        <p className="font-semibold mb-1">Plan d&apos;action structuré non affiché</p>
        <p className="text-amber-900/95 leading-relaxed">
          Le niveau IA Act qualifié est indisponible alors que la classification est marquée comme fiable. Aucun
          plan ORS / OCRU / BPGV n&apos;est affiché pour éviter un niveau implicite erroné. Vérifiez le
          recalcul du score ou rechargez la page.
        </p>
      </div>
    )
  }

  const riskResolved: RiskLevelCode = riskLevel

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
      questionnaireResponses,
    })
  ).filter(isItem)

  const groups = groupStandardPlanItemsByLegalCode(items)

  return (
    <>
      {groups.map((group, idx) => {
        const icon = LEGAL_GROUP_ICON[group.code]
        const isExpanded = groupExpanded[group.code]
        const panelId = `plan-action-group-${group.code}`
        const headerId = `plan-action-group-header-${group.code}`
        return (
          <section
            key={group.code}
            className={['pt-6', idx === 0 ? 'mt-0' : 'mt-8'].join(' ')}
            aria-label={group.title}
          >
            <button
              type="button"
              id={headerId}
              aria-expanded={isExpanded}
              aria-controls={panelId}
              onClick={() =>
                setGroupExpanded(prev => ({
                  ...prev,
                  [group.code]: !prev[group.code],
                }))
              }
              className={[
                'w-full text-left rounded-t-lg transition-all duration-200',
                'border-b-4 pb-3 mb-1',
                borderClassForLegalGroup(group.code),
                'hover:bg-gray-50/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0080A3] focus-visible:ring-offset-2',
              ].join(' ')}
            >
              <div className="flex items-center justify-between py-3 cursor-pointer group gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  {icon ? (
                    <img
                      src={icon.src}
                      alt={icon.alt}
                      width={22}
                      height={22}
                      className="flex-shrink-0"
                    />
                  ) : null}
                  <span className="text-xl font-semibold text-gray-900 truncate">{group.title}</span>
                </div>
                <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                  <span className="px-2.5 py-0.5 rounded-full text-sm font-semibold bg-gray-100 text-gray-700 whitespace-nowrap">
                    {group.items.length} action(s)
                  </span>
                  {isExpanded ? (
                    <ChevronUp
                      className="w-5 h-5 text-gray-500 group-hover:text-gray-700 shrink-0 transition-colors"
                      aria-hidden
                    />
                  ) : (
                    <ChevronDown
                      className="w-5 h-5 text-gray-500 group-hover:text-gray-700 shrink-0 transition-colors"
                      aria-hidden
                    />
                  )}
                </div>
              </div>
            </button>
            {isExpanded && (
              <div
                id={panelId}
                role="region"
                aria-labelledby={headerId}
                className="transition-all duration-200 ease-out"
              >
                <p className="text-sm text-gray-600 italic mb-4">{group.subtitle}</p>
                <ul className="flex flex-col mb-2 ml-0 sm:ml-2">
                  {group.items.map(item => (
                    <ReportCanonicalItemRow key={item.identity.report_slot_key} item={item} />
                  ))}
                </ul>
              </div>
            )}
          </section>
        )
      })}
    </>
  )
}
