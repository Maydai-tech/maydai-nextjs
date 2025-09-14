'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth'
import { supabase, getMultipleUseCaseNextSteps, getUseCaseNextSteps } from '@/lib/supabase'
import { UseCase, UseCaseNextSteps } from '@/lib/supabase'
import { CheckCircle, Clock, AlertCircle, Plus, Search, Filter } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import TodoListActions from '@/components/TodoListActions'

interface UseCaseWithNextSteps extends UseCase {
  nextSteps?: UseCaseNextSteps
}

interface UseCaseActionsProps {
  useCaseId: string
  nextSteps?: UseCaseNextSteps
}

function UseCaseActions({ useCaseId, nextSteps: initialNextSteps }: UseCaseActionsProps) {
  const [nextSteps, setNextSteps] = useState<UseCaseNextSteps | null>(initialNextSteps || null)
  const [loading, setLoading] = useState(!initialNextSteps)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!initialNextSteps) {
      // Récupérer les données nextSteps si elles ne sont pas déjà présentes
      const fetchNextSteps = async () => {
        try {
          console.log(`🔍 Récupération des nextSteps pour le cas d'usage: ${useCaseId}`)
          setLoading(true)
          const data = await getUseCaseNextSteps(useCaseId)
          console.log(`📊 Données nextSteps récupérées:`, data)
          setNextSteps(data)
        } catch (err) {
          console.error('❌ Erreur lors de la récupération des nextSteps:', err)
          setError('Erreur lors du chargement des actions')
        } finally {
          setLoading(false)
        }
      }

      fetchNextSteps()
    } else {
      console.log(`✅ NextSteps déjà présents pour le cas d'usage: ${useCaseId}`)
    }
  }, [useCaseId, initialNextSteps])

  if (loading) {
    return (
      <div className="mt-6 pt-6 border-t border-gray-200">
        <div className="text-center py-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#0080A3] mx-auto mb-2"></div>
          <p className="text-sm text-gray-500">Chargement des actions...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="mt-6 pt-6 border-t border-gray-200">
        <div className="text-center py-4">
          <AlertCircle className="h-8 w-8 text-red-400 mx-auto mb-2" />
          <p className="text-sm text-red-500">{error}</p>
        </div>
      </div>
    )
  }

  if (!nextSteps) {
    return (
      <div className="mt-6 pt-6 border-t border-gray-200">
        <div className="text-center py-4">
          <Clock className="h-8 w-8 text-gray-400 mx-auto mb-2" />
          <p className="text-sm text-gray-500">
            Aucune action recommandée disponible pour ce cas d'usage
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Les actions seront générées après l'évaluation complète du cas d'usage
          </p>
        </div>
      </div>
    )
  }

  return <TodoListActions nextSteps={nextSteps} />
}

