import { ScoreCategory } from '../types/usecase'

export const getScoreCategory = (score: number): ScoreCategory => {
  if (score >= 75) {
    return {
      category: 'Bon',
      color: 'text-green-700 bg-green-50 border border-green-200',
      description: 'Bonne conformité, quelques points d\'amélioration',
      icon: '🟢'
    }
  } else if (score >= 55) {
    return {
      category: 'Moyen',
      color: 'text-yellow-700 bg-yellow-50 border border-yellow-200',
      description: 'Conformité moyenne, améliorations nécessaires',
      icon: '🟡'
    }
  } else if (score >= 40) {
    return {
      category: 'Faible',
      color: 'text-orange-700 bg-orange-50 border border-orange-200',
      description: 'Conformité faible, risques élevés',
      icon: '🟠'
    }
  } else {
    return {
      category: 'Critique',
      color: 'text-red-700 bg-red-50 border border-red-200',
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