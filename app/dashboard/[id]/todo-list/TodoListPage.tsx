'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import { useApiCall } from '@/lib/api-client-legacy'
import { FileText, CheckCircle2, ChevronDown, ChevronRight } from 'lucide-react'
import { getCompactScoreStyle } from '@/lib/score-styles'
import ToDoAction from './components/ToDoAction'
import RegistryToDoAction from './components/RegistryToDoAction'
import {
  isUnacceptableCase,
  getRequiredDocumentType,
  getDocumentTodoText,
  isTodoCompleted,
  getRiskLevelConfig,
  getPotentialPoints,
  COMPLIANCE_DOCUMENT_TYPES,
  type DocumentType
} from './utils/todo-helpers'

interface UseCase {
  id: string
  name: string
  description: string
  company_id: string
  created_at: string
  updated_at: string
  status: 'draft' | 'active' | 'archived' | 'completed'
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
  docType: DocumentType | 'registry_action'
  registryCase?: 'A' | 'B' | 'C' // For registry-related todos
  potentialPoints?: number // Points that can be gained by completing this action
}

interface TodoListPageProps {
  params: Promise<{ id: string }>
}

export default function TodoListPage({ params }: TodoListPageProps) {
  const { user, loading } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const api = useApiCall()
  const [mounted, setMounted] = useState(false)
  const [companyId, setCompanyId] = useState<string>('')
  const [useCases, setUseCases] = useState<UseCase[]>([])
  const [company, setCompany] = useState<any>(null) // Company data with maydai_as_registry
  const [useCaseResponses, setUseCaseResponses] = useState<Record<string, any[]>>({}) // E5.N9.Q7 responses by usecase ID
  const [documentStatuses, setDocumentStatuses] = useState<Record<string, DocumentStatus>>({})
  const [complianceDocStatuses, setComplianceDocStatuses] = useState<Record<string, Record<string, DocumentStatus>>>({}) // Compliance documents by usecase ID and docType
  const [registryProofStatuses, setRegistryProofStatuses] = useState<Record<string, DocumentStatus>>({}) // Registry proof documents by usecase ID
  const [loadingData, setLoadingData] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [hasFetched, setHasFetched] = useState(false)
  const [expandedTodos, setExpandedTodos] = useState<Record<string, boolean>>({})
  const [expandedUseCases, setExpandedUseCases] = useState<Record<string, boolean>>({})

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

        // Fetch company data
        const companyResult = await api.get(`/api/companies/${companyId}`)
        if (companyResult.data) {
          setCompany(companyResult.data)
        }

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

          // Fetch E5.N9.Q7 responses for completed, non-unacceptable use cases
          const responsesMap: Record<string, any[]> = {}
          const completedNonUnacceptable = filteredUseCases.filter(
            (uc: UseCase) => uc.status === 'completed' && !isUnacceptableCase(uc)
          )

          // Parallelize response fetching
          const responsesPromises = completedNonUnacceptable.map(async (uc: UseCase) => {
            try {
              const responsesResult = await api.get(`/api/usecases/${uc.id}/responses`)
              return {
                id: uc.id,
                data: responsesResult.data || []
              }
            } catch (err) {
              console.error(`Error fetching responses for ${uc.id}:`, err)
              return {
                id: uc.id,
                data: []
              }
            }
          })

          const responsesResults = await Promise.all(responsesPromises)
          responsesResults.forEach(result => {
            responsesMap[result.id] = result.data
          })
          setUseCaseResponses(responsesMap)

          // Fetch compliance document statuses for completed, non-unacceptable cases
          // Use batch endpoint to fetch all documents in a single request
          const complianceMap: Record<string, Record<string, DocumentStatus>> = {}

          if (completedNonUnacceptable.length > 0) {
            try {
              const usecaseIds = completedNonUnacceptable.map((uc: UseCase) => uc.id).join(',')
              const docTypes = COMPLIANCE_DOCUMENT_TYPES.join(',')

              const batchResult = await api.get(`/api/dossiers/batch?usecaseIds=${usecaseIds}&docTypes=${docTypes}`)

              if (batchResult.data?.documents) {
                batchResult.data.documents.forEach((doc: any) => {
                  if (!complianceMap[doc.usecaseId]) {
                    complianceMap[doc.usecaseId] = {}
                  }
                  complianceMap[doc.usecaseId][doc.docType] = {
                    hasDocument: !!(doc.fileUrl || doc.formData),
                    status: doc.status || 'incomplete',
                    fileUrl: doc.fileUrl
                  }
                })
              }
            } catch (err) {
              console.error('Error fetching compliance documents in batch:', err)
              // Fallback: initialize empty statuses for all use cases
              completedNonUnacceptable.forEach((uc: UseCase) => {
                complianceMap[uc.id] = {}
                COMPLIANCE_DOCUMENT_TYPES.forEach(docType => {
                  complianceMap[uc.id][docType] = { hasDocument: false, status: 'incomplete' }
                })
              })
            }
          }
          setComplianceDocStatuses(complianceMap)

          // Fetch registry_proof document statuses for cases A and C
          const registryProofMap: Record<string, DocumentStatus> = {}
          const useCasesNeedingRegistryProof = completedNonUnacceptable.filter((uc: UseCase) => {
            const responses = responsesMap[uc.id] || []
            const registryResponse = responses.find((r: any) => r.question_code === 'E5.N9.Q7')
            if (!registryResponse) return false

            // Cas A: "Non"
            if (registryResponse.single_value === 'E5.N9.Q7.A') {
              console.log(`[FETCH] UseCase ${uc.id} (${uc.name}) - Case A detected`)
              return true
            }

            // Cas C: "Oui - autre registre"
            if (registryResponse.conditional_main === 'E5.N9.Q7.B') {
              const systemName = registryResponse.conditional_values?.[0]?.toLowerCase() || ''
              const isCaseC = systemName !== 'maydai'
              console.log(`[FETCH] UseCase ${uc.id} (${uc.name}) - Registry: ${systemName}, Case C: ${isCaseC}`)
              return isCaseC
            }
            return false
          })

          console.log(`[FETCH] Found ${useCasesNeedingRegistryProof.length} use cases needing registry_proof`)

          // Use batch endpoint to fetch all registry_proof documents in a single request
          if (useCasesNeedingRegistryProof.length > 0) {
            try {
              const usecaseIds = useCasesNeedingRegistryProof.map((uc: UseCase) => uc.id).join(',')

              const batchResult = await api.get(`/api/dossiers/batch?usecaseIds=${usecaseIds}&docTypes=registry_proof`)

              if (batchResult.data?.documents) {
                batchResult.data.documents.forEach((doc: any) => {
                  const status = {
                    hasDocument: !!doc.fileUrl,
                    status: doc.status || 'incomplete',
                    fileUrl: doc.fileUrl
                  }
                  registryProofMap[doc.usecaseId] = status
                  console.log(`[FETCH] registry_proof for ${doc.usecaseId}:`, status)
                })
              }
            } catch (err) {
              console.error('[FETCH] Error fetching registry_proof documents in batch:', err)
              // Fallback: initialize empty statuses
              useCasesNeedingRegistryProof.forEach((uc: UseCase) => {
                registryProofMap[uc.id] = { hasDocument: false, status: 'incomplete' }
              })
            }
          }
          console.log('[FETCH] Final registryProofStatuses:', registryProofMap)
          setRegistryProofStatuses(registryProofMap)

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, hasFetched, companyId])

  // Auto-expand use case and action from URL parameters
  const highlightUseCase = searchParams.get('usecase')
  const highlightAction = searchParams.get('action')

  useEffect(() => {
    if (highlightUseCase && highlightAction && !loadingData && useCases.length > 0) {
      // Expand the use case
      setExpandedUseCases(prev => ({
        ...prev,
        [highlightUseCase]: true
      }))

      // Expand the action
      const todoId = `${highlightUseCase}-${highlightAction}`
      setExpandedTodos(prev => ({
        ...prev,
        [todoId]: true
      }))

      // Scroll to the element after a delay
      setTimeout(() => {
        const element = document.getElementById(`todo-${todoId}`)
        element?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }, 300)
    }
  }, [highlightUseCase, highlightAction, loadingData, useCases.length])

  // Get E5.N9.Q7 response for a use case
  const getE5N9Q7Response = (useCaseId: string) => {
    const responses = useCaseResponses[useCaseId] || []
    return responses.find((r: any) => r.question_code === 'E5.N9.Q7')
  }

  // Determine registry case (A, B, or C) for a use case
  const determineRegistryCase = (useCaseId: string): 'A' | 'B' | 'C' | null => {
    const response = getE5N9Q7Response(useCaseId)

    if (!response) return null

    // Case A: "Non" answer
    if (response.single_value === 'E5.N9.Q7.A') {
      return 'A'
    }

    // Case B or C: "Oui" answer with system name
    if (response.conditional_main === 'E5.N9.Q7.B') {
      const systemName = response.conditional_values?.[0]?.toLowerCase() || ''
      return systemName === 'maydai' ? 'B' : 'C'
    }

    return null
  }

  // Get registry todo text based on case
  const getRegistryTodoText = (registryCase: 'A' | 'B' | 'C'): string => {
    switch (registryCase) {
      case 'A':
        return 'Déclarer un registre centralisé pour votre système IA'
      case 'B':
        return 'Confirmer MaydAI comme registre centralisé'
      case 'C':
        return 'Prouver l\'usage de votre registre centralisé'
      default:
        return 'Action requise pour le registre centralisé'
    }
  }

  // Check if registry todo is completed
  const isRegistryTodoCompleted = (useCaseId: string, registryCase: 'A' | 'B' | 'C'): boolean => {
    console.log('[COMPLETION CHECK] Checking:', { useCaseId, registryCase })

    if (registryCase === 'B') {
      const completed = company?.maydai_as_registry === true
      console.log('[COMPLETION CHECK] Case B:', { maydaiAsRegistry: company?.maydai_as_registry, completed })
      return completed
    }

    // For cases A and C, check if registry_proof document exists
    if (registryCase === 'A' || registryCase === 'C') {
      const docStatus = registryProofStatuses[useCaseId]
      const completed = docStatus?.hasDocument && docStatus.status !== 'incomplete'
      console.log('[COMPLETION CHECK] Case A/C:', {
        docStatus,
        hasDocument: docStatus?.hasDocument,
        status: docStatus?.status,
        completed
      })
      return completed
    }

    console.log('[COMPLETION CHECK] No matching case, returning false')
    return false
  }

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

    // Add compliance document todos for completed, non-unacceptable cases
    if (useCase.status === 'completed' && !isUnacceptableCase(useCase)) {
      const useCaseDocs = complianceDocStatuses[useCase.id] || {}
      const responses = useCaseResponses[useCase.id] || []

      // Add todos for each of the 7 compliance documents
      for (const docType of COMPLIANCE_DOCUMENT_TYPES) {
        const docStatus = useCaseDocs[docType]
        const potentialPoints = getPotentialPoints(docType, responses)
        todos.push({
          id: `${useCase.id}-${docType}`,
          text: getDocumentTodoText(docType),
          completed: isTodoCompleted(docStatus),
          useCaseId: useCase.id,
          docType: docType as DocumentType,
          potentialPoints: potentialPoints > 0 ? potentialPoints : undefined
        })
      }

      // Check for registry-related todos
      const registryCase = determineRegistryCase(useCase.id)
      if (registryCase) {
        todos.push({
          id: `${useCase.id}-registry`,
          text: getRegistryTodoText(registryCase),
          completed: isRegistryTodoCompleted(useCase.id, registryCase),
          useCaseId: useCase.id,
          docType: 'registry_action',
          registryCase
        })
      }
    }

    return todos
  }

  // Toggle todo expansion
  const toggleTodo = useCallback((todoId: string) => {
    setExpandedTodos(prev => ({
      ...prev,
      [todoId]: !prev[todoId]
    }))
  }, [])

  // Toggle use case todos section expansion
  const toggleUseCaseTodos = useCallback((useCaseId: string) => {
    setExpandedUseCases(prev => ({
      ...prev,
      [useCaseId]: !prev[useCaseId]
    }))
  }, [])

  // Navigate to dossier page with optional document query parameter
  const handleTodoClick = useCallback((useCaseId: string, docType?: string) => {
    const baseUrl = `/dashboard/${companyId}/dossiers/${useCaseId}`
    const url = docType ? `${baseUrl}?doc=${docType}` : baseUrl
    router.push(url)
  }, [companyId, router])

  // Memoize document upload handler
  const handleDocumentUploaded = useCallback(async (useCaseId: string) => {
    console.log('[TODO] Document uploaded for useCase:', useCaseId)

    // Refetch registry_proof status after upload
    try {
      const docResult = await api.get(`/api/dossiers/${useCaseId}/registry_proof`)
      console.log('[TODO] Refetched document:', docResult.data)

      if (docResult.data) {
        const newStatus = {
          hasDocument: !!docResult.data?.fileUrl,
          status: docResult.data?.status || 'incomplete',
          fileUrl: docResult.data?.fileUrl
        }
        console.log('[TODO] Updating status to:', newStatus)

        setRegistryProofStatuses(prev => ({
          ...prev,
          [useCaseId]: newStatus
        }))
      } else {
        console.warn('[TODO] No document data returned')
      }
    } catch (err) {
      console.error('[TODO] Error refetching registry proof:', err)
      // Even if refetch fails, try to mark as complete optimistically
      setRegistryProofStatuses(prev => ({
        ...prev,
        [useCaseId]: {
          hasDocument: true,
          status: 'complete',
          fileUrl: prev[useCaseId]?.fileUrl
        }
      }))
      console.log('[TODO] Set optimistic completion status')
    }

    // Also refresh company data in case maydai_as_registry was updated
    try {
      const companyResult = await api.get(`/api/companies/${companyId}`)
      if (companyResult.data) {
        setCompany(companyResult.data)
        console.log('[TODO] Refreshed company data')
      }
    } catch (err) {
      console.error('[TODO] Error refetching company:', err)
    }
  }, [api, companyId])

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
                    {todos.length > 0 ? (
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <button
                          onClick={() => toggleUseCaseTodos(useCase.id)}
                          className={`w-full flex items-center justify-between px-4 py-3 rounded-lg border transition-all cursor-pointer ${
                            expandedUseCases[useCase.id]
                              ? 'bg-[#0080A3]/5 border-[#0080A3]/20'
                              : 'bg-gray-50 border-gray-200 hover:bg-[#0080A3]/5 hover:border-[#0080A3]/20'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`p-1 rounded ${expandedUseCases[useCase.id] ? 'bg-[#0080A3]/10' : 'bg-gray-200'}`}>
                              {expandedUseCases[useCase.id] ? (
                                <ChevronDown className="w-4 h-4 text-[#0080A3]" />
                              ) : (
                                <ChevronRight className="w-4 h-4 text-gray-600" />
                              )}
                            </div>
                            <h4 className="text-sm font-semibold text-gray-800">Actions à mener</h4>
                            <span className="text-xs text-gray-500">Cliquez pour {expandedUseCases[useCase.id] ? 'replier' : 'voir le détail'}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`text-sm font-semibold px-3 py-1 rounded-full ${
                              todos.filter(t => t.completed).length === todos.length
                                ? 'bg-green-100 text-green-700'
                                : 'bg-amber-100 text-amber-700'
                            }`}>
                              {todos.filter(t => t.completed).length} / {todos.length}
                            </span>
                          </div>
                        </button>
                        {expandedUseCases[useCase.id] && (
                          <div className="space-y-3 mt-3">
                            {todos.map((todo) => (
                              <div
                                key={todo.id}
                                id={`todo-${todo.id}`}
                                className={highlightUseCase === todo.useCaseId && highlightAction === todo.docType ? 'ring-2 ring-[#0080A3] ring-offset-2 rounded-lg' : ''}
                              >
                                {todo.docType === 'registry_action' ? (
                                  <RegistryToDoAction
                                    todo={todo as any}
                                    isExpanded={expandedTodos[todo.id] || false}
                                    onToggle={toggleTodo}
                                    companyId={companyId}
                                    maydaiAsRegistry={company?.maydai_as_registry === true}
                                    hasRegistryProofDocument={registryProofStatuses[todo.useCaseId]?.hasDocument || false}
                                    onDocumentUploaded={() => handleDocumentUploaded(todo.useCaseId)}
                                  />
                                ) : (
                                  <ToDoAction
                                    todo={todo as any}
                                    isExpanded={expandedTodos[todo.id] || false}
                                    onToggle={toggleTodo}
                                    onActionClick={(useCaseId) => handleTodoClick(useCaseId, todo.docType)}
                                    potentialPoints={todo.potentialPoints}
                                  />
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <span>Vous devez d'abord compléter le cas d'usage pour voir les actions à mener.</span>
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
