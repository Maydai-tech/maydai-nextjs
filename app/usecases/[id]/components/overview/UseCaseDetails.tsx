import React, { useState, useEffect, useCallback } from 'react'
import { UseCase } from '../../types/usecase'
import { Calendar, Users, Clock, Edit3 } from 'lucide-react'
import { CategoryScores } from '../CategoryScores'


interface UseCaseDetailsProps {
  useCase: UseCase
  onUpdateUseCase?: (updates: Partial<UseCase>) => Promise<UseCase | null>
  updating?: boolean
}

export function UseCaseDetails({ useCase, onUpdateUseCase, updating = false }: UseCaseDetailsProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(useCase.description || '')
  const [isSaving, setIsSaving] = useState(false)

  // Sync editValue when useCase.description changes
  useEffect(() => {
    setEditValue(useCase.description || '')
  }, [useCase.description])

  const handleSave = useCallback(async () => {
    if (!onUpdateUseCase || isSaving) return

    setIsSaving(true)
    try {
      await onUpdateUseCase({ description: editValue })
      setIsEditing(false)
    } catch (error) {
      console.error('Failed to save description:', error)
    } finally {
      setIsSaving(false)
    }
  }, [editValue, onUpdateUseCase, isSaving])

  const handleCancel = useCallback(() => {
    setEditValue(useCase.description || '')
    setIsEditing(false)
  }, [useCase.description])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      handleCancel()
    } else if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      handleSave()
    }
  }, [handleCancel, handleSave])

  return (
    <div className="lg:col-span-2 space-y-6">
      {/* Description - Section avec placeholder */}
      <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Description</h2>
          {!isEditing && onUpdateUseCase && (
            <button
              onClick={() => setIsEditing(true)}
              className="flex-shrink-0 inline-flex items-center px-3 py-1.5 text-sm font-medium text-[#0080A3] bg-[#0080A3]/10 rounded-lg hover:bg-[#0080A3]/20 transition-colors"
            >
              <Edit3 className="h-4 w-4 mr-1.5" />
              Modifier le résumé
            </button>
          )}
        </div>
        {isEditing ? (
          <div className="space-y-3">
            <textarea
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full h-40 p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0080A3] focus:border-[#0080A3] resize-y text-gray-800"
              placeholder="Décrivez votre cas d'usage..."
              autoFocus
              disabled={isSaving}
            />
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-500">
                Cmd+Entrée pour sauvegarder, Échap pour annuler
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCancel}
                  disabled={isSaving}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
                >
                  Annuler
                </button>
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="px-4 py-2 text-sm font-medium text-white bg-[#0080A3] rounded-lg hover:bg-[#006280] transition-colors disabled:opacity-50"
                >
                  {isSaving ? 'Enregistrement...' : 'Sauvegarder'}
                </button>
              </div>
            </div>
          </div>
        ) : useCase.description && useCase.description.trim() ? (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
            <p className="text-gray-800 leading-relaxed whitespace-pre-wrap">
              {useCase.description}
            </p>
          </div>
        ) : (
          <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
            <p className="text-gray-500 italic">
              Aucune description disponible pour ce cas d'usage
            </p>
          </div>
        )}
      </div>

      {/* Informations de suivi */}
      <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">{"Suivi du cas d'usage"}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex items-start space-x-3">
            <Calendar className="h-5 w-5 text-gray-400 mt-0.5" />
            <div>
              <div className="text-sm font-medium text-gray-500">Première soumission</div>
              <div className="text-gray-900">
                {useCase.created_at ? new Date(useCase.created_at).toLocaleDateString('fr-FR', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                }) : 'Non spécifiée'}
              </div>
            </div>
          </div>
          <div className="flex items-start space-x-3">
            <Clock className="h-5 w-5 text-gray-400 mt-0.5" />
            <div>
              <div className="text-sm font-medium text-gray-500">Dernière mise à jour</div>
              <div className="text-gray-900">
                {useCase.updated_at ? new Date(useCase.updated_at).toLocaleDateString('fr-FR', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                }) : 'Non spécifiée'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Technical Details */}
      <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Détails techniques</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="text-sm font-medium text-gray-500 mb-1">Catégorie IA</div>
            <div className="text-gray-900">{useCase.ai_category || 'Non spécifié'}</div>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="text-sm font-medium text-gray-500 mb-1">Type de système</div>
            <div className="text-gray-900">{useCase.system_type || 'Non spécifié'}</div>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="text-sm font-medium text-gray-500 mb-1">Service responsable</div>
            <div className="text-gray-900 flex items-center">
              <Users className="h-4 w-4 mr-2 text-gray-400" />
              {useCase.responsible_service || 'Non spécifié'}
            </div>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="text-sm font-medium text-gray-500 mb-1">Date de déploiement</div>
            <div className="text-gray-900 flex items-center">
              <Calendar className="h-4 w-4 mr-2 text-gray-400" />
              {useCase.deployment_date ? (
                // Check if it's a valid date format
                /^\d{4}-\d{2}-\d{2}$/.test(useCase.deployment_date) ? 
                  new Date(useCase.deployment_date).toLocaleDateString('fr-FR', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  }) :
                  useCase.deployment_date
              ) : 'Non spécifiée'}
            </div>
          </div>
        </div>
      </div>



    </div>
  )
}