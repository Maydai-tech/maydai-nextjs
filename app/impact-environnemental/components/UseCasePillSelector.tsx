'use client'

import type { UseCaseDefinition, UseCaseId } from '@/lib/impact-environnemental'

interface UseCasePillSelectorProps {
  useCases: UseCaseDefinition[]
  value: UseCaseId
  onChange: (id: UseCaseId) => void
}

export default function UseCasePillSelector({
  useCases,
  value,
  onChange,
}: UseCasePillSelectorProps) {
  return (
    <div
      role="group"
      aria-label="Définissez votre cas d'usage"
      className="flex flex-row overflow-x-auto sm:flex-wrap gap-2 pb-2 sm:pb-0"
    >
      {useCases.map((useCase) => {
        const isActive = value === useCase.id
        return (
          <button
            key={useCase.id}
            type="button"
            aria-pressed={isActive}
            onClick={() => onChange(useCase.id)}
            className={`shrink-0 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0080A3] focus-visible:ring-offset-1 ${
              isActive
                ? 'bg-[#0080A3] text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <span className="flex flex-col items-center justify-center py-2 px-4">
              <span className="text-sm font-medium">{useCase.label}</span>
              <span
                className={`text-xs font-normal mt-0.5 ${
                  isActive ? 'text-white/80' : 'text-slate-500'
                }`}
              >
                {useCase.tokenHint}
              </span>
            </span>
          </button>
        )
      })}
    </div>
  )
}
