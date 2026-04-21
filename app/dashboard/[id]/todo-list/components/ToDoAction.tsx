'use client'

import { CheckSquare, Square, ChevronRight, ChevronDown, CheckCircle2, TrendingUp, Check } from 'lucide-react'
import { getDocumentExplanation, type DocumentType } from '../utils/todo-helpers'
import { DECLARATION_PROOF_FLOW_COPY } from '@/app/usecases/[id]/utils/declaration-proof-flow-copy'

interface TodoItem {
  id: string
  text: string
  completed: boolean
  useCaseId: string
  docType: DocumentType
  actionNumber?: number // Optional numbering for ordered actions (1-8)
  isUnacceptablePrimary?: boolean
}

interface ToDoActionProps {
  todo: TodoItem
  isExpanded: boolean
  onToggle: (todoId: string) => void
  onActionClick: (useCaseId: string) => void
  potentialPoints?: number
  earnedPoints?: number
}

export default function ToDoAction({
  todo,
  isExpanded,
  onToggle,
  onActionClick,
  potentialPoints,
  earnedPoints
}: ToDoActionProps) {
  const p = potentialPoints ?? 0
  const e = earnedPoints ?? 0

  return (
    <div className="space-y-2">
      {/* Todo header - clickable to expand */}
      <div
        onClick={() => onToggle(todo.id)}
        className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer group"
        role="button"
        aria-expanded={isExpanded}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            onToggle(todo.id)
          }
        }}
      >
        {/* Checkbox icon */}
        {todo.completed ? (
          <CheckSquare className="w-5 h-5 text-green-600 flex-shrink-0" />
        ) : (
          <Square className="w-5 h-5 text-gray-400 flex-shrink-0 group-hover:text-[#0080A3]" />
        )}

        {/* Todo text */}
        <span className={`flex-1 text-sm ${todo.completed ? 'text-gray-500 line-through' : 'text-gray-900'}`}>
          {todo.actionNumber ? `${todo.actionNumber}. ${todo.text}` : todo.text}
        </span>

        {todo.isUnacceptablePrimary === true && (
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-800 border border-red-200 flex-shrink-0">
            Prioritaire
          </span>
        )}
        {todo.isUnacceptablePrimary === false && (
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 border border-gray-200 flex-shrink-0">
            Également requis
          </span>
        )}

        {/* Points malus récupérable — aligné questionnaire (pas de forfait) */}
        {!todo.completed && p > 0 ? (
          <span
            className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 text-xs font-semibold rounded-full flex-shrink-0"
            title={DECLARATION_PROOF_FLOW_COPY.todoPointsToRecoverTitle}
          >
            <TrendingUp className="w-3 h-3" aria-hidden />
            +{p} pt à récupérer
          </span>
        ) : null}
        {todo.completed && e > 0 ? (
          <span
            className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-600 text-white text-xs font-semibold rounded-full flex-shrink-0"
            title={DECLARATION_PROOF_FLOW_COPY.todoPointsRecoveredTitle}
          >
            <Check className="w-3 h-3" aria-hidden />
            +{e} pt récupérés
          </span>
        ) : null}
        {todo.completed && e === 0 && p === 0 ? (
          <span
            className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 text-slate-800 text-xs font-semibold rounded-full border border-slate-200 flex-shrink-0"
            title={DECLARATION_PROOF_FLOW_COPY.todoValidatedBadge}
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" aria-hidden />
            {DECLARATION_PROOF_FLOW_COPY.todoValidatedBadge}
          </span>
        ) : null}
        {todo.completed && e === 0 && p > 0 ? (
          <span
            className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 text-amber-900 text-xs font-semibold rounded-full border border-amber-200 flex-shrink-0"
            title={DECLARATION_PROOF_FLOW_COPY.todoPointsToRecoverTitle}
          >
            <TrendingUp className="w-3 h-3" aria-hidden />
            +{p} pt à récupérer
          </span>
        ) : null}

        {/* Chevron icon */}
        <ChevronDown
          className={`w-5 h-5 text-gray-400 flex-shrink-0 group-hover:text-[#0080A3] transition-transform duration-300 ${
            isExpanded ? 'rotate-180' : ''
          }`}
        />
      </div>

      {/* Expandable content */}
      <div
        className="overflow-hidden transition-all duration-300 ease-in-out"
        style={{
          maxHeight: isExpanded ? '400px' : '0',
          opacity: isExpanded ? 1 : 0
        }}
      >
        <div className="pl-8 pr-3 pb-3 space-y-4">
          {/* Explanation text */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-900">
              {getDocumentExplanation(todo.docType)}
            </p>
            <p className="text-xs text-blue-900/85 mt-3 leading-relaxed border-t border-blue-200/80 pt-3">
              {DECLARATION_PROOF_FLOW_COPY.todoActionHint}
            </p>
          </div>

          {/* Status indicator */}
          <div className="flex items-center gap-2">
            {todo.completed ? (
              <>
                <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
                <span className="text-sm font-medium text-green-600">
                  Document complété
                </span>
              </>
            ) : null}
          </div>

          {/* CTA Button */}
          <button
            onClick={() => onActionClick(todo.useCaseId)}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[#0080A3] text-white font-medium rounded-lg hover:bg-[#006280] transition-colors"
          >
            {todo.completed ? 'Voir le document' : 'Compléter le document'}
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  )
}
