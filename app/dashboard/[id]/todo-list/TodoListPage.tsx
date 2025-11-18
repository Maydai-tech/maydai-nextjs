'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import { useApiCall } from '@/lib/api-client-legacy'
import { FileText, CheckSquare, Square, ChevronRight, AlertTriangle, CheckCircle2, ChevronDown } from 'lucide-react'
import { getCompactScoreStyle } from '@/lib/score-styles'
import {
  isUnacceptableCase,
  getRequiredDocumentType,
  getDocumentTodoText,
  isTodoCompleted,
  getRiskLevelConfig,
  getDocumentExplanation
} from './utils/todo-helpers'

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

interface DocumentStatus {
  hasDocument: boolean
  status: 'incomplete' | 'complete' | 'validated'
  fileUrl?: string
  fileName?: string
}

interface TodoItem {
  id: string
  text: string
  completed: boolean
  useCaseId: string
  docType: 'stopping_proof' | 'system_prompt'
}

interface TodoListPageProps {
  params: Promise<{ id: string }>
}

export default function TodoListPage({ params }: TodoListPageProps) {
  const { user, loading } = useAuth()
  const router = useRouter()
  const api = useApiCall()
  const [mounted, setMounted] = useState(false)
  const [companyId, setCompanyId] = useState<string>('')
  const [useCases, setUseCases] = useState<UseCase[]>([])
  const [documentStatuses, setDocumentStatuses] = useState<Record<string, DocumentStatus>>({})
  const [loadingData, setLoadingData] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [hasFetched, setHasFetched] = useState(false)
  const [expandedTodos, setExpandedTodos] = useState<Record<string, boolean>>({})

  // Unwrap params
  useEffect(() => {
    params.then(p => setCompanyId(p.id))
  }, [params])

  // Client-side only rendering
  useEffect(() => setMounted(true), [])

  // Auth protection
  useEffect(() => {
    if (mounted && !loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router, mounted])

  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      if (!user || hasFetched || !companyId) return

      try {
        setLoadingData(true)

        // Fetch use cases for this company
        const result = await api.get('/api/usecases')

        if (result.data) {
          // Filter use cases for current company
          const filteredUseCases = result.data.filter((uc: UseCase) => uc.company_id === companyId)
          setUseCases(filteredUseCases)

          // Fetch document statuses for unacceptable cases
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
                    status: docResult.data?.status || 'incomplete',
                    fileUrl: docResult.data?.fileUrl,
                    fileName: docResult.data?.fileName
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
        setError('Erreur lors du chargement des cas d\'usage')
      } finally {
        setLoadingData(false)
      }
    }

    fetchData()
  }, [user, api, hasFetched, companyId])

  // Get todos for a use case
  const getTodosForUseCase = (useCase: UseCase): TodoItem[] => {
    const todos: TodoItem[] = []

    // Check if this is an unacceptable case
    if (isUnacceptableCase(useCase)) {
      const docType = getRequiredDocumentType(useCase)
      if (docType) {
        const docStatus = documentStatuses[useCase.id]
        todos.push({
          id: `${useCase.id}-${docType}`,
          text: getDocumentTodoText(docType),
          completed: isTodoCompleted(docStatus),
          useCaseId: useCase.id,
          docType
        })
      }
    }

    return todos
  }

  // Toggle todo expansion
  const toggleTodo = (todoId: string) => {
    setExpandedTodos(prev => ({
      ...prev,
      [todoId]: !prev[todoId]
    }))
  }

  // Navigate to dossier page
  const handleTodoClick = (useCaseId: string) => {
    router.push(`/dashboard/${companyId}/dossiers/${useCaseId}`)
  }

  // Calculate stats
  const totalTodos = useCases.reduce((acc, uc) => acc + getTodosForUseCase(uc).length, 0)
  const completedTodos = useCases.reduce((acc, uc) => {
    const todos = getTodosForUseCase(uc)
    return acc + todos.filter(t => t.completed).length
  }, 0)

  if (!mounted || loading || loadingData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0080A3]"></div>
          <p className="mt-4 text-gray-600">Chargement de votre To-do list...</p>
        </div>
      </div>
    )
  }

  if (!user) return null

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
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">To-do List</h1>
              <p className="mt-2 text-gray-600">
                Actions à mener pour vos cas d&apos;usage IA
              </p>
            </div>
            {totalTodos > 0 && (
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  <span className="text-gray-600">
                    <span className="font-semibold text-gray-900">{completedTodos}</span> / {totalTodos} complétés
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Use cases list */}
        <div className="space-y-4">
          {useCases.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun cas d&apos;usage trouvé</h3>
              <p className="text-gray-600">Commencez par créer votre premier cas d&apos;usage.</p>
            </div>
          ) : (
            useCases.map((useCase) => {
              const todos = getTodosForUseCase(useCase)
              const hasUnacceptableTodos = isUnacceptableCase(useCase)

              return (
                <div
                  key={useCase.id}
                  className="bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
                >
                  <div className="p-6">
                    {/* Use case header */}
                    <div className="flex items-start justify-between gap-3 mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <FileText className="w-6 h-6 text-[#0080A3] flex-shrink-0" />
                          <h3 className="text-xl font-semibold text-gray-900">{useCase.name}</h3>
                        </div>
                        <p className="text-gray-600 line-clamp-2">{useCase.description}</p>
                      </div>

                      {/* Badges */}
                      <div className="flex flex-wrap gap-2 flex-shrink-0">
                        {/* Risk level badge */}
                        {useCase.risk_level && (
                          <div className={`px-3 py-2 rounded-lg border ${getRiskLevelConfig(useCase.risk_level).bg} ${getRiskLevelConfig(useCase.risk_level).border}`}>
                            <div className="flex flex-col gap-0.5">
                              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                                Niveau de risque
                              </span>
                              <span className={`text-xs font-semibold ${getRiskLevelConfig(useCase.risk_level).text}`}>
                                {getRiskLevelConfig(useCase.risk_level).label}
                              </span>
                            </div>
                          </div>
                        )}

                        {/* Score badge */}
                        {useCase.score_final !== null && useCase.score_final !== undefined && (
                          <div className={`px-3 py-2 rounded-lg ${getCompactScoreStyle(useCase.score_final).bg}`}>
                            <div className="flex flex-col gap-0.5">
                              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                                Score
                              </span>
                              <div className="flex items-center gap-2">
                                <div className={`w-2 h-2 rounded-full ${getCompactScoreStyle(useCase.score_final).indicator}`}></div>
                                <span className={`text-xs font-semibold ${getCompactScoreStyle(useCase.score_final).accent}`}>
                                  {Math.round(useCase.score_final)}
                                </span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Todos section */}
                    {hasUnacceptableTodos && todos.length > 0 ? (
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <h4 className="text-sm font-semibold text-gray-700 mb-3">Actions à mener :</h4>
                        <div className="space-y-3">
                          {todos.map((todo) => {
                            const isExpanded = expandedTodos[todo.id]

                            return (
                              <div key={todo.id} className="space-y-2">
                                {/* Todo header - clickable to expand */}
                                <div
                                  onClick={() => toggleTodo(todo.id)}
                                  className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer group"
                                >
                                  {todo.completed ? (
                                    <CheckSquare className="w-5 h-5 text-green-600 flex-shrink-0" />
                                  ) : (
                                    <Square className="w-5 h-5 text-gray-400 flex-shrink-0 group-hover:text-[#0080A3]" />
                                  )}
                                  <span className={`flex-1 text-sm ${todo.completed ? 'text-gray-500 line-through' : 'text-gray-900'}`}>
                                    {todo.text}
                                  </span>
                                  <ChevronDown
                                    className={`w-5 h-5 text-gray-400 flex-shrink-0 group-hover:text-[#0080A3] transition-transform duration-300 ${
                                      isExpanded ? 'rotate-180' : ''
                                    }`}
                                  />
                                </div>

                                {/* Expandable content */}
                                <div
                                  className="overflow-hidden transition-all duration-300 ease-in-out"
                                  style={{
                                    maxHeight: isExpanded ? '400px' : '0',
                                    opacity: isExpanded ? 1 : 0
                                  }}
                                >
                                  <div className="pl-8 pr-3 pb-3 space-y-4">
                                    {/* Explanation text */}
                                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                      <p className="text-sm text-blue-900">
                                        {getDocumentExplanation(todo.docType)}
                                      </p>
                                    </div>

                                    {/* CTA Button */}
                                    <button
                                      onClick={() => handleTodoClick(todo.useCaseId)}
                                      className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[#0080A3] text-white font-medium rounded-lg hover:bg-[#006280] transition-colors"
                                    >
                                      {todo.completed ? 'Voir le document' : 'Compléter cette action'}
                                      <ChevronRight className="w-5 h-5" />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    ) : (
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <CheckCircle2 className="w-5 h-5 text-green-600" />
                          <span>Aucune action requise pour le moment</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Empty state when no todos */}
        {useCases.length > 0 && totalTodos === 0 && (
          <div className="mt-8 text-center py-8 bg-green-50 border border-green-200 rounded-lg">
            <CheckCircle2 className="w-12 h-12 text-green-600 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Tout est en ordre !</h3>
            <p className="text-gray-600">
              Aucune action n&apos;est requise pour vos cas d&apos;usage actuellement.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
