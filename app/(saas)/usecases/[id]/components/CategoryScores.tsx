'use client'

import React from 'react'
import Image from 'next/image'
import { useUseCaseScore } from '../hooks/useUseCaseScore'
import { RISK_CATEGORIES } from '../utils/risk-categories'
import { AlertCircle, Info, AlertTriangle } from 'lucide-react'
import { getScoreStyle } from '@/lib/score-styles'
import {
  isClassificationImpossible,
  V3_IMPOSSIBLE_MATURITY_SCORES_DISCLAIMER,
} from '@/lib/classification-risk-display'

interface CategoryScoresProps {
  usecaseId: string
  /** Depuis le use case (DB) : recadrage scores si qualification V3 impossible */
  classificationStatus?: string | null
}

export const CategoryScores = React.memo(function CategoryScores({
  usecaseId,
  classificationStatus = null,
}: CategoryScoresProps) {
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

  const impossible = isClassificationImpossible(classificationStatus)

  // Score 0 = éliminatoire affiché comme tel, sauf si la qualification réglementaire est « impossible »
  const isUnacceptableRisk = score.score === 0 && !impossible

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

  // Score "Risque Cas d'Usage" calculé par reverse engineering (pour affichage)
  const riskUseCase = score.risk_use_case
  const globalScorePercent = score.max_score > 0 ? Math.round((score.score / score.max_score) * 100) : 0

  return (
    <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Scores par principes</h3>

      {impossible && (
        <div
          className="mb-4 p-3 rounded-lg border border-violet-200 bg-violet-50 text-sm text-violet-900 leading-relaxed"
          role="status"
        >
          {V3_IMPOSSIBLE_MATURITY_SCORES_DISCLAIMER}
        </div>
      )}
      
      <div className="space-y-4">
        {sortedCategoryScores.map((category) => {
            const categoryInfo = RISK_CATEGORIES[category.category_id]
            const scoreColors = getScoreColor(category.percentage)
            const isNotEvaluated = category.evaluation_status === 'not_evaluated'
            
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
                    <span className={`text-sm font-bold ${isNotEvaluated ? 'text-gray-500' : scoreColors.text}`}>
                      {isNotEvaluated ? 'Non évalué' : `${category.percentage}/100`}
                    </span>
                  </div>
                </div>
                
                {isNotEvaluated ? (
                  <p className="text-xs text-gray-500">
                    Aucune question du parcours ne porte sur ce principe pour ce cas d&apos;usage.
                  </p>
                ) : (
                  <>
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div
                        className={`h-2.5 rounded-full transition-all duration-500 ${scoreColors.bg}`}
                        style={{ width: `${Math.max(category.percentage, 2)}%` }}
                      ></div>
                    </div>
                    {category.percentage < 60 && category.category_id !== 'technical_robustness' && category.category_id !== 'privacy_data' && (
                      <p className="text-xs text-gray-600 italic">
                        {categoryInfo?.description}
                      </p>
                    )}
                  </>
                )}
              </div>
            )
          })}
      </div>

      {/* Section Score risques (Risque Cas d'Usage) */}
      {riskUseCase != null && (
        <div className="mt-6 pt-4 border-t border-gray-200">
          <h3 className={`text-lg font-semibold text-gray-900 ${impossible ? 'mb-1' : 'mb-4'}`}>
            Indicateur risque (questionnaire)
          </h3>
          {impossible && (
            <p className="text-xs text-gray-600 mb-3">
              Synthèse des risques déclarés au questionnaire — distinct du niveau IA Act juridiquement qualifié.
            </p>
          )}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Image
                  src="/icons/risk.png"
                  alt="Risque cas d'usage"
                  width={20}
                  height={20}
                  className="w-5 h-5"
                />
                <span className="text-sm font-medium text-gray-900">
                  Score risque du cas d&apos;usage (réponses)
                </span>
              </div>
              <span className={`text-sm font-bold ${getScoreColor(riskUseCase.percentage).text}`}>
                {Math.round(riskUseCase.percentage)}/100
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div
                className={`h-2.5 rounded-full transition-all duration-500 ${getScoreColor(riskUseCase.percentage).bg}`}
                style={{ width: `${Math.max(riskUseCase.percentage, 2)}%` }}
              ></div>
            </div>
            <p className="text-xs text-gray-600 italic">
              Agrégat des risques identifiés dans le questionnaire (pas un niveau AI Act)
            </p>
          </div>
        </div>
      )}

      {/* Total Global - Mise en avant : résultat de l'addition des scores ci-dessus */}
      <div className="mt-6 pt-5 border-t-2 border-[#0080A3]/30 bg-gray-50/80 rounded-b-xl -mx-1 px-4 pb-4 -mb-1">
        <h3 className="text-base font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <Image
            src="/icons/evaluation.png"
            alt="Total Global"
            width={24}
            height={24}
            className="w-6 h-6"
          />
          Total Global
        </h3>
        <div className="flex items-baseline justify-between gap-3 mb-2">
          <p className="text-xs text-gray-600 italic flex-1">
            {impossible
              ? 'Total indicatif (maturité / conformité) — sans qualification réglementaire AI Act tant que la classification est impossible.'
              : 'Ensemble Scores principes + Score risques + Model LLM'}
          </p>
          <span className={`text-xl font-bold shrink-0 ${getScoreColor(globalScorePercent).text}`}>
            {globalScorePercent}/100
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3.5">
          <div
            className={`h-3.5 rounded-full transition-all duration-500 ${getScoreColor(globalScorePercent).bg}`}
            style={{ width: `${Math.max(globalScorePercent, 2)}%` }}
          ></div>
        </div>
      </div>
    </div>
  )
}) 