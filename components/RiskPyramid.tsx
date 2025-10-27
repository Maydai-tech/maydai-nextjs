'use client'

import { useMemo, useEffect } from 'react'

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
  level: 'unacceptable' | 'high' | 'limited' | 'minimal'
  label: string
  color: string
  bgColor: string
  borderColor: string
  textColor: string
  badgeColor: string
  barWidth: string
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

  // Configuration des catégories de risque avec nouvelles largeurs pyramidales
  const riskCategories: RiskCategory[] = [
    {
      level: 'unacceptable',
      label: 'Inacceptable',
      color: '#ef4444',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-300',
      textColor: 'text-red-900',
      badgeColor: 'bg-red-600',
      barWidth: 'w-[50%]'
    },
    {
      level: 'high',
      label: 'Élevé',
      color: '#f97316',
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-300',
      textColor: 'text-orange-900',
      badgeColor: 'bg-orange-500',
      barWidth: 'w-[65%]'
    },
    {
      level: 'limited',
      label: 'Limité',
      color: '#3b82f6',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-300',
      textColor: 'text-blue-900',
      badgeColor: 'bg-blue-600',
      barWidth: 'w-[85%]'
    },
    {
      level: 'minimal',
      label: 'Minimal',
      color: '#22c55e',
      bgColor: 'bg-[#f1fdfa]',
      borderColor: 'border-green-300',
      textColor: 'text-green-900',
      badgeColor: 'bg-green-600',
      barWidth: 'w-full'
    }
  ]

  // Total incluant les cas non évalués
  const total = counts.unacceptable + counts.high + counts.limited + counts.minimal + counts.undefined

  return (
    <div className={`flex flex-col p-6 ${className}`}>
      {/* Titre */}
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Pyramide des risques</h3>
      </div>

      {/* Liste des catégories de risque */}
      <div className="space-y-2">
        {riskCategories.map((category) => {
          const count = counts[category.level]
          
          return (
            <div key={category.level} className="flex items-center gap-3">
              {/* Zone des barres - 75% max du conteneur */}
              <div className="flex-1 max-w-[75%]">
                <div 
                  className={`h-9 rounded ${category.bgColor} ${category.borderColor} border-2 
                              flex items-center transition-all duration-300 ${category.barWidth}`}
                >
                  <span className={`pl-2 text-sm font-semibold ${category.textColor}`}>
                    {category.label}
                  </span>
                </div>
              </div>
              
              {/* Zone des badges - largeur fixe, alignés verticalement, légèrement décalés à droite */}
              <div className="w-12 flex justify-center flex-shrink-0">
                <div className={`${category.badgeColor} rounded-full w-8 h-8 
                                 flex items-center justify-center text-white text-sm font-bold`}>
                  {count}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Affichage des cas non évalués si nécessaire */}
      {counts.undefined > 0 && (
        <div className="flex items-center gap-3 mt-1 opacity-60">
          <div className="flex-1 max-w-[75%]">
            <div className="h-9 rounded bg-gray-50 border-2 border-gray-200 flex items-center">
              <span className="pl-2 text-sm font-semibold text-gray-600">
                Non évalué
              </span>
            </div>
          </div>
          <div className="w-12 flex justify-center flex-shrink-0">
            <div className="bg-gray-400 rounded-full w-8 h-8 flex items-center justify-center text-white text-sm font-bold">
              {counts.undefined}
            </div>
          </div>
        </div>
      )}

      {/* Ligne de séparation en bas - Total aligné à droite sous les badges */}
      <div className="border-t border-gray-200 mt-3 pt-3">
        <div className="flex items-center gap-3">
          {/* Zone gauche */}
          <div className="flex-1 max-w-[75%]">
            <span className="text-sm font-medium text-gray-600">Total</span>
          </div>
          
          {/* Zone droite - alignée avec les badges */}
          <div className="w-12 flex justify-center flex-shrink-0">
            <span className="text-sm font-semibold text-gray-900">{total}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
