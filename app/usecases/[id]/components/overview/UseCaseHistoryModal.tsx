'use client'

import React, { useEffect, useState } from 'react'
import { X, History, Plus, RefreshCw, FileUp, Edit, ArrowRight, TrendingUp, TrendingDown, Minus, RotateCcw, FilePen } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import {
  UseCaseHistoryEntry,
  UseCaseHistoryEventType,
  FIELD_LABELS,
  DOC_TYPE_LABELS,
  EVENT_TYPE_LABELS,
  formatValueForDisplay,
  formatRelativeDate
} from '@/lib/usecase-history'

interface UseCaseHistoryModalProps {
  isOpen: boolean
  onClose: () => void
  usecaseId: string
  usecaseName: string
}

const EVENT_ICONS: Record<UseCaseHistoryEventType, React.ReactNode> = {
  created: <Plus className="h-4 w-4" />,
  reevaluated: <RefreshCw className="h-4 w-4" />,
  document_uploaded: <FileUp className="h-4 w-4" />,
  document_modified: <FilePen className="h-4 w-4" />,
  document_reset: <RotateCcw className="h-4 w-4" />,
  field_updated: <Edit className="h-4 w-4" />
}

const EVENT_COLORS: Record<UseCaseHistoryEventType, { bg: string; text: string }> = {
  created: { bg: 'bg-green-100', text: 'text-green-600' },
  reevaluated: { bg: 'bg-blue-100', text: 'text-blue-600' },
  document_uploaded: { bg: 'bg-purple-100', text: 'text-purple-600' },
  document_modified: { bg: 'bg-amber-100', text: 'text-amber-600' },
  document_reset: { bg: 'bg-red-100', text: 'text-red-600' },
  field_updated: { bg: 'bg-orange-100', text: 'text-orange-600' }
}