export default function TodoListPage() {
  const { user, loading } = useAuth()
  const [useCases, setUseCases] = useState<UseCaseWithNextSteps[]>([])
  const [loadingData, setLoadingData] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')

  useEffect(() => {
    if (user && !loading) {
      // Réinitialiser les données quand l'utilisateur change
      setUseCases([])
      fetchUseCasesWithNextSteps()
    }
  }, [user, loading])

  const fetchUseCasesWithNextSteps = async () => {
    try {
      setLoadingData(true)
      
      // Récupérer les cas d'usage de l'utilisateur
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user?.id)
        .single()

      if (!profile?.company_id) {
        console.error('Aucune entreprise trouvée pour cet utilisateur')
        return
      }

      // Utiliser les cas d'usage de MaydAI
      const maydaiCompanyId = 'de5c91bb-a4f8-488f-936d-c237157c32a5'
      
      const { data: useCasesData, error: useCasesError } = await supabase
        .from('usecases')
        .select(`
          id,
          name,
          description,
          status,
          risk_level,
          ai_category,
          technology_partner,
          created_at,
          updated_at
        `)
        .eq('company_id', maydaiCompanyId)
        .order('created_at', { ascending: false })

      if (useCasesError) {
        console.error('Erreur lors de la récupération des cas d\'usage:', useCasesError)
        return
      }

      // Récupérer les nextsteps pour tous les cas d'usage
      const usecaseIds = (useCasesData || []).map(uc => uc.id)
      const nextStepsMap = await getMultipleUseCaseNextSteps(usecaseIds)

      // Combiner les données
      const useCasesWithNextSteps = (useCasesData || []).map(useCase => ({
        ...useCase,
        nextSteps: nextStepsMap[useCase.id] || undefined
      }))

      setUseCases(useCasesWithNextSteps)
    } catch (error) {
      console.error('Erreur lors du chargement des données:', error)
    } finally {
      setLoadingData(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'completed':
      case 'complété':
        return 'bg-green-100 text-green-800'
      case 'draft':
      case 'not_started':
      case 'à compléter':
        return 'bg-yellow-100 text-yellow-800'
      case 'eliminated':
      case 'éliminé':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusInFrench = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'completed':
        return 'Complété'
      case 'draft':
      case 'not_started':
        return 'À compléter'
      case 'eliminated':
        return 'Éliminé'
      default:
        return status || 'À compléter'
    }
  }


  const filteredUseCases = useCases.filter(useCase => {
    const matchesSearch = useCase.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         useCase.description?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesFilter = filterStatus === 'all' || 
                         (filterStatus === 'completed' && useCase.status?.toLowerCase() === 'completed') ||
                         (filterStatus === 'pending' && (useCase.status?.toLowerCase() === 'draft' || useCase.status?.toLowerCase() === 'not_started')) ||
                         (filterStatus === 'eliminated' && useCase.status?.toLowerCase() === 'eliminated')
    
    return matchesSearch && matchesFilter
  })

  if (loading || loadingData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0080A3] mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement de votre To-do list...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Accès non autorisé</h1>
          <p className="text-gray-600 mb-6">Vous devez être connecté pour accéder à votre To-do list.</p>
          <Link
            href="/login"
            className="inline-flex items-center px-4 py-2 bg-[#0080A3] text-white font-medium rounded-lg hover:bg-[#006280] transition-colors"
          >
            Se connecter
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">To-do List</h1>
              <p className="text-gray-600">
                Suivez les actions à mener pour chaque cas d'usage IA
              </p>
            </div>
            <div className="mt-4 sm:mt-0">
              <Link
                href="/usecases/new"
                className="inline-flex items-center px-4 py-2 bg-[#0080A3] text-white font-medium rounded-lg hover:bg-[#006280] transition-colors"
              >
                <Plus className="h-4 w-4 mr-2" />
                Nouveau cas d'usage
              </Link>
            </div>
          </div>
        </div>

        {/* Filtres et recherche */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center space-y-4 sm:space-y-0 sm:space-x-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Rechercher un cas d'usage..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0080A3] focus:border-transparent"
                />
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4 text-gray-400" />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#0080A3] focus:border-transparent"
              >
                <option value="all">Tous les statuts</option>
                <option value="completed">Complétés</option>
                <option value="pending">À compléter</option>
                <option value="eliminated">Éliminés</option>
              </select>
            </div>
          </div>
        </div>

        {/* Message de développement */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <AlertCircle className="h-5 w-5 text-blue-400" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">
                Fonctionnalité en cours de développement
              </h3>
              <p className="text-sm text-blue-700 mt-1">
                Le suivi des actions mises en place sera bientôt disponible. 
                Pour l'instant, vous pouvez consulter la liste des actions recommandées pour chaque cas d'usage.
              </p>
            </div>
          </div>
        </div>

        {/* Liste des cas d'usage */}
        {useCases.length === 0 ? (
          <div className="text-center py-12">
            <div className="bg-gray-50 p-4 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
              <CheckCircle className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun cas d'usage</h3>
            <p className="text-gray-600 mb-6">Créez votre premier cas d'usage pour voir les actions à mener</p>
            <Link
              href="/usecases/new"
              className="inline-flex items-center px-4 py-2 bg-[#0080A3] text-white font-medium rounded-lg hover:bg-[#006280] transition-colors"
            >
              <Plus className="h-4 w-4 mr-2" />
              Nouveau cas d'usage
            </Link>
          </div>
        ) : filteredUseCases.length === 0 ? (
          <div className="text-center py-12">
            <div className="bg-gray-50 p-4 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
              <Search className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun résultat trouvé</h3>
            <p className="text-gray-600 mb-6">
              Aucun cas d'usage ne correspond à votre recherche "{searchTerm}"
            </p>
            <button
              onClick={() => {
                setSearchTerm('')
                setFilterStatus('all')
              }}
              className="inline-flex items-center px-4 py-2 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition-colors"
            >
              Effacer les filtres
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {filteredUseCases.map((useCase) => (
              <div
                key={useCase.id}
                className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden"
              >
                <div className="p-6">
                  <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between space-y-4 lg:space-y-0">
                    {/* Informations du cas d'usage */}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-3 mb-3">
                        <h3 className="text-lg font-semibold text-gray-900 truncate">
                          {useCase.name}
                        </h3>
                        <div className="flex flex-wrap gap-2">
                          <span 
                            className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(useCase.status)}`}
                          >
                            {getStatusInFrench(useCase.status)}
                          </span>
                          {useCase.risk_level && (
                            <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">
                              {useCase.risk_level} risk
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <p className="text-gray-600 mb-4 line-clamp-2">
                        {useCase.description}
                      </p>
                      
                      <div className="flex flex-col sm:flex-row sm:items-center space-y-1 sm:space-y-0 sm:space-x-4 text-sm text-gray-500">
                        {useCase.ai_category && <span>{useCase.ai_category}</span>}
                        {useCase.technology_partner && <span>• {useCase.technology_partner}</span>}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
                      <Link
                        href={`/usecases/${useCase.id}`}
                        className="inline-flex items-center justify-center px-4 py-2 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition-colors"
                      >
                        Voir le détail
                      </Link>
                    </div>
                  </div>

                  {/* Actions à mener */}
                  <UseCaseActions useCaseId={useCase.id} nextSteps={useCase.nextSteps} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
