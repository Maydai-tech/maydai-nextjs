'use client'

import { TrendingUp, X } from 'lucide-react'
import { useEffect } from 'react'

interface ScoreEvolutionPopupProps {
  previousScore: number | null
  newScore: number | null
  pointsGained: number
  reason?: string
  onClose: () => void
  autoCloseDelay?: number // in milliseconds, default 5000
}

export default function ScoreEvolutionPopup({
  previousScore,
  newScore,
  pointsGained,
  reason,
  onClose,
  autoCloseDelay = 5000
}: ScoreEvolutionPopupProps) {
  // Auto-close after delay
  useEffect(() => {
    if (autoCloseDelay > 0) {
      const timer = setTimeout(() => {
        onClose()
      }, autoCloseDelay)
      return () => clearTimeout(timer)
    }
  }, [autoCloseDelay, onClose])

  const isPositive = pointsGained > 0

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md transform transition-all duration-200 scale-100 relative">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="Fermer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center">
          {/* Icon */}
          <div className={`w-16 h-16 ${isPositive ? 'bg-green-100' : 'bg-blue-100'} rounded-full flex items-center justify-center mx-auto mb-6`}>
            <TrendingUp className={`w-8 h-8 ${isPositive ? 'text-green-600' : 'text-blue-600'}`} />
          </div>

          {/* Title */}
          <h3 className="text-2xl font-bold text-gray-900 mb-4">
            Score mis a jour !
          </h3>

          {/* Score display */}
          <div className="flex items-center justify-center gap-4 mb-6">
            {/* Previous score */}
            <div className="text-center">
              <div className="text-sm text-gray-500 mb-1">Avant</div>
              <div className="text-2xl font-bold text-gray-400">
                {previousScore !== null ? Math.round(previousScore) : '-'}
              </div>
            </div>

            {/* Arrow */}
            <div className="text-gray-400 text-2xl">
              &rarr;
            </div>

            {/* New score */}
            <div className="text-center">
              <div className="text-sm text-gray-500 mb-1">Maintenant</div>
              <div className={`text-3xl font-bold ${isPositive ? 'text-green-600' : 'text-blue-600'}`}>
                {newScore !== null ? Math.round(newScore) : '-'}
              </div>
            </div>
          </div>

          {/* Points gained badge */}
          <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full ${isPositive ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'} font-semibold mb-4`}>
            <TrendingUp className="w-4 h-4" />
            {isPositive ? '+' : ''}{Math.round(pointsGained)} points
          </div>

          {/* Reason */}
          {reason && (
            <p className="text-gray-600 mb-6 leading-relaxed">
              {reason}
            </p>
          )}

          {/* Close button */}
          <button
            onClick={onClose}
            className="w-full px-6 py-3 bg-[#0080A3] text-white hover:bg-[#006d8a] rounded-xl font-semibold transition-all duration-200 flex items-center justify-center gap-2 shadow-lg"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  )
}
