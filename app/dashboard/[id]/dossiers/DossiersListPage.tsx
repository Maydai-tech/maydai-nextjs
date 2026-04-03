'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import { useApiCall } from '@/lib/api-client-legacy'
import { FileText, ChevronRight, Check, AlertTriangle } from 'lucide-react'
import { getCompactScoreStyle } from '@/lib/score-styles'
import {
  getUnacceptableActionDocTypesOrdered,
  isUnacceptableCase
} from '@/app/dashboard/[id]/todo-list/utils/todo-helpers'

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

type UnacceptableDocKey = 'stopping_proof' | 'system_prompt'

interface UnacceptableRow {
  key: UnacceptableDocKey
  doneLabel: string
  todoLabel: string
}

const UNACCEPTABLE_STATUS_ROWS: UnacceptableRow[] = [
  {
    key: 'stopping_proof',
    doneLabel: 'Preuve d\'arrêt complétée',
    todoLabel: 'Preuve d\'arrêt à compléter'
  },
  {
    key: 'system_prompt',
    doneLabel: 'Instructions système enregistrées',
    todoLabel: 'Instructions système à compléter'
  }
]

export default function DossiersComplianceView() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const params = useParams()
  const companyId = params.id as string
  const api = useApiCall()
  const [useCases, setUseCases] = useState<UseCase[]>([])
  const [completions, setCompletions] = useState<Record<string, CompletionData>>({})
  const [unacceptableDocStatuses, setUnacceptableDocStatuses] = useState<
    Record<string, Record<UnacceptableDocKey, DocumentStatus>>
  >({})
  const [loadingData, setLoadingData] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [hasFetched, setHasFetched] = useState(false)

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

        const result = await api.get('/api/usecases')

        if (result.data) {
          const filteredUseCases = result.data.filter((uc: UseCase) => uc.company_id === companyId)
          setUseCases(filteredUseCases)

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
          completionResults.forEach(r => {
            completionMap[r.id] = r.data
          })
          setCompletions(completionMap)

          const unacceptablePromises = filteredUseCases
            .filter((uc: UseCase) => isUnacceptableCase(uc))
            .map(async (uc: UseCase) => {
              const keys: UnacceptableDocKey[] = ['stopping_proof', 'system_prompt']
              const pair = await Promise.all(
                keys.map(async key => {
                  try {
                    const docResult = await api.get(`/api/dossiers/${uc.id}/${key}`)
                    const status: DocumentStatus = {
                      hasDocument: !!(
                        docResult.data?.fileUrl || docResult.data?.formData?.system_instructions
                      ),
                      status: docResult.data?.status || 'incomplete'
                    }
                    return [key, status] as const
                  } catch (err) {
                    console.error(`Error fetching ${key} for ${uc.id}:`, err)
                    return [key, { hasDocument: false, status: 'incomplete' as const }] as const
                  }
                })
              )
              return {
                id: uc.id,
                data: Object.fromEntries(pair) as Record<UnacceptableDocKey, DocumentStatus>
              }
            })

          const unacceptableResults = await Promise.all(unacceptablePromises)
          const unacceptableMap: Record<string, Record<UnacceptableDocKey, DocumentStatus>> = {}
          unacceptableResults.forEach(r => {
            unacceptableMap[r.id] = r.data
          })
          setUnacceptableDocStatuses(unacceptableMap)

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
    router.push(`/dashboard/${companyId}/dossiers/${useCase.id}`)
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
        <div className="space-y-4">
          {useCases.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun cas d'usage trouvé</h3>
              <p className="text-gray-600">Commencez par créer votre premier cas d'usage.</p>
            </div>
          ) : (
            useCases.map(useCase => {
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

                          <div className="flex flex-wrap gap-2">
                            <div
                              className={`px-3 py-2 rounded-lg border ${getRiskLevelConfig(useCase.risk_level || '').bg} ${getRiskLevelConfig(useCase.risk_level || '').border}`}
                            >
                              <div className="flex flex-col gap-0.5">
                                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">
                                  Niveau de risque
                                </span>
                                <span
                                  className={`text-xs font-semibold ${getRiskLevelConfig(useCase.risk_level || '').text}`}
                                >
                                  {getRiskLevelConfig(useCase.risk_level || '').label}
                                </span>
                              </div>
                            </div>

                            {useCase.score_final !== null && useCase.score_final !== undefined ? (
                              <div className={`px-3 py-2 rounded-lg ${getCompactScoreStyle(useCase.score_final).bg}`}>
                                <div className="flex flex-col gap-0.5">
                                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">
                                    Score de conformité
                                  </span>
                                  <div className="flex items-center gap-2">
                                    <div
                                      className={`w-2 h-2 rounded-full ${getCompactScoreStyle(useCase.score_final).indicator}`}
                                    ></div>
                                    <span
                                      className={`text-xs font-semibold ${getCompactScoreStyle(useCase.score_final).accent}`}
                                    >
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
                                    <span className="text-xs font-semibold text-gray-600">N/A</span>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                        <p className="text-gray-600 mb-4 line-clamp-2">{useCase.description}</p>

                        {isUnacceptableCase(useCase) ? (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-sm mb-2">
                              <span className="text-gray-600">Statut de conformité</span>
                            </div>
                            <div className="flex flex-col gap-2">
                              {(() => {
                                const byKey = unacceptableDocStatuses[useCase.id]
                                const order = getUnacceptableActionDocTypesOrdered(useCase)
                                const orderedRows = order
                                  .map(k => UNACCEPTABLE_STATUS_ROWS.find(r => r.key === k))
                                  .filter((r): r is UnacceptableRow => !!r)

                                return orderedRows.map(row => {
                                  const docStatus = byKey?.[row.key]
                                  const isComplete =
                                    docStatus?.status === 'complete' || docStatus?.status === 'validated'

                                  return isComplete ? (
                                    <div
                                      key={row.key}
                                      className="inline-flex items-center gap-2 px-4 py-3 bg-green-50 border border-green-300 rounded-lg w-full sm:w-auto"
                                    >
                                      <Check className="w-5 h-5 text-green-600 flex-shrink-0" />
                                      <span className="text-sm font-semibold text-green-800">{row.doneLabel}</span>
                                    </div>
                                  ) : (
                                    <div
                                      key={row.key}
                                      className="inline-flex items-center gap-2 px-4 py-3 bg-orange-50 border border-orange-300 rounded-lg w-full sm:w-auto"
                                    >
                                      <AlertTriangle className="w-5 h-5 text-orange-600 flex-shrink-0" />
                                      <span className="text-sm font-semibold text-orange-800">{row.todoLabel}</span>
                                    </div>
                                  )
                                })
                              })()}
                            </div>
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
    </div>
  )
}
