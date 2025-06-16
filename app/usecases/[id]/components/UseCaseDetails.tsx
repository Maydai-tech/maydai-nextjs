import React from 'react'
import { UseCase } from '../types/usecase'
import { Calendar, Users, Shield } from 'lucide-react'

interface UseCaseDetailsProps {
  useCase: UseCase
}

export function UseCaseDetails({ useCase }: UseCaseDetailsProps) {
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
            <div className="text-sm font-medium text-gray-500 mb-1">Modèle LLM</div>
            <div className="text-gray-900">{useCase.llm_model_version || 'Non spécifié'}</div>
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
    </div>
  )
} 