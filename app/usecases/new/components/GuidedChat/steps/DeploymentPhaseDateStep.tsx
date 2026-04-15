'use client'

import { useId } from 'react'
import { Send, SkipForward } from 'lucide-react'
import {
  DEPLOYMENT_PHASE_OPTIONS,
  getDeploymentDateFieldLabel,
} from '@/lib/deployment-status'

interface DeploymentPhaseDateStepProps {
  phaseValue: string
  dateValue: string
  onPhaseChange: (phase: string) => void
  onDateChange: (date: string) => void
  onSubmit: () => void
  onSkip?: () => void
  error?: string
}

export default function DeploymentPhaseDateStep({
  phaseValue,
  dateValue,
  onPhaseChange,
  onDateChange,
  onSubmit,
  onSkip,
  error,
}: DeploymentPhaseDateStepProps) {
  const phaseHeadingId = useId()

  const canSubmit = Boolean(phaseValue.trim() && dateValue.trim())

  return (
    <div className="space-y-4">
      <p
        id={phaseHeadingId}
        className="text-sm font-medium text-gray-900"
      >
        Où en est le déploiement de ce système IA ?
      </p>
      <div
        role="radiogroup"
        aria-labelledby={phaseHeadingId}
        className="grid grid-cols-1 gap-2"
      >
        {DEPLOYMENT_PHASE_OPTIONS.map((option) => (
          <label
            key={option}
            className={`flex cursor-pointer items-start gap-3 rounded-xl border-2 p-3 transition-colors ${
              phaseValue === option
                ? 'border-[#0080A3] bg-[#0080A3]/5'
                : 'border-gray-200 hover:border-[#0080A3]/60'
            }`}
          >
            <input
              type="radio"
              name="guided-deployment-phase"
              value={option}
              checked={phaseValue === option}
              onChange={() => onPhaseChange(option)}
              className="mt-0.5 h-4 w-4 shrink-0 border-gray-300 text-[#0080A3] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0080A3] focus:ring-offset-0"
            />
            <span className="text-sm text-gray-900">{option}</span>
          </label>
        ))}
      </div>

      <div>
        <label
          htmlFor="guided-deployment-date"
          className="mb-1 block text-xs font-medium text-gray-700"
        >
          {getDeploymentDateFieldLabel(phaseValue)}
        </label>
        <div
          className={`flex items-center gap-2 rounded-xl border-2 bg-white px-3 py-2 ${
            error ? 'border-red-300' : 'border-gray-200'
          }`}
        >
          <input
            id="guided-deployment-date"
            type="date"
            value={dateValue}
            onChange={(e) => onDateChange(e.target.value)}
            className="min-h-[2.5rem] flex-1 border-0 bg-transparent text-sm text-gray-900 outline-none focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0080A3] focus-visible:ring-offset-2 rounded"
          />
          <button
            type="button"
            onClick={onSubmit}
            disabled={!canSubmit}
            className="flex-shrink-0 rounded-lg bg-[#0080A3] p-1.5 text-white transition-colors hover:bg-[#006280] disabled:cursor-not-allowed disabled:opacity-30"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-400">Format date : calendrier (AAAA-MM-JJ)</p>
        {onSkip && (
          <button
            type="button"
            onClick={onSkip}
            className="flex items-center gap-1 text-xs text-gray-400 transition-colors hover:text-[#0080A3]"
          >
            <SkipForward className="h-3 w-3" />
            Passer
          </button>
        )}
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}
