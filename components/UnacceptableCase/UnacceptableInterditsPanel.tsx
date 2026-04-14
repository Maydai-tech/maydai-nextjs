'use client'

import { useRouter } from 'next/navigation'
import { ArrowRight } from 'lucide-react'
import UnacceptableStatusBanner from '@/components/UnacceptableCase/UnacceptableStatusBanner'
import {
  getDeploymentUrgency,
  getUnacceptablePriorityHint,
  UNACCEPTABLE_CTA_STOPPING_PROOF,
  UNACCEPTABLE_CTA_SYSTEM_PROMPT,
  UNACCEPTABLE_DOSSIER_CTAS_DISABLED_HINT,
  UNACCEPTABLE_INTERDIT2_BODY,
  UNACCEPTABLE_INTERDIT3_BODY,
} from '@/lib/unacceptable-case-copy'
import {
  getUnacceptableStoppingProofDossierUrl,
  getUnacceptableSystemPromptDossierUrl,
} from '@/lib/unacceptable-case-actions'

type Props = {
  useCaseId: string
  /** Vide ou absent si le cas n'est pas rattaché à une entreprise : CTA dossier désactivés. */
  companyId?: string | null
  deploymentDateIso: string | null | undefined
  interdit1Text: string
  interdit1Loading: boolean
  interdit1Error: string | null
}

export default function UnacceptableInterditsPanel({
  useCaseId,
  companyId,
  deploymentDateIso,
  interdit1Text,
  interdit1Loading,
  interdit1Error,
}: Props) {
  const router = useRouter()
  const urgency = getDeploymentUrgency(deploymentDateIso)
  const priorityHint = getUnacceptablePriorityHint(urgency)

  const hasCompany = Boolean(companyId?.trim())
  const stoppingUrl = hasCompany
    ? getUnacceptableStoppingProofDossierUrl(companyId!.trim(), useCaseId)
    : ''
  const promptUrl = hasCompany
    ? getUnacceptableSystemPromptDossierUrl(companyId!.trim(), useCaseId)
    : ''

  const ctaDisabledClass =
    'cursor-not-allowed bg-gray-300 text-gray-600 hover:bg-gray-300 focus:ring-0'
  const ctaEnabledClass =
    'bg-[#0080A3] text-white hover:bg-[#006280] focus:ring-2 focus:ring-[#0080A3]'

  const sectionTitleClass =
    'text-lg font-semibold text-gray-900 flex items-center gap-2'

  return (
    <div className="mb-8 space-y-6">
      <h3 className="text-xl font-semibold text-gray-900">
        Cas de risque inacceptable
      </h3>

      <UnacceptableStatusBanner deploymentDateIso={deploymentDateIso} urgency={urgency} />

      <p className="text-sm text-gray-600 leading-relaxed">{priorityHint}</p>

      {!hasCompany ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          {UNACCEPTABLE_DOSSIER_CTAS_DISABLED_HINT}
        </p>
      ) : null}

      {/* interdit_1 — hors bloc rouge */}
      <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <h4 className={sectionTitleClass}>
          <span className="text-[#0080A3]">1.</span>
          Motif principal d&apos;interdiction
        </h4>
        {interdit1Loading ? (
          <p className="mt-3 text-sm text-gray-500">Chargement du motif…</p>
        ) : interdit1Error ? (
          <p className="mt-3 text-sm text-red-700">{interdit1Error}</p>
        ) : (
          <p className="mt-3 whitespace-pre-line text-base leading-relaxed text-gray-800">
            {interdit1Text}
          </p>
        )}
      </div>

      {/* interdit_2 — copy fixe + CTA */}
      <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <h4 className={sectionTitleClass}>
          <span className="text-[#0080A3]">2.</span>
          Preuve d&apos;arrêt et traçabilité
        </h4>
        <p className="mt-3 text-base leading-relaxed text-gray-800">
          {UNACCEPTABLE_INTERDIT2_BODY}
        </p>
        <button
          type="button"
          disabled={!hasCompany}
          onClick={() => hasCompany && router.push(stoppingUrl)}
          className={`mt-4 inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ${
            hasCompany ? ctaEnabledClass : ctaDisabledClass
          }`}
        >
          {UNACCEPTABLE_CTA_STOPPING_PROOF}
          <ArrowRight className="h-4 w-4 shrink-0" aria-hidden />
        </button>
      </div>

      {/* interdit_3 — copy fixe + CTA */}
      <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <h4 className={sectionTitleClass}>
          <span className="text-[#0080A3]">3.</span>
          Instructions système, prompts et garde-fous
        </h4>
        <p className="mt-3 text-base leading-relaxed text-gray-800">
          {UNACCEPTABLE_INTERDIT3_BODY}
        </p>
        <button
          type="button"
          disabled={!hasCompany}
          onClick={() => hasCompany && router.push(promptUrl)}
          className={`mt-4 inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ${
            hasCompany ? ctaEnabledClass : ctaDisabledClass
          }`}
        >
          {UNACCEPTABLE_CTA_SYSTEM_PROMPT}
          <ArrowRight className="h-4 w-4 shrink-0" aria-hidden />
        </button>
      </div>
    </div>
  )
}
