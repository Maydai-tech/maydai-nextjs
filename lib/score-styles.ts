/**
 * Utilitaires pour les styles de score unifiés dans toute l'application
 */

export interface ScoreStyle {
  bg: string
  text: string
  border: string
  accent: string
  indicator: string
  shadow: string
}

/**
 * Détermine le style de score basé sur la valeur du score
 * Règles unifiées pour toutes les cartes de score dans l'application
 */
export const getScoreStyle = (score: number): ScoreStyle => {
  if (score >= 80) {
    return {
      bg: 'bg-gradient-to-br from-green-50 via-emerald-50 to-green-100',
      text: 'text-green-800',
      border: 'border-green-200',
      accent: 'text-green-600',
      indicator: 'bg-green-500',
      shadow: 'shadow-green-100'
    }
  } else if (score >= 60) {
    return {
      bg: 'bg-gradient-to-br from-yellow-50 via-amber-50 to-yellow-100',
      text: 'text-yellow-800',
      border: 'border-yellow-200',
      accent: 'text-yellow-600',
      indicator: 'bg-yellow-500',
      shadow: 'shadow-yellow-100'
    }
  } else if (score >= 40) {
    return {
      bg: 'bg-gradient-to-br from-orange-50 via-amber-50 to-orange-100',
      text: 'text-orange-800',
      border: 'border-orange-200',
      accent: 'text-orange-600',
      indicator: 'bg-orange-500',
      shadow: 'shadow-orange-100'
    }
  } else {
    return {
      bg: 'bg-gradient-to-br from-red-50 via-rose-50 to-red-100',
      text: 'text-red-800',
      border: 'border-red-200',
      accent: 'text-red-600',
      indicator: 'bg-red-500',
      shadow: 'shadow-red-100'
    }
  }
}

/**
 * Styles pour les cartes compactes (dashboard)
 */
export const getCompactScoreStyle = (score: number): ScoreStyle => {
  const baseStyle = getScoreStyle(score)
  
  // Version simplifiée pour les cartes compactes
  return {
    ...baseStyle,
    bg: baseStyle.bg.replace('gradient-to-br', 'gradient-to-r').replace('via-', '').replace(' to-', ''),
    shadow: '' // Pas d'ombre pour les cartes compactes
  }
}

/**
 * Styles pour les états spéciaux
 */
export const getSpecialScoreStyles = () => ({
  eliminated: {
    bg: 'bg-red-100',
    text: 'text-red-700',
    border: 'border-red-200',
    accent: 'text-red-600',
    indicator: 'bg-red-500',
    shadow: ''
  },
  notAvailable: {
    bg: 'bg-gray-50',
    text: 'text-gray-700',
    border: 'border-gray-200',
    accent: 'text-gray-600',
    indicator: 'bg-gray-400',
    shadow: ''
  },
  loading: {
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    border: 'border-blue-200',
    accent: 'text-blue-600',
    indicator: 'bg-blue-500',
    shadow: ''
  }
})

/**
 * Catégorie de score avec description
 */
export interface ScoreCategory {
  category: string
  description: string
  icon: string
}

export const getScoreCategory = (score: number): ScoreCategory => {
  if (score >= 80) {
    return {
      category: 'Excellent',
      description: 'Conformité excellente, risques minimaux',
      icon: '🟢'
    }
  } else if (score >= 60) {
    return {
      category: 'Moyen',
      description: 'Conformité moyenne, améliorations nécessaires',
      icon: '🟡'
    }
  } else if (score >= 40) {
    return {
      category: 'Faible',
      description: 'Conformité faible, risques élevés',
      icon: '🟠'
    }
  } else {
    return {
      category: 'Critique',
      description: 'Conformité critique, action immédiate requise',
      icon: '🔴'
    }
  }
}
