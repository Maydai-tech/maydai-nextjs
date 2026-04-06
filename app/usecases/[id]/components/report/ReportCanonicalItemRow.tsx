'use client'

import { useRouter } from 'next/navigation'
import { ArrowRight } from 'lucide-react'
import type { EvidenceStatusValue, ReportCanonicalItem } from '@/lib/report-canonical-items'
import { LEGAL_TAXONOMY_SHORT } from '@/lib/report-canonical-items'
import { CompletedAction } from './CompletedAction'

const EVIDENCE_UI: Record<
  EvidenceStatusValue,
  { short: string; className: string }
> = {
  complete: { short: 'Preuve complétée', className: 'bg-emerald-50 text-emerald-900 border-emerald-200' },
  validated: { short: 'Preuve validée', className: 'bg-green-50 text-green-900 border-green-200' },
  incomplete: { short: 'Preuve à fournir', className: 'bg-amber-50 text-amber-900 border-amber-200' },
  not_tracked: { short: 'Preuve non suivie', className: 'bg-gray-50 text-gray-700 border-gray-200' },
  not_applicable: { short: 'Preuve N/A', className: 'bg-slate-50 text-slate-600 border-slate-200' },
}

const LEGAL_BADGE: Record<string, string> = {
  ORS: 'bg-red-50 text-red-900 border-red-200',
  OCRU: 'bg-orange-50 text-orange-900 border-orange-200',
  BPGV: 'bg-sky-50 text-sky-900 border-sky-200',
  NAD: 'bg-gray-100 text-gray-700 border-gray-200',
}

function declarationLabel(
  d: ReportCanonicalItem['declaration']['status']
): { text: string; className: string } | null {
  if (d == null) return null
  if (d === 'OUI')
    return { text: 'Déclaratif : OUI', className: 'bg-teal-50 text-teal-900 border-teal-200' }
  if (d === 'NON')
    return { text: 'Déclaratif : NON', className: 'bg-rose-50 text-rose-900 border-rose-200' }
  return {
    text: 'Déclaratif : insuffisant',
    className: 'bg-amber-50 text-amber-900 border-amber-200',
  }
}

export function ReportCanonicalItemRow({ item }: { item: ReportCanonicalItem }) {
  const router = useRouter()
  const decl = declarationLabel(item.declaration.status)
  const ev = EVIDENCE_UI[item.evidence.status]

  return (
    <li
      className="text-base leading-relaxed text-gray-800 border-b border-gray-100 last:border-0 pb-4 last:pb-0"
      data-canonical-action={item.identity.canonical_action_code}
      data-report-slot={item.identity.report_slot_key}
      data-doc-type={item.identity.doc_type_canonique}
    >
      <div className="flex flex-wrap items-center gap-2 mb-2">
        <span
          className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${LEGAL_BADGE[item.legal.code] ?? LEGAL_BADGE.BPGV}`}
          title={item.legal.label_long}
        >
          {LEGAL_TAXONOMY_SHORT[item.legal.code]}
        </span>
        {decl && (
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${decl.className}`}>
            {decl.text}
          </span>
        )}
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${ev.className}`}>{ev.short}</span>
      </div>
      <p className="text-xs text-gray-500 mb-1 leading-snug">
        <span className="font-medium text-gray-600">Mesure (catalogue) : </span>
        {item.identity.action_label}
      </p>
      <p className="text-xs text-gray-600 mb-1 leading-snug">
        <span className="font-semibold text-gray-700">Fondement : </span>
        {item.legal.basis_primary}
      </p>
      <p className="text-xs text-gray-600 mb-2 leading-snug italic">
        <span className="font-semibold not-italic text-gray-700">Gouvernance : </span>
        {item.governance.rationale}
      </p>
      <div className="flex items-start gap-2">
        <span className="text-[#0080a3] text-6xl leading-none mt-[-0.3em]">•</span>
        <span className="flex-1 whitespace-pre-line text-gray-800">{item.narrative.text}</span>
      </div>
      {item.cta.completed ? (
        <CompletedAction
          title={item.cta.label}
          points={item.cta.points}
          onClick={() => router.push(item.cta.dossierUrl)}
        />
      ) : (
        <button
          type="button"
          onClick={() => router.push(item.cta.todoUrl)}
          className="mt-2 ml-8 inline-flex items-center justify-between gap-3 px-4 py-2.5 text-sm font-medium text-white bg-[#0080A3] rounded-lg hover:bg-[#006280] transition-colors"
        >
          <span>{item.cta.label}</span>
          <div className="flex items-center gap-2">
            {item.cta.points > 0 && (
              <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs font-semibold">
                +{item.cta.points} pts
              </span>
            )}
            <ArrowRight className="w-4 h-4" />
          </div>
        </button>
      )}
    </li>
  )
}
