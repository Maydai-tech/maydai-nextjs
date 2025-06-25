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
  TrendingUp,
  ChevronLeft,
  ChevronRight,
  Search,
  X
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
  const [loadingData, setLoadingData] = useState(true)
  
  // Search state
  const [searchTerm, setSearchTerm] = useState('')
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10
  
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
        // Reset to first page when data changes
        setCurrentPage(1)
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoadingData(false)
    }
  }

  // Filter use cases based on search term
  const filteredUseCases = useCases.filter(useCase =>
    (useCase.name && useCase.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (useCase.description && useCase.description.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  // Pagination calculations
  const totalPages = Math.ceil(filteredUseCases.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentUseCases = filteredUseCases.slice(startIndex, endIndex)
  const startItem = startIndex + 1
  const endItem = Math.min(endIndex, filteredUseCases.length)

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    // Scroll to top of use cases section
    document.getElementById('use-cases-section')?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleSearchChange = (value: string) => {
    setSearchTerm(value)
    setCurrentPage(1) // Reset to first page when searching
  }

  const clearSearch = () => {
    setSearchTerm('')
    setCurrentPage(1)
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
      case 'terminé': return 'text-green-700 bg-green-50 border border-green-200'
      case 'en cours': return 'text-yellow-700 bg-yellow-50 border border-yellow-200'
      case 'a compléter': return 'text-gray-700 bg-gray-50 border border-gray-200'
      default: return 'text-gray-700 bg-gray-50 border border-gray-200'
    }
  }

  const getUseCaseStatusInFrench = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'completed':
      case 'active': 
        return 'Terminé'
      case 'in_progress':
      case 'under_review':
        return 'En cours'
      case 'draft':
      case 'not_started':
      default:
        return 'À compléter'
    }
  }

  const getCompletedCount = () => {
    return useCases.filter(useCase => 
      ['completed', 'active'].includes(useCase.status?.toLowerCase())
    ).length
  }

  const getInProgressCount = () => {
    return useCases.filter(useCase => 
      ['in_progress', 'under_review'].includes(useCase.status?.toLowerCase())
    ).length
  }

  const getNotStartedCount = () => {
    return useCases.filter(useCase => 
      ['draft', 'not_started'].includes(useCase.status?.toLowerCase()) || !useCase.status
    ).length
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
                  {getCompletedCount()}
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
                  {getInProgressCount()}
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
                  {getNotStartedCount()}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Use Cases Section */}
        <div id="use-cases-section" className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="px-4 sm:px-6 py-4 bg-gray-50 border-b border-gray-100">
            <div className="flex flex-col space-y-4">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-3 sm:space-y-0">
                <div className="flex flex-col sm:flex-row sm:items-center space-y-1 sm:space-y-0 sm:space-x-4">
                  <h2 className="text-lg font-semibold text-gray-900">Cas d'usage IA</h2>
                  {useCases.length > 0 && (
                    <span className="text-sm text-gray-600">
                      {searchTerm ? (
                        <>
                          {startItem}-{endItem} sur {filteredUseCases.length} 
                          {filteredUseCases.length !== useCases.length && (
                            <span className="text-gray-400"> (filtré sur {useCases.length})</span>
                          )}
                        </>
                      ) : (
                        <>{startItem}-{endItem} sur {useCases.length}</>
                      )}
                    </span>
                  )}
                </div>
                <Link
                  href={`/usecases/new?company=${companyId}`}
                  className="inline-flex items-center justify-center px-4 py-2 bg-[#0080A3] text-white text-sm font-medium rounded-lg hover:bg-[#006280] transition-colors w-full sm:w-auto"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Nouveau cas d'usage
                </Link>
              </div>
              
              {/* Search Bar */}
              {useCases.length > 0 && (
                <div className="relative max-w-md">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-4 w-4 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    placeholder="Rechercher un cas d'usage..."
                    value={searchTerm}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    className="block w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#0080A3] focus:border-transparent"
                  />
                  {searchTerm && (
                    <button
                      onClick={clearSearch}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center hover:text-gray-600 transition-colors"
                    >
                      <X className="h-4 w-4 text-gray-400" />
                    </button>
                  )}
                </div>
              )}
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
            ) : filteredUseCases.length === 0 ? (
              <div className="text-center py-8 sm:py-12">
                <div className="bg-gray-50 p-3 sm:p-4 rounded-full w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-4 flex items-center justify-center">
                  <Search className="h-6 w-6 sm:h-8 sm:w-8 text-gray-400" />
                </div>
                <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-2">Aucun résultat trouvé</h3>
                <p className="text-sm sm:text-base text-gray-600 mb-4 sm:mb-6">
                  Aucun cas d'usage ne correspond à votre recherche "{searchTerm}"
                </p>
                <button
                  onClick={clearSearch}
                  className="inline-flex items-center px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors"
                >
                  <X className="h-4 w-4 mr-2" />
                  Effacer la recherche
                </button>
              </div>
            ) : (
              <>
                <div className="space-y-4">
                  {currentUseCases.map((useCase) => {
                    // Détermine l'URL de destination selon le statut
                    const getUseCaseUrl = (useCase: UseCase) => {
                      const isToComplete = 
                        useCase.status?.toLowerCase() === 'draft' ||
                        useCase.status?.toLowerCase() === 'not_started' ||
                        !useCase.status
                      
                      return isToComplete 
                        ? `/usecases/${useCase.id}/evaluation`
                        : `/usecases/${useCase.id}`
                    }

                    return (
                      <Link
                        key={useCase.id}
                        href={getUseCaseUrl(useCase)}
                        className="block p-4 bg-gray-50 rounded-lg hover:bg-gray-100 hover:shadow-md transition-all"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between space-y-3 sm:space-y-0">
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-3 mb-2">
                              <h3 className="font-medium text-gray-900 truncate">{useCase.name}</h3>
                              <div className="flex flex-wrap gap-2">
                                <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(getUseCaseStatusInFrench(useCase.status))}`}>
                                  {getUseCaseStatusInFrench(useCase.status)}
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
                        </div>
                      </Link>
                    )
                  })}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="mt-6 pt-6 border-t border-gray-100">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
                      <div className="text-sm text-gray-600 text-center sm:text-left">
                        Affichage de {startItem} à {endItem} sur {filteredUseCases.length} cas d'usage
                        {searchTerm && filteredUseCases.length !== useCases.length && (
                          <span className="text-gray-400"> (filtré sur {useCases.length})</span>
                        )}
                      </div>
                      <div className="flex items-center justify-center space-x-2">
                        <button
                          onClick={() => handlePageChange(currentPage - 1)}
                          disabled={currentPage === 1}
                          className="flex items-center px-3 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white disabled:hover:text-gray-600 transition-colors"
                        >
                          <ChevronLeft className="h-4 w-4 mr-1" />
                          Précédent
                        </button>

                        <div className="flex items-center space-x-1">
                          {[...Array(totalPages)].map((_, index) => {
                            const page = index + 1
                            const isCurrentPage = page === currentPage
                            
                            // Show first page, last page, current page, and pages around current page
                            const showPage = 
                              page === 1 || 
                              page === totalPages || 
                              (page >= currentPage - 1 && page <= currentPage + 1)
                            
                            if (!showPage) {
                              // Show ellipsis for gaps
                              if ((page === currentPage - 2 && currentPage > 3) || 
                                  (page === currentPage + 2 && currentPage < totalPages - 2)) {
                                return (
                                  <span key={page} className="px-2 py-1 text-sm text-gray-400">
                                    ...
                                  </span>
                                )
                              }
                              return null
                            }

                            return (
                              <button
                                key={page}
                                onClick={() => handlePageChange(page)}
                                className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                                  isCurrentPage
                                    ? 'bg-[#0080A3] text-white'
                                    : 'text-gray-600 bg-white border border-gray-300 hover:bg-gray-50 hover:text-gray-700'
                                }`}
                              >
                                {page}
                              </button>
                            )
                          })}
                        </div>

                        <button
                          onClick={() => handlePageChange(currentPage + 1)}
                          disabled={currentPage === totalPages}
                          className="flex items-center px-3 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white disabled:hover:text-gray-600 transition-colors"
                        >
                          Suivant
                          <ChevronRight className="h-4 w-4 ml-1" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

      
      </div>
    </div>
  )
} 