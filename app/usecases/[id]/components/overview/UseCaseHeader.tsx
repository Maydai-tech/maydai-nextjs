import React, { useState } from 'react'
import Link from 'next/link'
import { UseCase, Progress } from '../../types/usecase'
import { ComplAIModel } from '@/lib/supabase'
import { getStatusColor, getUseCaseStatusInFrench } from '../../utils/questionnaire'
import { useCaseRoutes } from '../../utils/routes'
import { useUseCaseNavigation } from '../../utils/navigation'
import { ArrowLeft, Brain, Building, CheckCircle, Clock, Info, Edit3, RefreshCcw } from 'lucide-react'
import { getScoreCategory } from '../../utils/score-categories'
import ModelSelectorModal from '../ModelSelectorModal'
import ComplAiScoreBadge from '../ComplAiScoreBadge'
import { RiskLevelBadge } from './RiskLevelBadge'
import { useRiskLevel } from '../../hooks/useRiskLevel'

type PartialComplAIModel = Pick<ComplAIModel, 'id' | 'model_name' | 'model_provider'> & Partial<Pick<ComplAIModel, 'model_type' | 'version' | 'created_at' | 'updated_at'>>

interface UseCaseHeaderProps {
  useCase: UseCase
  progress?: Progress | null
  onUpdateUseCase?: (updates: Partial<UseCase>) => Promise<UseCase | null>
  updating?: boolean
}

const getStatusIcon = (status: string) => {
  const frenchStatus = getUseCaseStatusInFrench(status)
  switch (frenchStatus.toLowerCase()) {
    case 'terminé': return <CheckCircle className="h-4 w-4" />
    case 'en cours': return <Clock className="h-4 w-4" />
    case 'à compléter': return <Clock className="h-4 w-4" />
    default: return <Clock className="h-4 w-4" />
  }
}

