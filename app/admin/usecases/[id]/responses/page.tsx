'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase, UseCase, UseCaseResponse } from '@/lib/supabase'
import { ArrowLeft, Calendar, User, FileText, Eye, AlertTriangle, Shield } from 'lucide-react'
import questionsData from '@/app/usecases/[id]/data/questions-with-scores.json'

interface ResponseWithQuestion extends UseCaseResponse {
  question_text?: string
}

export default function UseCaseResponsesPage() {
  const params = useParams()
  const router = useRouter()
  const usecaseId = params.id as string

  const [usecase, setUsecase] = useState<UseCase | null>(null)
  const [responses, setResponses] = useState<ResponseWithQuestion[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (usecaseId) {
      fetchUseCaseData()
    }
  }, [usecaseId])

  async function fetchUseCaseData() {
    try {
      setLoading(true)
      setError(null)

      // Récupérer les informations du use case
      const { data: usecaseData, error: usecaseError } = await supabase
        .from('usecases')
        .select('*')
        .eq('id', usecaseId)
        .single()

      if (usecaseError) {
        throw new Error('Cas d\'usage non trouvé')
      }

      setUsecase(usecaseData)

      // Récupérer les réponses du use case
      const { data: responsesData, error: responsesError } = await supabase
        .from('usecase_responses')
        .select('*')
        .eq('usecase_id', usecaseId)
        .order('answered_at', { ascending: true })

      if (responsesError) {
        throw responsesError
      }

      // Enrichir les réponses avec les textes des questions depuis le JSON
      const enrichedResponses = (responsesData || []).map((response) => {
        const question = questionsData[response.question_code as keyof typeof questionsData]
        return {
          ...response,
          question_text: question?.question || response.question_code
        }
      })

      setResponses(enrichedResponses)
    } catch (err) {
      console.error('Erreur lors du chargement des données:', err)
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement des données')
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // Fonction pour obtenir le label d'une option depuis le JSON
  const getOptionLabel = (questionCode: string, optionCode: string): string => {
    const question = questionsData[questionCode as keyof typeof questionsData]
    if (!question?.options) return optionCode
    
    const option = question.options.find((opt: any) => opt.code === optionCode)
    return option?.label || optionCode
  }

  // Fonction pour obtenir les informations de risque d'une option
  const getOptionRisk = (questionCode: string, optionCode: string): string | null => {
    const question = questionsData[questionCode as keyof typeof questionsData]
    if (!question?.options) return null
    
    const option = question.options.find((opt: any) => opt.code === optionCode)
    return option?.risk || null
  }

  // Fonction pour obtenir l'impact sur le score d'une option
  const getOptionScoreImpact = (questionCode: string, optionCode: string): number => {
    const question = questionsData[questionCode as keyof typeof questionsData]
    if (!question?.options) return 0
    
    const option = question.options.find((opt: any) => opt.code === optionCode)
    return option?.score_impact || 0
  }

  // Fonction pour obtenir l'icône de risque
  const getRiskIcon = (risk: string) => {
    switch (risk?.toLowerCase()) {
      case 'unacceptable':
        return <AlertTriangle className="h-4 w-4 text-red-600" />
      case 'high':
        return <AlertTriangle className="h-4 w-4 text-orange-600" />
      case 'limited':
        return <Shield className="h-4 w-4 text-yellow-600" />
      case 'minimal':
        return <Shield className="h-4 w-4 text-green-600" />
      default:
        return null
    }
  }

  // Fonction pour obtenir la couleur de badge de risque
  const getRiskBadgeColor = (risk: string): string => {
    switch (risk?.toLowerCase()) {
      case 'unacceptable':
        return 'bg-red-100 text-red-800'
      case 'high':
        return 'bg-orange-100 text-orange-800'
      case 'limited':
        return 'bg-yellow-100 text-yellow-800'
      case 'minimal':
        return 'bg-green-100 text-green-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getResponseDisplay = (response: UseCaseResponse) => {
    // Single value response (text, select, etc.)
    if (response.single_value) {
      const label = getOptionLabel(response.question_code, response.single_value)
      const risk = getOptionRisk(response.question_code, response.single_value)
      const scoreImpact = getOptionScoreImpact(response.question_code, response.single_value)
      
      return (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-900">{label}</span>
            {risk && (
              <div className="flex items-center gap-1">
                {getRiskIcon(risk)}
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${getRiskBadgeColor(risk)}`}>
                  {risk}
                </span>
              </div>
            )}
          </div>
          {scoreImpact !== 0 && (
            <div className="text-sm text-gray-600">
              Impact score: <span className={scoreImpact < 0 ? 'text-red-600' : 'text-green-600'}>
                {scoreImpact > 0 ? '+' : ''}{scoreImpact}
              </span>
            </div>
          )}
        </div>
      )
    }
    
    // Multiple choice response
    if (response.multiple_codes?.length) {
      return (
        <div className="space-y-2">
          {response.multiple_codes.map((code, index) => {
            const label = getOptionLabel(response.question_code, code)
            const risk = getOptionRisk(response.question_code, code)
            const scoreImpact = getOptionScoreImpact(response.question_code, code)
            
            return (
              <div key={index} className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span className="font-medium text-gray-900">{label}</span>
                  {risk && (
                    <div className="flex items-center gap-1">
                      {getRiskIcon(risk)}
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getRiskBadgeColor(risk)}`}>
                        {risk}
                      </span>
                    </div>
                  )}
                </div>
                {scoreImpact !== 0 && (
                  <div className="text-sm text-gray-600 ml-4">
                    Impact: <span className={scoreImpact < 0 ? 'text-red-600' : 'text-green-600'}>
                      {scoreImpact > 0 ? '+' : ''}{scoreImpact}
                    </span>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )
    }

    // Fallback to multiple_labels if no multiple_codes
    if (response.multiple_labels?.length) {
      return (
        <div className="space-y-1">
          {response.multiple_labels.map((label, index) => (
            <div key={index} className="flex items-center">
              <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
              <span className="font-medium text-gray-900">{label}</span>
            </div>
          ))}
        </div>
      )
    }
    
    // Conditional response
    if (response.conditional_main) {
      const mainLabel = getOptionLabel(response.question_code, response.conditional_main)
      const mainRisk = getOptionRisk(response.question_code, response.conditional_main)
      const mainScoreImpact = getOptionScoreImpact(response.question_code, response.conditional_main)
      
      return (
        <div className="space-y-3">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-900">{mainLabel}</span>
              {mainRisk && (
                <div className="flex items-center gap-1">
                  {getRiskIcon(mainRisk)}
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getRiskBadgeColor(mainRisk)}`}>
                    {mainRisk}
                  </span>
                </div>
              )}
            </div>
            {mainScoreImpact !== 0 && (
              <div className="text-sm text-gray-600">
                Impact: <span className={mainScoreImpact < 0 ? 'text-red-600' : 'text-green-600'}>
                  {mainScoreImpact > 0 ? '+' : ''}{mainScoreImpact}
                </span>
              </div>
            )}
          </div>
          
          {response.conditional_keys && response.conditional_values && (
            <div className="ml-4 space-y-1 border-l-2 border-gray-200 pl-4">
              <div className="text-sm font-medium text-gray-700">Détails complémentaires :</div>
              {response.conditional_keys.map((key, index) => (
                <div key={index} className="text-sm text-gray-600">
                  <span className="font-medium">{key}:</span> {response.conditional_values![index]}
                </div>
              ))}
            </div>
          )}
        </div>
      )
    }
    
    return (
      <div className="text-gray-500 italic">Aucune réponse</div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-600 mb-4">{error}</div>
        <button
          onClick={() => router.push('/admin/usecases')}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Retour à la liste
        </button>
      </div>
    )
  }

  return (
    <div>
      {/* Header avec breadcrumb */}
      <div className="mb-6">
        <button
          onClick={() => router.push('/admin/usecases')}
          className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Retour aux cas d'usage
        </button>
        
        <div className="mb-4">
          <h1 className="text-2xl font-bold text-gray-900">
            Réponses du cas d'usage
          </h1>
          <p className="mt-2 text-gray-600">
            Consultez toutes les réponses soumises pour ce cas d'usage
          </p>
        </div>

        {/* Informations du cas d'usage */}
        {usecase && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">{usecase.name}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <div className="text-sm font-medium text-gray-500">Description</div>
                <div className="text-sm text-gray-900 mt-1">
                  {usecase.description || 'Aucune description'}
                </div>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-500">Statut</div>
                <div className="text-sm text-gray-900 mt-1 capitalize">{usecase.status}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-500">Niveau de risque</div>
                <div className="text-sm text-gray-900 mt-1 capitalize">
                  {usecase.risk_level || 'Non évalué'}
                </div>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-500">Date de création</div>
                <div className="text-sm text-gray-900 mt-1">
                  {formatDate(usecase.created_at)}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-2xl font-bold text-blue-600">{responses.length}</div>
          <div className="text-sm text-gray-600">Réponses totales</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-2xl font-bold text-green-600">
            {new Set(responses.map(r => r.question_code)).size}
          </div>
          <div className="text-sm text-gray-600">Questions répondues</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-2xl font-bold text-purple-600">
            {responses.filter(r => r.single_value || r.multiple_labels?.length || r.conditional_main).length}
          </div>
          <div className="text-sm text-gray-600">Réponses complètes</div>
        </div>
      </div>

      {/* Liste des réponses */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {responses.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <div className="text-gray-500">Aucune réponse trouvée pour ce cas d'usage</div>
            <p className="text-sm text-gray-400 mt-2">
              Les réponses apparaîtront ici une fois que le questionnaire sera complété.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {responses.map((response) => (
              <div key={response.id} className="p-6 hover:bg-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center mb-2">
                      <div className="text-sm font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded">
                        {response.question_code}
                      </div>
                      {(() => {
                        const question = questionsData[response.question_code as keyof typeof questionsData]
                        const questionType = question?.type
                        return questionType && (
                          <div className="text-sm text-blue-600 bg-blue-50 px-2 py-1 rounded ml-2">
                            {questionType}
                          </div>
                        )
                      })()}
                      <div className="flex items-center ml-4 text-sm text-gray-500">
                        <Calendar className="h-4 w-4 mr-1" />
                        {formatDate(response.answered_at)}
                      </div>
                      <div className="flex items-center ml-4 text-sm text-gray-500">
                        <User className="h-4 w-4 mr-1" />
                        {response.answered_by}
                      </div>
                    </div>
                    
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="text-lg font-medium text-gray-900 flex-1">
                        {response.question_text}
                      </h3>
                      {(() => {
                        const question = questionsData[response.question_code as keyof typeof questionsData]
                        const questionRisk = question?.risk
                        return questionRisk && (
                          <div className="flex items-center gap-1 ml-4">
                            {getRiskIcon(questionRisk)}
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${getRiskBadgeColor(questionRisk)}`}>
                              Question {questionRisk}
                            </span>
                          </div>
                        )
                      })()}
                    </div>
                    
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="text-sm font-medium text-gray-700 mb-2">Réponse :</div>
                      <div className="text-gray-900">
                        {getResponseDisplay(response)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}