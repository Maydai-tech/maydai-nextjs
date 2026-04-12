import React from 'react'
import { Shield, AlertTriangle, AlertCircle, CheckCircle, HelpCircle } from 'lucide-react'

type RiskLevel = 'unacceptable' | 'high' | 'limited' | 'minimal'

export type ClassificationStatus = 'qualified' | 'impossible'

interface RiskLevelBadgeProps {
  riskLevel: RiskLevel | null
  /** V3 : si impossible, affichage dédié même sans risk_level. */
  classificationStatus?: ClassificationStatus | null
  loading?: boolean
  error?: string | null
  className?: string
}

const getRiskLevelConfig = (level: RiskLevel) => {
  switch (level) {
    case 'unacceptable':
      return {
        label: 'Risque inacceptable',
        icon: AlertTriangle,
        colors: {
          bg: 'bg-red-50',
          border: 'border-red-300',
          text: 'text-red-800',
          iconColor: 'text-red-600',
        }
      }
    case 'high':
      return {
        label: 'Risque élevé',
        icon: AlertCircle,
        colors: {
          bg: 'bg-orange-50',
          border: 'border-orange-300',
          text: 'text-orange-800',
          iconColor: 'text-orange-600',
        }
      }
    case 'limited':
      return {
        label: 'Risque limité',
        icon: Shield,
        colors: {
          bg: 'bg-amber-50',
          border: 'border-amber-300',
          text: 'text-amber-800',
          iconColor: 'text-amber-600',
        }
      }
    case 'minimal':
      return {
        label: 'Risque minimal',
        icon: CheckCircle,
        colors: {
          bg: 'bg-[#f1fdfa]',
          border: 'border-green-300',
          text: 'text-green-800',
          iconColor: 'text-green-600',
        }
      }
  }
}

export function RiskLevelBadge({
  riskLevel,
  classificationStatus = null,
  loading = false,
  error = null,
  className = '',
}: RiskLevelBadgeProps) {
  if (loading) {
    return (
      <div className={`inline-flex items-center px-4 py-2 rounded-lg border-2 bg-gray-50 border-gray-200 ${className}`}>
        <div className="animate-spin h-4 w-4 border-2 border-gray-400 border-t-transparent rounded-full mr-2" />
        <span className="text-sm font-semibold text-gray-600">Analyse du risque...</span>
      </div>
    )
  }

  if (classificationStatus === 'impossible') {
    return (
      <div
        className={`inline-flex items-center px-4 py-2 rounded-lg border-2 transition-all duration-200 bg-violet-50 border-violet-200 shadow-sm ${className}`}
        title="Qualification réglementaire : pivots non tranchés (réponses « Je ne sais pas »)."
      >
        <HelpCircle className="h-5 w-5 text-violet-600 mr-2.5 flex-shrink-0" />
        <div className="flex flex-col text-left min-w-0">
          <span className="text-xs font-medium text-violet-800 opacity-90">Niveau IA Act</span>
          <span className="text-sm font-bold text-violet-900 leading-tight">
            Classification impossible
          </span>
          <span className="text-xs text-violet-800/80 mt-0.5">
            Complétez ou précisez les réponses « Je ne sais pas » sur les pivots juridiques.
          </span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div
        className={`inline-flex items-center px-4 py-2 rounded-lg border-2 border-amber-200 bg-amber-50 ${className}`}
        title={error}
      >
        <AlertCircle className="h-4 w-4 text-amber-600 mr-2 flex-shrink-0" />
        <span className="text-sm font-semibold text-amber-900">
          Impossible de charger le niveau IA Act
        </span>
      </div>
    )
  }

  if (!riskLevel) {
    return (
      <div className={`inline-flex items-center px-4 py-2 rounded-lg border-2 bg-gray-50 border-gray-200 ${className}`}>
        <Shield className="h-4 w-4 text-gray-400 mr-2 flex-shrink-0" />
        <div className="flex flex-col text-left min-w-0">
          <span className="text-xs font-medium text-gray-600 opacity-90">Niveau IA Act</span>
          <span className="text-sm font-bold text-gray-800 leading-tight">Non évalué</span>
        </div>
      </div>
    )
  }

  const config = getRiskLevelConfig(riskLevel)
  const Icon = config.icon

  return (
    <div 
      className={`
        inline-flex items-center px-4 py-2 rounded-lg border-2 transition-all duration-200
        ${config.colors.bg} ${config.colors.border} 
        ${className}
        shadow-sm 
      `}
      title={`Niveau IA Act : ${config.label}`}
    >
      <Icon className={`h-5 w-5 ${config.colors.iconColor} mr-2.5 flex-shrink-0`} />
      <div className="flex flex-col text-left min-w-0">
        <span className={`text-xs font-medium ${config.colors.text} opacity-75`}>
          Niveau IA Act
        </span>
        <span className={`text-sm font-bold ${config.colors.text} leading-tight`}>
          {config.label}
        </span>
      </div>
    </div>
  )
}