'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/lib/auth'
import { useApiCall } from '@/lib/api-client-legacy'
import { useUserPlan } from '@/app/abonnement/hooks/useUserPlan'
import { getProviderIcon } from '@/lib/provider-icons'
import {
  ArrowLeft,
  Shield,
  CheckCircle,
  AlertTriangle,
  Clock,
  Plus,
  ChevronLeft,
  ChevronRight,
  Search,
  X,
  Trash2
} from 'lucide-react'
import WorldMap from '@/components/WorldMap'
import ScoreCircle from '@/components/ScoreCircle'
import RiskPyramid from '@/components/RiskPyramid'
import DeleteConfirmationModal from '@/app/usecases/[id]/components/DeleteConfirmationModal'
import DeleteRegistryModal from './components/DeleteRegistryModal'
import PlanLimitModal from '@/components/Shared/PlanLimitModal'
import Image from 'next/image'
import { getCompactScoreStyle, getSpecialScoreStyles } from '@/lib/score-styles'

interface Company {
  id: string
  name: string
  industry: string
  city: string
  country: string
  role?: string
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
  llm_model_version?: string
  responsible_service: string
  deployment_countries?: string[]
  deployment_date?: string
  primary_model_id?: string
  score_final?: number | null
  is_eliminated?: boolean
  elimination_reason?: string
  compl_ai_models?: {
    id: string
    model_name: string
    model_provider: string
    model_type?: string
    version?: string
  }
}

interface DashboardProps {
  params: Promise<{
    id: string
  }>
}

