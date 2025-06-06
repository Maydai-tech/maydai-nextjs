'use client'

import { useEffect, useState } from 'react'
import { supabase, UseCase } from '@/lib/supabase'
import { Eye, Filter, Search } from 'lucide-react'

export default function UseCasesPage() {
  const [usecases, setUsecases] = useState<UseCase[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [riskFilter, setRiskFilter] = useState('')

  useEffect(() => {
    fetchUseCases()
  }, [])

  async function fetchUseCases() {
    try {
      const { data, error } = await supabase
        .from('usecases')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setUsecases(data || [])
    } catch (error) {
      console.error('Erreur lors du chargement des cas d\'usage:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredUseCases = usecases.filter(usecase => {
    const matchesSearch = usecase.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (usecase.description && usecase.description.toLowerCase().includes(searchTerm.toLowerCase()))
    const matchesStatus = !statusFilter || usecase.status === statusFilter
    const matchesRisk = !riskFilter || usecase.risk_level === riskFilter
    
    return matchesSearch && matchesStatus && matchesRisk
  })

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'draft':
        return 'bg-gray-100 text-gray-800'
      case 'in_progress':
        return 'bg-yellow-100 text-yellow-800'
      case 'completed':
        return 'bg-green-100 text-green-800'
      case 'approved':
        return 'bg-blue-100 text-blue-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getRiskColor = (risk: string | null | undefined) => {
    if (!risk) return 'bg-gray-100 text-gray-800'
    
    switch (risk.toLowerCase()) {
      case 'minimal':
        return 'bg-green-100 text-green-800'
      case 'limited':
        return 'bg-yellow-100 text-yellow-800'
      case 'high':
        return 'bg-orange-100 text-orange-800'
      case 'unacceptable':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Cas d'usage IA</h1>
        <p className="mt-2 text-gray-600">
          Consultez et gérez les cas d'usage soumis pour évaluation de conformité IA Act
        </p>
      </div>

      {/* Filtres et recherche */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Search className="h-4 w-4 inline mr-1" />
              Rechercher
            </label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-[#0080A3] focus:border-[#0080A3] focus:outline-none transition-colors"
              placeholder="Nom ou description du cas d'usage..."
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Filter className="h-4 w-4 inline mr-1" />
              Statut
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-[#0080A3] focus:border-[#0080A3] focus:outline-none transition-colors"
            >
              <option value="">Tous les statuts</option>
              <option value="draft">Brouillon</option>
              <option value="in_progress">En cours</option>
              <option value="completed">Terminé</option>
              <option value="approved">Approuvé</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Niveau de risque
            </label>
            <select
              value={riskFilter}
              onChange={(e) => setRiskFilter(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-[#0080A3] focus:border-[#0080A3] focus:outline-none transition-colors"
            >
              <option value="">Tous les niveaux</option>
              <option value="minimal">Minimal</option>
              <option value="limited">Limité</option>
              <option value="high">Élevé</option>
              <option value="unacceptable">Inacceptable</option>
            </select>
          </div>
        </div>
      </div>

      {/* Statistiques rapides */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-2xl font-bold text-blue-600">{usecases.length}</div>
          <div className="text-sm text-gray-600">Total cas d'usage</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-2xl font-bold text-yellow-600">
            {usecases.filter(u => u.status === 'in_progress').length}
          </div>
          <div className="text-sm text-gray-600">En cours</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-2xl font-bold text-green-600">
            {usecases.filter(u => u.status === 'completed').length}
          </div>
          <div className="text-sm text-gray-600">Terminés</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-2xl font-bold text-red-600">
            {usecases.filter(u => u.risk_level === 'high' || u.risk_level === 'unacceptable').length}
          </div>
          <div className="text-sm text-gray-600">Risque élevé</div>
        </div>
      </div>

      {/* Liste des cas d'usage */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Nom
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Description
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Statut
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Risque
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Catégorie IA
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Date création
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredUseCases.map((usecase) => (
              <tr key={usecase.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{usecase.name}</div>
                  {usecase.responsible_service && (
                    <div className="text-sm text-gray-500">{usecase.responsible_service}</div>
                  )}
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm text-gray-900 max-w-xs truncate">
                    {usecase.description || 'Aucune description'}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(usecase.status)}`}>
                    {usecase.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRiskColor(usecase.risk_level)}`}>
                    {usecase.risk_level || 'Non évalué'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {usecase.ai_category || 'Non spécifié'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {formatDate(usecase.created_at)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <button
                    className="text-blue-600 hover:text-blue-900 flex items-center"
                    onClick={() => {
                      // TODO: Implémenter la vue détaillée
                      console.log('Voir détails:', usecase.id)
                    }}
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    Voir
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredUseCases.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-500">
              {searchTerm || statusFilter || riskFilter
                ? 'Aucun cas d\'usage ne correspond aux critères de recherche'
                : 'Aucun cas d\'usage trouvé'}
            </div>
          </div>
        )}
      </div>
    </div>
  )
} 