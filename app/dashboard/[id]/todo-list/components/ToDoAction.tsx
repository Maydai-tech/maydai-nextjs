'use client'

import { CheckSquare, Square, ChevronRight, ChevronDown, AlertTriangle, CheckCircle2, TrendingUp } from 'lucide-react'
import { getDocumentExplanation, type DocumentType } from '../utils/todo-helpers'

interface TodoItem {
  id: string
  text: string
  completed: boolean
  useCaseId: string
  docType: DocumentType
}

interface ToDoActionProps {
  todo: TodoItem
  isExpanded: boolean
  onToggle: (todoId: string) => void
  onActionClick: (useCaseId: string) => void
  potentialPoints?: number // Points that can be gained by completing this action
}

export default function ToDoAction({
  todo,
  isExpanded,
  onToggle,
  onActionClick,
  potentialPoints
}: ToDoActionProps) {
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
          {todo.text}
        </span>

        {/* Points badge - only shown when action can gain points */}
        {potentialPoints && potentialPoints > 0 && !todo.completed && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 text-xs font-semibold rounded-full flex-shrink-0">
            <TrendingUp className="w-3 h-3" />
            +{potentialPoints} pts
          </span>
        )}

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
