import React from 'react'
import { UseCase } from '../../types/usecase'
import { Calendar, Users, Clock, AlertTriangle, CheckCircle, Lightbulb, ArrowRight } from 'lucide-react'
import { useNextSteps } from '../../hooks/useNextSteps'
import Link from 'next/link'

interface UseCaseDetailsProps {
  useCase: UseCase
  onUpdateUseCase?: (updates: Partial<UseCase>) => Promise<UseCase | null>
  updating?: boolean
}

export function UseCaseDetails({ useCase, onUpdateUseCase, updating = false }: UseCaseDetailsProps) {
  const { nextSteps, loading: nextStepsLoading, error: nextStepsError } = useNextSteps(useCase.id)
  
  return (
    <div className="lg:col-span-2 space-y-6">
      {/* Description - Section avec placeholder */}
      <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Description</h2>
        {useCase.description && useCase.description.trim() ? (
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

      {/* Plan d'action Mistral */}
      <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">{"Plan d'action"}</h2>
        
        <div className="space-y-4">
          {/* Quick wins */}
          <div className="border-l-4 border-green-400 pl-4">
            <div className="flex items-center space-x-2 mb-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <h3 className="font-medium text-gray-900">Priorités d'actions réglementaires</h3>
            </div>
            <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-4">
              {nextStepsLoading ? (
                <div className="flex items-center justify-center py-4">
                  <div className="animate-spin h-6 w-6 border-2 border-[#0080a3] border-t-transparent rounded-full"></div>
                  <span className="ml-2 text-gray-600">Chargement des actions prioritaires...</span>
                </div>
              ) : nextStepsError ? (
                <p className="text-red-500 text-sm">
                  Erreur lors du chargement des actions prioritaires
                </p>
              ) : nextSteps && (nextSteps.priorite_1 || nextSteps.priorite_2 || nextSteps.priorite_3) ? (
                <div className="space-y-3">
                  {nextSteps.priorite_1 && (
                    <div className="flex items-start">
                      <div className="w-2 h-2 bg-green-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                      <p className="text-gray-800 text-sm leading-relaxed">
                        <strong>{nextSteps.priorite_1}</strong>
                      </p>
                    </div>
                  )}
                  {nextSteps.priorite_2 && (
                    <div className="flex items-start">
                      <div className="w-2 h-2 bg-green-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                      <p className="text-gray-800 text-sm leading-relaxed">
                        <strong>{nextSteps.priorite_2}</strong>
                      </p>
                    </div>
                  )}
                  {nextSteps.priorite_3 && (
                    <div className="flex items-start">
                      <div className="w-2 h-2 bg-green-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                      <p className="text-gray-800 text-sm leading-relaxed">
                        <strong>{nextSteps.priorite_3}</strong>
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-gray-500 italic text-sm">
                  Les actions rapides seront générées automatiquement
                </p>
              )}
            </div>
            
            {/* Bouton pour voir le rapport complet */}
            <div className="mt-4 pt-3 border-t border-gray-200">
              <Link 
                href={`/usecases/${useCase.id}/rapport`}
                className="inline-flex items-center px-4 py-2 bg-[#0080a3] text-white text-sm font-medium rounded-lg hover:bg-[#006b8a] transition-colors duration-200"
              >
                <span>Voir tous les détails du plan d'action</span>
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </div>
          </div>

          {/* Avertissements */}
          <div className="border-l-4 border-amber-400 pl-4">
            <div className="flex items-center space-x-2 mb-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              <h3 className="font-medium text-gray-900">Avertissements</h3>
            </div>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <div className="space-y-4">
                <p className="text-sm text-gray-700 mb-4">
                  Le non-respect de l'AI Act peut entraîner des sanctions sévères.
                </p>
                
                <div className="space-y-3">
                  <div className="flex items-start">
                    <img 
                      src="/icons/withdraw.png" 
                      alt="Sanctions" 
                      width={16} 
                      height={16} 
                      className="mr-2 mt-0.5 flex-shrink-0"
                    />
                    <div className="flex-1">
                      <h5 className="text-xs font-semibold text-gray-900 mb-1">
                        Violations des pratiques interdites (Article 5)
                      </h5>
                      <p className="text-xs text-gray-600">
                        Amendes jusqu'à <strong className="text-[#0080a3]">35 millions d'euros</strong> ou <strong className="text-[#0080a3]">7% du chiffre d'affaires annuel mondial</strong>.
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <img 
                      src="/icons/auction.png" 
                      alt="Sanctions pour non-conformité" 
                      width={16} 
                      height={16} 
                      className="mr-2 mt-0.5 flex-shrink-0"
                    />
                    <div className="flex-1">
                      <h5 className="text-xs font-semibold text-gray-900 mb-1">
                        Violations des obligations pour les systèmes d'IA à haut risque
                      </h5>
                      <p className="text-xs text-gray-600">
                        Amendes jusqu'à <strong className="text-[#0080a3]">15 millions d'euros</strong> ou <strong className="text-[#0080a3]">3% du chiffre d'affaires annuel mondial</strong>.
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <img 
                      src="/icons/lawyer.png" 
                      alt="Sanctions pour informations incorrectes" 
                      width={16} 
                      height={16} 
                      className="mr-2 mt-0.5 flex-shrink-0"
                    />
                    <div className="flex-1">
                      <h5 className="text-xs font-semibold text-gray-900 mb-1">
                        Fourniture d'informations inexactes, incomplètes ou trompeuses
                      </h5>
                      <p className="text-xs text-gray-600">
                        Amendes jusqu'à <strong className="text-[#0080a3]">7,5 millions d'euros</strong> ou <strong className="text-[#0080a3]">1% du chiffre d'affaires annuel mondial</strong>.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Sujets LLM indépendants */}
          <div className="border-l-4 border-blue-400 pl-4">
            <div className="flex items-center space-x-2 mb-2">
              <Lightbulb className="h-5 w-5 text-blue-500" />
              <h3 className="font-medium text-gray-900">Sujets LLM indépendants</h3>
            </div>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <div className="space-y-4">
                <div className="flex items-center mb-3">
                  <img 
                    src="/icons/feuille.png" 
                    alt="Impact Social & Environmental" 
                    width={20} 
                    height={20} 
                    className="mr-2"
                  />
                  <h4 className="text-sm font-semibold text-gray-900">
                    Impact Social & Environmental
                  </h4>
                </div>
                
                <p className="text-sm text-gray-700 mb-4">
                  Les critères suivants sont intégrés aux demandes de transparence de l'AI Act mais ne sont pas encore transmises par les technologies concernées :
                </p>
                
                <div className="space-y-3">
                  <div className="flex items-start">
                    <img 
                      src="/icons/app.png" 
                      alt="Nombre de GPUs" 
                      width={16} 
                      height={16} 
                      className="mr-2 mt-0.5 flex-shrink-0"
                    />
                    <div className="flex-1">
                      <h5 className="text-xs font-semibold text-gray-900 mb-1">
                        Nombre de GPUs
                      </h5>
                      <p className="text-xs text-gray-600">
                        Nombre total d'unités de traitement graphique (GPU) utilisées pour entraîner le modèle d'IA. Les GPUs sont des composants très puissants mais aussi très énergivores.
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <img 
                      src="/icons/low-performance.png" 
                      alt="Consommation électrique par GPU" 
                      width={16} 
                      height={16} 
                      className="mr-2 mt-0.5 flex-shrink-0"
                    />
                    <div className="flex-1">
                      <h5 className="text-xs font-semibold text-gray-900 mb-1">
                        Consommation électrique par GPU
                      </h5>
                      <p className="text-xs text-gray-600">
                        Puissance électrique moyenne consommée par un seul GPU pendant l'entraînement, généralement mesurée en Watts (W).
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <img 
                      src="/icons/level-up.png" 
                      alt="Temps d'entraînement" 
                      width={16} 
                      height={16} 
                      className="mr-2 mt-0.5 flex-shrink-0"
                    />
                    <div className="flex-1">
                      <h5 className="text-xs font-semibold text-gray-900 mb-1">
                        Temps d'entraînement
                      </h5>
                      <p className="text-xs text-gray-600">
                        Durée totale nécessaire pour entraîner le modèle, souvent exprimée en heures.
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <img 
                      src="/icons/ecosystem.png" 
                      alt="Intensité carbone du datacenter" 
                      width={16} 
                      height={16} 
                      className="mr-2 mt-0.5 flex-shrink-0"
                    />
                    <div className="flex-1">
                      <h5 className="text-xs font-semibold text-gray-900 mb-1">
                        Intensité carbone du datacenter
                      </h5>
                      <p className="text-xs text-gray-600">
                        Mesure qui indique la quantité de dioxyde de carbone (CO2) émise pour produire une unité d'énergie.
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="mt-4 pt-3 border-t border-gray-200">
                  <p className="text-xs text-gray-600">
                    Dès que ces indicateurs seront disponibles, nous les ajouterons aux évaluations des LLM.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  )
}