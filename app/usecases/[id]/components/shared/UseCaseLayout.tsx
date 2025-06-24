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
      <div className="bg-white shadow-sm -m-6 mb-0 p-6">
        <UseCaseHeader useCase={useCase} />
      </div>

      {/* Navigation */}
      {showNavigation && (
        <div className="bg-white border-b border-gray-200 sticky top-0 z-10 -mx-6 px-6">
          <UseCaseNavigation 
            useCaseId={useCase.id} 
            companyId={useCase.company_id}
            isDraft={isDraft}
          />
        </div>
      )}

      {/* Content */}
      <div className="pt-6">
        {children}
      </div>
    </div>
  )
} 