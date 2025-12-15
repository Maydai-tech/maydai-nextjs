'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import { useApiCall } from '@/lib/api-client-legacy'
import { FileText, ChevronRight, Check, AlertTriangle } from 'lucide-react'
import { getCompactScoreStyle } from '@/lib/score-styles'
import UnacceptableCaseModal from '@/components/Shared/UnacceptableCaseModal'

interface UseCase {
  id: string
  name: string
  description: string
  company_id: string
  created_at: string
  updated_at: string
  status: 'draft' | 'active' | 'archived'
  risk_level?: string
  score_final?: number | null
  deployment_date?: string | null
}

interface CompletionData {
  completed: number
  total: number
  percentage: number
}

interface DocumentStatus {
  hasDocument: boolean
  status: 'incomplete' | 'complete' | 'validated'
}

export default function DossiersComplianceView() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const params = useParams()
  const companyId = params.id as string
  const api = useApiCall()
  const [useCases, setUseCases] = useState<UseCase[]>([])
  const [completions, setCompletions] = useState<Record<string, CompletionData>>({})
  const [documentStatuses, setDocumentStatuses] = useState<Record<string, DocumentStatus>>({})
  const [loadingData, setLoadingData] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [hasFetched, setHasFetched] = useState(false)
  const [showUnacceptableModal, setShowUnacceptableModal] = useState(false)
  const [selectedUseCase, setSelectedUseCase] = useState<UseCase | null>(null)
  const [updatingDate, setUpdatingDate] = useState(false)

  // Fonction pour déterminer le type de document requis pour un cas inacceptable
  const getRequiredDocumentType = (useCase: UseCase): 'stopping_proof' | 'system_prompt' | null => {
    if (!useCase.risk_level || useCase.risk_level.toLowerCase() !== 'unacceptable') {
      return null
    }

    if (!useCase.deployment_date) {
      return null
    }

    const deploymentDate = new Date(useCase.deployment_date)
    const today = new Date()
    today.setHours(0, 0, 0, 0) // Normaliser à minuit

    return deploymentDate < today ? 'stopping_proof' : 'system_prompt'
  }

  // Fonction pour vérifier si un cas est inacceptable (pour affichage du badge au lieu de la progression)
  const isUnacceptableCase = (useCase: UseCase): boolean => {
    return useCase.risk_level?.toLowerCase() === 'unacceptable' && !!useCase.deployment_date
  }

  // Fonction pour obtenir les configurations de style selon le niveau de risque
  const getRiskLevelConfig = (riskLevel: string) => {
    switch (riskLevel?.toLowerCase()) {
      case 'minimal':
        return {
          bg: 'bg-[#f1fdfa]',
          border: 'border-green-300',
          text: 'text-green-800',
          label: 'Minimal'
        }
      case 'limited':
        return {
          bg: 'bg-yellow-50',
          border: 'border-yellow-300',
          text: 'text-yellow-800',
          label: 'Limité'
        }
      case 'high':
        return {
          bg: 'bg-orange-50',
          border: 'border-orange-300',
          text: 'text-orange-800',
          label: 'Élevé'
        }
      case 'unacceptable':
        return {
          bg: 'bg-red-50',
          border: 'border-red-300',
          text: 'text-red-800',
          label: 'Inacceptable'
        }
      default:
        return {
          bg: 'bg-gray-50',
          border: 'border-gray-300',
          text: 'text-gray-800',
          label: 'Non évalué'
        }
    }
  }

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router])

  useEffect(() => {
    const fetchData = async () => {
      if (!user || hasFetched) return

      try {
        setLoadingData(true)

        // Récupérer les use cases
        const result = await api.get('/api/usecases')

        if (result.data) {
          // Filtrer uniquement les use cases du registre actuel
          const filteredUseCases = result.data.filter((uc: UseCase) => uc.company_id === companyId)
          setUseCases(filteredUseCases)

          // Récupérer les taux de complétion pour chaque use case filtré
          const completionPromises = filteredUseCases.map(async (uc: UseCase) => {
            try {
              const completionResult = await api.get(`/api/dossiers/${uc.id}/completion`)
              return { id: uc.id, data: completionResult.data }
            } catch (err) {
              console.error(`Error fetching completion for ${uc.id}:`, err)
              return { id: uc.id, data: { completed: 0, total: 8, percentage: 0 } }
            }
          })

          const completionResults = await Promise.all(completionPromises)
          const completionMap: Record<string, CompletionData> = {}
          completionResults.forEach(result => {
            completionMap[result.id] = result.data
          })
          setCompletions(completionMap)

          // Récupérer les statuts de documents pour les cas inacceptables
          const documentStatusPromises = filteredUseCases
            .filter((uc: UseCase) => isUnacceptableCase(uc))
            .map(async (uc: UseCase) => {
              const docType = getRequiredDocumentType(uc)
              if (!docType) return null

              try {
                const docResult = await api.get(`/api/dossiers/${uc.id}/${docType}`)
                return {
                  id: uc.id,
                  data: {
                    hasDocument: !!(docResult.data?.fileUrl || docResult.data?.formData?.system_instructions),
                    status: docResult.data?.status || 'incomplete'
                  }
                }
              } catch (err) {
                console.error(`Error fetching ${docType} for ${uc.id}:`, err)
                return {
                  id: uc.id,
                  data: { hasDocument: false, status: 'incomplete' as const }
                }
              }
            })

          const docResults = await Promise.all(documentStatusPromises)
          const docMap: Record<string, DocumentStatus> = {}
          docResults.forEach(result => {
            if (result) docMap[result.id] = result.data
          })
          setDocumentStatuses(docMap)

          setHasFetched(true)
        }
      } catch (err) {
        console.error('Error fetching use cases:', err)
        setError('Erreur lors du chargement des dossiers')
      } finally {
        setLoadingData(false)
      }
    }

    fetchData()
  }, [user, api, hasFetched, companyId])

  const handleUseCaseClick = (useCase: UseCase) => {
    // Toujours naviguer vers la page de détail (qui gère maintenant les cas inacceptables)
    router.push(`/dashboard/${companyId}/dossiers/${useCase.id}`)
  }

  const handleUpdateDeploymentDate = async (date: string) => {
    if (!selectedUseCase) return

    try {
      setUpdatingDate(true)
      const result = await api.put(`/api/usecases/${selectedUseCase.id}`, {
        deployment_date: date
      })

      if (result.data) {
        // Mettre à jour le useCase local
        setUseCases(prevUseCases =>
          prevUseCases.map(uc =>
            uc.id === selectedUseCase.id
              ? { ...uc, deployment_date: date }
              : uc
          )
        )
        setSelectedUseCase({ ...selectedUseCase, deployment_date: date })
      }
    } catch (error) {
      console.error('Error updating deployment date:', error)
      throw error
    } finally {
      setUpdatingDate(false)
    }
  }

  if (loading || loadingData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0080A3]"></div>
          <p className="mt-4 text-gray-600">Chargement des dossiers...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Erreur</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="inline-flex items-center px-4 py-2 bg-[#0080A3] text-white font-medium rounded-lg hover:bg-[#006280] transition-colors"
          >
            Réessayer
          </button>
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Dossiers de Conformité</h1>
            <p className="mt-2 text-gray-600">
              Suivi de la conformité réglementaire pour tous vos cas d'usage IA
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Liste des dossiers */}
        <div className="space-y-4">
          {useCases.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun cas d'usage trouvé</h3>
              <p className="text-gray-600">Commencez par créer votre premier cas d'usage.</p>
            </div>
          ) : (
            useCases.map((useCase) => {
              const completion = completions[useCase.id] || { completed: 0, total: 8, percentage: 0 }

              return (
                <div
                  key={useCase.id}
                  className="bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => handleUseCaseClick(useCase)}
                >
                  <div className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center justify-between gap-3 mb-2">
                          <div className="flex items-center gap-3">
                            <FileText className="w-6 h-6 text-[#0080A3]" />
                            <h3 className="text-xl font-semibold text-gray-900">{useCase.name}</h3>
                          </div>

                          {/* Badges Niveau de Risque et Score - alignés à droite */}
                          <div className="flex flex-wrap gap-2">
                            {/* Badge Niveau de Risque */}
                            <div className={`px-3 py-2 rounded-lg border ${getRiskLevelConfig(useCase.risk_level || '').bg} ${getRiskLevelConfig(useCase.risk_level || '').border}`}>
                              <div className="flex flex-col gap-0.5">
                                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">
                                  Niveau de risque
                                </span>
                                <span className={`text-xs font-semibold ${getRiskLevelConfig(useCase.risk_level || '').text}`}>
                                  {getRiskLevelConfig(useCase.risk_level || '').label}
                                </span>
                              </div>
                            </div>

                            {/* Badge Score de conformité */}
                            {useCase.score_final !== null && useCase.score_final !== undefined ? (
                              <div className={`px-3 py-2 rounded-lg ${getCompactScoreStyle(useCase.score_final).bg}`}>
                                <div className="flex flex-col gap-0.5">
                                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">
                                    Score de conformité
                                  </span>
                                  <div className="flex items-center gap-2">
                                    <div className={`w-2 h-2 rounded-full ${getCompactScoreStyle(useCase.score_final).indicator}`}></div>
                                    <span className={`text-xs font-semibold ${getCompactScoreStyle(useCase.score_final).accent}`}>
                                      {Math.round(useCase.score_final)}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div className="px-3 py-2 rounded-lg bg-gray-50 border border-gray-200">
                                <div className="flex flex-col gap-0.5">
                                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">
                                    Score de conformité
                                  </span>
                                  <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-gray-400"></div>
                                    <span className="text-xs font-semibold text-gray-600">
                                      N/A
                                    </span>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                        <p className="text-gray-600 mb-4 line-clamp-2">{useCase.description}</p>

                        {/* Badge de statut pour les cas inacceptables, sinon barre de progression */}
                        {isUnacceptableCase(useCase) ? (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-sm mb-2">
                              <span className="text-gray-600">Statut de conformité</span>
                            </div>
                            {(() => {
                              const docType = getRequiredDocumentType(useCase)
                              const docStatus = documentStatuses[useCase.id]
                              const isComplete = docStatus?.status === 'complete' || docStatus?.status === 'validated'

                              if (docType === 'stopping_proof') {
                                return isComplete ? (
                                  <div className="inline-flex items-center gap-2 px-4 py-3 bg-green-50 border border-green-300 rounded-lg">
                                    <Check className="w-5 h-5 text-green-600" />
                                    <span className="text-sm font-semibold text-green-800">
                                      Preuve d'arrêt complétée
                                    </span>
                                  </div>
                                ) : (
                                  <div className="inline-flex items-center gap-2 px-4 py-3 bg-orange-50 border border-orange-300 rounded-lg">
                                    <AlertTriangle className="w-5 h-5 text-orange-600" />
                                    <span className="text-sm font-semibold text-orange-800">
                                      Preuve d'arrêt à compléter
                                    </span>
                                  </div>
                                )
                              } else if (docType === 'system_prompt') {
                                return isComplete ? (
                                  <div className="inline-flex items-center gap-2 px-4 py-3 bg-green-50 border border-green-300 rounded-lg">
                                    <Check className="w-5 h-5 text-green-600" />
                                    <span className="text-sm font-semibold text-green-800">
                                      Instructions système enregistrées
                                    </span>
                                  </div>
                                ) : (
                                  <div className="inline-flex items-center gap-2 px-4 py-3 bg-orange-50 border border-orange-300 rounded-lg">
                                    <AlertTriangle className="w-5 h-5 text-orange-600" />
                                    <span className="text-sm font-semibold text-orange-800">
                                      Instructions système à compléter
                                    </span>
                                  </div>
                                )
                              }
                              return null
                            })()}
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-gray-600">Progression de la conformité</span>
                              <span className="font-semibold text-[#0080A3]">
                                {completion.completed}/{completion.total} documents complétés
                              </span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-3">
                              <div
                                className="h-3 rounded-full transition-all duration-300 bg-[#0080A3]"
                                style={{ width: `${completion.percentage}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="ml-6">
                        <ChevronRight className="w-6 h-6 text-gray-400" />
                      </div>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* Modal pour les cas inacceptables */}
      <UnacceptableCaseModal
        isOpen={showUnacceptableModal}
        onClose={() => {
          setShowUnacceptableModal(false)
          setSelectedUseCase(null)
        }}
        useCase={selectedUseCase}
        companyId={companyId}
        onUpdateDeploymentDate={handleUpdateDeploymentDate}
        updating={updatingDate}
      />
    </div>
  )
}
