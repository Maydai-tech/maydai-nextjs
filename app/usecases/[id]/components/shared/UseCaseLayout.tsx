import React from 'react'
import { UseCase } from '../../types/usecase'
import { UseCaseHeader } from '../overview/UseCaseHeader'

interface UseCaseLayoutProps {
  useCase: UseCase
  children: React.ReactNode
  onUpdateUseCase?: (updates: Partial<UseCase>) => Promise<UseCase | null>
  updating?: boolean
}

export function UseCaseLayout({ useCase, children, onUpdateUseCase, updating }: UseCaseLayoutProps) {
  return (
    <div className="space-y-0">
      {/* Header */}
      <div className="bg-white shadow-sm -m-6 mb-0 p-6">
        <UseCaseHeader 
          useCase={useCase} 
          onUpdateUseCase={onUpdateUseCase}
          updating={updating}
        />
      </div>

      {/* Content */}
      <div className="pt-6">
        {children}
      </div>
    </div>
  )
} 