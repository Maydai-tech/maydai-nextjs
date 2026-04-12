'use client'

import type { RiskLevelCode } from '@/lib/risk-level'
import type { UseCaseNextSteps } from '@/lib/supabase'
import { buildReportCanonicalItemForSlot, type ReportCanonicalItem } from '@/lib/report-canonical-items'
import type { SlotStatusMap } from '@/lib/slot-statuses'
import { REPORT_STANDARD_SLOT_KEYS_ORDERED } from '@/lib/canonical-actions'
import { groupStandardPlanItemsByLegalCode } from '@/lib/report-plan-ors-ocru-bpgv'
import { ReportCanonicalItemRow } from './ReportCanonicalItemRow'
import { DECLARATION_PROOF_FLOW_COPY } from '../../utils/declaration-proof-flow-copy'

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

export type PlanClassificationStatus = 'qualified' | 'impossible'

export interface ReportStandardPlanBlocksProps {
  nextSteps: UseCaseNextSteps
  slotStatuses: SlotStatusMap | null
  documentStatuses: DocumentStatuses
  maydaiAsRegistry?: boolean
  companyId: string
  useCaseId: string
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
  riskLevel,
  classificationStatus,
}: ReportStandardPlanBlocksProps) {
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
    })
  ).filter(isItem)

  const groups = groupStandardPlanItemsByLegalCode(items)

  return (
    <>
      <p className="text-sm text-gray-700 mb-6 rounded-lg border border-gray-200 bg-slate-50/80 px-3 py-2.5 leading-relaxed">
        {DECLARATION_PROOF_FLOW_COPY.filRougeTitle} — {DECLARATION_PROOF_FLOW_COPY.rapportPlanHint}
      </p>
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
