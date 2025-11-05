'use client'

import { useMemo } from 'react'

interface ScoreCircleProps {
  averageScore: number | null
  loading?: boolean
  evaluatedCount?: number
  totalCount?: number
  className?: string
}

export default function ScoreCircle({ 
  averageScore, 
  loading = false, 
  evaluatedCount = 0, 
  totalCount = 0,
  className = '' 
}: ScoreCircleProps) {
  
  const getScoreColor = (score: number) => {
    if (score >= 75) return '#22c55e' // Vert
    if (score >= 55) return '#f59e0b' // Amber/Jaune
    if (score >= 40) return '#f97316' // Orange
    return '#ef4444' // Rouge
  }

  const getScoreColorClass = (score: number) => {
    if (score >= 75) return 'text-green-600'
    if (score >= 55) return 'text-amber-600'
    if (score >= 40) return 'text-orange-600'
    return 'text-red-600'
  }

  const circleData = useMemo(() => {
    if (!averageScore) return null
    
    const radius = 70
    const circumference = 2 * Math.PI * radius
    const strokeDasharray = circumference
    const strokeDashoffset = circumference - (averageScore / 100) * circumference
    
    return {
      radius,
      circumference,
      strokeDasharray,
      strokeDashoffset,
      color: getScoreColor(averageScore),
      colorClass: getScoreColorClass(averageScore)
    }
  }, [averageScore])

  if (loading) {
    return (
      <div className={`flex flex-col items-center justify-center p-6 ${className}`}>
        <div className="relative">
          <svg width="160" height="160" viewBox="0 0 160 160">
            <circle
              cx="80"
              cy="80"
              r="70"
              fill="none"
              stroke="#e5e7eb"
              strokeWidth="8"
              className="animate-pulse"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-400"></div>
          </div>
        </div>
        <div className="mt-4 text-center">
          <p className="text-sm text-gray-500 animate-pulse">Chargement...</p>
        </div>
      </div>
    )
  }

  if (!circleData || averageScore === null) {
    return (
      <div className={`flex flex-col items-center justify-center p-6 ${className}`}>
        <div className="relative">
          <svg width="160" height="160" viewBox="0 0 160 160">
            <circle
              cx="80"
              cy="80"
              r="70"
              fill="none"
              stroke="#e5e7eb"
              strokeWidth="8"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="text-4xl font-bold text-gray-400">-</div>
            <div className="text-sm text-gray-400">%</div>
          </div>
        </div>
        <div className="mt-4 text-center">
          <h3 className="text-lg font-semibold text-gray-900 mb-1">Score IA Act</h3>
          <p className="text-sm text-gray-500">Aucun cas d'usage évalué</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`flex flex-col items-center justify-center p-6 ${className}`}>
      <div className="relative">
        <svg width="160" height="160" viewBox="0 0 160 160" className="transform -rotate-90">
          {/* Circle de fond */}
          <circle
            cx="80"
            cy="80"
            r="70"
            fill="none"
            stroke="#f3f4f6"
            strokeWidth="8"
          />
          {/* Circle de progression */}
          <circle
            cx="80"
            cy="80"
            r="70"
            fill="none"
            stroke={circleData.color}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circleData.strokeDasharray}
            strokeDashoffset={circleData.strokeDashoffset}
            style={{
              transition: 'stroke-dashoffset 0.8s ease-in-out, stroke 0.3s ease'
            }}
          />
        </svg>
        {/* Contenu au centre */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className={`flex items-baseline ${circleData.colorClass} font-bold`}>
            <span className="text-4xl">{Math.round(averageScore)}</span>
            <span className="text-lg ml-1">%</span>
          </div>
        </div>
      </div>
      
      <div className="mt-4 text-center">
        <h3 className="text-lg font-semibold text-gray-900 mb-1">Score IA Act de l'entreprise</h3>
        <p className="text-sm text-gray-600">
          {evaluatedCount > 0 ? (
            <>
              {evaluatedCount} cas d'usage évalué{evaluatedCount > 1 ? 's' : ''}
            </>
          ) : (
            'Aucun cas d\'usage évalué'
          )}
        </p>
      </div>
    </div>
  )
}