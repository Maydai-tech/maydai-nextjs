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
 * 
 * Score ≥ 75 : Vert foncé #0080a3 — Bon
 *   Fond : bg-[#c6eef8]
 *   Texte : text-[#0080a3]
 *   Indicateur : bg-[#0080a3]
 * 
 * Score ≥ 50 : Vert clair #c6eef8 — Moyen
 *   Fond : bg-[#0080a3]/10 (10% d'opacité)
 *   Texte : text-[#0080a3]
 *   Indicateur : bg-[#c6eef8]
 * 
 * Score ≥ 30 : Orange (orange) — Faible
 * Score < 30 : Rouge (red) — Critique
 */
export const getScoreStyle = (score: number): ScoreStyle => {
  if (score >= 75) {
    return {
      bg: 'bg-[#c6eef8]',
      text: 'text-[#0080a3]',
      border: 'border-[#c6eef8]',
      accent: 'text-[#0080a3]',
      indicator: 'bg-[#0080a3]',
      shadow: 'shadow-[#c6eef8]/20'
    }
  } else if (score >= 50) {
    return {
      bg: 'bg-[#0080a3]/10',
      text: 'text-[#0080a3]',
      border: 'border-[#0080a3]/20',
      accent: 'text-[#0080a3]',
      indicator: 'bg-[#c6eef8]',
      shadow: 'shadow-[#0080a3]/20'
    }
  } else if (score >= 30) {
    return {
      bg: 'bg-orange-50',
      text: 'text-orange-800',
      border: 'border-orange-200',
      accent: 'text-orange-600',
      indicator: 'bg-orange-500',
      shadow: 'shadow-orange-100'
    }
  } else {
    return {
      bg: 'bg-red-50',
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
  // Retourne des gradients simplifiés valides pour les cartes compactes
  if (score >= 75) {
    return {
      bg: 'bg-[#c6eef8]',
      text: 'text-[#0080a3]',
      border: 'border-[#c6eef8]',
      accent: 'text-[#0080a3]',
      indicator: 'bg-[#0080a3]',
      shadow: ''
    }
  } else if (score >= 50) {
    return {
      bg: 'bg-[#0080a3]/10',
      text: 'text-[#0080a3]',
      border: 'border-[#0080a3]/20',
      accent: 'text-[#0080a3]',
      indicator: 'bg-[#c6eef8]',
      shadow: ''
    }
  } else if (score >= 30) {
    return {
      bg: 'bg-orange-50',
      text: 'text-orange-800',
      border: 'border-orange-200',
      accent: 'text-orange-600',
      indicator: 'bg-orange-500',
      shadow: ''
    }
  } else {
    return {
      bg: 'bg-red-50',
      text: 'text-red-800',
      border: 'border-red-200',
      accent: 'text-red-600',
      indicator: 'bg-red-500',
      shadow: ''
    }
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
  if (score >= 75) {
    return {
      category: 'Bon',
      description: 'Bonne conformité, quelques points d\'amélioration',
      icon: '🟢'
    }
  } else if (score >= 50) {
    return {
      category: 'Moyen',
      description: 'Conformité moyenne, améliorations nécessaires',
      icon: '🟡'
    }
  } else if (score >= 30) {
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
