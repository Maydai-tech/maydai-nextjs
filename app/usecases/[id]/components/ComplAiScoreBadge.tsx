import React, { useState, useEffect } from 'react'
import { ComplAIModel } from '@/lib/supabase'
import { supabase } from '@/lib/supabase'
import { TrendingUp, AlertCircle } from 'lucide-react'

interface ComplAiScoreBadgeProps {
  model: Pick<ComplAIModel, 'id' | 'model_name' | 'model_provider'> & Partial<Pick<ComplAIModel, 'model_type' | 'version' | 'created_at' | 'updated_at'>>
  className?: string
  size?: 'sm' | 'md'
}

export const ComplAiScoreBadge: React.FC<ComplAiScoreBadgeProps> = ({
  model,
  className = '',
  size = 'sm'
}) => {
  const [score, setScore] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchModelScore()
  }, [model.id])

  const fetchModelScore = async () => {
    try {
      setLoading(true)
      setError(null)

      // Récupérer toutes les évaluations pour ce modèle
      const { data: evaluations, error: evaluationsError } = await supabase
        .from('compl_ai_evaluations')
        .select('score')
        .eq('model_id', model.id)
        .not('score', 'is', null)

      if (evaluationsError) {
        throw evaluationsError
      }

      if (!evaluations || evaluations.length === 0) {
        setScore(null)
        return
      }

      // Calculer la moyenne des scores
      const totalScore = evaluations.reduce((sum, evaluation) => sum + (evaluation.score || 0), 0)
      const averageScore = totalScore / evaluations.length
      
      setScore(averageScore)
    } catch (err) {
      console.error('Error fetching COMPL-AI score:', err)
      setError(err instanceof Error ? err.message : 'Error fetching score')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className={`inline-flex items-center gap-1 ${className}`}>
        <div className={`${size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'} bg-gray-200 rounded animate-pulse`} />
        <div className={`${size === 'sm' ? 'w-8 h-3' : 'w-10 h-4'} bg-gray-200 rounded animate-pulse`} />
      </div>
    )
  }

  if (error || score === null) {
    return (
      <div className={`inline-flex items-center gap-1 text-gray-400 ${className}`}>
        <AlertCircle className={size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'} />
        <span className={`${size === 'sm' ? 'text-xs' : 'text-sm'} font-medium`}>
          N/A
        </span>
      </div>
    )
  }

  const scorePercentage = Math.round(score * 100)
  
  // Score ≥ 75 : Vert foncé #0080a3 — Bon
  // Score ≥ 50 : Vert clair #c6eef8 — Moyen
  // Score ≥ 30 : Orange (orange) — Faible
  // Score < 30 : Rouge (red) — Critique
  // Note: score est en décimal (0.75 = 75%)
  const getScoreColor = (score: number) => {
    if (score >= 0.75) return 'text-white bg-[#0080a3]'
    if (score >= 0.50) return 'text-[#0080a3] bg-[#c6eef8]'
    if (score >= 0.30) return 'text-orange-800 bg-orange-100'
    return 'text-red-800 bg-red-100'
  }

  const colorClass = getScoreColor(score)

  return (
    <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full ${colorClass} ${className}`}>
      <TrendingUp className={size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'} />
      <span className={`${size === 'sm' ? 'text-xs' : 'text-sm'} font-medium`}>
        {scorePercentage}%
      </span>
    </div>
  )
}

export default ComplAiScoreBadge