export default function CompanyDashboardPage({ params }: DashboardProps) {
  const { user, session, loading } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [mounted, setMounted] = useState(false)
  const [companyId, setCompanyId] = useState<string>('')
  const [company, setCompany] = useState<Company | null>(null)
  const [useCases, setUseCases] = useState<UseCase[]>([])
  const [loadingData, setLoadingData] = useState(true)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [useCaseToDelete, setUseCaseToDelete] = useState<UseCase | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showUseCaseLimitModal, setShowUseCaseLimitModal] = useState(false)
  const [deleteRegistryModalOpen, setDeleteRegistryModalOpen] = useState(false)
  const [isDeletingRegistry, setIsDeletingRegistry] = useState(false)
  const { plan } = useUserPlan()

  // Average score state
  const [averageScore, setAverageScore] = useState<number | null>(null)
  const [loadingScore, setLoadingScore] = useState(true)
  const [evaluatedCount, setEvaluatedCount] = useState(0)
  const [totalCount, setTotalCount] = useState(0)

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

  // Prevent hydration mismatch and check for success message
  useEffect(() => {
    setMounted(true)

    // Check for deletion success message
    if (searchParams.get('deleted') === 'true') {
      const useCaseName = searchParams.get('useCaseName')
      setSuccessMessage(`Le use case "${useCaseName || 'Use case'}" a été supprimé avec succès`)

      // Clear the message after 5 seconds
      setTimeout(() => {
        setSuccessMessage(null)
        // Clean up the URL
        const url = new URL(window.location.href)
        url.searchParams.delete('deleted')
        url.searchParams.delete('useCaseName')
        router.replace(url.pathname)
      }, 5000)
    }
  }, [searchParams, router])

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
      setLoadingScore(true)

      if (!session?.access_token) {
        return
      }

      // Fetch company details, use cases, and average score in parallel
      const [companyResponse, useCasesResponse, averageScoreResponse] = await Promise.all([
        api.get(`/api/companies/${companyId}`),
        api.get(`/api/companies/${companyId}/usecases`),
        api.get(`/api/companies/${companyId}/average-score`)
      ])

      if (companyResponse.status === 404) {
        router.push('/dashboard/registries')
        return
      } else if (companyResponse.data) {
        setCompany(companyResponse.data)
      }

      if (useCasesResponse.data) {
        console.log('🔍 Debug dashboard usecases data:', useCasesResponse.data.map((uc: any) => ({
          id: uc.id,
          name: uc.name,
          status: uc.status,
          risk_level: uc.risk_level,
          score_final: uc.score_final,
          has_compl_ai_models: !!uc.compl_ai_models
        })))
        setUseCases(useCasesResponse.data)
        // Reset to first page when data changes
        setCurrentPage(1)
      }

      // Handle average score response
      if (averageScoreResponse.data) {
        setAverageScore(averageScoreResponse.data.average_score)
        setEvaluatedCount(averageScoreResponse.data.evaluated_count || 0)
        setTotalCount(averageScoreResponse.data.total_count || 0)
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoadingData(false)
      setLoadingScore(false)
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

  const handleDeleteClick = (e: React.MouseEvent, useCase: UseCase) => {
    e.preventDefault()
    e.stopPropagation()
    setUseCaseToDelete(useCase)
    setDeleteModalOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!useCaseToDelete || !session?.access_token) return

    setIsDeleting(true)
    try {
      const response = await fetch(`/api/usecases/${useCaseToDelete.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Erreur lors de la suppression')
      }

      // Rafraîchir la liste
      setSuccessMessage(`Le use case "${useCaseToDelete.name}" a été supprimé avec succès`)
      setUseCases(useCases.filter(uc => uc.id !== useCaseToDelete.id))
      setDeleteModalOpen(false)
      setUseCaseToDelete(null)

      // Clear message after 5 seconds
      setTimeout(() => {
        setSuccessMessage(null)
      }, 5000)
    } catch (error) {
      console.error('Erreur lors de la suppression:', error)
      alert('Une erreur est survenue lors de la suppression du use case')
    } finally {
      setIsDeleting(false)
    }
  }

  const handleDeleteCancel = () => {
    setDeleteModalOpen(false)
    setUseCaseToDelete(null)
  }

  const handleDeleteRegistry = async () => {
    if (!company || !session?.access_token) return

    setIsDeletingRegistry(true)
    try {
      const response = await fetch(`/api/companies/${companyId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Erreur lors de la suppression')
      }

      // Rediriger vers la page registries avec message de succès
      router.push(`/dashboard/registries?deleted=true&registryName=${encodeURIComponent(company.name)}`)
    } catch (error) {
      console.error('Erreur lors de la suppression du registre:', error)
      alert('Une erreur est survenue lors de la suppression du registre')
      setIsDeletingRegistry(false)
      setDeleteRegistryModalOpen(false)
    }
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
      case 'complété': return 'border border-[#0080a3]'
      case 'en cours': return 'text-yellow-700 bg-yellow-50 border border-yellow-200'
      case 'éliminé': return 'text-red-700 bg-red-50 border border-red-200'
      case 'a compléter': return 'text-gray-700 border border-gray-200'
      default: return 'text-gray-700 border border-gray-200'
    }
  }

  const getUseCaseStatusInFrench = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'completed':
      case 'active':
        return 'Complété'
      case 'in_progress':
      case 'under_review':
        return 'En cours'
      case 'eliminated':
      case 'rejected':
        return 'Éliminé'
      case 'draft':
      case 'not_started':
      default:
        return 'À compléter'
    }
  }

  // Fonction pour obtenir l'icône du provider (utilise la fonction utilitaire)
  const getProviderIconPath = (provider: string) => {
    return getProviderIcon(provider)
  }

  // Fonction pour obtenir le nom du modèle à afficher
  const getModelDisplayName = (useCase: UseCase) => {
    if (useCase.compl_ai_models?.model_name) {
      return useCase.compl_ai_models.model_name
    }
    if (useCase.llm_model_version) {
      return useCase.llm_model_version
    }
    if (useCase.technology_partner) {
      return useCase.technology_partner
    }
    return 'Modèle non renseigné'
  }

  // Fonction pour obtenir le provider à afficher
  const getProviderDisplayName = (useCase: UseCase) => {
    if (useCase.compl_ai_models?.model_provider) {
      return useCase.compl_ai_models.model_provider
    }
    if (useCase.technology_partner) {
      return useCase.technology_partner
    }
    return 'Provider inconnu'
  }

  // Fonction pour traduire le niveau de risque en français
  const getRiskLevelInFrench = (riskLevel: string): string => {
    const riskLevelMap: Record<string, string> = {
      'low': 'Risque Limité',
      'limited': 'Risque Limité',
      'high': 'Risque Élevé',
      'unacceptable': 'Risque Inacceptable',
      'minimal': 'Risque Minimal',
      'moderate': 'Risque Modéré'
    }
    return riskLevelMap[riskLevel?.toLowerCase()] || riskLevel || 'Non évalué'
  }

  // Fonction pour déterminer le statut de déploiement (Actif/Inactif)
  const getDeploymentStatus = (deploymentDate?: string): 'Actif' | 'Inactif' => {
    if (!deploymentDate) return 'Inactif'
    
    try {
      const deployment = new Date(deploymentDate)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      deployment.setHours(0, 0, 0, 0)
      
      // Vérifier si la date est valide
      if (isNaN(deployment.getTime())) return 'Inactif'
      
      return deployment <= today ? 'Actif' : 'Inactif'
    } catch (error) {
      return 'Inactif'
    }
  }

  // Fonction pour obtenir les styles de la pastille de statut de déploiement
  const getDeploymentStatusColor = (status: 'Actif' | 'Inactif') => {
    if (status === 'Actif') {
      return {
        backgroundColor: '#f1fdfa',
        color: '#0080a3',
        border: 'border border-[#0080a3]'
      }
    } else {
      return {
        backgroundColor: '#f3f4f6',
        color: '#6b7280',
        border: 'border border-gray-300'
      }
    }
  }

  // Fonction pour obtenir les couleurs et icônes selon le niveau de risque
  const getRiskLevelConfig = (riskLevel: string) => {
    switch (riskLevel?.toLowerCase()) {
      case 'minimal':
        return {
          bg: 'bg-[#f1fdfa]',
          border: 'border-green-300',
          text: 'text-green-800',
          iconColor: 'text-green-600',
          icon: (
            <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          )
        }
      case 'limited':
        return {
          bg: 'bg-yellow-50',
          border: 'border-yellow-300',
          text: 'text-yellow-800',
          iconColor: 'text-yellow-600',
          icon: (
            <svg className="w-4 h-4 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          )
        }
      case 'high':
        return {
          bg: 'bg-orange-50',
          border: 'border-orange-300',
          text: 'text-orange-800',
          iconColor: 'text-orange-600',
          icon: (
            <svg className="w-4 h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          )
        }
      case 'unacceptable':
        return {
          bg: 'bg-red-50',
          border: 'border-red-300',
          text: 'text-red-800',
          iconColor: 'text-red-600',
          icon: (
            <AlertTriangle className="h-4 w-4 text-red-500" />
          )
        }
      default:
        return {
          bg: 'bg-yellow-50',
          border: 'border-yellow-300',
          text: 'text-yellow-800',
          iconColor: 'text-yellow-600',
          icon: (
            <svg className="w-4 h-4 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          )
        }
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

  // Get all unique deployment countries from use cases
  const getDeploymentCountries = () => {
    const allCountries = new Set<string>()
    useCases.forEach(useCase => {
      if (useCase.deployment_countries && Array.isArray(useCase.deployment_countries)) {
        useCase.deployment_countries.forEach(country => {
          if (country && typeof country === 'string') {
            allCountries.add(country.trim())
          }
        })
      }
    })
    return Array.from(allCountries).sort()
  }

  // Get count of use cases per country
  const getCountryUseCaseCount = () => {
    const countryCount: { [key: string]: number } = {}
    useCases.forEach(useCase => {
      if (useCase.deployment_countries && Array.isArray(useCase.deployment_countries)) {
        useCase.deployment_countries.forEach(country => {
          if (country && typeof country === 'string') {
            const trimmedCountry = country.trim()
            countryCount[trimmedCountry] = (countryCount[trimmedCountry] || 0) + 1
          }
        })
      }
    })
    return countryCount
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
            href="/dashboard/registries"
            className="inline-flex items-center px-4 py-2 bg-[#0080A3] text-white font-medium rounded-lg hover:bg-[#006280] transition-colors"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour aux registres
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 sm:space-y-8 px-4 sm:px-6 lg:px-8">
      {/* Success Message */}
      {successMessage && (
        <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 flex items-center justify-between">
          <div className="flex items-center">
            <CheckCircle className="h-5 w-5 text-green-600 mr-3" />
            <p className="text-green-800 font-medium">{successMessage}</p>
          </div>
          <button
            onClick={() => setSuccessMessage(null)}
            className="text-green-600 hover:text-green-800 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6">
        <div className="flex flex-col space-y-4">
          <div className="flex items-center justify-between">
            <Link
              href="/dashboard/registries"
              className="inline-flex items-center text-gray-600 hover:text-[#0080A3] transition-colors"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              <span className="text-sm font-medium">Retour aux registres</span>
            </Link>
          </div>

          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-4 sm:space-y-0">
            <div className="flex items-center space-x-3 sm:space-x-4">
              <div className="bg-[#0080A3]/10 p-2 sm:p-3 rounded-lg">
                <Shield className="h-6 w-6 sm:h-8 sm:w-8 text-[#0080A3]" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{company.name}</h1>
              </div>
            </div>

            {/* Delete Registry Button - Only for owners */}
            {company.role === 'owner' && (
              <button
                onClick={() => setDeleteRegistryModalOpen(true)}
                className="inline-flex items-center px-4 py-2 text-red-600 hover:text-red-700 hover:bg-red-50 border border-red-300 rounded-lg transition-colors font-medium"
                title="Supprimer le registre"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Supprimer le registre</span>
                <span className="sm:hidden">Supprimer</span>
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-6 sm:space-y-8">
        {/* Overview Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
          <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow">
            <div className="flex flex-col sm:flex-row sm:items-center">
              <div className="bg-purple-50 p-2 sm:p-3 rounded-lg mb-2 sm:mb-0 w-fit">
                <Image
                  src="/icons_dash/technology.png"
                  alt="Icône technologie"
                  width={24}
                  height={24}
                  className="h-5 w-5 sm:h-6 sm:w-6"
                />
              </div>
              <div className="sm:ml-4">
                <p className="text-xs sm:text-sm font-medium text-gray-600">Cas d'usage IA</p>
                <p className="text-lg sm:text-2xl font-bold text-gray-900">{useCases.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow">
            <div className="flex flex-col sm:flex-row sm:items-center">
              <div className="p-2 sm:p-3 rounded-lg mb-2 sm:mb-0 w-fit" style={{backgroundColor: '#f1fdfa'}}>
                <CheckCircle className="h-5 w-5 sm:h-6 sm:w-6" style={{color: '#0080a3'}} />
              </div>
              <div className="sm:ml-4">
                <p className="text-xs sm:text-sm font-medium text-gray-600">Complétés</p>
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

        {/* Score and World Map Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Colonne gauche - ScoreCircle et RiskPyramid */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white rounded-xl shadow-sm">
              <ScoreCircle
                averageScore={averageScore}
                loading={loadingScore}
                evaluatedCount={evaluatedCount}
                totalCount={totalCount}
              />
            </div>
            <div className="bg-white rounded-xl shadow-sm">
              <RiskPyramid useCases={useCases} />
            </div>
          </div>

          {/* Colonne droite - World Map */}
          <div className="lg:col-span-2">
            <WorldMap
              deploymentCountries={getDeploymentCountries()}
              countryUseCaseCount={getCountryUseCaseCount()}
              className=""
            />
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
                <button
                  onClick={() => {
                    const maxUseCases = plan.maxUseCasesPerRegistry || 3

                    if (useCases.length >= maxUseCases) {
                      setShowUseCaseLimitModal(true)
                    } else {
                      router.push(`/usecases/new?company=${companyId}`)
                    }
                  }}
                  className="inline-flex items-center justify-center px-8 py-4 bg-[#0080A3] text-white text-lg font-medium rounded-lg hover:bg-[#006280] transition-colors w-full sm:w-auto"
                >
                  <Plus className="h-8 w-8 mr-4" />
                  Nouveau cas d'usage
                </button>
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
                  <Image
                    src="/icons_dash/technology.png"
                    alt="Icône technologie"
                    width={32}
                    height={32}
                    className="h-6 w-6 sm:h-8 sm:w-8"
                  />
                </div>
                <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-2">Aucun cas d'usage</h3>
                <p className="text-sm sm:text-base text-gray-600 mb-4 sm:mb-6">Créez votre premier cas d'usage IA pour ce registre</p>
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
                      <div
                        key={useCase.id}
                        className="relative group"
                      >
                        <Link
                          href={getUseCaseUrl(useCase)}
                          className="block p-4 bg-gray-50 rounded-lg hover:bg-gray-100 hover:shadow-md transition-all"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between space-y-3 sm:space-y-0">
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-3 mb-2">
                                <h3 className="font-medium text-gray-900 truncate">{useCase.name}</h3>
                                <div className="flex flex-wrap gap-2">
                                  <span
                                    className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(getUseCaseStatusInFrench(useCase.status))}`}
                                    style={getUseCaseStatusInFrench(useCase.status) === 'Complété' ? {
                                      color: '#0080a3',
                                      backgroundColor: '#f1fdfa'
                                    } : getUseCaseStatusInFrench(useCase.status) === 'À compléter' ? {
                                      color: '#713f12',
                                      backgroundColor: '#fefce8'
                                    } : getUseCaseStatusInFrench(useCase.status) === 'Éliminé' ? {
                                      color: '#dc2626',
                                      backgroundColor: '#fef2f2'
                                    } : {}}
                                  >
                                    {getUseCaseStatusInFrench(useCase.status)}
                                  </span>
                                  {(() => {
                                    const deploymentStatus = getDeploymentStatus(useCase.deployment_date)
                                    const statusStyle = getDeploymentStatusColor(deploymentStatus)
                                    return (
                                      <span
                                        className={`px-2 py-1 text-xs font-medium rounded-full ${statusStyle.border}`}
                                        style={{
                                          color: statusStyle.color,
                                          backgroundColor: statusStyle.backgroundColor
                                        }}
                                      >
                                        {deploymentStatus}
                                      </span>
                                    )
                                  })()}
                                  {useCase.risk_level && (
                                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getRiskLevelColor(useCase.risk_level)}`}>
                                      {useCase.risk_level} risk
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Description et cartes d'information sur la même ligne */}
                              <div className="flex flex-col xl:flex-row xl:items-start space-y-3 xl:space-y-0 xl:space-x-4">
                                <div className="flex-1">
                                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">{useCase.description}</p>
                                  <div className="flex flex-col sm:flex-row sm:items-center space-y-1 sm:space-y-0 sm:space-x-4 text-sm text-gray-500">
                                    {useCase.ai_category && <span>{useCase.ai_category}</span>}
                                    {useCase.technology_partner && <span className="hidden sm:inline">• {useCase.technology_partner}</span>}
                                    {useCase.technology_partner && <span className="sm:hidden text-xs">{useCase.technology_partner}</span>}
                                  </div>
                                </div>

                                {/* Cartes d'information alignées horizontalement */}
                                <div className="flex flex-row gap-2">
                                  {/* Carte Modèle utilisé */}
                                  <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm flex-shrink-0">
                                    <div className="flex items-center justify-between mb-2">
                                      <span className="text-xs font-medium text-gray-600">Modèle utilisé</span>
                                      <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                      </svg>
                                    </div>
                                    {(useCase.compl_ai_models?.model_name || useCase.llm_model_version || useCase.technology_partner) ? (
                                      <div className="flex items-center space-x-2">
                                        <div className="w-6 h-6 flex items-center justify-center">
                                          <Image
                                            src={getProviderIconPath(getProviderDisplayName(useCase))}
                                            alt={`Logo ${getProviderDisplayName(useCase)}`}
                                            width={24}
                                            height={24}
                                            className="w-6 h-6 object-contain"
                                            onError={(e) => {
                                              const target = e.target as HTMLImageElement;
                                              target.style.display = 'none';
                                            }}
                                          />
                                        </div>
                                        <div>
                                          <div className="text-sm font-medium text-gray-900">{getModelDisplayName(useCase)}</div>
                                          <div className="text-xs text-gray-500">{getProviderDisplayName(useCase)}</div>
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="text-sm text-gray-500 italic">
                                        {getUseCaseStatusInFrench(useCase.status) === 'À compléter'
                                          ? 'Disponible après évaluation'
                                          : 'Modèle non renseigné'
                                        }
                                      </div>
                                    )}
                                  </div>

                                  {/* Carte Niveau IA Act */}
                                  <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm flex-shrink-0">
                                    <div className="text-xs font-medium text-gray-600 mb-2">Niveau IA Act</div>
                                    {useCase.score_final === 0 ? (
                                      <div className="bg-red-50 border border-red-200 rounded-lg p-2 flex items-center space-x-2">
                                        <AlertTriangle className="h-4 w-4 text-red-500" />
                                        <div>
                                          <div className="text-xs text-red-600 opacity-75">Risque</div>
                                          <div className="text-sm font-semibold text-red-800">
                                            Inacceptable
                                          </div>
                                        </div>
                                      </div>
                                    ) : useCase.risk_level ? (
                                      (() => {
                                        const config = getRiskLevelConfig(useCase.risk_level);
                                        return (
                                          <div className={`${config.bg} ${config.border} rounded-lg p-2 flex items-center space-x-2`}>
                                            {config.icon}
                                            <div>
                                              <div className={`text-xs ${config.text} opacity-75`}>Risque</div>
                                              <div className={`text-sm font-semibold ${config.text}`}>
                                                {getRiskLevelInFrench(useCase.risk_level).replace('Risque ', '')}
                                              </div>
                                            </div>
                                          </div>
                                        );
                                      })()
                                    ) : (
                                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-2 flex items-center space-x-2">
                                        <svg className="w-4 h-4 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                        </svg>
                                        <div>
                                          <span className="px-2 py-1 text-xs font-medium rounded-full text-gray-700 border border-gray-200" style={{
                                            color: '#713f12',
                                            backgroundColor: '#fefce8'
                                          }}>
                                            Non évalué
                                          </span>
                                        </div>
                                      </div>
                                    )}
                                  </div>

                                  {/* Carte Score de conformité */}
                                  <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm flex-shrink-0">
                                    {useCase.score_final !== null && useCase.score_final !== undefined ? (
                                      <>
                                        <div className="flex items-center space-x-1 mb-2">
                                          <div className={`w-2 h-2 rounded-full ${getCompactScoreStyle(useCase.score_final || 0).indicator}`}></div>
                                          <span className="text-xs font-medium text-gray-600">Score de conformité</span>
                                        </div>
                                        <div className={`${getCompactScoreStyle(useCase.score_final || 0).bg} rounded-lg p-3 text-center`}>
                                          <div className={`text-2xl font-bold ${getCompactScoreStyle(useCase.score_final || 0).accent}`}>
                                            {Math.round(useCase.score_final || 0)}
                                          </div>
                                          {useCase.is_eliminated && (
                                            <div className="inline-flex items-center px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-semibold border border-red-200 mt-2">
                                              <AlertTriangle className="h-3 w-3 mr-1" />
                                              Éliminé
                                            </div>
                                          )}
                                        </div>
                                      </>
                                    ) : (
                                      <>
                                        <div className="flex items-center space-x-1 mb-2">
                                          <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                                          <span className="text-xs font-medium text-gray-600">Score de conformité</span>
                                        </div>
                                        <div className="bg-gray-50 rounded-lg p-3 text-center">
                                          <span className="px-2 py-1 text-xs font-medium rounded-full text-gray-700 border border-gray-200">
                                            N/A
                                          </span>
                                        </div>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </Link>
                        <button
                          onClick={(e) => handleDeleteClick(e, useCase)}
                          className="absolute top-4 right-4 p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-200"
                          title="Supprimer le use case"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
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

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={deleteModalOpen}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        useCaseName={useCaseToDelete?.name || ''}
        deleting={isDeleting}
      />

      {/* Delete Registry Modal */}
      <DeleteRegistryModal
        isOpen={deleteRegistryModalOpen}
        onClose={() => setDeleteRegistryModalOpen(false)}
        onConfirm={handleDeleteRegistry}
        registryName={company?.name || ''}
        deleting={isDeletingRegistry}
      />

      {/* Use Case Limit Modal */}
      <PlanLimitModal
        isOpen={showUseCaseLimitModal}
        onClose={() => setShowUseCaseLimitModal(false)}
        currentCount={useCases.length}
        maxLimit={plan.maxUseCasesPerRegistry || 3}
        planName={plan.displayName}
        resourceType="usecase"
      />
    </div>
  )
}
