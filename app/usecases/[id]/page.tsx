'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/lib/auth'
import { useApiCall } from '@/lib/api-auth'
import { 
  ArrowLeft, 
  Brain, 
  Calendar,
  Building,
  Shield,
  AlertCircle,
  CheckCircle,
  Clock,
  Edit3,
  Users,
  Settings
} from 'lucide-react'

interface UseCase {
  id: string
  name: string
  description: string
  deployment_date?: string
  status: string
  risk_level: string
  ai_category: string
  technology_partner: string
  llm_model_version?: string
  responsible_service: string
  system_type?: string
  company_id: string
  created_at: string
  updated_at: string
  companies?: {
    name: string
    industry: string
    city: string
    country: string
  }
}

interface Progress {
  usecase_id: string
  completion_percentage: number
  is_completed: boolean
  answered_questions: number
  total_questions: number
}

export default function UseCaseDetailPage() {
  const { user, session, loading } = useAuth()
  const router = useRouter()
  const params = useParams()
  const [mounted, setMounted] = useState(false)
  const [useCase, setUseCase] = useState<UseCase | null>(null)
  const [progress, setProgress] = useState<Progress | null>(null)
  const [loadingData, setLoadingData] = useState(true)
  const api = useApiCall()

  const useCaseId = params.id as string

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (mounted && !loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router, mounted])

  useEffect(() => {
    if (user && mounted && useCaseId) {
      fetchUseCaseData()
    }
  }, [user, mounted, useCaseId])

  const fetchUseCaseData = async () => {
    try {
      setLoadingData(true)
      
      if (!session?.access_token) {
        return
      }
      
      // Fetch use case details
      const useCaseResponse = await api.get(`/api/usecases/${useCaseId}`)
      
      if (useCaseResponse.status === 404) {
        router.push('/dashboard/companies')
        return
      } else if (useCaseResponse.data) {
        setUseCase(useCaseResponse.data)
        
        // Fetch progress for this use case
        if (useCaseResponse.data.company_id) {
          const progressResponse = await api.get(`/api/companies/${useCaseResponse.data.company_id}/progress`)
          if (progressResponse.data) {
            const useCaseProgress = progressResponse.data.find((p: Progress) => p.usecase_id === useCaseId)
            setProgress(useCaseProgress || null)
          }
        }
      }
    } catch (error) {
      console.error('Error fetching use case data:', error)
      router.push('/dashboard/companies')
    } finally {
      setLoadingData(false)
    }
  }

  const getRiskLevelColor = (riskLevel: string) => {
    switch (riskLevel?.toLowerCase()) {
      case 'high': return 'text-red-700 bg-red-50 border border-red-200'
      case 'limited': return 'text-yellow-700 bg-yellow-50 border border-yellow-200'
      case 'minimal': return 'text-green-700 bg-green-50 border border-green-200'
      case 'unacceptable': return 'text-red-800 bg-red-100 border border-red-300'
      default: return 'text-gray-700 bg-gray-50 border border-gray-200'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'active': return 'text-green-700 bg-green-50 border border-green-200'
      case 'draft': return 'text-gray-700 bg-gray-50 border border-gray-200'
      case 'under_review': return 'text-yellow-700 bg-yellow-50 border border-yellow-200'
      case 'suspended': return 'text-red-700 bg-red-50 border border-red-200'
      default: return 'text-gray-700 bg-gray-50 border border-gray-200'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'active': return <CheckCircle className="h-4 w-4" />
      case 'draft': return <Edit3 className="h-4 w-4" />
      case 'under_review': return <Clock className="h-4 w-4" />
      case 'suspended': return <AlertCircle className="h-4 w-4" />
      default: return <Settings className="h-4 w-4" />
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

  // Show loading state during SSR and initial client load
  if (!mounted || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0080A3]"></div>
          <p className="mt-4 text-gray-600">Chargement...</p>
        </div>
      </div>
    )
  }

  // Redirect if no user
  if (!user) {
    return null
  }

  if (loadingData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0080A3]"></div>
          <p className="mt-4 text-gray-600">Chargement du cas d'usage...</p>
        </div>
      </div>
    )
  }

  if (!useCase) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Cas d'usage non trouvé</h1>
          <p className="text-gray-600 mb-4">Le cas d'usage que vous recherchez n'existe pas ou vous n'y avez pas accès.</p>
          <Link
            href="/dashboard/companies"
            className="inline-flex items-center px-4 py-2 bg-[#0080A3] text-white font-medium rounded-lg hover:bg-[#006280] transition-colors"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour aux entreprises
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 sm:space-y-8 px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <Link
            href={`/dashboard/${useCase.company_id}`}
            className="inline-flex items-center text-gray-600 hover:text-[#0080A3] transition-colors"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            <span className="text-sm font-medium">Retour au dashboard</span>
          </Link>
        </div>
        
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start space-y-4 sm:space-y-0">
          <div className="flex items-start space-x-3 sm:space-x-4">
            <div className="bg-[#0080A3]/10 p-2 sm:p-3 rounded-lg flex-shrink-0">
              <Brain className="h-6 w-6 sm:h-8 sm:w-8 text-[#0080A3]" />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 break-words">{useCase.name}</h1>
              {useCase.companies && (
                <p className="text-sm sm:text-base text-gray-600 flex items-center mt-1">
                  <Building className="h-4 w-4 mr-1" />
                  {useCase.companies.name} • {useCase.companies.industry}
                </p>
              )}
              <div className="flex flex-wrap gap-2 mt-3">
                <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(useCase.status)}`}>
                  {getStatusIcon(useCase.status)}
                  <span className="ml-1">{useCase.status}</span>
                </span>
                {useCase.risk_level && (
                  <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${getRiskLevelColor(useCase.risk_level)}`}>
                    <Shield className="h-3 w-3 mr-1" />
                    {useCase.risk_level} risk
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Progress Card */}
          {progress && (
            <div className="bg-gray-50 p-4 rounded-lg w-full sm:w-auto">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Progression</span>
                {progress.is_completed ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <Clock className="h-4 w-4 text-yellow-600" />
                )}
              </div>
              <div className="text-2xl font-bold text-gray-900 mb-1">
                {Math.round(progress.completion_percentage)}%
              </div>
              <div className="text-xs text-gray-600">
                {progress.answered_questions} / {progress.total_questions} questions
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                <div
                  className={`h-2 rounded-full transition-all ${
                    progress.is_completed ? 'bg-green-600' : 'bg-yellow-600'
                  }`}
                  style={{ width: `${progress.completion_percentage}%` }}
                ></div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
        {/* Main Content */}
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

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Metadata */}
          <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Informations</h3>
            <div className="space-y-4">
              <div className="flex items-start">
                <Calendar className="h-4 w-4 text-gray-400 mt-1 mr-3" />
                <div>
                  <div className="text-sm font-medium text-gray-500">Créé le</div>
                  <div className="text-sm text-gray-900">{formatDate(useCase.created_at)}</div>
                </div>
              </div>
              <div className="flex items-start">
                <Clock className="h-4 w-4 text-gray-400 mt-1 mr-3" />
                <div>
                  <div className="text-sm font-medium text-gray-500">Modifié le</div>
                  <div className="text-sm text-gray-900">{formatDate(useCase.updated_at)}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Actions rapides</h3>
            <div className="space-y-3">
              <Link
                href={`/questionnaire?usecase=${useCase.id}`}
                className="w-full inline-flex items-center justify-center px-4 py-2 bg-[#0080A3] text-white text-sm font-medium rounded-lg hover:bg-[#006280] transition-colors"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Évaluer la conformité
              </Link>
              <Link
                href={`/reports?usecase=${useCase.id}`}
                className="w-full inline-flex items-center justify-center px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
              >
                Voir le rapport
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 