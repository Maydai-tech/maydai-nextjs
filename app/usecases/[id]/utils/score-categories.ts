import { ScoreCategory } from '../types/usecase'

// Score ≥ 75 : Vert foncé #0080a3 — Bon
// Score ≥ 50 : Vert clair #c6eef8 — Moyen
// Score ≥ 30 : Orange (orange) — Faible
// Score < 30 : Rouge (red) — Critique
export const getScoreCategory = (score: number): ScoreCategory => {
  if (score >= 75) {
    return {
      category: 'Bon',
      color: 'text-[#0080a3] bg-[#0080a3]/10 border border-[#0080a3]/20',
      description: 'Bonne conformité, quelques points d\'amélioration',
      icon: '🟢'
    }
  } else if (score >= 50) {
    return {
      category: 'Moyen',
      color: 'text-[#0080a3] bg-[#c6eef8] border border-[#c6eef8]',
      description: 'Conformité moyenne, améliorations nécessaires',
      icon: '🟡'
    }
  } else if (score >= 30) {
    return {
      category: 'Faible',
      color: 'text-orange-800 bg-orange-50 border border-orange-200',
      description: 'Conformité faible, risques élevés',
      icon: '🟠'
    }
  } else {
    return {
      category: 'Critique',
      color: 'text-red-800 bg-red-50 border border-red-200',
      description: 'Conformité critique, action immédiate requise',
      icon: '🔴'
    }
  }
}

export const getScoreColor = (score: number): string => {
  const category = getScoreCategory(score)
  return category.color
}

export const getScorePercentage = (score: number, maxScore: number = 100): number => {
  return Math.round((score / maxScore) * 100)
}

export const getScoreRecommendations = (score: number, breakdown: any[]): string[] => {
  const recommendations: string[] = []
  
  if (score < 55) {
    recommendations.push('Révision urgente du système requise')
  }
  
  if (score < 75) {
    recommendations.push('Améliorer les processus de conformité')
  }
  
  // Recommandations basées sur les impacts négatifs les plus importants
  const negativeImpacts = breakdown
    .filter(item => item.score_impact < 0)
    .sort((a, b) => a.score_impact - b.score_impact)
    .slice(0, 3)
  
  for (const impact of negativeImpacts) {
    if (impact.score_impact <= -15) {
      recommendations.push(`Priorité haute: ${impact.question_text}`)
    } else if (impact.score_impact <= -5) {
      recommendations.push(`À améliorer: ${impact.question_text}`)
    }
  }
  
  return recommendations
} 