export const UseCaseHistoryModal: React.FC<UseCaseHistoryModalProps> = ({
  isOpen,
  onClose,
  usecaseId,
  usecaseName
}) => {
  const { session } = useAuth()
  const [history, setHistory] = useState<UseCaseHistoryEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen && usecaseId && session?.access_token) {
      fetchHistory()
    }
  }, [isOpen, usecaseId, session?.access_token])

  const fetchHistory = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/usecases/${usecaseId}/history`, {
        headers: {
          Authorization: `Bearer ${session?.access_token}`
        }
      })

      if (!response.ok) {
        throw new Error('Erreur lors du chargement de l\'historique')
      }

      const data = await response.json()
      setHistory(data.history || [])
    } catch (err) {
      console.error('Error fetching history:', err)
      setError('Impossible de charger l\'historique')
    } finally {
      setLoading(false)
    }
  }

  const getEventTitle = (entry: UseCaseHistoryEntry): string => {
    if (entry.event_type === 'field_updated' && entry.field_name) {
      const fieldLabel = FIELD_LABELS[entry.field_name] || entry.field_name
      return `${fieldLabel} modifié`
    }
    if (entry.event_type === 'document_uploaded' && entry.metadata?.doc_type) {
      const docTypeLabel = DOC_TYPE_LABELS[String(entry.metadata.doc_type)] || String(entry.metadata.doc_type)
      return `Document complété : ${docTypeLabel}`
    }
    if (entry.event_type === 'document_modified' && entry.metadata?.doc_type) {
      const docTypeLabel = DOC_TYPE_LABELS[String(entry.metadata.doc_type)] || String(entry.metadata.doc_type)
      return `Document modifié : ${docTypeLabel}`
    }
    if (entry.event_type === 'document_reset' && entry.metadata?.doc_type) {
      const docTypeLabel = DOC_TYPE_LABELS[String(entry.metadata.doc_type)] || String(entry.metadata.doc_type)
      return `Document réinitialisé : ${docTypeLabel}`
    }
    return EVENT_TYPE_LABELS[entry.event_type]
  }

  const getUserName = (entry: UseCaseHistoryEntry): string => {
    if (entry.user?.first_name || entry.user?.last_name) {
      return `${entry.user.first_name || ''} ${entry.user.last_name || ''}`.trim()
    }
    return 'Utilisateur inconnu'
  }

  const renderScoreChange = (entry: UseCaseHistoryEntry) => {
    const metadata = entry.metadata
    if (!metadata) return null

    const previousScore = metadata.previous_score as number | null
    const newScore = metadata.new_score as number | null
    const scoreChange = metadata.score_change as number | null

    // Si pas de données de score, ne rien afficher
    if (newScore === null || newScore === undefined) return null

    // Arrondir les scores à l'entier
    const roundedNewScore = Math.round(newScore)
    const roundedPreviousScore = previousScore !== null ? Math.round(previousScore) : null
    const roundedScoreChange = scoreChange !== null ? Math.round(scoreChange) : null

    // Première évaluation (pas de score précédent)
    if (roundedPreviousScore === null) {
      return (
        <div className="mt-2 p-2 bg-blue-50 rounded-lg">
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium text-blue-700">Score initial :</span>
            <span className="text-lg font-bold text-blue-600">{roundedNewScore}</span>
          </div>
        </div>
      )
    }

    // Évolution du score
    const isPositive = roundedScoreChange !== null && roundedScoreChange > 0
    const isNegative = roundedScoreChange !== null && roundedScoreChange < 0
    const isNeutral = roundedScoreChange === 0 || roundedScoreChange === null

    return (
      <div className={`mt-2 p-2 rounded-lg ${isPositive ? 'bg-green-50' : isNegative ? 'bg-red-50' : 'bg-gray-50'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="text-center">
              <span className="text-xs text-gray-500 block">Avant</span>
              <span className="text-sm font-medium text-gray-700">{roundedPreviousScore}</span>
            </div>
            <ArrowRight className="h-4 w-4 text-gray-400" />
            <div className="text-center">
              <span className="text-xs text-gray-500 block">Après</span>
              <span className="text-sm font-medium text-gray-700">{roundedNewScore}</span>
            </div>
          </div>
          {!isNeutral && (
            <div className={`flex items-center space-x-1 px-2 py-1 rounded-full ${
              isPositive ? 'bg-green-100' : 'bg-red-100'
            }`}>
              {isPositive ? (
                <TrendingUp className="h-3 w-3 text-green-600" />
              ) : (
                <TrendingDown className="h-3 w-3 text-red-600" />
              )}
              <span className={`text-xs font-medium ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                {isPositive ? '+' : ''}{roundedScoreChange}
              </span>
            </div>
          )}
          {isNeutral && (
            <div className="flex items-center space-x-1 px-2 py-1 rounded-full bg-gray-100">
              <Minus className="h-3 w-3 text-gray-500" />
              <span className="text-xs font-medium text-gray-500">Stable</span>
            </div>
          )}
        </div>
      </div>
    )
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-2xl shadow-2xl max-w-lg w-full transform transition-all max-h-[80vh] flex flex-col">
          {/* Header */}
          <div className="px-6 pt-6 pb-4 border-b border-gray-100 flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-[#0080A3]/10 rounded-lg">
                  <History className="h-6 w-6 text-[#0080A3]" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">
                    Historique
                  </h3>
                  <p className="text-sm text-gray-500 truncate max-w-[280px]">
                    {usecaseName}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors p-1 hover:bg-gray-100 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="px-6 py-4 overflow-y-auto flex-1">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0080A3] mb-3"></div>
                <p className="text-gray-500 text-sm">Chargement de l'historique...</p>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center py-12">
                <p className="text-red-500 text-sm mb-3">{error}</p>
                <button
                  onClick={fetchHistory}
                  className="text-[#0080A3] hover:text-[#006280] text-sm font-medium"
                >
                  Réessayer
                </button>
              </div>
            ) : history.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <History className="h-12 w-12 text-gray-300 mb-3" />
                <p className="text-gray-500 text-sm">Aucun historique disponible</p>
              </div>
            ) : (
              <div className="space-y-4">
                {history.map((entry, index) => {
                  const colors = EVENT_COLORS[entry.event_type]
                  return (
                    <div
                      key={entry.id}
                      className={`relative ${index !== history.length - 1 ? 'pb-4 border-b border-gray-100' : ''}`}
                    >
                      <div className="flex items-start space-x-3">
                        {/* Icon */}
                        <div className={`p-2 rounded-lg flex-shrink-0 ${colors.bg}`}>
                          <span className={colors.text}>
                            {EVENT_ICONS[entry.event_type]}
                          </span>
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900">
                            {getEventTitle(entry)}
                          </p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            Par {getUserName(entry)} • {formatRelativeDate(entry.created_at)}
                          </p>

                          {/* Show old/new values for field updates */}
                          {entry.event_type === 'field_updated' && (entry.old_value !== null || entry.new_value !== null) ? (
                            <div className="mt-2 p-2 bg-gray-50 rounded-lg text-xs">
                              <div className="flex items-start space-x-2">
                                <div className="flex-1">
                                  <span className="text-gray-500">Avant :</span>
                                  <p className="text-gray-700 break-words">
                                    {formatValueForDisplay(entry.old_value, 150)}
                                  </p>
                                </div>
                                <ArrowRight className="h-4 w-4 text-gray-400 flex-shrink-0 mt-3" />
                                <div className="flex-1">
                                  <span className="text-gray-500">Après :</span>
                                  <p className="text-gray-700 break-words">
                                    {formatValueForDisplay(entry.new_value, 150)}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ) : null}

                          {/* Show document type for uploads */}
                          {entry.event_type === 'document_uploaded' && entry.metadata?.doc_type ? (
                            <p className="text-xs text-gray-500 mt-1">
                              Type : {DOC_TYPE_LABELS[String(entry.metadata.doc_type)] || String(entry.metadata.doc_type)}
                            </p>
                          ) : null}

                          {/* Show score evolution for events that can change the score */}
                          {(entry.event_type === 'reevaluated' || entry.event_type === 'document_uploaded' || entry.event_type === 'document_reset' || entry.event_type === 'document_modified') && entry.metadata?.new_score !== undefined ? (
                            renderScoreChange(entry)
                          ) : null}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-100 flex-shrink-0">
            <button
              onClick={onClose}
              className="w-full px-4 py-2.5 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition-colors"
            >
              Fermer
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default UseCaseHistoryModal
