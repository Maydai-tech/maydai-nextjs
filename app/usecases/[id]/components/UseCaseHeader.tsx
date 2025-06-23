import React from 'react'
import Link from 'next/link'
import { UseCase, Progress } from '../types/usecase'
import { getRiskLevelColor, getStatusColor, getUseCaseStatusInFrench } from '../utils/questionnaire'
import { ArrowLeft, Brain, Building, Shield, CheckCircle, Clock } from 'lucide-react'

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
      
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start space-y-4 sm:space-y-0">
        <div className="flex items-start space-x-3 sm:space-x-4">
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
      </div>
    </div>
  )
} 