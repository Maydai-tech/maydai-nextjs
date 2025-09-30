'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import { useApiCall } from '@/lib/api-client-legacy'
import { 
  ArrowLeft,
  FileText, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Eye, 
  Shield, 
  Users, 
  Search,
  BarChart3,
  Settings,
  Clock,
  Upload,
  Download,
  Edit,
  Plus,
  ExternalLink,
  BookOpen,
  UserCheck,
  Image,
  AlertTriangle,
  Database,
  Monitor,
  Info
} from 'lucide-react'

interface ComplianceItem {
  id: string
  title: string
  description: string
  status: 'completed' | 'pending' | 'not-started'
  required: boolean
  lastUpdated?: string
  documents?: string[]
  assignedTo?: string
  priority: 'high' | 'medium' | 'low'
}

interface UseCase {
  id: string
  name: string
  description: string
  company_id: string
  company_name?: string
  created_at: string
  updated_at: string
  status: 'draft' | 'active' | 'archived'
  compliance_items: ComplianceItem[]
  compliance_scores: {
    overall: number
    documentation: number
    governance: number
    monitoring: number
  }
}

export default function DossierDetailPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const params = useParams()
  const api = useApiCall()
  const [useCase, setUseCase] = useState<UseCase | null>(null)
  const [loadingData, setLoadingData] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'overview' | 'documents' | 'governance' | 'monitoring'>('overview')
  const [showBetaMessage, setShowBetaMessage] = useState(false)

  const useCaseId = params.id as string

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router])

  useEffect(() => {
    const fetchUseCase = async () => {
      if (!user || !useCaseId) return

      try {
        setLoadingData(true)
        const result = await api.get(`/api/usecases/${useCaseId}`)
        
        if (result.data) {
          // Tous les éléments à 0% comme demandé (fonctionnalité en développement)
          const complianceItems: ComplianceItem[] = [
            {
              id: 'registry',
              title: 'Registre des systèmes d\'IA',
              description: 'Enregistrement du système dans le registre européen des systèmes d\'IA à haut risque',
              status: 'not-started',
              required: true,
              priority: 'high'
            },
            {
              id: 'documentation',
              title: 'Documentation technique complète',
              description: 'Documentation détaillée du système, de ses capacités et de ses limitations',
              status: 'not-started',
              required: true,
              priority: 'high'
            },
            {
              id: 'surveillance',
              title: 'Surveillance humaine nommée',
              description: 'Désignation d\'une personne responsable de la surveillance du système',
              status: 'not-started',
              required: true,
              priority: 'high'
            },
            {
              id: 'brand-examples',
              title: 'Exemples de marques visibles',
              description: 'Enregistrement d\'exemples de marques visibles pour la reconnaissance',
              status: 'not-started',
              required: false,
              priority: 'medium'
            },
            {
              id: 'risk-management',
              title: 'Gestion des risques',
              description: 'Plan de gestion des risques et mesures de mitigation',
              status: 'not-started',
              required: true,
              priority: 'high'
            },
            {
              id: 'data-quality',
              title: 'Procédure de vérification qualité des données',
              description: 'Processus de validation et contrôle qualité des données d\'entraînement',
              status: 'not-started',
              required: true,
              priority: 'high'
            },
            {
              id: 'monitoring-plan',
              title: 'Plan de surveillance continue',
              description: 'Stratégie de monitoring en continu des performances du système',
              status: 'not-started',
              required: true,
              priority: 'medium'
            }
          ]

          setUseCase({
            ...result.data,
            compliance_items: complianceItems,
            compliance_scores: {
              overall: 0,
              documentation: 0,
              governance: 0,
              monitoring: 0,
            }
          })
        }
      } catch (err) {
        console.error('Error fetching use case:', err)
        setError('Erreur lors du chargement du cas d\'usage')
      } finally {
        setLoadingData(false)
      }
    }

    fetchUseCase()
  }, [user, useCaseId, api])

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-5 h-5 text-green-600" />
      case 'pending': return <Clock className="w-5 h-5 text-yellow-600" />
      case 'not-started': return <XCircle className="w-5 h-5 text-red-600" />
      default: return <AlertCircle className="w-5 h-5 text-gray-400" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-50 border-green-200 text-green-800'
      case 'pending': return 'bg-yellow-50 border-yellow-200 text-yellow-800'
      case 'not-started': return 'bg-red-50 border-red-200 text-red-800'
      default: return 'bg-gray-50 border-gray-200 text-gray-800'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed': return 'Terminé'
      case 'pending': return 'En cours'
      case 'not-started': return 'Non démarré'
      default: return 'Inconnu'
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800'
      case 'medium': return 'bg-yellow-100 text-yellow-800'
      case 'low': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getPriorityText = (priority: string) => {
    switch (priority) {
      case 'high': return 'Élevée'
      case 'medium': return 'Moyenne'
      case 'low': return 'Faible'
      default: return 'Non définie'
    }
  }

  const completedItems = useCase?.compliance_items.filter(item => item.status === 'completed').length || 0
  const totalItems = useCase?.compliance_items.length || 0
  const completionPercentage = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0

  const handleUploadClick = () => {
    setShowBetaMessage(true)
  }

  if (loading || loadingData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0080A3]"></div>
          <p className="mt-4 text-gray-600">Chargement du dossier...</p>
        </div>
      </div>
    )
  }

  if (error || !useCase) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Erreur</h1>
          <p className="text-gray-600 mb-4">{error || 'Cas d\'usage non trouvé'}</p>
          <button
            onClick={() => router.push('/dossiers')}
            className="inline-flex items-center px-4 py-2 bg-[#0080A3] text-white font-medium rounded-lg hover:bg-[#006280] transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour aux dossiers
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
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/dossiers')}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">{useCase.name}</h1>
                <p className="text-gray-600 mt-1">{useCase.description}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button className="inline-flex items-center px-4 py-2 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors">
                <Download className="w-4 h-4 mr-2" />
                Exporter
              </button>
              <button className="inline-flex items-center px-4 py-2 bg-[#0080A3] text-white font-medium rounded-lg hover:bg-[#006280] transition-colors">
                <Edit className="w-4 h-4 mr-2" />
                Modifier
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto">
        {/* Statistiques globales */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <BarChart3 className="w-6 h-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Score global</p>
                <p className="text-2xl font-bold text-gray-900">{useCase.compliance_scores.overall}%</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Éléments terminés</p>
                <p className="text-2xl font-bold text-gray-900">{completedItems}/{totalItems}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Clock className="w-6 h-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">En cours</p>
                <p className="text-2xl font-bold text-gray-900">
                  {useCase.compliance_items.filter(item => item.status === 'pending').length}
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
                <p className="text-sm font-medium text-gray-600">Non démarrés</p>
                <p className="text-2xl font-bold text-gray-900">
                  {useCase.compliance_items.filter(item => item.status === 'not-started').length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Barre de progression globale */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Progression de la conformité</h3>
            <span className="text-sm text-gray-600">{completionPercentage}% complété</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div 
              className="bg-[#0080A3] h-3 rounded-full transition-all duration-300"
              style={{ width: `${completionPercentage}%` }}
            />
          </div>
        </div>

        {/* Onglets */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-8">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              {[
                { id: 'overview', label: 'Vue d\'ensemble', icon: BarChart3 },
                { id: 'documents', label: 'Documents', icon: FileText },
                { id: 'governance', label: 'Gouvernance', icon: Shield },
                { id: 'monitoring', label: 'Surveillance', icon: Monitor }
              ].map((tab) => {
                const Icon = tab.icon
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                      activeTab === tab.id
                        ? 'border-[#0080A3] text-[#0080A3]'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {tab.label}
                  </button>
                )
              })}
            </nav>
          </div>

          <div className="p-6">
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-gray-900">Éléments de conformité</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {useCase.compliance_items.map((item) => (
                    <div key={item.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          {getStatusIcon(item.status)}
                          <div>
                            <h4 className="font-medium text-gray-900">{item.title}</h4>
                            <p className="text-sm text-gray-600">{item.description}</p>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(item.status)}`}>
                            {getStatusText(item.status)}
                          </span>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(item.priority)}`}>
                            {getPriorityText(item.priority)}
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between text-sm text-gray-600">
                        <div className="flex items-center gap-4">
                          {item.assignedTo && (
                            <div className="flex items-center gap-1">
                              <UserCheck className="w-4 h-4" />
                              <span>{item.assignedTo}</span>
                            </div>
                          )}
                          {item.lastUpdated && (
                            <div className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              <span>{new Date(item.lastUpdated).toLocaleDateString('fr-FR')}</span>
                            </div>
                          )}
                        </div>
                        {item.documents && item.documents.length > 0 && (
                          <div className="flex items-center gap-1">
                            <FileText className="w-4 h-4" />
                            <span>{item.documents.length} document(s)</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'documents' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">Documents de conformité</h3>
                  <button 
                    onClick={handleUploadClick}
                    className="inline-flex items-center px-4 py-2 bg-[#0080A3] text-white font-medium rounded-lg hover:bg-[#006280] transition-colors"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Ajouter un document
                  </button>
                </div>
                
                <div className="space-y-4">
                  {useCase.compliance_items
                    .filter(item => item.documents && item.documents.length > 0)
                    .map((item) => (
                      <div key={item.id} className="border border-gray-200 rounded-lg p-4">
                        <h4 className="font-medium text-gray-900 mb-3">{item.title}</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                          {item.documents?.map((doc, index) => (
                            <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer">
                              <FileText className="w-5 h-5 text-gray-400" />
                              <span className="text-sm text-gray-700 flex-1">{doc}</span>
                              <button className="p-1 hover:bg-gray-200 rounded">
                                <Download className="w-4 h-4 text-gray-500" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {activeTab === 'governance' && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-gray-900">Gouvernance et responsabilités</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h4 className="font-medium text-gray-900">Équipe de surveillance</h4>
                    {useCase.compliance_items
                      .filter(item => item.assignedTo)
                      .map((item) => (
                        <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div>
                            <p className="font-medium text-gray-900">{item.assignedTo}</p>
                            <p className="text-sm text-gray-600">{item.title}</p>
                          </div>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(item.status)}`}>
                            {getStatusText(item.status)}
                          </span>
                        </div>
                      ))}
                  </div>
                  
                  <div className="space-y-4">
                    <h4 className="font-medium text-gray-900">Éléments critiques</h4>
                    {useCase.compliance_items
                      .filter(item => item.priority === 'high')
                      .map((item) => (
                        <div key={item.id} className="flex items-center gap-3 p-3 bg-red-50 rounded-lg border border-red-200">
                          <AlertTriangle className="w-5 h-5 text-red-600" />
                          <div className="flex-1">
                            <p className="font-medium text-gray-900">{item.title}</p>
                            <p className="text-sm text-gray-600">{item.description}</p>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'monitoring' && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-gray-900">Surveillance et monitoring</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h4 className="font-medium text-gray-900">Métriques de conformité</h4>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <span className="text-sm text-gray-600">Score documentation</span>
                        <span className="font-medium text-gray-900">{useCase.compliance_scores.documentation}%</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <span className="text-sm text-gray-600">Score gouvernance</span>
                        <span className="font-medium text-gray-900">{useCase.compliance_scores.governance}%</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <span className="text-sm text-gray-600">Score surveillance</span>
                        <span className="font-medium text-gray-900">{useCase.compliance_scores.monitoring}%</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <h4 className="font-medium text-gray-900">Prochaines actions</h4>
                    <div className="space-y-3">
                      {useCase.compliance_items
                        .filter(item => item.status !== 'completed')
                        .slice(0, 3)
                        .map((item) => (
                          <div key={item.id} className="flex items-center gap-3 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                            <Clock className="w-5 h-5 text-yellow-600" />
                            <div className="flex-1">
                              <p className="font-medium text-gray-900">{item.title}</p>
                              <p className="text-sm text-gray-600">
                                {item.assignedTo ? `Assigné à ${item.assignedTo}` : 'Non assigné'}
                              </p>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
