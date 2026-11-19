'use client'

import type { ClosedFieldOption } from '../../../types'
import Tooltip from '@/components/Tooltip'

interface SingleSelectStepProps {
  options: string[] | ClosedFieldOption[]
  value: string
  onSelect: (value: string) => void
  error?: string
  columns?: 1 | 2
}

export default function SingleSelectStep({
  options,
  value,
  onSelect,
  error,
  columns = 1,
}: SingleSelectStepProps) {
  const isStringOptions = options.length > 0 && typeof options[0] === 'string'

  return (
    <div className="space-y-2">
      <div className={`grid gap-2 ${columns === 2 ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'}`}>
        {options.map((option, index) => {
          const label = isStringOptions ? (option as string) : (option as ClosedFieldOption).label
          const closedOption = isStringOptions ? null : (option as ClosedFieldOption)
          const isSelected = value === label

          return (
            <div
              key={index}
              role="button"
              tabIndex={0}
              onClick={() => onSelect(label)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(label) } }}
              className={`flex items-start gap-3 p-3 border-2 rounded-xl text-left transition-all duration-200 cursor-pointer ${
                isSelected
                  ? 'border-[#0080A3] bg-[#0080A3]/5'
                  : 'border-gray-200 hover:border-[#0080A3]/50 hover:bg-gray-50'
              }`}
            >
              <div className={`flex-shrink-0 w-4 h-4 mt-0.5 rounded-full border-2 flex items-center justify-center ${
                isSelected ? 'border-[#0080A3]' : 'border-gray-300'
              }`}>
                {isSelected && (
                  <div className="w-2 h-2 rounded-full bg-[#0080A3]" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium text-gray-900">{label}</span>
                  {closedOption?.tooltip && (
                    <Tooltip
                      title={closedOption.tooltip.title}
                      shortContent={closedOption.tooltip.shortContent}
                      fullContent={closedOption.tooltip.fullContent}
                      icon={closedOption.tooltip.icon}
                      type="answer"
                      position="auto"
                    />
                  )}
                </div>
                {closedOption?.examples && closedOption.examples.length > 0 && (
                  <p className="text-xs text-gray-500 mt-0.5">
                    Ex : {closedOption.examples.join(', ')}
                  </p>
                )}
              </div>
            </div>
          )
        })}
      </div>
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  )
}
