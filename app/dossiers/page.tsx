'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import { useApiCall } from '@/lib/api-auth'
import { 
  FileText, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Search,
  BarChart3,
  Clock,
  ExternalLink,
  Upload,
  Info
} from 'lucide-react'

interface UseCase {
  id: string
  name: string
  description: string
  company_id: string
  company_name?: string
  created_at: string
  updated_at: string
  status: 'draft' | 'active' | 'archived'
  // Statuts de conformité des dossiers
  compliance_status: {
    registry_exists: boolean
    documentation_complete: boolean
    human_surveillance_named: boolean
    brand_examples_registered: boolean
    risk_management_exists: boolean
    data_quality_procedure: boolean
    continuous_monitoring_plan: boolean
  }
  // Scores de conformité
  compliance_scores: {
    overall: number
    documentation: number
    governance: number
    monitoring: number
  }
}

export default function DossiersPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const api = useApiCall()
  const [useCases, setUseCases] = useState<UseCase[]>([])
  const [loadingData, setLoadingData] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'compliant' | 'non-compliant' | 'partial'>('all')
  const [showBetaMessage, setShowBetaMessage] = useState(false)
  const [hasFetched, setHasFetched] = useState(false)

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router])

  useEffect(() => {
    const fetchUseCases = async () => {
      if (!user || hasFetched) return

      try {
        setLoadingData(true)
        const result = await api.get('/api/usecases')
        
        if (result.data) {
          // Tous les scores à 0% comme demandé (fonctionnalité en développement)
          const useCasesWithCompliance = result.data.map((uc: any) => ({
            ...uc,
            compliance_status: {
              registry_exists: false,
              documentation_complete: false,
              human_surveillance_named: false,
              brand_examples_registered: false,
              risk_management_exists: false,
              data_quality_procedure: false,
              continuous_monitoring_plan: false,
            },
            compliance_scores: {
              overall: 0,
              documentation: 0,
              governance: 0,
              monitoring: 0,
            }
          }))
          
          setUseCases(useCasesWithCompliance)
          setHasFetched(true)
        }
      } catch (err) {
        console.error('Error fetching use cases:', err)
        setError('Erreur lors du chargement des cas d\'usage')
      } finally {
        setLoadingData(false)
      }
    }

    fetchUseCases()
  }, [user, api, hasFetched])

  const getComplianceStatus = (useCase: UseCase) => {
    const statuses = useCase.compliance_status
    const completedCount = Object.values(statuses).filter(Boolean).length
    const totalCount = Object.keys(statuses).length
    
    if (completedCount === totalCount) return 'compliant'
    if (completedCount === 0) return 'non-compliant'
    return 'partial'
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'compliant': return 'text-green-600 bg-green-50 border-green-200'
      case 'non-compliant': return 'text-red-600 bg-red-50 border-red-200'
      case 'partial': return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      default: return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'compliant': return <CheckCircle className="w-4 h-4" />
      case 'non-compliant': return <XCircle className="w-4 h-4" />
      case 'partial': return <AlertCircle className="w-4 h-4" />
      default: return <Clock className="w-4 h-4" />
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'compliant': return 'Conforme'
      case 'non-compliant': return 'Non conforme'
      case 'partial': return 'Partiellement conforme'
      default: return 'En cours'
    }
  }

  const handleUploadClick = () => {
    setShowBetaMessage(true)
  }

  const filteredUseCases = useCases.filter(useCase => {
    const matchesSearch = useCase.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         useCase.description.toLowerCase().includes(searchTerm.toLowerCase())
    const complianceStatus = getComplianceStatus(useCase)
    const matchesFilter = filterStatus === 'all' || complianceStatus === filterStatus
    
    return matchesSearch && matchesFilter
  })

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
      {/* Message Beta pour upload de documents */}
      {showBetaMessage && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md mx-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Info className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Fonctionnalité en développement</h3>
            </div>
            <p className="text-gray-600 mb-6">
              La plateforme MaydAI est en Beta test, il n'est pas encore possible de soumettre des documents de conformité. 
              Cette fonctionnalité sera disponible dans une prochaine version.
            </p>
            <div className="flex justify-end">
              <button
                onClick={() => setShowBetaMessage(false)}
                className="px-4 py-2 bg-[#0080A3] text-white font-medium rounded-lg hover:bg-[#006280] transition-colors"
              >
                Compris
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Dossiers de Conformité</h1>
              <p className="mt-2 text-gray-600">
                Suivi de la conformité réglementaire pour tous vos cas d'usage IA
              </p>
            </div>
            <div className="mt-4 sm:mt-0 flex gap-3">
              <button
                onClick={handleUploadClick}
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Upload className="w-4 h-4 mr-2" />
                Charger des documents
              </button>
              <button
                onClick={() => router.push('/usecases/new')}
                className="inline-flex items-center px-4 py-2 bg-[#0080A3] text-white font-medium rounded-lg hover:bg-[#006280] transition-colors"
              >
                <FileText className="w-4 h-4 mr-2" />
                Nouveau cas d'usage
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto">
        {/* Filtres et recherche */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Rechercher un cas d'usage..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0080A3] focus:border-transparent"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as any)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0080A3] focus:border-transparent"
              >
                <option value="all">Tous les statuts</option>
                <option value="compliant">Conforme</option>
                <option value="partial">Partiellement conforme</option>
                <option value="non-compliant">Non conforme</option>
              </select>
            </div>
          </div>
        </div>

        {/* Statistiques globales */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Conformes</p>
                <p className="text-2xl font-bold text-gray-900">
                  {useCases.filter(uc => getComplianceStatus(uc) === 'compliant').length}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <AlertCircle className="w-6 h-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Partiellement</p>
                <p className="text-2xl font-bold text-gray-900">
                  {useCases.filter(uc => getComplianceStatus(uc) === 'partial').length}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <div className="flex items-center">
              <div className="p-2 bg-red-100 rounded-lg">
                <XCircle className="w-6 h-6 text-red-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Non conformes</p>
                <p className="text-2xl font-bold text-gray-900">
                  {useCases.filter(uc => getComplianceStatus(uc) === 'non-compliant').length}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <BarChart3 className="w-6 h-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Score moyen</p>
                <p className="text-2xl font-bold text-gray-900">0%</p>
              </div>
            </div>
          </div>
        </div>

        {/* Message d'information sur la fonctionnalité */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mb-8">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Info className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-blue-900 mb-2">Fonctionnalité en développement</h3>
              <p className="text-blue-800">
                La rubrique "Dossiers de Conformité" est actuellement en phase de développement. 
                Tous les scores sont affichés à 0% car la fonctionnalité de chargement de documents 
                n'est pas encore disponible. Cette section illustre les futures capacités de suivi 
                de conformité réglementaire.
              </p>
            </div>
          </div>
        </div>

        {/* Liste des cas d'usage */}
        <div className="space-y-4">
          {filteredUseCases.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun cas d'usage trouvé</h3>
              <p className="text-gray-600">
                {searchTerm || filterStatus !== 'all' 
                  ? 'Aucun cas d\'usage ne correspond à vos critères de recherche.'
                  : 'Commencez par créer votre premier cas d\'usage.'
                }
              </p>
            </div>
          ) : (
            filteredUseCases.map((useCase) => {
              const complianceStatus = getComplianceStatus(useCase)
              const completedCount = Object.values(useCase.compliance_status).filter(Boolean).length
              const totalCount = Object.keys(useCase.compliance_status).length
              
              return (
                <div
                  key={useCase.id}
                  className="bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => router.push(`/dossiers/${useCase.id}`)}
                >
                  <div className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">{useCase.name}</h3>
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(complianceStatus)}`}>
                            {getStatusIcon(complianceStatus)}
                            {getStatusText(complianceStatus)}
                          </span>
                        </div>
                        <p className="text-gray-600 mb-4">{useCase.description}</p>
                        
                        {/* Barre de progression */}
                        <div className="mb-4">
                          <div className="flex items-center justify-between text-sm text-gray-600 mb-1">
                            <span>Progression de la conformité</span>
                            <span>{completedCount}/{totalCount} éléments</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-red-500 h-2 rounded-full transition-all duration-300"
                              style={{ width: '0%' }}
                            />
                          </div>
                        </div>

                        {/* Détails de conformité */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-red-500" />
                            <span className="text-sm text-gray-600">Registre</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-red-500" />
                            <span className="text-sm text-gray-600">Documentation</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-red-500" />
                            <span className="text-sm text-gray-600">Surveillance</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-red-500" />
                            <span className="text-sm text-gray-600">Gestion risques</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 ml-4">
                        <div className="text-right">
                          <div className="text-2xl font-bold text-gray-900">0%</div>
                          <div className="text-sm text-gray-600">Score global</div>
                        </div>
                        <ExternalLink className="w-5 h-5 text-gray-400" />
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