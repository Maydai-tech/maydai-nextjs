'use client'

import { useMemo, useEffect } from 'react'
import { AlertTriangle, Flame, Settings, ShieldCheck, HelpCircle } from 'lucide-react'

interface UseCase {
  id: string
  risk_level?: string
  name: string
}

interface RiskPyramidProps {
  useCases: UseCase[]
  className?: string
}

interface RiskCategory {
  level: 'unacceptable' | 'high' | 'limited' | 'minimal' | 'undefined'
  label: string
  color: string
  icon: typeof AlertTriangle
  badgeColor: string
}

export default function RiskPyramid({ 
  useCases, 
  className = '' 
}: RiskPyramidProps) {
  
  // Calculer le nombre de cas par catégorie de risque
  const counts = useMemo(() => {
    if (!useCases || useCases.length === 0) {
      return {
        minimal: 0,
        limited: 0,
        high: 0,
        unacceptable: 0,
        undefined: 0
      }
    }

    return {
      minimal: useCases.filter(uc => uc.risk_level?.toLowerCase() === 'minimal').length,
      limited: useCases.filter(uc => uc.risk_level?.toLowerCase() === 'limited').length,
      high: useCases.filter(uc => uc.risk_level?.toLowerCase() === 'high').length,
      unacceptable: useCases.filter(uc => uc.risk_level?.toLowerCase() === 'unacceptable').length,
      undefined: useCases.filter(uc => !uc.risk_level || uc.risk_level.trim() === '').length
    }
  }, [useCases])

  // Logging debug pour identifier les problèmes
  useEffect(() => {
    console.log('🔍 RiskPyramid Debug:', {
      totalUseCases: useCases.length,
      counts,
      undefinedRiskLevel: counts.undefined,
      allRiskLevels: useCases.map(uc => ({
        id: uc.id,
        name: uc.name,
        risk_level: uc.risk_level
      }))
    })
  }, [useCases, counts])

  // Configuration des catégories de risque
  const riskCategories: RiskCategory[] = useMemo(() => [
    {
      level: 'unacceptable',
      label: 'Inacceptable',
      color: '#ef4444',
      icon: AlertTriangle,
      badgeColor: 'bg-red-600'
    },
    {
      level: 'high',
      label: 'Élevé',
      color: '#f97316',
      icon: Flame,
      badgeColor: 'bg-orange-500'
    },
    {
      level: 'limited',
      label: 'Limité',
      color: '#3b82f6',
      icon: Settings,
      badgeColor: 'bg-blue-600'
    },
    {
      level: 'minimal',
      label: 'Minimal',
      color: '#22c55e',
      icon: ShieldCheck,
      badgeColor: 'bg-green-600'
    }
  ], [])

  // Catégorie pour les cas non évalués
  const unevaluatedCategory: RiskCategory = useMemo(() => ({
    level: 'undefined',
    label: 'Non évalué',
    color: '#9ca3af',
    icon: HelpCircle,
    badgeColor: 'bg-gray-400'
  }), [])

  // Total incluant les cas non évalués
  const total = counts.unacceptable + counts.high + counts.limited + counts.minimal + counts.undefined

  // Tous les niveaux à afficher (incluant non évalué si nécessaire)
  const allLevels = useMemo(() => {
    return [...riskCategories, ...(counts.undefined > 0 ? [unevaluatedCategory] : [])]
  }, [riskCategories, unevaluatedCategory, counts.undefined])

  // Fonction helper pour convertir hex en rgba
  const hexToRgba = (hex: string, alpha: number) => {
    const r = parseInt(hex.slice(1, 3), 16)
    const g = parseInt(hex.slice(3, 5), 16)
    const b = parseInt(hex.slice(5, 7), 16)
    return `rgba(${r}, ${g}, ${b}, ${alpha})`
  }

  // Mapping des largeurs pour l'effet pyramide en escalier
  const widthMap: Record<string, string> = {
    'unacceptable': '40%',
    'high': '60%',
    'limited': '80%',
    'minimal': '100%',
    'undefined': '100%' // Même largeur que minimal
  }

  return (
    <div className={`bg-white rounded-lg shadow-sm p-4 md:p-6 max-w-4xl mx-auto ${className}`}>
      {/* Titre */}
      <h3 className="text-lg font-semibold text-gray-900 mb-6">Pyramide des risques</h3>

      {/* Pyramide en escalier avec largeurs progressives */}
      <div className="space-y-3 relative">
        {allLevels.map((category) => {
          const Icon = category.icon
          const count = counts[category.level]
          const width = widthMap[category.level]
          
          return (
            <div key={category.level} className="relative h-12 flex items-center">
              {/* Marche colorée avec largeur variable */}
              <div 
                className="h-full rounded-lg flex items-center gap-2 px-3 transition-all"
                style={{ 
                  backgroundColor: hexToRgba(category.color, 0.15),
                  width: width
                }}
              >
                {/* Icône */}
                <Icon 
                  className="w-5 h-5 flex-shrink-0" 
                  style={{ color: category.color }}
                />
                {/* Label */}
                <span className="text-sm font-medium text-gray-700 truncate">
                  {category.label}
                </span>
              </div>
              
              {/* Badge à position fixe à droite */}
              <div className="absolute right-0 top-1/2 -translate-y-1/2">
                <div 
                  className={`${category.badgeColor} rounded-full w-10 h-10 
                             flex items-center justify-center text-white text-sm font-bold shadow-sm`}
                >
                  {count}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Total en bas */}
      <div className="border-t border-gray-200 mt-6 pt-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-600">Total</span>
          <span className="text-sm font-semibold text-gray-900">{total}</span>
        </div>
      </div>
    </div>
  )
}
