'use client'

import React, { useState } from 'react'
import { UseCase } from '../../types/usecase'
import { useQuestionnaireResponses } from '@/lib/hooks/useQuestionnaireResponses'
import { useUseCaseScore } from '../../hooks/useUseCaseScore'
import { ChevronDown, ChevronUp, Bug, X } from 'lucide-react'

interface EvaluationDebuggerProps {
  useCase: UseCase
}

export const EvaluationDebugger = React.memo(function EvaluationDebugger({ useCase }: EvaluationDebuggerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const { formattedAnswers, loading: loadingResponses } = useQuestionnaireResponses(useCase.id)
  const { score, loading: loadingScore } = useUseCaseScore(useCase.id)

  if (!isOpen) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg shadow-lg hover:bg-red-700 transition-colors"
        >
          <Bug className="h-4 w-4 mr-2" />
          Debug Évaluation
        </button>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <Bug className="h-5 w-5 mr-2 text-red-600" />
            Debug Évaluation - {useCase.name}
          </h3>
          <button
            onClick={() => setIsOpen(false)}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto max-h-[70vh] space-y-6">
          {/* Status général */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-2">Status général</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">UseCase ID:</span> {useCase.id}
              </div>
              <div>
                <span className="text-gray-600">Status:</span> {useCase.status}
              </div>
              <div>
                <span className="text-gray-600">Loading Responses:</span> {loadingResponses ? 'true' : 'false'}
              </div>
              <div>
                <span className="text-gray-600">Loading Score:</span> {loadingScore ? 'true' : 'false'}
              </div>
              <div>
                <span className="text-gray-600">Formatted Answers Count:</span> {Object.keys(formattedAnswers || {}).length}
              </div>
              <div>
                <span className="text-gray-600">Score Available:</span> {score ? 'true' : 'false'}
              </div>
            </div>
          </div>

          {/* Réponses formatées */}
          <div className="bg-blue-50 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-2">Réponses formatées</h4>
            <div className="bg-white rounded p-3 max-h-48 overflow-y-auto">
              <pre className="text-xs text-gray-700 whitespace-pre-wrap">
                {JSON.stringify(formattedAnswers, null, 2)}
              </pre>
            </div>
          </div>

          {/* Score détaillé */}
          {score && (
            <div className="bg-green-50 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">Score calculé</h4>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-gray-600">Score:</span> {score.score}/100 (score déjà en pourcentage)
                </div>
                <div>
                  <span className="text-gray-600">Breakdown Count:</span> {score.score_breakdown?.length || 0}
                </div>
                <div>
                  <span className="text-gray-600">Category Scores:</span> {score.category_scores?.length || 0}
                </div>
              </div>
              
              {score.score_breakdown && score.score_breakdown.length > 0 && (
                <div className="mt-4">
                  <h5 className="font-medium text-gray-900 mb-2">Détail des impacts</h5>
                  <div className="bg-white rounded p-3 max-h-48 overflow-y-auto">
                    <div className="space-y-2">
                      {score.score_breakdown.map((item, index) => (
                        <div key={index} className="border-b border-gray-200 pb-2">
                          <div className="font-medium text-sm">{item.question_id}</div>
                          <div className="text-xs text-gray-600">{item.reasoning}</div>
                          <div className="text-xs">
                            <span className="text-gray-600">Impact:</span> 
                            <span className={`ml-1 ${item.score_impact > 0 ? 'text-green-600' : item.score_impact < 0 ? 'text-red-600' : 'text-gray-600'}`}>
                              {item.score_impact > 0 ? '+' : ''}{item.score_impact}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Détails des scores par réponse */}
          {score && score.score_breakdown && score.score_breakdown.length > 0 && (
            <div className="bg-purple-50 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-3">Détails des scores par réponse</h4>
              <div className="bg-white rounded p-3 max-h-96 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-white border-b border-gray-200">
                    <tr>
                      <th className="text-left py-2 px-2 font-medium text-gray-900">Question</th>
                      <th className="text-left py-2 px-2 font-medium text-gray-900">Réponse</th>
                      <th className="text-center py-2 px-2 font-medium text-gray-900">Score</th>
                      <th className="text-left py-2 px-2 font-medium text-gray-900">Catégorie</th>
                      <th className="text-left py-2 px-2 font-medium text-gray-900">Impacts par catégorie</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {score.score_breakdown.map((item, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="py-2 px-2">
                          <div>
                            <div className="font-medium text-xs text-gray-900">{item.question_id}</div>
                            <div className="text-xs text-gray-600 mt-1">{item.question_text}</div>
                          </div>
                        </td>
                        <td className="py-2 px-2">
                          <div className="text-xs text-gray-700">
                            {typeof item.answer_value === 'object' 
                              ? JSON.stringify(item.answer_value, null, 2)
                              : item.answer_value || 'N/A'}
                          </div>
                        </td>
                        <td className="py-2 px-2 text-center">
                          <span className={`inline-flex items-center justify-center px-2 py-1 rounded-full text-xs font-medium ${
                            item.score_impact > 0 
                              ? 'bg-green-100 text-green-800' 
                              : item.score_impact < 0 
                              ? 'bg-red-100 text-red-800' 
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {item.score_impact > 0 ? '+' : ''}{item.score_impact}
                          </span>
                        </td>
                        <td className="py-2 px-2">
                          <span className="text-xs text-gray-600">
                            {item.risk_category || 'N/A'}
                          </span>
                        </td>
                        <td className="py-2 px-2">
                          {item.category_impacts && Object.keys(item.category_impacts).length > 0 ? (
                            <div className="space-y-1">
                              {Object.entries(item.category_impacts).map(([category, impact]) => (
                                <div key={category} className="flex items-center justify-between text-xs">
                                  <span className="text-gray-600">{category}:</span>
                                  <span className={`ml-2 font-medium ${
                                    impact > 0 ? 'text-green-600' : impact < 0 ? 'text-red-600' : 'text-gray-600'
                                  }`}>
                                    {impact > 0 ? '+' : ''}{impact}
                                  </span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400">-</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {/* Résumé par catégorie */}
              {score.category_scores && score.category_scores.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <h5 className="font-medium text-gray-900 mb-2 text-sm">Résumé par catégorie</h5>
                  <div className="grid grid-cols-2 gap-2">
                    {score.category_scores.map((category, index) => (
                      <div key={index} className="bg-gray-50 rounded p-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-gray-700">{category.category_name}</span>
                          <span className="text-xs text-gray-600">
                            {category.score}/{category.max_score} ({category.percentage.toFixed(0)}%)
                          </span>
                        </div>
                        <div className="mt-1 w-full bg-gray-200 rounded-full h-1.5">
                          <div 
                            className="h-1.5 rounded-full" 
                            style={{
                              backgroundColor: category.color,
                              width: `${category.percentage}%`
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Diagnostics */}
          <div className="bg-yellow-50 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-2">Diagnostics</h4>
            <div className="space-y-2 text-sm">
              {Object.keys(formattedAnswers || {}).length === 0 && (
                <div className="text-red-600">⚠️ Aucune réponse formatée trouvée</div>
              )}
              {loadingResponses && (
                <div className="text-blue-600">🔄 Chargement des réponses en cours...</div>
              )}
              {!score && !loadingScore && (
                <div className="text-orange-600">⚠️ Score non disponible</div>
              )}
              {score && score.score_breakdown && score.score_breakdown.length === 0 && (
                <div className="text-yellow-600">⚠️ Aucun impact dans le breakdown</div>
              )}
              {!loadingResponses && !loadingScore && Object.keys(formattedAnswers || {}).length > 0 && score && (
                <div className="text-green-600">✅ Données chargées correctement</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
})