import React from 'react'
import Link from 'next/link'
import { UseCase, Progress } from '../types/usecase'
import { getRiskLevelColor, getStatusColor, getUseCaseStatusInFrench } from '../utils/questionnaire'
import { ArrowLeft, Brain, Building, Shield, CheckCircle, Clock, Info } from 'lucide-react'
import { useUseCaseScore } from '../hooks/useUseCaseScore'
import { getScoreCategory } from '../utils/score-categories'

interface UseCaseHeaderProps {
  useCase: UseCase
  progress?: Progress | null
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

function HeaderScore({ usecaseId }: { usecaseId: string }) {
  const { score, loading, error } = useUseCaseScore(usecaseId)

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-4 w-full sm:w-auto">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-28 mb-3"></div>
          <div className="h-8 bg-gray-200 rounded mb-2"></div>
          <div className="h-3 bg-gray-200 rounded w-20 mx-auto"></div>
        </div>
      </div>
    )
  }

  if (error || !score) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-4 w-full sm:w-auto">
        <div className="text-center">
          <Info className="h-5 w-5 text-gray-400 mx-auto mb-2" />
          <div className="text-sm font-medium text-gray-900 mb-1">Score non disponible</div>
          <div className="text-xs text-gray-500">En attente de calcul</div>
        </div>
      </div>
    )
  }

  const category = getScoreCategory(score.score)

  // Couleurs professionnelles et sobres
  const getProfessionalColor = (category: any) => {
    const categoryName = category.category.toLowerCase()
    if (categoryName.includes('excellent')) {
      return {
        bg: 'bg-green-50',
        border: 'border-green-200',
        text: 'text-green-800',
        accent: 'text-green-600'
      }
    } else if (categoryName.includes('bon')) {
      return {
        bg: 'bg-blue-50',
        border: 'border-blue-200',
        text: 'text-blue-800',
        accent: 'text-blue-600'
      }
    } else if (categoryName.includes('moyen')) {
      return {
        bg: 'bg-amber-50',
        border: 'border-amber-200',
        text: 'text-amber-800',
        accent: 'text-amber-600'
      }
    } else {
      return {
        bg: 'bg-red-50',
        border: 'border-red-200',
        text: 'text-red-800',
        accent: 'text-red-600'
      }
    }
  }

  const professionalColors = getProfessionalColor(category)

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 w-full sm:w-auto">
      <div className="text-center mb-3">
        <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">Score de Conformité</div>
      </div>
      
      <div className={`${professionalColors.bg} ${professionalColors.border} border p-4 rounded-lg`}>
        <div className="flex items-center justify-center space-x-3">
          <span className={`text-2xl ${professionalColors.accent}`}>
            {category.icon}
          </span>
          <div className="text-center">
            <div className={`text-2xl font-semibold ${professionalColors.text}`}>
              {score.score}
              <span className="text-lg text-gray-500">/{score.max_score}</span>
            </div>
            <div className={`text-xs font-medium ${professionalColors.accent} mt-1`}>
              {category.category}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export function UseCaseHeader({ useCase, progress }: UseCaseHeaderProps) {
  const frenchStatus = getUseCaseStatusInFrench(useCase.status)
  
  return (
    <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6">
      <div className="flex items-center justify-between mb-4">
        <Link
          href={`/dashboard/${useCase.company_id}`}
          className="inline-flex items-center text-gray-600 hover:text-[#0080A3] transition-colors"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          <span className="text-sm font-medium">Retour au dashboard</span>
        </Link>
      </div>
      
      <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start space-y-4 lg:space-y-0 lg:space-x-6">
        <div className="flex items-start space-x-3 sm:space-x-4 flex-1">
          <div className="bg-[#0080A3]/10 p-2 sm:p-3 rounded-lg flex-shrink-0">
            <Brain className="h-6 w-6 sm:h-8 sm:w-8 text-[#0080A3]" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 break-words">{useCase.name}</h1>
            {useCase.companies && (
              <p className="text-sm sm:text-base text-gray-600 flex items-center mt-1">
                <Building className="h-4 w-4 mr-1" />
                {useCase.companies.name} • {useCase.companies.industry}
              </p>
            )}
            <div className="flex flex-wrap gap-2 mt-3">
              <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(frenchStatus)}`}>
                {getStatusIcon(useCase.status)}
                <span className="ml-1">{frenchStatus}</span>
              </span>
              {useCase.risk_level && (
                <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${getRiskLevelColor(useCase.risk_level)}`}>
                  <Shield className="h-3 w-3 mr-1" />
                  {useCase.risk_level} risk
                </span>
              )}
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
          <HeaderScore usecaseId={useCase.id} />
        </div>
      </div>
    </div>
  )
} 