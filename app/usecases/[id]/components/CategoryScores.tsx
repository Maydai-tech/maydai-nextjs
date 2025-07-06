'use client'

import React from 'react'
import { useUseCaseScore } from '../hooks/useUseCaseScore'
import { RISK_CATEGORIES, QUESTION_RISK_CATEGORY_MAPPING } from '../utils/risk-categories'
import { AlertCircle, Info } from 'lucide-react'

interface CategoryScoresProps {
  usecaseId: string
}

export const CategoryScores = React.memo(function CategoryScores({ usecaseId }: CategoryScoresProps) {
  const { score, loading, error } = useUseCaseScore(usecaseId)

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Scores par Catégorie</h3>
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
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Scores par Catégorie</h3>
        <div className="text-center py-4">
          <Info className="h-8 w-8 text-gray-400 mx-auto mb-3" />
          <p className="text-sm text-gray-600">
            Les scores par catégorie seront disponibles après avoir complété le questionnaire.
          </p>
        </div>
      </div>
    )
  }

  // Si pas de category_scores (ancien score), on les calcule à partir du breakdown
  let categoryScores = score.category_scores || []
  
  if (categoryScores.length === 0 && score.score_breakdown && score.score_breakdown.length > 0) {
    console.log('Calculating category scores from breakdown for backward compatibility')
    
    // Regrouper les impacts par catégorie
    const categoryData: Record<string, { totalImpact: number, questionCount: number }> = {}
    
    Object.keys(RISK_CATEGORIES).forEach(categoryId => {
      categoryData[categoryId] = { totalImpact: 0, questionCount: 0 }
    })
    
    score.score_breakdown.forEach(item => {
      const categoryId = item.risk_category || QUESTION_RISK_CATEGORY_MAPPING[item.question_id]
      if (categoryId && categoryData[categoryId]) {
        categoryData[categoryId].totalImpact += item.score_impact
        categoryData[categoryId].questionCount += 1
      }
    })
    
    // Créer les category scores
    categoryScores = Object.entries(RISK_CATEGORIES).map(([categoryId, category]) => {
      const data = categoryData[categoryId]
      const baseScore = 100 // Toutes les catégories ont le même score de base
      const adjustedScore = Math.max(0, baseScore + data.totalImpact)
      
      return {
        category_id: categoryId,
        category_name: category.shortName,
        score: adjustedScore,
        max_score: baseScore,
        percentage: Math.round((adjustedScore / baseScore) * 100),
        question_count: data.questionCount,
        color: category.color,
        icon: category.icon
      }
    })
  }

  if (categoryScores.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Scores par Catégorie</h3>
        <div className="text-center py-4">
          <Info className="h-8 w-8 text-gray-400 mx-auto mb-3" />
          <p className="text-sm text-gray-600">
            Les scores par catégorie seront disponibles après avoir complété le questionnaire.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Scores par Catégorie</h3>
      
      <div className="space-y-4">
        {categoryScores
          .filter(cat => cat.question_count > 0) // Afficher seulement les catégories avec des questions
          .sort((a, b) => b.percentage - a.percentage) // Trier par pourcentage décroissant
          .map((category) => {
            const percentage = Math.round((category.score / category.max_score) * 100)
            const categoryInfo = RISK_CATEGORIES[category.category_id]
            
            return (
              <div key={category.category_id} className="space-y-2">
                {/* En-tête de catégorie */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-base">{categoryInfo?.icon || '📊'}</span>
                    <span className="text-sm font-medium text-gray-900">
                      {categoryInfo?.shortName || category.category_name}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-bold text-gray-900">
                      {percentage}/100
                    </span>
                  </div>
                </div>
                
                {/* Barre de progression */}
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div
                    className={`h-2.5 rounded-full transition-all duration-500 ${
                      percentage >= 80 
                        ? 'bg-green-500' 
                        : percentage >= 60 
                        ? 'bg-yellow-500' 
                        : percentage >= 40
                        ? 'bg-orange-500'
                        : 'bg-red-500'
                    }`}
                    style={{ width: `${Math.max(percentage, 2)}%` }}
                  ></div>
                </div>
                
                {/* Description optionnelle pour les scores faibles */}
                {percentage < 60 && (
                  <p className="text-xs text-gray-600 italic">
                    {categoryInfo?.description}
                  </p>
                )}
              </div>
            )
          })}
      </div>
      
      {/* Légende */}
      <div className="mt-4 pt-3 border-t border-gray-200">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>Score global: {score.score}/{score.max_score}</span>
          <span>{Math.round((score.score / score.max_score) * 100)}/100</span>
        </div>
      </div>
    </div>
  )
}) 