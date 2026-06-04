'use client'

import { CheckCircle2 } from 'lucide-react'

interface ProfileCompletenessScoreProps {
  score: number
  isLoading?: boolean
  onHighlightRequest: () => void
}

const SIZE = 80
const STROKE_WIDTH = 8
const CENTER = SIZE / 2
const RADIUS = CENTER - STROKE_WIDTH / 2 - 1
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

export default function ProfileCompletenessScore({
  score,
  isLoading = false,
  onHighlightRequest,
}: ProfileCompletenessScoreProps) {
  const clampedScore = Math.min(100, Math.max(0, Math.round(score)))
  const strokeDashoffset = CIRCUMFERENCE - (clampedScore / 100) * CIRCUMFERENCE

  if (isLoading) {
    return (
      <aside
        className="flex flex-col items-center font-sans w-full sm:w-auto sm:min-w-[140px]"
        aria-busy="true"
        aria-label="Chargement du score de complétude du profil"
      >
        <h3 className="text-sm font-medium text-gray-700 mb-4 self-start w-full">
          Complétude du profil
        </h3>
        <div
          className="w-20 h-20 rounded-full bg-gray-200 animate-pulse"
          aria-hidden="true"
        />
      </aside>
    )
  }

  return (
    <aside className="font-sans w-full sm:w-auto sm:min-w-[140px]">
      <div
        className="flex flex-col items-center"
        aria-live="polite"
      >
        <h3 className="text-sm font-medium text-gray-700 mb-4 self-start w-full">
          Complétude du profil
        </h3>

        <div className="relative w-20 h-20">
          <svg
            width={SIZE}
            height={SIZE}
            viewBox={`0 0 ${SIZE} ${SIZE}`}
            className="-rotate-90"
            role="progressbar"
            aria-valuenow={clampedScore}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Complétude du profil : ${clampedScore} pour cent`}
          >
            <circle
              cx={CENTER}
              cy={CENTER}
              r={RADIUS}
              fill="none"
              className="stroke-[#F5E6C2]"
              strokeWidth={STROKE_WIDTH}
            />
            <circle
              cx={CENTER}
              cy={CENTER}
              r={RADIUS}
              fill="none"
              className="stroke-[#0080A3] transition-all duration-500 ease-out"
              strokeWidth={STROKE_WIDTH}
              strokeLinecap="round"
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={strokeDashoffset}
            />
          </svg>
          <span className="font-mono text-lg font-semibold text-gray-900 absolute inset-0 flex items-center justify-center pointer-events-none">
            {clampedScore}%
          </span>
        </div>

        {clampedScore === 100 ? (
          <div className="mt-4 flex items-center justify-center gap-1.5 text-emerald-600 animate-in fade-in zoom-in duration-500">
            <CheckCircle2 aria-hidden="true" size={16} />
            <span className="text-xs font-medium">Profil optimal</span>
          </div>
        ) : (
          <button
            type="button"
            onClick={onHighlightRequest}
            className="mt-4 text-xs text-[#0080A3] underline hover:text-opacity-80 transition-colors focus-visible:ring-2 focus-visible:ring-[#0080A3] focus-visible:outline-none rounded px-1 py-0.5"
            aria-controls="profile-form"
          >
            Comment améliorer mon score ?
          </button>
        )}
      </div>
    </aside>
  )
}
