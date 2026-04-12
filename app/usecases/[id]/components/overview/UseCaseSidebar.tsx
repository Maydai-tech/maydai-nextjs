import React from 'react'
import { UseCase } from '../../types/usecase'
import { CategoryScores } from '../CategoryScores'
import { useUseCaseRisk } from '../../context/UseCaseRiskContext'

interface UseCaseSidebarProps {
  useCase: UseCase
  onUpdateUseCase?: (updates: Partial<UseCase>) => Promise<UseCase | null>
  isRecalculating?: boolean // Propété passée depuis le parent pour indiquer un recalcul en cours
}

// Composant sidebar affichant les catégories
export function UseCaseSidebar({ useCase, onUpdateUseCase, isRecalculating = false }: UseCaseSidebarProps) {
  const { classificationStatus } = useUseCaseRisk()

  return (
    <div id="scores-description" className="space-y-6" tabIndex={-1}>
      {/* Scores par Catégorie - Seul contenu de la sidebar */}
      <CategoryScores usecaseId={useCase.id} classificationStatus={classificationStatus} />
    </div>
  )
} 