import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { UseCase } from '../../types/usecase'
import { formatDate } from '../../utils/questionnaire'
import { useCaseRoutes } from '../../utils/routes'
import { Calendar, Clock, CheckCircle, Bug, X } from 'lucide-react'
import { CategoryScores } from '../CategoryScores'
import { useUseCaseScore } from '../../hooks/useUseCaseScore'

interface UseCaseSidebarProps {
  useCase: UseCase
}

export function UseCaseSidebar({ useCase }: UseCaseSidebarProps) {
  const [showDebug, setShowDebug] = useState(false)
  const { score, loading, error } = useUseCaseScore(useCase.id)

  // Persister l'état dans sessionStorage pour éviter la perte lors du re-mount
  useEffect(() => {
    const debugState = sessionStorage.getItem(`debug-modal-${useCase.id}`)
    if (debugState === 'true') {
      setShowDebug(true)
    }
  }, [useCase.id])

  useEffect(() => {
    sessionStorage.setItem(`debug-modal-${useCase.id}`, showDebug.toString())
  }, [showDebug, useCase.id])

  // Gestion des touches clavier
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showDebug) {
        setShowDebug(false)
      }
    }

    if (showDebug) {
      document.addEventListener('keydown', handleKeyDown)
      // Empêcher le scroll du body quand la modal est ouverte
      document.body.style.overflow = 'hidden'
      return () => {
        document.removeEventListener('keydown', handleKeyDown)
        document.body.style.overflow = 'unset'
      }
    }
  }, [showDebug])

  // Nettoyer au démontage
  useEffect(() => {
    return () => {
      if (showDebug) {
        sessionStorage.removeItem(`debug-modal-${useCase.id}`)
      }
    }
  }, [useCase.id, showDebug])

  return (
    <div className="space-y-6">
      {/* Scores par Catégorie */}
      <CategoryScores usecaseId={useCase.id} />

      {/* Debug Modal */}
      {showDebug && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={(e) => {
            // Fermer seulement si on clique sur le backdrop
            if (e.target === e.currentTarget) {
              setShowDebug(false)
            }
          }}
        >
          <div 
            className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Debug - Détails du Scoring</h3>
                <button
                  onClick={() => setShowDebug(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              
              {loading && <div className="text-center py-4">Chargement...</div>}
              {error && <div className="text-red-600 py-4">Erreur: {error}</div>}
              
              {score && (
                <div className="space-y-6">
                  {/* Score global */}
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-semibold mb-2">Score Global</h4>
                    <div className="text-2xl font-bold text-blue-600">
                      {score.score}/{score.max_score} ({Math.round((score.score / score.max_score) * 100)}%)
                    </div>
                  </div>

                  {/* Détail des impacts */}
                  {score.score_breakdown && score.score_breakdown.length > 0 && (
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h4 className="font-semibold mb-3">Détail des Impacts</h4>
                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {score.score_breakdown.map((item, index) => (
                          <div key={index} className="flex items-start justify-between text-sm p-2 bg-white rounded">
                            <div className="flex-1">
                              <div className="font-medium">{item.question_id}</div>
                              <div className="text-gray-600 text-xs">{item.reasoning}</div>
                            </div>
                            <div className={`font-bold ${item.score_impact >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {item.score_impact >= 0 ? '+' : ''}{item.score_impact}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Scores par catégorie */}
                  {score.category_scores && score.category_scores.length > 0 && (
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h4 className="font-semibold mb-3">Scores par Catégorie</h4>
                      <div className="space-y-2">
                        {score.category_scores.map((cat) => (
                          <div key={cat.category_id} className="flex items-center justify-between p-2 bg-white rounded">
                            <div>
                              <div className="font-medium">{cat.category_name}</div>
                              <div className="text-sm text-gray-600">{cat.question_count} questions</div>
                            </div>
                            <div className="text-right">
                              <div className="font-bold">{cat.score}/{cat.max_score}</div>
                              <div className="text-sm text-gray-600">{cat.percentage}%</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Données brutes */}
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-semibold mb-2">Données Brutes (JSON)</h4>
                    <pre className="text-xs bg-white p-3 rounded border overflow-x-auto">
                      {JSON.stringify(score, null, 2)}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Metadata */}
      <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Informations</h3>
        <div className="space-y-4">
          <div className="flex items-start">
            <Calendar className="h-4 w-4 text-gray-400 mt-1 mr-3" />
            <div>
              <div className="text-sm font-medium text-gray-500">Créé le</div>
              <div className="text-sm text-gray-900">{formatDate(useCase.created_at)}</div>
            </div>
          </div>
          <div className="flex items-start">
            <Clock className="h-4 w-4 text-gray-400 mt-1 mr-3" />
            <div>
              <div className="text-sm font-medium text-gray-500">Modifié le</div>
              <div className="text-sm text-gray-900">{formatDate(useCase.updated_at)}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Actions rapides</h3>
        <div className="space-y-3">
          {useCase.status?.toLowerCase() === 'draft' ? (
            <Link
              href={useCaseRoutes.evaluation(useCase.id)}
              className="w-full inline-flex items-center justify-center px-4 py-2 bg-[#0080A3] text-white text-sm font-medium rounded-lg hover:bg-[#006280] transition-colors"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Compléter l'évaluation
            </Link>
          ) : (
            <Link
              href={useCaseRoutes.rapport(useCase.id)}
              className="w-full inline-flex items-center justify-center px-4 py-2 bg-[#0080A3] text-white text-sm font-medium rounded-lg hover:bg-[#006280] transition-colors"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Voir le rapport
            </Link>
          )}
          
          {/* Debug Button */}
          <button
            onClick={() => setShowDebug(true)}
            className="w-full inline-flex items-center justify-center px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors"
          >
            <Bug className="h-4 w-4 mr-2" />
            Debug Scoring
          </button>
        </div>
      </div>
    </div>
  )
} 