'use client'

const STEPS = [
  { id: 1, label: 'Profil' },
  { id: 2, label: 'Brouillon' },
  { id: 3, label: 'Évaluation' },
] as const

interface ChatFlowStepperProps {
  current: 1 | 2 | 3
}

export default function ChatFlowStepper({ current }: ChatFlowStepperProps) {
  return (
    <ol className="mb-6 flex items-center justify-center gap-1 sm:gap-2" aria-label="Parcours Chat IA">
      {STEPS.map((step, index) => {
        const isCurrent = step.id === current
        const isDone = step.id < current
        return (
          <li key={step.id} className="flex items-center gap-1 sm:gap-2">
            {index > 0 ? (
              <span className="h-px w-4 bg-gray-200 sm:w-8" aria-hidden />
            ) : null}
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium sm:px-3 ${
                isCurrent
                  ? 'bg-[#0080A3] text-white'
                  : isDone
                    ? 'bg-[#0080A3]/10 text-[#006280]'
                    : 'bg-gray-100 text-gray-500'
              }`}
            >
              <span aria-hidden>{step.id}</span>
              <span>{step.label}</span>
              {isCurrent ? <span className="sr-only">(étape en cours)</span> : null}
            </span>
          </li>
        )
      })}
    </ol>
  )
}
