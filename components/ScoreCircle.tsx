'use client'

import { useMemo } from 'react'

interface ScoreCircleProps {
  averageScore: number | null
  loading?: boolean
  evaluatedCount?: number
  totalCount?: number
  activeAverageScore?: number | null
  activeEvaluatedCount?: number
  className?: string
}

export default function ScoreCircle({ 
  averageScore, 
  loading = false, 
  evaluatedCount = 0, 
  totalCount = 0,
  activeAverageScore = null,
  activeEvaluatedCount = 0,
  className = '' 
}: ScoreCircleProps) {
  
  // Score ≥ 75 : Vert foncé #0080a3 — Bon
  // Score ≥ 50 : Vert clair #c6eef8 — Moyen
  // Score ≥ 30 : Orange (orange) — Faible
  // Score < 30 : Rouge (red) — Critique
  const getScoreColor = (score: number) => {
    if (score >= 75) return '#0080a3' // Vert foncé
    if (score >= 50) return '#c6eef8' // Vert clair
    if (score >= 30) return '#f97316' // Orange
    return '#ef4444' // Rouge
  }

  const getScoreColorClass = (score: number) => {
    if (score >= 75) return 'text-[#0080a3]' // Vert foncé
    if (score >= 50) return 'text-[#0080a3]' // Vert foncé pour contraste
    if (score >= 30) return 'text-orange-600' // Orange
    return 'text-red-600' // Rouge
  }

  type CircleData = {
    radius: number
    circumference: number
    strokeDasharray: number
    strokeDashoffset: number
    color: string
    colorClass: string
  } | null

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

  const activeCircleData = useMemo(() => {
    if (!activeAverageScore) return null
    
    const radius = 70
    const circumference = 2 * Math.PI * radius
    const strokeDasharray = circumference
    const strokeDashoffset = circumference - (activeAverageScore / 100) * circumference
    
    return {
      radius,
      circumference,
      strokeDasharray,
      strokeDashoffset,
      color: getScoreColor(activeAverageScore),
      colorClass: getScoreColorClass(activeAverageScore)
    }
  }, [activeAverageScore])

  // Helper function to render a circle
  const renderCircle = (
    score: number | null,
    circleData: CircleData,
    label: string,
    count: number,
    countLabel: string
  ) => {
    if (!circleData || score === null) {
      return (
        <div className="flex flex-col items-center">
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
            <p className="text-sm text-gray-600">{label}</p>
            <p className="text-sm text-gray-500 mt-1">Aucun cas d'usage {countLabel}</p>
          </div>
        </div>
      )
    }

    return (
      <div className="flex flex-col items-center">
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
              <span className="text-4xl">{Math.round(score)}</span>
              <span className="text-lg ml-1">%</span>
            </div>
          </div>
        </div>
        <div className="mt-4 text-center">
          <p className="text-sm text-gray-600">
            {count > 0 ? (
              <>
                {count} cas d'usage {countLabel}
              </>
            ) : (
              `Aucun cas d'usage ${countLabel}`
            )}
          </p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className={`p-6 ${className}`}>
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Scores IA Act du registre</h3>
        <div className="flex flex-col md:flex-row gap-8 justify-center items-center">
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
        </div>
      </div>
    )
  }

  return (
    <div className={`p-6 ${className}`}>
      {/* Titre en haut à gauche */}
      <h3 className="text-lg font-semibold text-gray-900 mb-6">Scores IA Act du registre</h3>
      
      {/* Deux cercles côte à côte */}
      <div className="flex flex-col md:flex-row gap-8 justify-center items-start">
        {/* Cercle 1 : Score global */}
        {renderCircle(
          averageScore,
          circleData,
          '',
          evaluatedCount,
          'évalué' + (evaluatedCount > 1 ? 's' : '')
        )}
        
        {/* Cercle 2 : Score actifs */}
        {renderCircle(
          activeAverageScore,
          activeCircleData,
          '',
          activeEvaluatedCount,
          'actif' + (activeEvaluatedCount > 1 ? 's' : '')
        )}
      </div>
    </div>
  )
}