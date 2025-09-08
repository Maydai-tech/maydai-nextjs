'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase, UseCase } from '@/lib/supabase'
import { Eye, Filter, Search, Calculator } from 'lucide-react'

export default function UseCasesPage() {
  const router = useRouter()
  const [usecases, setUsecases] = useState<UseCase[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [riskFilter, setRiskFilter] = useState('')
  const [emailFilter, setEmailFilter] = useState('')
  const [recalculating, setRecalculating] = useState(false)

  useEffect(() => {
    fetchUseCases()
  }, [])

  async function fetchUseCases() {
    try {
      const { data, error } = await supabase
        .from('usecases')
        .select(`
          *,
          companies (
            id,
            name
          ),
          usecase_responses!inner (
            answered_by
          )
        `)
        .order('created_at', { ascending: false })

      if (error) throw error
      
      // Traiter les données pour récupérer l'email unique de chaque cas d'usage
      const processedData = (data || []).map(usecase => ({
        ...usecase,
        user_email: usecase.usecase_responses?.[0]?.answered_by || 'Non disponible'
      }))
      
      setUsecases(processedData)
    } catch (error) {
      console.error('Erreur lors du chargement des cas d\'usage:', error)
    } finally {
      setLoading(false)
    }
  }

  async function recalculateAllScores() {
    setRecalculating(true)

    try {
      // Appeler la nouvelle edge function bulk-calculate-scores
      const { data, error } = await supabase.functions.invoke('bulk-calculate-scores', {
        body: {
          batch_size: 10,
          delay_ms: 200
        }
      })

      if (error) {
        throw error
      }

      // Afficher le résultat détaillé
      if (data) {
        const message = `Recalcul terminé en ${(data.execution_time_ms / 1000).toFixed(1)}s:\n\n` +
          `📊 Cas d'usage traités: ${data.processed_count}\n` +
          `✅ Succès: ${data.success_count}\n` +
          `❌ Erreurs: ${data.error_count}\n\n` +
          `📈 Moyennes:\n` +
          `• Score de base: ${data.summary.average_base_score}\n` +
          `• Score modèle: ${data.summary.average_model_score ?? 'N/A'}\n` +
          `• Score final: ${data.summary.average_final_score}\n` +
          `• Cas éliminés: ${data.summary.eliminated_count}`
        
        alert(message)

        // Logger les erreurs dans la console
        if (data.errors && data.errors.length > 0) {
          console.error('Erreurs détaillées:', data.errors)
        }
      }

      // Rafraîchir la liste
      await fetchUseCases()
    } catch (error) {
      console.error('Erreur lors du recalcul des scores:', error)
      alert('Erreur lors du recalcul des scores. Vérifiez vos permissions administrateur.')
    } finally {
      setRecalculating(false)
    }
  }

  const filteredUseCases = usecases.filter(usecase => {
    const matchesSearch = usecase.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (usecase.description && usecase.description.toLowerCase().includes(searchTerm.toLowerCase()))
    const matchesStatus = !statusFilter || usecase.status === statusFilter
    const matchesRisk = !riskFilter || usecase.risk_level === riskFilter
    const matchesEmail = !emailFilter || (usecase.user_email && usecase.user_email.toLowerCase().includes(emailFilter.toLowerCase()))
    
    return matchesSearch && matchesStatus && matchesRisk && matchesEmail
  })

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'draft':
        return 'bg-gray-100 text-gray-800'
      case 'in_progress':
        return 'bg-yellow-100 text-yellow-800'
      case 'completed':
        return 'text-[#0080a3]'
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

      {/* Bouton de recalcul et filtres */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Gestion des scores</h2>
          <button
            onClick={recalculateAllScores}
            disabled={recalculating}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {recalculating ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Recalcul en cours...
              </>
            ) : (
              <>
                <Calculator className="h-4 w-4 mr-2" />
                Recalculer tous les scores
              </>
            )}
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
              <Search className="h-4 w-4 inline mr-1" />
              Email utilisateur
            </label>
            <input
              type="text"
              value={emailFilter}
              onChange={(e) => setEmailFilter(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-[#0080A3] focus:border-[#0080A3] focus:outline-none transition-colors"
              placeholder="Filtrer par email..."
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
              <option value="completed">Complété</option>
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
          <div className="text-sm text-gray-600">Complétés</div>
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
                Entreprise
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Email
              </th>
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
              <tr key={usecase.id} className="hover:bg-gray-50"
              onClick={() => {
                router.push(`/admin/usecases/${usecase.id}/responses`)
              }}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    {usecase.companies?.name || 'Non spécifié'}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    {usecase.user_email || 'Non disponible'}
                  </div>
                </td>
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
                  <span 
                    className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(usecase.status)}`}
                    style={usecase.status === 'completed' ? { backgroundColor: '#f1fdfa' } : {}}
                  >
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
                      router.push(`/admin/usecases/${usecase.id}/responses`)
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
              {searchTerm || statusFilter || riskFilter || emailFilter
                ? 'Aucun cas d\'usage ne correspond aux critères de recherche'
                : 'Aucun cas d\'usage trouvé'}
            </div>
          </div>
        )}
      </div>
    </div>
  )
} 