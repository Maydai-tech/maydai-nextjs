/**
 * Utilitaires pour la page Bench LLM
 */

import type { BenchLLMModel } from '@/lib/types/bench-llm'

/**
 * Formate une valeur de benchmark
 * Gère les valeurs spéciales NR, ND, NA
 */
export function formatBenchmarkValue(
  value: number | string | null | undefined,
  type: 'rank' | 'cost' | 'percentage' | 'number' | 'date' | 'text'
): string {
  if (value === null || value === undefined) {
    return '-'
  }

  // Gestion des valeurs spéciales
  if (typeof value === 'string') {
    const upperValue = value.toUpperCase()
    if (upperValue === 'NR' || upperValue === 'ND' || upperValue === 'NA') {
      return value
    }
  }

  switch (type) {
    case 'rank':
      return typeof value === 'number' ? value.toString() : (value || '-')
    case 'cost':
      if (typeof value === 'number') {
        return `$${value.toFixed(2)}`
      }
      return typeof value === 'string' ? value : '-'
    case 'percentage':
      if (typeof value === 'number') {
        return `${value.toFixed(1)}%`
      }
      return typeof value === 'string' ? value : '-'
    case 'number':
      if (typeof value === 'number') {
        // Formater les grands nombres avec des espaces
        return value.toLocaleString('fr-FR')
      }
      return typeof value === 'string' ? value : '-'
    case 'date':
      if (typeof value === 'string') {
        try {
          const date = new Date(value)
          return date.toLocaleDateString('fr-FR', { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric' 
          })
        } catch {
          return value
        }
      }
      return typeof value === 'number' ? value.toString() : '-'
    case 'text':
    default:
      return typeof value === 'string' ? value : (typeof value === 'number' ? value.toString() : '-')
  }
}

/**
 * Récupère l'emoji du pays depuis la colonne country
 */
export function getCountryFlag(country?: string | null): string {
  if (!country) return ''
  
  // Si le country contient déjà un emoji, le retourner
  if (/[\u{1F300}-\u{1F9FF}]/u.test(country)) {
    return country
  }
  
  // Mapping des pays vers emojis (si nécessaire)
  const countryMap: Record<string, string> = {
    '🇫🇷': '🇫🇷',
    '🇺🇸': '🇺🇸',
    '🇨🇳': '🇨🇳',
    'France': '🇫🇷',
    'USA': '🇺🇸',
    'US': '🇺🇸',
    'China': '🇨🇳',
  }
  
  return countryMap[country] || country
}

/**
 * Vérifie si un modèle est multimodal
 * Note: Cette fonction retourne false par défaut car model_type n'est pas inclus dans BenchLLMModel
 * Pour une implémentation complète, ajouter model_type au type BenchLLMModel
 */
export function isMultimodal(model: BenchLLMModel): boolean {
  // Pour l'instant, retourner false car model_type n'est pas disponible dans BenchLLMModel
  // TODO: Ajouter model_type au type BenchLLMModel si nécessaire
  return false
}

/**
 * Vérifie si un modèle a un long contexte
 * Un long contexte est généralement > 100k tokens
 */
export function isLongContext(model: BenchLLMModel): boolean {
  return (model.context_length ?? 0) > 100000
}

/**
 * Vérifie si un modèle est "small" (<8B)
 * Basé sur le model_size
 */
export function isSmallModel(model: BenchLLMModel): boolean {
  return model.model_size === 'XS' || model.model_size === 'S'
}

/**
 * Vérifie si un modèle est open source
 */
export function isOpenSource(model: BenchLLMModel): boolean {
  return model.license?.toLowerCase() === 'open'
}

/**
 * Formate le contexte length avec unités
 */
export function formatContextLength(length?: number | null): string {
  if (!length) return '-'
  
  if (length >= 1000000) {
    return `${(length / 1000000).toFixed(1)}M`
  }
  if (length >= 1000) {
    return `${(length / 1000).toFixed(0)}k`
  }
  return length.toString()
}

/**
 * Formate la consommation en Wh
 */
export function formatConsumption(consumption?: number | null): string {
  if (!consumption) return '-'
  return `${consumption.toFixed(2)} Wh`
}

