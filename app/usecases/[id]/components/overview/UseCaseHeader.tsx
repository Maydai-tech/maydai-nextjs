import React, { useState } from 'react'
import Link from 'next/link'
import { UseCase, Progress } from '../../types/usecase'
import { ComplAIModel } from '@/lib/supabase'
import { getStatusColor, getUseCaseStatusInFrench } from '../../utils/questionnaire'
import { useCaseRoutes } from '../../utils/routes'
import { useUseCaseNavigation } from '../../utils/navigation'
import { ArrowLeft, Brain, Building, CheckCircle, Clock, Edit3, RefreshCcw, AlertTriangle } from 'lucide-react'
import { getScoreCategory } from '../../utils/score-categories'
import ModelSelectorModal from '../ModelSelectorModal'
import ComplAiScoreBadge from '../ComplAiScoreBadge'
import { RiskLevelBadge } from './RiskLevelBadge'
import { useRiskLevel } from '../../hooks/useRiskLevel'
import { CountryDeploymentDisplay } from './CountryDeploymentDisplay'

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
      <div className="bg-gradient-to-br from-white to-gray-50 rounded-xl shadow-sm border border-gray-200 p-4 hover:shadow-md transition-all duration-200">
        <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center">
          <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
          Score de conformité
        </h3>
        <div className="relative">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-100">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600 mb-2 animate-pulse">--</div>
            </div>
          </div>
          <div className="text-xs text-blue-600 mt-2 flex items-center justify-center">
            <RefreshCcw className="h-3 w-3 mr-1 animate-spin" />
            Recalcul en cours...
          </div>
        </div>
      </div>
    )
  }

  if (!score) {
    return (
      <div className="bg-gradient-to-br from-white to-gray-50 rounded-xl shadow-sm border border-gray-200 p-4 hover:shadow-md transition-all duration-200">
        <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center">
          <div className="w-2 h-2 bg-gray-400 rounded-full mr-2"></div>
          Score de conformité
        </h3>
        <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-4 text-center border border-gray-200">
          <div className="text-3xl font-bold text-gray-400 mb-2">--</div>
          <div className="text-xs text-gray-500">Non disponible</div>
        </div>
      </div>
    )
  }

  // Style moderne avec fond coloré et effets visuels selon le score
  const getScoreStyle = () => {
    if (score.score >= 80) {
      return {
        bg: 'bg-gradient-to-br from-green-50 via-emerald-50 to-green-100',
        text: 'text-green-800',
        border: 'border-green-200',
        accent: 'text-green-600',
        indicator: 'bg-green-500',
        shadow: 'shadow-green-100'
      }
    } else if (score.score >= 60) {
      return {
        bg: 'bg-gradient-to-br from-blue-50 via-indigo-50 to-blue-100',
        text: 'text-blue-800',
        border: 'border-blue-200',
        accent: 'text-blue-600',
        indicator: 'bg-blue-500',
        shadow: 'shadow-blue-100'
      }
    } else if (score.score >= 40) {
      return {
        bg: 'bg-gradient-to-br from-amber-50 via-orange-50 to-amber-100',
        text: 'text-amber-800',
        border: 'border-amber-200',
        accent: 'text-amber-600',
        indicator: 'bg-amber-500',
        shadow: 'shadow-amber-100'
      }
    } else {
      return {
        bg: 'bg-gradient-to-br from-red-50 via-rose-50 to-red-100',
        text: 'text-red-800',
        border: 'border-red-200',
        accent: 'text-red-600',
        indicator: 'bg-red-500',
        shadow: 'shadow-red-100'
      }
    }
  }

  const scoreStyle = getScoreStyle()

  return (
    <div className="bg-gradient-to-br from-white to-gray-50 rounded-xl shadow-sm border border-gray-200 p-4 hover:shadow-md transition-all duration-200">
      <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center">
        <div className={`w-2 h-2 rounded-full mr-2 ${scoreStyle.indicator}`}></div>
        Score de conformité
      </h3>
      
      <div className={`${scoreStyle.bg} rounded-xl p-4 border ${scoreStyle.border} ${scoreStyle.shadow} shadow-sm hover:shadow-md transition-all duration-200`}>
        <div className="text-center relative">
          <div className={`text-3xl font-bold ${scoreStyle.text} mb-2`}>
            {score.score}
          </div>
          
          {score.is_eliminated && (
            <div className="inline-flex items-center px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-semibold border border-red-200">
              <AlertTriangle className="h-3 w-3 mr-1" />
              Éliminé
            </div>
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
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6">
      <div className="flex items-center justify-between mb-6">
        <Link
          href={useCaseRoutes.dashboard(useCase.company_id)}
          className="group inline-flex items-center text-gray-500 hover:text-[#0080A3] transition-all duration-200 hover:bg-gray-50 rounded-lg px-3 py-2 -ml-3"
        >
          <ArrowLeft className="h-4 w-4 mr-2 group-hover:-translate-x-0.5 transition-transform duration-200" />
          <span className="text-sm font-medium">Retour au dashboard</span>
        </Link>
      </div>
      
      <div className="flex flex-col xl:flex-row xl:justify-between xl:items-start space-y-6 xl:space-y-0 xl:space-x-8">
        <div className="flex-1 min-w-0">
          <div className="mb-4">
            <div className="mb-3">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 break-words leading-tight hover:text-gray-700 transition-colors duration-200">{useCase.name}</h1>
            </div>
            {useCase.companies && (
              <p className="text-base text-gray-600 flex items-center font-medium mb-4">
                <Building className="h-5 w-5 mr-2 text-gray-400" />
                {useCase.companies.name}
              </p>
            )}
            
            {/* Pays de déploiement */}
            <div className="mb-4">
              <CountryDeploymentDisplay 
                deploymentCountries={useCase.deployment_countries} 
                onUpdateUseCase={onUpdateUseCase ? async (updates) => {
                  await onUpdateUseCase(updates)
                } : undefined}
                updating={updating}
              />
            </div>
            
            {/* Modèle COMPL-AI */}
            <div className="flex items-center gap-3 mb-4">
              <div 
                className={`group relative inline-flex items-center px-4 py-2.5 bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 rounded-xl border border-blue-200 transition-all duration-200 ${
                  onUpdateUseCase ? 'cursor-pointer hover:from-blue-100 hover:to-indigo-100 hover:shadow-md hover:border-blue-300' : ''
                }`}
                onClick={onUpdateUseCase ? handleModelEdit : undefined}
                title={onUpdateUseCase ? "Cliquer pour modifier le modèle" : undefined}
              >
                <Brain className="h-4 w-4 mr-2 text-blue-600" />
                {useCase.compl_ai_models ? (
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">{useCase.compl_ai_models.model_name}</span>
                    {useCase.compl_ai_models.model_provider && (
                      <span className="text-blue-600 text-sm">• {useCase.compl_ai_models.model_provider}</span>
                    )}
                    {useCase.compl_ai_models.version && (
                      <span className="text-blue-500 text-xs bg-blue-100 px-2 py-0.5 rounded-full">
                        v{useCase.compl_ai_models.version}
                      </span>
                    )}
                  </div>
                ) : (
                  <span className="text-sm text-gray-500 font-medium">Aucun modèle sélectionné</span>
                )}
                
                {/* Icône modifier avec tooltip */}
                {onUpdateUseCase && (
                  <div className="ml-3 opacity-60 group-hover:opacity-100 transition-opacity duration-200">
                    <Edit3 className="h-4 w-4 text-blue-600" />
                  </div>
                )}
                
                {/* Tooltip */}
                {onUpdateUseCase && (
                  <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 translate-y-full opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                    <div className="bg-gray-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                      Cliquer pour modifier
                    </div>
                    <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-gray-900 rotate-45"></div>
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex flex-wrap gap-3">
              <span className={`inline-flex items-center px-3 py-1.5 text-sm font-semibold rounded-lg shadow-sm transition-all duration-200 hover:shadow-md hover:scale-105 ${getStatusColor(frenchStatus)}`}>
                {getStatusIcon(useCase.status)}
                <span className="ml-2">{frenchStatus}</span>
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4 xl:w-80 xl:flex-shrink-0">
          {/* Progress Card */}
          {progress && (
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 p-4 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-800">Progression</h3>
                <div className={`p-1.5 rounded-full ${
                  progress.is_completed 
                    ? 'bg-green-100 text-green-600' 
                    : 'bg-amber-100 text-amber-600'
                }`}>
                  {progress.is_completed ? (
                    <CheckCircle className="h-3 w-3" />
                  ) : (
                    <Clock className="h-3 w-3" />
                  )}
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900 mb-1">
                  {progress.answered_questions} / {progress.total_questions}
                </div>
                <div className="text-xs text-gray-600">
                  questions répondues
                </div>
              </div>
            </div>
          )}

          {/* Risk Level Badge */}
          <div className="transform hover:scale-105 transition-transform duration-200">
            <RiskLevelBadge 
              riskLevel={riskLevel} 
              loading={riskLoading} 
              error={riskError}
              className=""
            />
          </div>

          {/* Score Card */}
          <HeaderScore useCase={useCase} refreshing={isRecalculatingScore} />
          
          {/* Réévaluer Button */}
          <button
            onClick={goToEvaluation}
            className="group inline-flex items-center justify-center px-4 py-3 bg-[#0080A3] text-white font-semibold rounded-xl hover:bg-[#006280] hover:shadow-lg transition-all duration-200 w-full"
          >
            <RefreshCcw className="h-4 w-4 mr-2 group-hover:rotate-180 transition-transform duration-300" />
            <span className="text-sm">Réévaluer le use case</span>
          </button>
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