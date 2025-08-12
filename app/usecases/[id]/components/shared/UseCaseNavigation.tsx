import React from 'react'
import Link from 'next/link'
import { useCaseNavigation } from '../../utils/routes'
import { useUseCaseNavigation } from '../../utils/navigation'
import { Eye, ClipboardCheck, FileText } from 'lucide-react'

interface UseCaseNavigationProps {
  useCaseId: string
  companyId: string
  isDraft?: boolean
}

const getIcon = (key: string) => {
  switch (key) {
    case 'overview': return <Eye className="h-4 w-4" />
    case 'rapport': return <FileText className="h-4 w-4" />
    default: return null
  }
}

export function UseCaseNavigation({ useCaseId, companyId, isDraft = false }: UseCaseNavigationProps) {
  const { isCurrentPath } = useUseCaseNavigation(useCaseId, companyId)

  return (
    <div className="flex space-x-8">
      {useCaseNavigation.map((item) => {
        const isActive = isCurrentPath(item.key)
        const href = item.href(useCaseId)
        
        // L'évaluation est maintenant toujours accessible
        const isDisabled = false
        
        return (
          <Link
            key={item.key}
            href={href}
            className={`${
              isActive
                ? 'border-[#0080A3] text-[#0080A3]'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm inline-flex items-center space-x-2 transition-colors`}
          >
            {getIcon(item.key)}
            <span>{item.label}</span>
            {item.key === 'evaluation' && isDraft && (
              <span className="bg-orange-100 text-orange-800 text-xs px-2 py-0.5 rounded-full ml-2">
                À compléter
              </span>
            )}
            {item.key === 'evaluation' && !isDraft && (
              <span className="bg-green-100 text-green-800 text-xs px-2 py-0.5 rounded-full ml-2">
                Complété
              </span>
            )}
          </Link>
        )
      })}
    </div>
  )
} 