import React from 'react'
import { Shield, AlertTriangle, AlertCircle, CheckCircle } from 'lucide-react'

type RiskLevel = 'unacceptable' | 'high' | 'limited' | 'minimal'

interface RiskLevelBadgeProps {
  riskLevel: RiskLevel | null
  loading?: boolean
  error?: string | null
  className?: string
}

const getRiskLevelConfig = (level: RiskLevel) => {
  switch (level) {
    case 'unacceptable':
      return {
        label: 'Risque Inacceptable',
        icon: AlertTriangle,
        colors: {
          bg: 'bg-red-50',
          border: 'border-red-300',
          text: 'text-red-800',
          iconColor: 'text-red-600',
          hoverBg: 'hover:bg-red-100',
          animation: 'animate-pulse'
        }
      }
    case 'high':
      return {
        label: 'Risque Élevé',
        icon: AlertCircle,
        colors: {
          bg: 'bg-orange-50',
          border: 'border-orange-300',
          text: 'text-orange-800',
          iconColor: 'text-orange-600',
          hoverBg: 'hover:bg-orange-100',
          animation: ''
        }
      }
    case 'limited':
      return {
        label: 'Risque Limité',
        icon: Shield,
        colors: {
          bg: 'bg-amber-50',
          border: 'border-amber-300',
          text: 'text-amber-800',
          iconColor: 'text-amber-600',
          hoverBg: 'hover:bg-amber-100',
          animation: ''
        }
      }
    case 'minimal':
      return {
        label: 'Risque Minimal',
        icon: CheckCircle,
        colors: {
          bg: 'bg-green-50',
          border: 'border-green-300',
          text: 'text-green-800',
          iconColor: 'text-green-600',
          hoverBg: 'hover:bg-green-100',
          animation: ''
        }
      }
  }
}

export function RiskLevelBadge({ riskLevel, loading = false, error = null, className = '' }: RiskLevelBadgeProps) {
  if (loading) {
    return (
      <div className={`inline-flex items-center px-4 py-2 rounded-lg border-2 bg-gray-50 border-gray-200 ${className}`}>
        <div className="animate-spin h-4 w-4 border-2 border-gray-400 border-t-transparent rounded-full mr-2" />
        <span className="text-sm font-semibold text-gray-600">Analyse du risque...</span>
      </div>
    )
  }

  if (error || !riskLevel) {
    return (
      <div className={`inline-flex items-center px-4 py-2 rounded-lg border-2 bg-gray-50 border-gray-200 ${className}`}>
        <Shield className="h-4 w-4 text-gray-400 mr-2" />
        <span className="text-sm font-semibold text-gray-600">Niveau de risque indisponible</span>
      </div>
    )
  }

  const config = getRiskLevelConfig(riskLevel)
  const Icon = config.icon

  return (
    <div 
      className={`
        inline-flex items-center px-4 py-2 rounded-lg border-2 transition-all duration-200
        ${config.colors.bg} ${config.colors.border} ${config.colors.hoverBg}
        ${config.colors.animation} ${className}
        shadow-sm hover:shadow-md
      `}
      title={`Niveau de risque selon l'IA Act: ${config.label}`}
    >
      <Icon className={`h-5 w-5 ${config.colors.iconColor} mr-2.5`} />
      <div className="flex flex-col">
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