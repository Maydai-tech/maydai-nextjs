'use client'

import { useRouter } from 'next/navigation'
import { AlertTriangle, ArrowRight } from 'lucide-react'
import type { EvidenceStatusValue, ReportCanonicalItem } from '@/lib/report-canonical-items'
import { DECLARATION_PROOF_FLOW_COPY } from '../../utils/declaration-proof-flow-copy'
import { CompletedAction } from './CompletedAction'

const TAG_BASE = 'px-2.5 py-0.5 rounded-full text-xs font-medium border'

const EVIDENCE_UI: Record<
  EvidenceStatusValue,
  { short: string; className: string }
> = {
  complete: {
    short: DECLARATION_PROOF_FLOW_COPY.evidenceShortComplete,
    className: `${TAG_BASE} bg-emerald-50 text-emerald-800 border-emerald-100`,
  },
  validated: {
    short: DECLARATION_PROOF_FLOW_COPY.evidenceShortValidated,
    className: `${TAG_BASE} bg-green-50 text-green-800 border-green-100`,
  },
  incomplete: {
    short: DECLARATION_PROOF_FLOW_COPY.evidenceShortIncomplete,
    className: `${TAG_BASE} bg-amber-50 text-amber-800 border-amber-100`,
  },
  not_tracked: {
    short: DECLARATION_PROOF_FLOW_COPY.evidenceShortNotTracked,
    className: `${TAG_BASE} bg-gray-50 text-gray-700 border-gray-100`,
  },
  not_applicable: {
    short: DECLARATION_PROOF_FLOW_COPY.evidenceShortNa,
    className: `${TAG_BASE} bg-slate-50 text-slate-600 border-slate-100`,
  },
}

function declarationLabel(
  d: ReportCanonicalItem['declaration']['status']
): { text: string; className: string } | null {
  if (d == null) return null
  if (d === 'OUI')
    return {
      text: DECLARATION_PROOF_FLOW_COPY.declarativeYes,
      className: `${TAG_BASE} bg-teal-50 text-teal-800 border-teal-100`,
    }
  if (d === 'NON')
    return {
      text: DECLARATION_PROOF_FLOW_COPY.declarativeNo,
      className: `${TAG_BASE} bg-red-50 text-red-700 border-red-100`,
    }
  if (d === 'Hors périmètre')
    return {
      text: DECLARATION_PROOF_FLOW_COPY.declarativeOut,
      className: `${TAG_BASE} bg-slate-50 text-slate-700 border-slate-100`,
    }
  return {
    text: DECLARATION_PROOF_FLOW_COPY.declarativeInsufficient,
    className: `${TAG_BASE} bg-amber-50 text-amber-800 border-amber-100`,
  }
}

function constatEtExigenceText(item: ReportCanonicalItem): string {
  const n = item.narrative.text.trim()
  const b = item.legal.basis_primary.trim()
  if (n && b) return `${n}\n\n${b}`
  return n || b
}

export function ReportCanonicalItemRow({ item }: { item: ReportCanonicalItem }) {
  const router = useRouter()
  const decl = declarationLabel(item.declaration.status)
  const ev = EVIDENCE_UI[item.evidence.status]

  return (
    <li
      className="list-none last:[&>div]:mb-0"
      data-canonical-action={item.identity.canonical_action_code}
      data-report-slot={item.identity.report_slot_key}
      data-doc-type={item.identity.doc_type_canonique}
    >
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6 mb-4 flex flex-col gap-4">
        <header className="flex flex-col gap-1">
          <div className="flex items-center gap-2 text-sm font-medium text-gray-500">
            <AlertTriangle className="w-4 h-4 text-gray-400 shrink-0" aria-hidden />
            <span>{item.legal.label_long}</span>
          </div>
          <h3 className="text-xl font-bold text-gray-900">{item.identity.action_label}</h3>
          <div className="flex flex-wrap gap-2 mt-2">
            {decl && (
              <span className={decl.className} title={DECLARATION_PROOF_FLOW_COPY.ouiSansPreuve}>
                {decl.text}
              </span>
            )}
            <span className={ev.className} title={DECLARATION_PROOF_FLOW_COPY.ouiSansPreuve}>
              {ev.short}
            </span>
          </div>
        </header>

        <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-700 border-l-4 border-gray-300">
          <strong className="text-gray-800">Constat & Exigence :</strong>
          <div className="mt-1.5 whitespace-pre-line leading-relaxed">{constatEtExigenceText(item)}</div>
        </div>

        <div className="bg-blue-50/50 rounded-lg p-4 text-sm text-gray-800 border-l-4 border-[#0080A3]">
          <strong className="text-gray-900">Action recommandée :</strong>
          <div className="mt-1.5 whitespace-pre-line leading-relaxed">{item.governance.rationale}</div>
        </div>

        <div className="mt-2 flex flex-col gap-3">
          {item.cta.ctaOmitted ? (
            <div className="mb-3 px-3 py-2 bg-gray-50 rounded text-sm text-gray-600 border border-gray-200">
              ℹ️ Hors périmètre : Aucune action stricte requise, mais vous pouvez documenter cette exemption.
            </div>
          ) : null}
          {item.cta.completed ? (
            <div className="flex justify-end">
              <CompletedAction
                title={item.cta.label}
                points={item.cta.points}
                onClick={() => router.push(item.cta.dossierUrl)}
              />
            </div>
          ) : (
            <div className="flex justify-end">
              <button
                type="button"
                disabled={!item.cta.todoUrl}
                onClick={() => item.cta.todoUrl && router.push(item.cta.todoUrl)}
                className="inline-flex items-center justify-between gap-3 px-4 py-2.5 text-sm font-medium text-white bg-[#0080A3] rounded-lg hover:bg-[#006280] transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-[#0080A3]"
              >
                <span>{item.cta.label}</span>
                <div className="flex items-center gap-2">
                  {item.cta.points > 0 && (
                    <span
                      className="bg-white/20 px-2 py-0.5 rounded-full text-xs font-semibold"
                      title={DECLARATION_PROOF_FLOW_COPY.todoPointsToRecoverTitle}
                    >
                      +{item.cta.points} pt à récupérer
                    </span>
                  )}
                  <ArrowRight className="w-4 h-4 shrink-0" />
                </div>
              </button>
            </div>
          )}
        </div>
      </div>
    </li>
  )
}
