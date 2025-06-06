'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/lib/auth'
import { Shield, Building2, Brain, FileText, Plus, Users, BarChart3, CheckCircle, AlertTriangle, Clock } from 'lucide-react'

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

export default function Dashboard() {
  const { user, session, loading } = useAuth()
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [companies, setCompanies] = useState<Company[]>([])
  const [useCases, setUseCases] = useState<UseCase[]>([])
  const [progress, setProgress] = useState<Progress[]>([])
  const [loadingData, setLoadingData] = useState(true)

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
    if (user && mounted) {
      fetchDashboardData()
    }
  }, [user, mounted])

  const fetchDashboardData = async () => {
    try {
      setLoadingData(true)
      
      if (!session?.access_token) {
        // Session token not available - redirecting to login
        return
      }
      
      // Fetch companies
      const companiesResponse = await fetch('/api/companies', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })
      if (companiesResponse.ok) {
        const companiesData = await companiesResponse.json()
        setCompanies(companiesData)
      }

      // Fetch use cases
      const useCasesResponse = await fetch('/api/usecases', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })
      if (useCasesResponse.ok) {
        const useCasesData = await useCasesResponse.json()
        setUseCases(useCasesData)
      }

      // Fetch progress
      const progressResponse = await fetch('/api/questionnaire/progress', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })
      if (progressResponse.ok) {
        const progressData = await progressResponse.json()
        setProgress(progressData)
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

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <div className="bg-[#0080A3]/10 p-3 rounded-lg">
              <Shield className="h-8 w-8 text-[#0080A3]" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Maydai Dashboard</h1>
              <p className="text-gray-600">Conformité IA Act</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-gray-600">
              Bonjour, {user.user_metadata?.first_name || user.email}
            </span>
            <Link
              href="/profil"
              className="text-[#0080A3] hover:text-[#006280] font-medium"
            >
              Profil
            </Link>
          </div>
        </div>
      </div>

      {loadingData ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0080A3]"></div>
          <span className="ml-3 text-gray-600">Chargement des données...</span>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center">
                <div className="bg-blue-50 p-3 rounded-lg">
                  <Building2 className="h-6 w-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Entreprises</p>
                  <p className="text-2xl font-bold text-gray-900">{companies.length}</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center">
                <div className="bg-purple-50 p-3 rounded-lg">
                  <Brain className="h-6 w-6 text-purple-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Cas d'usage IA</p>
                  <p className="text-2xl font-bold text-gray-900">{useCases.length}</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center">
                <div className="bg-green-50 p-3 rounded-lg">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Conformes</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {progress.filter(p => p.is_completed).length}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center">
                <div className="bg-yellow-50 p-3 rounded-lg">
                  <AlertTriangle className="h-6 w-6 text-yellow-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">En cours</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {progress.filter(p => !p.is_completed).length}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Companies Section */}
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-100">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold text-gray-900">Vos entreprises</h2>
                <Link
                  href="/companies/new"
                  className="inline-flex items-center px-4 py-2 bg-[#0080A3] text-white text-sm font-medium rounded-lg hover:bg-[#006280] transition-colors"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Ajouter une entreprise
                </Link>
              </div>
            </div>
            <div className="p-6">
              {companies.length === 0 ? (
                <div className="text-center py-12">
                  <div className="bg-gray-50 p-4 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                    <Building2 className="h-8 w-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Aucune entreprise</h3>
                  <p className="text-gray-600 mb-6">Commencez par ajouter votre première entreprise</p>
                  <Link
                    href="/companies/new"
                    className="inline-flex items-center px-4 py-2 bg-[#0080A3] text-white text-sm font-medium rounded-lg hover:bg-[#006280] transition-colors"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Ajouter une entreprise
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {companies.map((company) => (
                    <Link
                      key={company.id}
                      href={`/companies/${company.id}`}
                      className="block p-4 bg-gray-50 rounded-lg hover:bg-gray-100 hover:shadow-md transition-all"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-medium text-gray-900">{company.name}</h3>
                          <p className="text-sm text-gray-600 mt-1">{company.industry}</p>
                          <p className="text-sm text-gray-500 mt-1">
                            {company.city}, {company.country}
                          </p>
                        </div>
                        <div className="text-sm text-gray-400 bg-white px-2 py-1 rounded">
                          {useCases.filter(uc => uc.company_id === company.id).length} cas d'usage
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Use Cases Section */}
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-100">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold text-gray-900">Cas d'usage IA récents</h2>
                <Link
                  href="/usecases/new"
                  className="inline-flex items-center px-4 py-2 bg-[#0080A3] text-white text-sm font-medium rounded-lg hover:bg-[#006280] transition-colors"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Nouveau cas d'usage
                </Link>
              </div>
            </div>
            <div className="p-6">
              {useCases.length === 0 ? (
                <div className="text-center py-12">
                  <div className="bg-gray-50 p-4 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                    <Brain className="h-8 w-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun cas d'usage</h3>
                  <p className="text-gray-600 mb-6">Créez votre premier cas d'usage IA</p>
                  <Link
                    href="/usecases/new"
                    className="inline-flex items-center px-4 py-2 bg-[#0080A3] text-white text-sm font-medium rounded-lg hover:bg-[#006280] transition-colors"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Nouveau cas d'usage
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {useCases.slice(0, 5).map((useCase) => {
                    const useCaseProgress = getProgressForUseCase(useCase.id)
                    const company = companies.find(c => c.id === useCase.company_id)
                    
                    return (
                      <Link
                        key={useCase.id}
                        href={`/usecases/${useCase.id}`}
                        className="block p-4 bg-gray-50 rounded-lg hover:bg-gray-100 hover:shadow-md transition-all"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-2">
                              <h3 className="font-medium text-gray-900">{useCase.name}</h3>
                              <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(useCase.status)}`}>
                                {useCase.status}
                              </span>
                              {useCase.risk_level && (
                                <span className={`px-2 py-1 text-xs font-medium rounded-full ${getRiskLevelColor(useCase.risk_level)}`}>
                                  {useCase.risk_level} risk
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-600 mb-2 line-clamp-2">{useCase.description}</p>
                            <div className="flex items-center space-x-4 text-sm text-gray-500">
                              <span className="font-medium">{company?.name}</span>
                              {useCase.ai_category && <span>• {useCase.ai_category}</span>}
                              {useCase.technology_partner && <span>• {useCase.technology_partner}</span>}
                            </div>
                          </div>
                          <div className="ml-4 text-right">
                            {useCaseProgress ? (
                              <div className="flex items-center space-x-2 bg-white px-3 py-1 rounded-lg">
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
                              <span className="text-sm text-gray-400 bg-white px-3 py-1 rounded-lg">Non démarré</span>
                            )}
                          </div>
                        </div>
                      </Link>
                    )
                  })}
                  
                  {useCases.length > 5 && (
                    <div className="pt-4 border-t border-gray-100">
                      <Link
                        href="/usecases"
                        className="text-[#0080A3] hover:text-[#006280] text-sm font-medium"
                      >
                        Voir tous les cas d'usage ({useCases.length}) →
                      </Link>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Link
              href="/questionnaire"
              className="bg-white p-6 rounded-xl shadow-sm hover:shadow-md transition-all group"
            >
              <div className="flex items-center">
                <div className="bg-green-50 p-3 rounded-lg group-hover:bg-green-100 transition-colors">
                  <FileText className="h-6 w-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-medium text-gray-900">Questionnaire</h3>
                  <p className="text-sm text-gray-600">Gérer les questions de conformité</p>
                </div>
              </div>
            </Link>

            <Link
              href="/reports"
              className="bg-white p-6 rounded-xl shadow-sm hover:shadow-md transition-all group"
            >
              <div className="flex items-center">
                <div className="bg-purple-50 p-3 rounded-lg group-hover:bg-purple-100 transition-colors">
                  <BarChart3 className="h-6 w-6 text-purple-600" />
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-medium text-gray-900">Rapports</h3>
                  <p className="text-sm text-gray-600">Analyser la conformité</p>
                </div>
              </div>
            </Link>

            <Link
              href="/admin"
              className="bg-white p-6 rounded-xl shadow-sm hover:shadow-md transition-all group"
            >
              <div className="flex items-center">
                <div className="bg-[#0080A3]/10 p-3 rounded-lg group-hover:bg-[#0080A3]/20 transition-colors">
                  <Users className="h-6 w-6 text-[#0080A3]" />
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-medium text-gray-900">Administration</h3>
                  <p className="text-sm text-gray-600">Gérer les paramètres</p>
                </div>
              </div>
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
