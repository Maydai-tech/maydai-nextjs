'use client'

import React from 'react'
import Image from 'next/image'
import { useUseCaseScore } from '../hooks/useUseCaseScore'
import { RISK_CATEGORIES } from '../utils/risk-categories'
import { AlertCircle, Info, AlertTriangle } from 'lucide-react'
import { getScoreStyle } from '@/lib/score-styles'

interface CategoryScoresProps {
  usecaseId: string
}

export const CategoryScores = React.memo(function CategoryScores({ usecaseId }: CategoryScoresProps) {
  const { score, loading, error } = useUseCaseScore(usecaseId)

  // Utilise les styles unifiés de l'application
  const getScoreColor = (percentage: number) => {
    const style = getScoreStyle(percentage)
    return {
      text: style.accent,
      bg: style.indicator,
      border: style.border
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Scores par principes</h3>
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="flex items-center justify-between mb-2">
                <div className="h-4 bg-gray-200 rounded w-32"></div>
                <div className="h-4 bg-gray-200 rounded w-12"></div>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2"></div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6">
        <div className="flex items-center space-x-3">
          <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
          <div>
            <h3 className="font-medium text-red-900">Erreur</h3>
            <p className="text-sm text-red-700 mt-1">Impossible de charger les scores</p>
          </div>
        </div>
      </div>
    )
  }

  if (!score) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Scores par principes</h3>
        <div className="text-center py-4">
          <Info className="h-8 w-8 text-gray-400 mx-auto mb-3" />
          <p className="text-sm text-gray-600">
            Les scores par catégorie seront disponibles après avoir complété le questionnaire.
          </p>
        </div>
      </div>
    )
  }

  // Vérifier si le cas d'usage est en risque inacceptable (score global = 0)
  const isUnacceptableRisk = score.score === 0

  if (isUnacceptableRisk) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Scores par principes</h3>
        <div className="text-center py-6">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-sm text-red-700 font-medium">
            Votre cas d'usage présente un niveau de risque inacceptable. Les scores détaillés par principes ne sont pas disponibles dans cette situation.
          </p>
        </div>
      </div>
    )
  }

  // Si pas de category_scores (ancien score), on les calcule à partir du breakdown
  // Utiliser directement les scores calculés par score-calculator.ts
  const categoryScores = score.category_scores || []

  if (categoryScores.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Scores par principes</h3>
        <div className="text-center py-4">
          <Info className="h-8 w-8 text-gray-400 mx-auto mb-3" />
          <p className="text-sm text-gray-600">
            Les scores par catégorie seront disponibles après avoir complété le questionnaire.
          </p>
        </div>
      </div>
    )
  }

  // Définir l'ordre spécifique des catégories
  const categoryOrder = [
    'risk_level',
    'human_agency',
    'technical_robustness',
    'privacy_data',
    'transparency',
    'diversity_fairness',
    'social_environmental'
  ]

  // Trier les catégories selon l'ordre spécifié et filtrer les catégories non désirées
  const sortedCategoryScores = [...categoryScores]
    .filter(category => 
      category.category_id !== 'risk_level' && 
      category.category_id !== 'prohibited_practices'
    )
    .sort((a, b) => {
      const indexA = categoryOrder.indexOf(a.category_id)
      const indexB = categoryOrder.indexOf(b.category_id)
      
      // Si une catégorie n'est pas dans l'ordre, la mettre à la fin
      if (indexA === -1) return 1
      if (indexB === -1) return -1
      
      return indexA - indexB
    })

  return (
    <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Scores par principes</h3>
      
      <div className="space-y-4">
        {sortedCategoryScores.map((category) => {
            const categoryInfo = RISK_CATEGORIES[category.category_id]
            const scoreColors = getScoreColor(category.percentage)
            
            return (
              <div key={category.category_id} className="space-y-2">
                {/* En-tête de catégorie */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    {categoryInfo?.icon && categoryInfo.icon.startsWith('/') ? (
                      <Image 
                        src={categoryInfo.icon} 
                        alt={categoryInfo.shortName}
                        width={20}
                        height={20}
                        className="w-5 h-5"
                      />
                    ) : (
                      <span className="text-[#0080A3] text-base">{categoryInfo?.icon || '📊'}</span>
                    )}
                    <span className="text-sm font-medium text-gray-900">
                      {categoryInfo?.shortName || category.category_name}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`text-sm font-bold ${scoreColors.text}`}>
                      {category.percentage}/100
                    </span>
                  </div>
                </div>
                
                {/* Barre de progression avec couleur selon le score */}
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div
                    className={`h-2.5 rounded-full transition-all duration-500 ${scoreColors.bg}`}
                    style={{ width: `${Math.max(category.percentage, 2)}%` }}
                  ></div>
                </div>
                
                {/* Description optionnelle pour les scores faibles - sauf pour technical_robustness */}
                {category.percentage < 60 && category.category_id !== 'technical_robustness' && (
                  <p className="text-xs text-gray-600 italic">
                    {categoryInfo?.description}
                  </p>
                )}
              </div>
            )
          })}
      </div>
      
    </div>
  )
}) 