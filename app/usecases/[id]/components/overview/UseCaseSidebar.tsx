import React from 'react'
import { UseCase } from '../../types/usecase'
import { CategoryScores } from '../CategoryScores'

interface UseCaseSidebarProps {
  useCase: UseCase
  onUpdateUseCase?: (updates: Partial<UseCase>) => Promise<UseCase | null>
  isRecalculating?: boolean // Propété passée depuis le parent pour indiquer un recalcul en cours
}

// Composant sidebar affichant les catégories
export function UseCaseSidebar({ useCase, onUpdateUseCase, isRecalculating = false }: UseCaseSidebarProps) {

  return (
    <div id="scores-description" className="space-y-6" tabIndex={-1}>
      {/* Scores par Catégorie - Seul contenu de la sidebar */}
      <CategoryScores usecaseId={useCase.id} />
    </div>
  )
} 