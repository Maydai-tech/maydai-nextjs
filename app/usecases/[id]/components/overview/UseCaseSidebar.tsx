import React from 'react'
import Link from 'next/link'
import { UseCase } from '../../types/usecase'
import { formatDate } from '../../utils/questionnaire'
import { useCaseRoutes } from '../../utils/routes'
import { Calendar, Clock, CheckCircle } from 'lucide-react'
import { CategoryScores } from '../CategoryScores'

interface UseCaseSidebarProps {
  useCase: UseCase
}

export function UseCaseSidebar({ useCase }: UseCaseSidebarProps) {
  return (
    <div className="space-y-6">
      {/* Scores par Catégorie */}
      <CategoryScores usecaseId={useCase.id} />

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
        </div>
      </div>
    </div>
  )
} 