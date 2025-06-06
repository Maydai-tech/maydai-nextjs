'use client'

import { useEffect, useState } from 'react'
import { supabase, UseCaseResponse } from '@/lib/supabase'
import { Search, Filter, Eye, Calendar } from 'lucide-react'

interface ResponseWithDetails extends UseCaseResponse {
  usecase_name?: string
  question_text?: string
}

export default function ResponsesPage() {
  const [responses, setResponses] = useState<ResponseWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedUsecase, setSelectedUsecase] = useState('')
  const [usecases, setUsecases] = useState<any[]>([])

  useEffect(() => {
    fetchResponses()
    fetchUsecases()
  }, [])

  async function fetchResponses() {
    try {
      const { data, error } = await supabase
        .from('usecase_questionnaire_responses')
        .select(`
          *,
          usecases:usecase_id (
            name
          )
        `)
        .order('answered_at', { ascending: false })

      if (error) throw error

      // Récupérer les textes des questions
      const enrichedResponses = await Promise.all(
        (data || []).map(async (response) => {
          const { data: questionData } = await supabase
            .from('questionnaire_questions')
            .select('question_text')
            .eq('code', response.question_code)
            .single()

          return {
            ...response,
            usecase_name: response.usecases?.name || 'Cas d\'usage supprimé',
            question_text: questionData?.question_text || response.question_code
          }
        })
      )

      setResponses(enrichedResponses)
    } catch (error) {
      console.error('Erreur lors du chargement des réponses:', error)
    } finally {
      setLoading(false)
    }
  }

  async function fetchUsecases() {
    try {
      const { data, error } = await supabase
        .from('usecases')
        .select('id, name')
        .order('name')

      if (error) throw error
      setUsecases(data || [])
    } catch (error) {
      console.error('Erreur lors du chargement des cas d\'usage:', error)
    }
  }

  const filteredResponses = responses.filter(response => {
    const matchesSearch = 
      (response.question_text && response.question_text.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (response.response_value && response.response_value.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (response.usecase_name && response.usecase_name.toLowerCase().includes(searchTerm.toLowerCase()))
    
    const matchesUsecase = !selectedUsecase || response.usecase_id === selectedUsecase
    
    return matchesSearch && matchesUsecase
  })

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const truncateText = (text: string, maxLength: number = 100) => {
    if (text.length <= maxLength) return text
    return text.substring(0, maxLength) + '...'
  }

  const getResponsePreview = (response: UseCaseResponse) => {
    if (response.response_value) {
      return truncateText(response.response_value, 80)
    }
    if (response.response_data) {
      try {
        const data = typeof response.response_data === 'string' 
          ? JSON.parse(response.response_data) 
          : response.response_data
        return truncateText(JSON.stringify(data), 80)
      } catch {
        return 'Données complexes'
      }
    }
    return 'Aucune réponse'
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
        <h1 className="text-2xl font-bold text-gray-900">Réponses aux questionnaires</h1>
        <p className="mt-2 text-gray-600">
          Consultez toutes les réponses soumises pour les questionnaires de conformité IA Act
        </p>
      </div>

      {/* Filtres et recherche */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Search className="h-4 w-4 inline mr-1" />
              Rechercher
            </label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
              placeholder="Question, réponse ou cas d'usage..."
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Filter className="h-4 w-4 inline mr-1" />
              Cas d'usage
            </label>
            <select
              value={selectedUsecase}
              onChange={(e) => setSelectedUsecase(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            >
              <option value="">Tous les cas d'usage</option>
              {usecases.map((usecase) => (
                <option key={usecase.id} value={usecase.id}>
                  {usecase.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-2xl font-bold text-blue-600">{responses.length}</div>
          <div className="text-sm text-gray-600">Total réponses</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-2xl font-bold text-green-600">
            {new Set(responses.map(r => r.usecase_id)).size}
          </div>
          <div className="text-sm text-gray-600">Cas d'usage uniques</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-2xl font-bold text-purple-600">
            {new Set(responses.map(r => r.question_code)).size}
          </div>
          <div className="text-sm text-gray-600">Questions répondues</div>
        </div>
      </div>

      {/* Liste des réponses */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Cas d'usage
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Question
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Réponse
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Date de réponse
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredResponses.map((response) => (
              <tr key={response.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">
                    {response.usecase_name}
                  </div>
                  <div className="text-sm text-gray-500">
                    {response.question_code}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm text-gray-900 max-w-xs">
                    {truncateText(response.question_text || response.question_code, 100)}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm text-gray-900 max-w-xs">
                    {getResponsePreview(response)}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center text-sm text-gray-900">
                    <Calendar className="h-4 w-4 mr-1 text-gray-400" />
                    {formatDate(response.answered_at)}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <button
                    className="text-blue-600 hover:text-blue-900 flex items-center"
                    onClick={() => {
                      // TODO: Ouvrir modal avec détails complets
                      console.log('Voir détails réponse:', response.id)
                    }}
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    Détails
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredResponses.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-500">
              {searchTerm || selectedUsecase
                ? 'Aucune réponse ne correspond aux critères de recherche'
                : 'Aucune réponse trouvée'}
            </div>
          </div>
        )}
      </div>
    </div>
  )
} 