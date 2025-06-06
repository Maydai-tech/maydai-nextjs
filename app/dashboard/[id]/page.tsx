'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/lib/auth'
import { useApiCall } from '@/lib/api-auth'
import { 
  ArrowLeft, 
  Shield, 
  Brain, 
  CheckCircle, 
  AlertTriangle, 
  Clock,
  Plus,
  FileText,
  Calendar,
  TrendingUp
} from 'lucide-react'

interface Company {
  id: string
  name: string
  industry: string
  city: string
  country: string
}

interface UseCase {
  id: string
  name: string
  description: string
  status: string
  risk_level: string
  ai_category: string
  company_id: string
  created_at: string
  technology_partner: string
  responsible_service: string
}

interface Progress {
  usecase_id: string
  completion_percentage: number
  is_completed: boolean
  answered_questions: number
  total_questions: number
}

interface DashboardProps {
  params: Promise<{
    id: string
  }>
}

export default function CompanyDashboard({ params }: DashboardProps) {
  const { user, session, loading, signOut } = useAuth()
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [companyId, setCompanyId] = useState<string>('')
  const [company, setCompany] = useState<Company | null>(null)
  const [useCases, setUseCases] = useState<UseCase[]>([])
  const [progress, setProgress] = useState<Progress[]>([])
  const [loadingData, setLoadingData] = useState(true)
  const api = useApiCall()

  // Resolve params
  useEffect(() => {
    const resolveParams = async () => {
      const resolvedParams = await params
      setCompanyId(resolvedParams.id)
    }
    resolveParams()
  }, [params])

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
    if (user && mounted && companyId) {
      fetchDashboardData()
    }
  }, [user, mounted, companyId])

  const fetchDashboardData = async () => {
    try {
      setLoadingData(true)
      
      if (!session?.access_token) {
        return
      }
      
      // Fetch company details
      const companyResponse = await api.get(`/api/companies/${companyId}`)
      
      if (companyResponse.status === 404) {
        router.push('/dashboard/companies')
        return
      } else if (companyResponse.data) {
        setCompany(companyResponse.data)
      }

      // Fetch use cases for this company
      const useCasesResponse = await api.get(`/api/companies/${companyId}/usecases`)
      if (useCasesResponse.data) {
        setUseCases(useCasesResponse.data)
      }

      // Fetch progress for this company's use cases
      const progressResponse = await api.get(`/api/companies/${companyId}/progress`)
      if (progressResponse.data) {
        setProgress(progressResponse.data)
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoadingData(false)
    }
  }

  const getProgressForUseCase = (useCaseId: string) => {
    return progress.find(p => p.usecase_id === useCaseId)
  }

  const getRiskLevelColor = (riskLevel: string) => {
    switch (riskLevel?.toLowerCase()) {
      case 'high': return 'text-red-700 bg-red-50 border border-red-200'
      case 'limited': return 'text-yellow-700 bg-yellow-50 border border-yellow-200'
      case 'minimal': return 'text-green-700 bg-green-50 border border-green-200'
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

  // Show loading state during SSR and initial client load
  if (!mounted || loading || !companyId) {
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
          <p className="mt-4 text-gray-600">Chargement du dashboard...</p>
        </div>
      </div>
    )
  }

  if (!company) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Entreprise non trouvée</h1>
          <p className="text-gray-600 mb-4">L'entreprise que vous recherchez n'existe pas ou vous n'y avez pas accès.</p>
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
        <div className="flex flex-col space-y-4">
          <div className="flex items-center justify-between">
            <Link
              href="/dashboard/companies"
              className="inline-flex items-center text-gray-600 hover:text-[#0080A3] transition-colors"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              <span className="text-sm font-medium">Retour aux entreprises</span>
            </Link>
          </div>
          
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-4 sm:space-y-0">
            <div className="flex items-center space-x-3 sm:space-x-4">
              <div className="bg-[#0080A3]/10 p-2 sm:p-3 rounded-lg">
                <Shield className="h-6 w-6 sm:h-8 sm:w-8 text-[#0080A3]" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{company.name}</h1>
                <p className="text-sm sm:text-base text-gray-600">
                  {company.industry} • {company.city}, {company.country}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-6 sm:space-y-8">
        {/* Overview Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
          <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow">
            <div className="flex flex-col sm:flex-row sm:items-center">
              <div className="bg-purple-50 p-2 sm:p-3 rounded-lg mb-2 sm:mb-0 w-fit">
                <Brain className="h-5 w-5 sm:h-6 sm:w-6 text-purple-600" />
              </div>
              <div className="sm:ml-4">
                <p className="text-xs sm:text-sm font-medium text-gray-600">Cas d'usage IA</p>
                <p className="text-lg sm:text-2xl font-bold text-gray-900">{useCases.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow">
            <div className="flex flex-col sm:flex-row sm:items-center">
              <div className="bg-green-50 p-2 sm:p-3 rounded-lg mb-2 sm:mb-0 w-fit">
                <CheckCircle className="h-5 w-5 sm:h-6 sm:w-6 text-green-600" />
              </div>
              <div className="sm:ml-4">
                <p className="text-xs sm:text-sm font-medium text-gray-600">Conformes</p>
                <p className="text-lg sm:text-2xl font-bold text-gray-900">
                  {progress.filter(p => p.is_completed).length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow">
            <div className="flex flex-col sm:flex-row sm:items-center">
              <div className="bg-yellow-50 p-2 sm:p-3 rounded-lg mb-2 sm:mb-0 w-fit">
                <AlertTriangle className="h-5 w-5 sm:h-6 sm:w-6 text-yellow-600" />
              </div>
              <div className="sm:ml-4">
                <p className="text-xs sm:text-sm font-medium text-gray-600">En cours</p>
                <p className="text-lg sm:text-2xl font-bold text-gray-900">
                  {progress.filter(p => !p.is_completed).length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow">
            <div className="flex flex-col sm:flex-row sm:items-center">
              <div className="bg-red-50 p-2 sm:p-3 rounded-lg mb-2 sm:mb-0 w-fit">
                <Clock className="h-5 w-5 sm:h-6 sm:w-6 text-red-600" />
              </div>
              <div className="sm:ml-4">
                <p className="text-xs sm:text-sm font-medium text-gray-600">Non démarrés</p>
                <p className="text-lg sm:text-2xl font-bold text-gray-900">
                  {useCases.length - progress.length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Use Cases Section */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="px-4 sm:px-6 py-4 bg-gray-50 border-b border-gray-100">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-3 sm:space-y-0">
              <h2 className="text-lg font-semibold text-gray-900">Cas d'usage IA</h2>
              <Link
                href={`/usecases/new?company=${companyId}`}
                className="inline-flex items-center justify-center px-4 py-2 bg-[#0080A3] text-white text-sm font-medium rounded-lg hover:bg-[#006280] transition-colors w-full sm:w-auto"
              >
                <Plus className="h-4 w-4 mr-2" />
                Nouveau cas d'usage
              </Link>
            </div>
          </div>
          <div className="p-4 sm:p-6">
            {useCases.length === 0 ? (
              <div className="text-center py-8 sm:py-12">
                <div className="bg-gray-50 p-3 sm:p-4 rounded-full w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-4 flex items-center justify-center">
                  <Brain className="h-6 w-6 sm:h-8 sm:w-8 text-gray-400" />
                </div>
                <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-2">Aucun cas d'usage</h3>
                <p className="text-sm sm:text-base text-gray-600 mb-4 sm:mb-6">Créez votre premier cas d'usage IA pour cette entreprise</p>
                <Link
                  href={`/usecases/new?company=${companyId}`}
                  className="inline-flex items-center px-4 py-2 bg-[#0080A3] text-white text-sm font-medium rounded-lg hover:bg-[#006280] transition-colors"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Nouveau cas d'usage
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {useCases.map((useCase) => {
                  const useCaseProgress = getProgressForUseCase(useCase.id)
                  
                  return (
                    <Link
                      key={useCase.id}
                      href={`/usecases/${useCase.id}`}
                      className="block p-4 bg-gray-50 rounded-lg hover:bg-gray-100 hover:shadow-md transition-all"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between space-y-3 sm:space-y-0">
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-3 mb-2">
                            <h3 className="font-medium text-gray-900 truncate">{useCase.name}</h3>
                            <div className="flex flex-wrap gap-2">
                              <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(useCase.status)}`}>
                                {useCase.status}
                              </span>
                              {useCase.risk_level && (
                                <span className={`px-2 py-1 text-xs font-medium rounded-full ${getRiskLevelColor(useCase.risk_level)}`}>
                                  {useCase.risk_level} risk
                                </span>
                              )}
                            </div>
                          </div>
                          <p className="text-sm text-gray-600 mb-3 line-clamp-2">{useCase.description}</p>
                          <div className="flex flex-col sm:flex-row sm:items-center space-y-1 sm:space-y-0 sm:space-x-4 text-sm text-gray-500">
                            {useCase.ai_category && <span>{useCase.ai_category}</span>}
                            {useCase.technology_partner && <span className="hidden sm:inline">• {useCase.technology_partner}</span>}
                            {useCase.technology_partner && <span className="sm:hidden text-xs">{useCase.technology_partner}</span>}
                          </div>
                        </div>
                        <div className="flex justify-end sm:ml-4">
                          {useCaseProgress ? (
                            <div className="flex items-center space-x-2 bg-white px-3 py-2 rounded-lg">
                              {useCaseProgress.is_completed ? (
                                <CheckCircle className="h-4 w-4 text-green-600" />
                              ) : (
                                <Clock className="h-4 w-4 text-yellow-600" />
                              )}
                              <span className="text-sm font-medium">
                                {Math.round(useCaseProgress.completion_percentage)}%
                              </span>
                            </div>
                          ) : (
                            <span className="text-sm text-gray-400 bg-white px-3 py-2 rounded-lg">Non démarré</span>
                          )}
                        </div>
                      </div>
                    </Link>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          <Link
            href={`/questionnaire?company=${companyId}`}
            className="bg-white p-4 sm:p-6 rounded-xl shadow-sm hover:shadow-md transition-all group"
          >
            <div className="flex items-center">
              <div className="bg-green-50 p-2 sm:p-3 rounded-lg group-hover:bg-green-100 transition-colors">
                <FileText className="h-5 w-5 sm:h-6 sm:w-6 text-green-600" />
              </div>
              <div className="ml-3 sm:ml-4">
                <h3 className="text-base sm:text-lg font-medium text-gray-900">Questionnaire</h3>
                <p className="text-sm text-gray-600">Gérer les questions de conformité</p>
              </div>
            </div>
          </Link>

          <Link
            href={`/reports?company=${companyId}`}
            className="bg-white p-4 sm:p-6 rounded-xl shadow-sm hover:shadow-md transition-all group"
          >
            <div className="flex items-center">
              <div className="bg-purple-50 p-2 sm:p-3 rounded-lg group-hover:bg-purple-100 transition-colors">
                <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6 text-purple-600" />
              </div>
              <div className="ml-3 sm:ml-4">
                <h3 className="text-base sm:text-lg font-medium text-gray-900">Rapports</h3>
                <p className="text-sm text-gray-600">Analyser la conformité</p>
              </div>
            </div>
          </Link>

          <Link
            href="/admin"
            className="bg-white p-4 sm:p-6 rounded-xl shadow-sm hover:shadow-md transition-all group sm:col-span-2 lg:col-span-1"
          >
            <div className="flex items-center">
              <div className="bg-[#0080A3]/10 p-2 sm:p-3 rounded-lg group-hover:bg-[#0080A3]/20 transition-colors">
                <Calendar className="h-5 w-5 sm:h-6 sm:w-6 text-[#0080A3]" />
              </div>
              <div className="ml-3 sm:ml-4">
                <h3 className="text-base sm:text-lg font-medium text-gray-900">Administration</h3>
                <p className="text-sm text-gray-600">Gérer les paramètres</p>
              </div>
            </div>
          </Link>
        </div>
      </div>
    </div>
  )
} 