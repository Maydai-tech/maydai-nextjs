'use client'

import React, { useState } from 'react'
import { useUseCaseScore } from '../hooks/useUseCaseScore'
import { getScoreCategory, getScoreStyle } from '@/lib/score-styles'
import { getScoreRecommendations } from '../utils/score-categories'
import { RISK_CATEGORIES } from '../utils/risk-categories'
import { ChevronDown, ChevronUp, AlertCircle, CheckCircle, Info } from 'lucide-react'
import ComplAiScoreDisplay from './ComplAiScoreDisplay'

interface UseCaseScoreProps {
  usecaseId: string
}

export const UseCaseScore = React.memo(function UseCaseScore({ usecaseId }: UseCaseScoreProps) {
  const { score, loading, error } = useUseCaseScore(usecaseId)
  const [showBreakdown, setShowBreakdown] = useState(false)

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-16 bg-gray-200 rounded mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg border border-red-200 p-6">
        <div className="flex items-center space-x-3">
          <AlertCircle className="h-5 w-5 text-red-500" />
          <div>
            <h3 className="font-medium text-red-900">Erreur de calcul du score</h3>
            <p className="text-sm text-red-700 mt-1">{error}</p>
          </div>
        </div>
      </div>
    )
  }

  if (!score) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="text-center">
          <Info className="h-8 w-8 text-gray-400 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Score non disponible</h3>
          <p className="text-sm text-gray-600">
            Le score sera calculé une fois que vous aurez répondu au questionnaire.
          </p>
        </div>
      </div>
    )
  }

  const category = getScoreCategory(score.score)
  const recommendations = getScoreRecommendations(score.score, score.score_breakdown)

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">Score de Conformité</h3>
      </div>

      {/* Score Display */}
      <div className="p-6">
        <div className={`p-4 rounded-lg ${getScoreStyle(score.score).bg} ${getScoreStyle(score.score).border} border ${getScoreStyle(score.score).shadow} shadow-sm mb-4`}>
          <div className="flex items-center space-x-3">
            <span className="text-2xl">{category.icon}</span>
            <div>
              <div className="text-2xl font-bold">{score.score}/{score.max_score}</div>
              <div className="text-sm font-medium">{category.category}</div>
            </div>
          </div>
        </div>

        <p className="text-sm text-gray-600 mb-4">{category.description}</p>

        {/* COMPL-AI Score Bonus */}
        {score.compl_ai_bonus && score.compl_ai_bonus > 0 && (
          <ComplAiScoreDisplay
            score={score.compl_ai_score ?? null}
            bonus={score.compl_ai_bonus}
            modelInfo={score.model_info ?? null}
            className="mb-4"
          />
        )}

        {/* Recommendations */}
        {recommendations.length > 0 && (
          <div className="mb-4">
            <h4 className="text-sm font-medium text-gray-900 mb-2">Recommandations</h4>
            <ul className="space-y-1">
              {recommendations.slice(0, 3).map((rec, index) => (
                <li key={index} className="text-sm text-gray-600 flex items-start">
                  <span className="text-yellow-500 mr-2 mt-0.5">•</span>
                  {rec}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Toggle Breakdown */}
        {score.score_breakdown.length > 0 && (
          <button
            onClick={() => setShowBreakdown(!showBreakdown)}
            className="w-full flex items-center justify-between p-3 text-sm font-medium text-gray-700 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <span>Détails des impacts sur le score</span>
            {showBreakdown ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </button>
        )}
      </div>

      {/* Breakdown Details */}
      {showBreakdown && score.score_breakdown.length > 0 && (
        <div className="border-t border-gray-200 p-6 bg-gray-50">
          <h4 className="text-sm font-medium text-gray-900 mb-4">Détails des impacts</h4>
          
          {/* Scores par catégorie calculés */}
          {score.category_scores && score.category_scores.length > 0 && (
            <div className="mb-6">
              <h5 className="text-sm font-medium text-gray-700 mb-3">Scores par catégorie de risque</h5>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                {score.category_scores
                  .filter(cat => cat.question_count > 0)
                  .sort((a, b) => b.percentage - a.percentage)
                  .map((category) => (
                    <div key={category.category_id} className="bg-white rounded-lg p-3 border border-gray-200">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm">{category.icon}</span>
                          <span className="text-sm font-medium text-gray-900">
                            {category.category_name}
                          </span>
                        </div>
                        <div className="text-sm font-bold text-gray-900">
                          {category.score}/{category.max_score}
                        </div>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${
                            category.percentage >= 80 
                              ? 'bg-green-500' 
                              : category.percentage >= 60 
                              ? 'bg-yellow-500' 
                              : category.percentage >= 40
                              ? 'bg-orange-500'
                              : 'bg-red-500'
                          }`}
                          style={{ width: `${Math.max(category.percentage, 2)}%` }}
                        ></div>
                      </div>
                      <div className="flex justify-between text-xs text-gray-500 mt-1">
                        <span>{category.question_count} question{category.question_count > 1 ? 's' : ''}</span>
                        <span>{category.percentage}%</span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Détails par question */}
          <div className="space-y-3">
            <h5 className="text-sm font-medium text-gray-700">Détails par question</h5>
            {score.score_breakdown.map((item, index) => (
              <div key={index} className="py-3 border-b border-gray-200 last:border-b-0">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 pr-4">
                    <p className="text-sm font-medium text-gray-900 mb-1">
                      {item.question_id} - {item.question_text}
                    </p>
                    {item.risk_category && (
                      <span className="inline-block px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full mb-1">
                        {item.risk_category}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    {item.score_impact > 0 ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : item.score_impact < 0 ? (
                      <AlertCircle className="h-4 w-4 text-red-500" />
                    ) : (
                      <div className="h-4 w-4 rounded-full bg-gray-300" />
                    )}
                    <span className={`text-sm font-medium ${
                      item.score_impact > 0 ? 'text-green-600' : 
                      item.score_impact < 0 ? 'text-red-600' : 'text-gray-600'
                    }`}>
                      {item.score_impact > 0 ? '+' : ''}{item.score_impact} points
                    </span>
                  </div>
                </div>
                <div className="bg-white rounded-md p-3 border border-gray-100">
                  <p className="text-xs text-gray-600 mb-1">
                    <span className="font-medium">Réponse donnée:</span>
                  </p>
                  <p className="text-sm text-gray-800 mb-2">
                    {typeof item.answer_value === 'string' ? (
                      item.answer_value
                    ) : Array.isArray(item.answer_value) ? (
                      item.answer_value.join(', ')
                    ) : item.answer_value?.selected ? (
                      <>
                        {item.answer_value.selected}
                        {item.answer_value.conditionalValues && Object.keys(item.answer_value.conditionalValues).length > 0 && (
                          <div className="mt-1 text-xs text-gray-600">
                            <span className="font-medium">Détails:</span> {Object.entries(item.answer_value.conditionalValues).map(([key, value]) => `${key}: ${value}`).join(', ')}
                          </div>
                        )}
                      </>
                    ) : (
                      JSON.stringify(item.answer_value)
                    )}
                  </p>
                  
                  {/* Impacts par catégorie */}
                  {item.category_impacts && Object.keys(item.category_impacts).length > 0 && (
                    <div className="mt-2 mb-2">
                      <p className="text-xs text-gray-600 mb-1">
                        <span className="font-medium">Impacts par catégorie:</span>
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {Object.entries(item.category_impacts).map(([categoryId, impact]) => {
                          const category = RISK_CATEGORIES[categoryId]
                          if (!category || impact === 0) return null
                          
                          return (
                            <span
                              key={categoryId}
                              className={`inline-flex items-center px-2 py-1 text-xs rounded-full ${
                                impact > 0 
                                  ? 'bg-green-100 text-green-800 border border-green-200' 
                                  : 'bg-red-100 text-red-800 border border-red-200'
                              }`}
                            >
                              <span className="mr-1">{category.icon}</span>
                              {category.shortName}: {impact > 0 ? '+' : ''}{impact}
                            </span>
                          )
                        })}
                      </div>
                    </div>
                  )}
                  
                  <p className="text-xs text-gray-600">
                    <span className="font-medium">Calcul:</span> {item.reasoning}
                  </p>
                </div>
              </div>
            ))}
          </div>
          
          <div className="mt-4 pt-3 border-t border-gray-200">
            <p className="text-xs text-gray-500">
              Score calculé en temps réel
            </p>
          </div>
        </div>
      )}
    </div>
  )
}) 