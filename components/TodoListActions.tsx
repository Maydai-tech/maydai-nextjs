'use client'

import { CheckCircle, Clock, AlertCircle } from 'lucide-react'
import { UseCaseNextSteps } from '@/lib/supabase'

interface TodoListActionsProps {
  nextSteps: UseCaseNextSteps
}

export default function TodoListActions({ nextSteps }: TodoListActionsProps) {
  const getActionTypeIcon = (type: string) => {
    switch (type) {
      case 'priorite':
        return <AlertCircle className="h-4 w-4 text-red-500" />
      case 'quick_win':
        return <Clock className="h-4 w-4 text-green-500" />
      case 'action':
        return <CheckCircle className="h-4 w-4 text-blue-500" />
      default:
        return <CheckCircle className="h-4 w-4 text-gray-500" />
    }
  }

  const getActionTypeColor = (type: string) => {
    switch (type) {
      case 'priorite':
        return 'border-l-red-500 bg-red-50'
      case 'quick_win':
        return 'border-l-green-500 bg-green-50'
      case 'action':
        return 'border-l-blue-500 bg-blue-50'
      default:
        return 'border-l-gray-500 bg-gray-50'
    }
  }

  const getActionTypeLabel = (type: string) => {
    switch (type) {
      case 'priorite':
        return 'Priorités réglementaires'
      case 'quick_win':
        return 'Quick Wins'
      case 'action':
        return 'Actions à moyen terme'
      default:
        return 'Actions'
    }
  }

  const renderActionsList = () => {
    const actions = [
      { type: 'priorite', items: [nextSteps.priorite_1, nextSteps.priorite_2, nextSteps.priorite_3] },
      { type: 'quick_win', items: [nextSteps.quick_win_1, nextSteps.quick_win_2, nextSteps.quick_win_3] },
      { type: 'action', items: [nextSteps.action_1, nextSteps.action_2, nextSteps.action_3] }
    ]

    return (
      <div className="space-y-6">
        {actions.map((actionGroup, groupIndex) => {
          const validItems = actionGroup.items.filter(item => item && item.trim())
          if (validItems.length === 0) return null

          return (
            <div key={groupIndex} className="space-y-3">
              <div className="flex items-center space-x-2 mb-3">
                {getActionTypeIcon(actionGroup.type)}
                <h4 className="font-semibold text-sm text-gray-800">
                  {getActionTypeLabel(actionGroup.type)}
                </h4>
                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                  {validItems.length} action{validItems.length > 1 ? 's' : ''}
                </span>
              </div>
              <div className="space-y-2">
                {validItems.map((item, itemIndex) => (
                  <div
                    key={itemIndex}
                    className={`border-l-4 p-4 rounded-r-lg ${getActionTypeColor(actionGroup.type)} hover:shadow-sm transition-shadow`}
                  >
                    <div className="flex items-start space-x-3">
                      <input
                        type="checkbox"
                        className="mt-1 h-4 w-4 text-[#0080A3] border-gray-300 rounded focus:ring-[#0080A3] focus:ring-2"
                        disabled
                        title="Le suivi des actions sera bientôt disponible"
                      />
                      <div className="flex-1">
                        <span className="text-sm text-gray-700 leading-relaxed block">
                          {item}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div className="mt-6 pt-6 border-t border-gray-200">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-lg font-semibold text-gray-900">
          Actions recommandées
        </h4>
        <div className="text-xs text-gray-500 bg-blue-50 px-2 py-1 rounded-full">
          En cours de développement
        </div>
      </div>
      {renderActionsList()}
    </div>
  )
}

