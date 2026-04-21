/**
 * Composant pour afficher une action complétée
 * Style identique à la todo-list avec pastille verte + check
 */

import { Check, CheckCircle2 } from 'lucide-react'
import { DECLARATION_PROOF_FLOW_COPY } from '../../utils/declaration-proof-flow-copy'

interface CompletedActionProps {
  title: string
  points: number
  onClick: () => void
}

export function CompletedAction({ title, points, onClick }: CompletedActionProps) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
    >
      <span className="flex-1 text-left">{title}</span>
      {points > 0 ? (
        <span
          className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-600 text-white text-xs font-semibold rounded-full flex-shrink-0"
          title={DECLARATION_PROOF_FLOW_COPY.todoPointsRecoveredTitle}
        >
          <Check className="w-3 h-3" aria-hidden />
          +{points} pt récupérés
        </span>
      ) : (
        <span
          className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 text-slate-800 text-xs font-semibold rounded-full border border-slate-200 flex-shrink-0"
          title={DECLARATION_PROOF_FLOW_COPY.todoValidatedBadge}
        >
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" aria-hidden />
          {DECLARATION_PROOF_FLOW_COPY.todoValidatedBadge}
        </span>
      )}
    </button>
  )
}

