'use client'

import React, { useState } from 'react'
import { Calculator, RefreshCw, AlertCircle, CheckCircle, Info } from 'lucide-react'
import { UseCase } from '../types/usecase'
import { calculateUseCaseScore } from '@/lib/score-service'
import { useAuth } from '@/lib/auth'

interface ScoreCalculationProps {
  useCase: UseCase
  onScoreUpdate?: (updatedUseCase: Partial<UseCase>) => void
  isRecalculating?: boolean // Indique si un recalcul est en cours suite à un changement de modèle
}

// Composant de calcul et d'affichage du score de conformité
export function ScoreCalculation({ useCase, onScoreUpdate, isRecalculating = false }: ScoreCalculationProps) {
  const [calculating, setCalculating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const { session } = useAuth()

  const handleCalculateScore = async () => {
    if (!session?.access_token) {
      setError('Vous devez être connecté pour calculer le score')
      return
    }

    setCalculating(true)
    setError(null)
    setSuccess(false)

    try {
      const result = await calculateUseCaseScore(useCase.id, session.access_token)
      
      if (result.success) {
        setSuccess(true)
        
        // Mettre à jour le cas d'usage avec les nouveaux scores
        if (onScoreUpdate) {
          onScoreUpdate({
            score_base: result.scores.score_base,
            score_model: result.scores.score_model,
            score_final: result.scores.score_final,
            is_eliminated: result.scores.is_eliminated,
            elimination_reason: result.scores.elimination_reason,
            last_calculation_date: new Date().toISOString()
          })
        }
        
        // Rafraîchir la page après 2 secondes pour afficher les nouveaux scores
        setTimeout(() => {
          window.location.reload()
        }, 2000)
      } else {
        setError('Erreur lors du calcul du score')
      }
    } catch (err) {
      console.error('Erreur lors du calcul du score:', err)
      setError(err instanceof Error ? err.message : 'Une erreur inattendue est survenue')
    } finally {
      setCalculating(false)
    }
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Jamais calculé'
    const date = new Date(dateString)
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const hasScore = useCase.score_final !== null && useCase.score_final !== undefined

  return (
    <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Score de conformité
        {/* Indicateur visuel pendant le recalcul automatique */}
        {isRecalculating && (
          <span className="ml-2 text-sm text-blue-600">
            <RefreshCw className="h-4 w-4 inline animate-spin mr-1" />
            Mise à jour...
          </span>
        )}
      </h3>
      
      {/* Affichage du score actuel */}
      {hasScore ? (
        <div className="space-y-4">
          {/* Score principal */}
          {/* Zone d'affichage du score avec effet visuel pendant le recalcul */}
          <div className={`bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg ${isRecalculating ? 'opacity-50' : ''}`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">Score final</span>
              {useCase.is_eliminated && (
                <span className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded-full">
                  Éliminé
                </span>
              )}
            </div>
            <div className="text-3xl font-bold text-blue-600">
              {/* Animation pendant le recalcul */}
              {isRecalculating ? (
                <span className="animate-pulse">...</span>
              ) : (
                `${useCase.score_final?.toFixed(1)}%`
              )}
            </div>
            
            {/* Détails du score */}
            <div className="mt-3 pt-3 border-t border-blue-100 space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Score de base:</span>
                <span className="font-medium">{useCase.score_base}/90</span>
              </div>
              {useCase.score_model !== null && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Bonus COMPL-AI:</span>
                  <span className="font-medium">+{useCase.score_model?.toFixed(1)}/20</span>
                </div>
              )}
            </div>
            
            {/* Raison d'élimination */}
            {useCase.is_eliminated && useCase.elimination_reason && (
              <div className="mt-3 p-2 bg-red-50 rounded text-sm text-red-700">
                <AlertCircle className="h-4 w-4 inline mr-1" />
                {useCase.elimination_reason}
              </div>
            )}
          </div>
          
          {/* Date de dernier calcul */}
          <div className="text-xs text-gray-500">
            Dernière mise à jour: {formatDate(useCase.last_calculation_date)}
          </div>
        </div>
      ) : (
        <div className="text-center py-4">
          <Info className="h-8 w-8 text-gray-400 mx-auto mb-3" />
          <p className="text-sm text-gray-600">
            Aucun score calculé pour ce cas d'usage
          </p>
        </div>
      )}
      
      {/* Messages d'état */}
      {error && (
        <div className="mt-4 p-3 bg-red-50 rounded-lg flex items-start">
          <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 mr-2" />
          <div className="text-sm text-red-700">{error}</div>
        </div>
      )}
      
      {success && (
        <div className="mt-4 p-3 bg-green-50 rounded-lg flex items-start">
          <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 mr-2" />
          <div className="text-sm text-green-700">
            Score calculé avec succès ! La page va se rafraîchir...
          </div>
        </div>
      )}
      
      {/* Bouton de recalcul manuel - désactivé pendant les calculs */}
      <button
        onClick={handleCalculateScore}
        disabled={calculating || isRecalculating}
        className={`
          mt-4 w-full inline-flex items-center justify-center px-4 py-2
          text-sm font-medium rounded-lg transition-colors
          ${calculating || isRecalculating
            ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
            : 'bg-blue-600 text-white hover:bg-blue-700'
          }
        `}
      >
        {calculating ? (
          <>
            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            Calcul en cours...
          </>
        ) : (
          <>
            <Calculator className="h-4 w-4 mr-2" />
            {hasScore ? 'Recalculer le score' : 'Calculer le score'}
          </>
        )}
      </button>
      
      {/* Note informative */}
      <p className="mt-3 text-xs text-gray-500 text-center">
        Le calcul prend en compte les réponses au questionnaire et le modèle COMPL-AI sélectionné
      </p>
    </div>
  )
}