// Composant d'affichage du score dans le header
// Utilise directement les données du useCase pour garantir la synchronisation
function HeaderScore({ useCase, refreshing = false }: { useCase: UseCase, refreshing?: boolean }) {
  // Vérification de la présence d'un score calculé
  const hasScore = useCase.score_final !== null && useCase.score_final !== undefined
  
  // Préparation des données du score pour l'affichage
  const score = hasScore ? {
    score: Math.round(useCase.score_final!),
    score_base: useCase.score_base,
    score_model: useCase.score_model,
    is_eliminated: useCase.is_eliminated,
    elimination_reason: useCase.elimination_reason
  } : null

  if (refreshing) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">
          Score de conformité
        </h3>
        <div className="animate-pulse">
          <div className="bg-gray-100 rounded-lg p-4">
            <div className="h-8 bg-gray-200 rounded w-16"></div>
          </div>
        </div>
        <div className="text-xs text-blue-600 mt-2">
          Recalcul en cours...
        </div>
      </div>
    )
  }

  if (!score) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">
          Score de conformité
        </h3>
        <div className="bg-gray-50 rounded-lg p-4 text-center">
          <Info className="h-5 w-5 text-gray-400 mx-auto mb-2" />
          <div className="text-sm text-gray-600">Non disponible</div>
          <div className="text-xs text-gray-500 mt-1">En attente de calcul</div>
        </div>
      </div>
    )
  }

  // Style épuré avec fond coloré selon le score
  const getScoreStyle = () => {
    if (score.score >= 80) {
      return {
        bg: 'bg-gradient-to-r from-green-50 to-emerald-50',
        text: 'text-green-700',
        border: 'border-green-100'
      }
    } else if (score.score >= 60) {
      return {
        bg: 'bg-gradient-to-r from-blue-50 to-indigo-50',
        text: 'text-blue-700',
        border: 'border-blue-100'
      }
    } else if (score.score >= 40) {
      return {
        bg: 'bg-gradient-to-r from-amber-50 to-orange-50',
        text: 'text-amber-700',
        border: 'border-amber-100'
      }
    } else {
      return {
        bg: 'bg-gradient-to-r from-red-50 to-rose-50',
        text: 'text-red-700',
        border: 'border-red-100'
      }
    }
  }

  const scoreStyle = getScoreStyle()

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <h3 className="text-sm font-semibold text-gray-900 mb-3">
        Score de conformité
      </h3>
      
      <div className={`${scoreStyle.bg} rounded-lg p-4 border ${scoreStyle.border}`}>
        <div className="text-center">
          <div className={`text-3xl font-bold ${scoreStyle.text}`}>
            {score.score}
          </div>
          {score.is_eliminated && (
            <span className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded-full inline-block mt-2">
              Éliminé
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

export function UseCaseHeader({ useCase, progress, onUpdateUseCase, updating = false }: UseCaseHeaderProps) {
  const frenchStatus = getUseCaseStatusInFrench(useCase.status)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isRecalculatingScore, setIsRecalculatingScore] = useState(false) // État local pour l'animation du score pendant le recalcul
  const { goToEvaluation } = useUseCaseNavigation(useCase.id, useCase.company_id)
  const { riskLevel, loading: riskLoading, error: riskError } = useRiskLevel(useCase.id)

  const handleModelEdit = () => {
    setIsModalOpen(true)
  }

  // Gestionnaire de sauvegarde du modèle IA sélectionné
  const handleModelSave = async (selectedModel: PartialComplAIModel | null) => {
    if (!onUpdateUseCase) return
    
    try {
      // Active l'animation de recalcul du score
      setIsRecalculatingScore(true)
      
      // Mise à jour du modèle (déclenche automatiquement le recalcul du score côté serveur)
      await onUpdateUseCase({ 
        primary_model_id: selectedModel?.id || undefined 
      })
      
      // Animation visuelle pendant 1 seconde pour feedback utilisateur
      setTimeout(() => {
        setIsRecalculatingScore(false)
      }, 1000)
    } catch (error) {
      setIsRecalculatingScore(false)
      throw error
    }
  }

  const handleModalClose = () => {
    setIsModalOpen(false)
  }
  
  return (
    <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6">
      <div className="flex items-center justify-between mb-4">
        <Link
          href={useCaseRoutes.dashboard(useCase.company_id)}
          className="inline-flex items-center text-gray-600 hover:text-[#0080A3] transition-colors"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          <span className="text-sm font-medium">Retour au dashboard</span>
        </Link>
        
        <button
          onClick={goToEvaluation}
          className="inline-flex items-center px-4 py-2 bg-[#0080A3] text-white font-medium rounded-lg hover:bg-[#006280] transition-colors"
        >
          <RefreshCcw className="h-4 w-4 mr-2" />
          <span className="text-sm">Réévaluer le use case</span>
        </button>
      </div>
      
      <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start space-y-4 lg:space-y-0 lg:space-x-6">
        <div className="flex items-start space-x-3 sm:space-x-4 flex-1">
          <div className="min-w-0 flex-1">
            <div className="flex items-start gap-3 mb-2">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 break-words">{useCase.name}</h1>
              <RiskLevelBadge 
                riskLevel={riskLevel} 
                loading={riskLoading} 
                error={riskError}
                className="flex-shrink-0"
              />
            </div>
            {useCase.companies && (
              <p className="text-sm sm:text-base text-gray-600 flex items-center">
                <Building className="h-4 w-4 mr-1" />
                {useCase.companies.name}
              </p>
            )}
            
            {/* Modèle COMPL-AI */}
            <div className="flex items-center gap-2 mt-2">
              <div 
                className="group relative inline-flex items-center px-3 py-1 bg-blue-50 text-blue-700 rounded-full border border-blue-200 hover:bg-blue-100 transition-colors cursor-pointer"
                onClick={onUpdateUseCase ? handleModelEdit : undefined}
                title={onUpdateUseCase ? "Cliquer pour modifier le modèle" : undefined}
              >
                {useCase.compl_ai_models ? (
                  <>
                    <span className="text-sm font-medium">{useCase.compl_ai_models.model_name}</span>
                    {useCase.compl_ai_models.model_provider && (
                      <span className="text-blue-600 ml-2 text-sm">• {useCase.compl_ai_models.model_provider}</span>
                    )}
                    {useCase.compl_ai_models.version && (
                      <span className="text-blue-500 ml-2 text-xs">(v{useCase.compl_ai_models.version})</span>
                    )}
                  </>
                ) : (
                  <span className="text-sm text-gray-500">Aucun modèle sélectionné</span>
                )}
                
                {/* Icône modifier intégrée */}
                {onUpdateUseCase && (
                  <Edit3 className="h-3 w-3 ml-2 text-blue-500" />
                )}
              </div>
            
            </div>
            
            <div className="flex flex-wrap gap-2 mt-3">
              <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(frenchStatus)}`}>
                {getStatusIcon(useCase.status)}
                <span className="ml-1">{frenchStatus}</span>
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 lg:flex-col">
          {/* Progress Card */}
          {progress && (
            <div className="bg-gray-50 p-4 rounded-lg w-full sm:w-auto">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Progression</span>
                {progress.is_completed ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <Clock className="h-4 w-4 text-yellow-600" />
                )}
              </div>
              <div className="text-2xl font-bold text-gray-900 mb-1">
                {progress.answered_questions} / {progress.total_questions}
              </div>
              <div className="text-xs text-gray-600">
                questions répondues
              </div>
            </div>
          )}

          {/* Score Card */}
          <HeaderScore useCase={useCase} refreshing={isRecalculatingScore} />
        </div>
      </div>

      {/* Modal de sélection de modèle */}
      <ModelSelectorModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        currentModel={useCase.compl_ai_models || null}
        onSave={handleModelSave}
        saving={updating}
      />
    </div>
  )
} 