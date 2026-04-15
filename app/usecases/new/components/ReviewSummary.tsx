'use client'

import { isoCodeToFrenchName } from '../lib/countries'
import { CHAT_STEP_LABELS } from '../types'
import type { ChatStepId, GuidedChatDraft } from '../types'

interface ReviewSummaryProps {
  draft: GuidedChatDraft
  onEdit: (stepId: ChatStepId) => void
  onSubmit: () => void
  submitting: boolean
  error?: string
}

const REVIEW_FIELDS: { stepId: ChatStepId; getValue: (d: GuidedChatDraft) => string }[] = [
  { stepId: 'name', getValue: d => d.name },
  {
    stepId: 'deployment_date',
    getValue: d => {
      const parts = [d.deployment_phase?.trim(), d.deployment_date?.trim()].filter(Boolean)
      return parts.length ? parts.join(' — ') : '(Non renseigné)'
    },
  },
  { stepId: 'responsible_service', getValue: d => d.responsible_service },
  { stepId: 'technology_partner', getValue: d => d.technology_partner },
  { stepId: 'llm_model_version', getValue: d => d.llm_model_version },
  { stepId: 'ai_category', getValue: d => d.ai_category },
  { stepId: 'system_type', getValue: d => d.system_type },
  {
    stepId: 'deployment_countries',
    getValue: d => d.deployment_countries.map(c => isoCodeToFrenchName(c)).join(', '),
  },
  { stepId: 'description', getValue: d => d.description },
]

export default function ReviewSummary({
  draft,
  onEdit,
  onSubmit,
  submitting,
  error,
}: ReviewSummaryProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="divide-y divide-gray-100">
        {REVIEW_FIELDS.map(({ stepId, getValue }) => {
          const value = getValue(draft)
          return (
            <div key={stepId} className="flex items-start justify-between p-4 gap-4">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-0.5">
                  {CHAT_STEP_LABELS[stepId]}
                </p>
                <p className="text-sm text-gray-900 break-words whitespace-pre-wrap">
                  {value.length > 150 ? value.substring(0, 150) + '...' : value}
                </p>
              </div>
              <button
                onClick={() => onEdit(stepId)}
                className="flex-shrink-0 text-xs text-[#0080A3] hover:text-[#006280] font-medium transition-colors"
              >
                Modifier
              </button>
            </div>
          )
        })}
      </div>

      {error && (
        <div className="px-4 py-3 bg-red-50 border-t border-red-100">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      <div className="p-4 bg-gray-50 border-t border-gray-100">
        <button
          onClick={onSubmit}
          disabled={submitting}
          className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-[#0080A3] text-white font-medium rounded-xl hover:bg-[#006280] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {submitting ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
              Création en cours...
            </>
          ) : (
            'Créer le cas d\'usage'
          )}
        </button>
      </div>
    </div>
  )
}
