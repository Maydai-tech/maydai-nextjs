'use client'

import { useUseCaseScore } from '../hooks/useUseCaseScore'
import { getScoreCategory } from '@/lib/score-styles'
import { AlertCircle, CheckCircle, Info } from 'lucide-react'

interface CompactScoreProps {
  usecaseId: string
}

export function CompactScore({ usecaseId }: CompactScoreProps) {
  const { score, loading, error } = useUseCaseScore(usecaseId)

  if (loading) {
    return (
      <div className="bg-gray-50 p-4 rounded-lg w-full sm:w-auto">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-16 mb-2"></div>
          <div className="h-6 bg-gray-200 rounded w-12 mb-1"></div>
          <div className="h-3 bg-gray-200 rounded w-20"></div>
        </div>
      </div>
    )
  }

  if (error || !score) {
    return (
      <div className="bg-gray-50 p-4 rounded-lg w-full sm:w-auto">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Score</span>
          <Info className="h-4 w-4 text-gray-400" />
        </div>
        <div className="text-lg font-bold text-gray-400 mb-1">
          --/100
        </div>
        <div className="text-xs text-gray-500">
          Non calculé
        </div>
      </div>
    )
  }

  const category = getScoreCategory(score.score)

  return (
    <div className="bg-gray-50 p-4 rounded-lg w-full sm:w-auto">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-700">Score de Conformité</span>
        <span className="text-lg">{category.icon}</span>
      </div>
      <div className="text-2xl font-bold text-gray-900 mb-1">
        {score.score}%
      </div>
      <div className="text-xs text-gray-600">
        {category.category}
      </div>
    </div>
  )
} 