import React from 'react'
import { UseCase } from '../../types/usecase'
import { UseCaseNavigation } from './UseCaseNavigation'
import { UseCaseHeader } from '../overview/UseCaseHeader'

interface UseCaseLayoutProps {
  useCase: UseCase
  children: React.ReactNode
  showNavigation?: boolean
}

export function UseCaseLayout({ useCase, children, showNavigation = true }: UseCaseLayoutProps) {
  const isDraft = useCase.status?.toLowerCase() === 'draft'

  return (
    <div className="space-y-0">
      {/* Header */}
      <div className="px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <UseCaseHeader useCase={useCase} />
      </div>

      {/* Navigation */}
      {showNavigation && (
        <UseCaseNavigation 
          useCaseId={useCase.id} 
          companyId={useCase.company_id}
          isDraft={isDraft}
        />
      )}

      {/* Content */}
      <div className="px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {children}
      </div>
    </div>
  )
} 