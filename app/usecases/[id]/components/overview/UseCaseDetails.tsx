import React, { useState } from 'react'
import { UseCase } from '../../types/usecase'
import { ComplAIModel } from '@/lib/supabase'
import { Calendar, Users, Shield, Bot, Edit3 } from 'lucide-react'
import ModelSelectorModal from '../ModelSelectorModal'
import ComplAiScoreBadge from '../ComplAiScoreBadge'

interface UseCaseDetailsProps {
  useCase: UseCase
  onUpdateUseCase?: (updates: Partial<UseCase>) => Promise<UseCase | null>
  updating?: boolean
}

export function UseCaseDetails({ useCase, onUpdateUseCase, updating = false }: UseCaseDetailsProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)

  const handleModelEdit = () => {
    setIsModalOpen(true)
  }

  const handleModelSave = async (selectedModel: ComplAIModel | null) => {
    if (!onUpdateUseCase) return
    
    await onUpdateUseCase({ 
      primary_model_id: selectedModel?.id || null 
    })
  }

  const handleModalClose = () => {
    setIsModalOpen(false)
  }
  return (
    <div className="lg:col-span-2 space-y-6">
      {/* Description */}
      <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Description</h2>
        <p className="text-gray-600 leading-relaxed whitespace-pre-wrap">
          {useCase.description || 'Aucune description disponible.'}
        </p>
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
            <div className="text-sm font-medium text-gray-500 mb-1">Partenaire technologique</div>
            <div className="text-gray-900">{useCase.technology_partner || 'Non spécifié'}</div>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="text-sm font-medium text-gray-500 mb-3">Modèle COMPL-AI</div>
            
            <div className="flex items-center">
              <div 
                className="group relative inline-flex items-center px-3 py-2 bg-blue-50 text-blue-700 rounded-lg border border-blue-200 hover:bg-blue-100 transition-colors cursor-pointer w-full"
                onClick={onUpdateUseCase ? handleModelEdit : undefined}
                title={onUpdateUseCase ? "Cliquer pour modifier le modèle" : undefined}
              >
                <Bot className="h-4 w-4 mr-2 text-blue-500" />
                {useCase.compl_ai_models ? (
                  <div className="flex-1">
                    <span className="font-medium">{useCase.compl_ai_models.model_name}</span>
                    {useCase.compl_ai_models.model_provider && (
                      <span className="text-blue-600 ml-2">• {useCase.compl_ai_models.model_provider}</span>
                    )}
                    {useCase.compl_ai_models.version && (
                      <span className="text-blue-500 text-sm ml-2">(v{useCase.compl_ai_models.version})</span>
                    )}
                  </div>
                ) : (
                  <span className="text-gray-500 flex-1">Aucun modèle sélectionné</span>
                )}
                
                {/* Icône modifier intégrée */}
                {onUpdateUseCase && (
                  <Edit3 className="h-4 w-4 ml-3 text-blue-500" />
                )}
              </div>
            </div>
            
            {useCase.compl_ai_models && (
              <div className="mt-3 flex items-center justify-between">
                <div className="text-xs text-gray-600">
                  Ce modèle influence directement le bonus COMPL-AI appliqué au score final.
                </div>
                <ComplAiScoreBadge 
                  model={useCase.compl_ai_models} 
                  size="md"
                />
              </div>
            )}
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
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="text-sm font-medium text-gray-500 mb-1">Niveau de risque</div>
            <div className="text-gray-900 flex items-center">
              <Shield className="h-4 w-4 mr-2 text-gray-400" />
              {useCase.risk_level || 'Non évalué'}
            </div>
          </div>
        </div>
      </div>

      {/* Modal de sélection de modèle */}
      <ModelSelectorModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        currentModel={useCase.compl_ai_models || null}
        onSave={handleModelSave}
        saving={updating}
      />
    </div>
  )
} 