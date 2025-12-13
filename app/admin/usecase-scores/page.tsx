'use client'

import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import AdminProtectedRoute from '@/components/AdminProtectedRoute'
import Header from '@/components/site-vitrine/Header'
import { 
  AlertCircle, 
  TrendingUp, 
  ChevronDown, 
  ChevronRight,
  Building2,
  Shield,
  Bot,
  RefreshCw,
  Download
} from 'lucide-react'
import type { UseCaseScore } from '@/app/usecases/[id]/types/usecase'

interface CategoryScore {
  category: string
  name: string
  score: number
  weight: number
}

interface ScoreBreakdownItem {
  question_code: string
  impact: number
  reason: string
}

interface UseCaseWithScore {
  id: string
  name: string
  description: string | null
  company_id: string
  company_name: string
  risk_level: string | null
  ai_category: string | null
  system_type: string | null
  status: string
  score: number | null
  max_score: number
  category_scores: CategoryScore[]
  score_breakdown: ScoreBreakdownItem[]
  calculated_at: string | null
  response_count: number
  responses: any[]
}

// Score ≥ 75 : Vert foncé #0080a3 — Bon
// Score ≥ 50 : Vert clair #c6eef8 — Moyen
// Score ≥ 30 : Orange (orange) — Faible
// Score < 30 : Rouge (red) — Critique
function getScoreColor(score: number): string {
  if (score >= 75) return 'text-[#0080a3]'
  if (score >= 50) return 'text-[#0080a3]'
  if (score >= 30) return 'text-orange-600'
  return 'text-red-600'
}

function getScoreBgColor(score: number): string {
  if (score >= 75) return 'bg-[#0080a3]'
  if (score >= 50) return 'bg-[#c6eef8]'
  if (score >= 30) return 'bg-orange-100'
  return 'bg-red-100'
}

function getRiskLevelLabel(level: string | null): string {
  switch (level) {
    case 'minimal': return 'Risque minimal'
    case 'limited': return 'Risque limité'
    case 'high': return 'Risque élevé'
    case 'systemic': return 'Risque systémique'
    default: return 'Non défini'
  }
}

function getAICategoryLabel(category: string | null): string {
  switch (category) {
    case 'nlp': return 'Traitement du langage'
    case 'vision': return 'Vision par ordinateur'
    case 'prediction': return 'Prédiction/Analyse'
    case 'generation': return 'Génération de contenu'
    case 'decision': return 'Aide à la décision'
    case 'other': return 'Autre'
    default: return 'Non défini'
  }
}

function getStatusLabel(status: string): string {
  switch (status) {
    case 'draft': return 'Brouillon'
    case 'in_progress': return 'En cours'
    case 'completed': return 'Complété'
    default: return status
  }
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'draft': return 'text-gray-600'
    case 'in_progress': return 'text-blue-600'
    case 'completed': return 'text-green-600'
    default: return 'text-gray-600'
  }
}

export default function UseCaseScoresPage() {
  const { user } = useAuth()
  const [usecases, setUsecases] = useState<UseCaseWithScore[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
  const [loadingScores, setLoadingScores] = useState<Set<string>>(new Set())
  const [selectedCompany, setSelectedCompany] = useState<string>('all')
  const [selectedRiskLevel, setSelectedRiskLevel] = useState<string>('all')
  const [companies, setCompanies] = useState<Array<{ id: string; name: string }>>([])

  useEffect(() => {
    loadUseCases()
  }, [])

  const loadUseCases = async () => {
    try {
      setLoading(true)

      // Load companies for filter
      const { data: companiesData } = await supabase
        .from('companies')
        .select('id, name')
        .order('name')

      setCompanies(companiesData || [])

      // Load usecases with companies and responses
      const { data: usecasesData, error: usecasesError } = await supabase
        .from('usecases')
        .select(`
          id,
          name,
          description,
          company_id,
          risk_level,
          ai_category,
          system_type,
          status,
          created_at,
          companies!inner(name),
          usecase_responses(responses)
        `)
        .order('created_at', { ascending: false })

      if (usecasesError) throw usecasesError

      const formattedUsecases: UseCaseWithScore[] = (usecasesData || []).map(uc => ({
        id: uc.id,
        name: uc.name,
        description: uc.description,
        company_id: uc.company_id,
        company_name: uc.companies?.[0]?.name || 'Unknown',
        risk_level: uc.risk_level,
        ai_category: uc.ai_category,
        system_type: uc.system_type,
        status: uc.status,
        score: null,
        max_score: 100,
        category_scores: [],
        score_breakdown: [],
        calculated_at: null,
        response_count: uc.usecase_responses?.[0]?.responses?.length || 0,
        responses: uc.usecase_responses?.[0]?.responses || []
      }))

      setUsecases(formattedUsecases)
    } catch (err) {
      console.error('Error loading usecases:', err)
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement des usecases')
    } finally {
      setLoading(false)
    }
  }

  const calculateScore = async (usecaseId: string) => {
    try {
      setLoadingScores(prev => new Set(prev).add(usecaseId))
      
      const response = await fetch(`/api/usecases/${usecaseId}/score`, {
        headers: {
          'Authorization': `Bearer ${user?.id}`
        }
      })

      if (!response.ok) {
        throw new Error('Erreur lors du calcul du score')
      }

      const scoreData: UseCaseScore = await response.json()

      setUsecases(prev => prev.map(uc => 
        uc.id === usecaseId 
          ? {
              ...uc,
              score: scoreData.score,
              category_scores: scoreData.category_scores.map(cat => ({
                category: cat.category_id,
                name: cat.category_name,
                score: cat.percentage,
                weight: cat.question_count
              })),
              score_breakdown: scoreData.score_breakdown.map(item => ({
                question_code: item.question_id || item.question_text,
                impact: item.score_impact,
                reason: item.reasoning
              })),
              calculated_at: new Date().toISOString()
            }
          : uc
      ))
    } catch (err) {
      console.error('Error calculating score:', err)
    } finally {
      setLoadingScores(prev => {
        const newSet = new Set(prev)
        newSet.delete(usecaseId)
        return newSet
      })
    }
  }

  const toggleRow = (usecaseId: string) => {
    const newExpanded = new Set(expandedRows)
    if (newExpanded.has(usecaseId)) {
      newExpanded.delete(usecaseId)
    } else {
      newExpanded.add(usecaseId)
      // Calculate score if not already calculated
      const usecase = usecases.find(uc => uc.id === usecaseId)
      if (usecase && usecase.score === null) {
        calculateScore(usecaseId)
      }
    }
    setExpandedRows(newExpanded)
  }

  const refreshAllScores = async () => {
    for (const usecase of usecases) {
      await calculateScore(usecase.id)
    }
  }

  const exportToCSV = () => {
    const headers = ['Entreprise', 'Usecase', 'Catégorie IA', 'Niveau de risque', 'Score', 'Statut', 'Nombre de réponses']
    const rows = filteredUsecases.map(uc => [
      uc.company_name,
      uc.name,
      getAICategoryLabel(uc.ai_category),
      getRiskLevelLabel(uc.risk_level),
      uc.score !== null ? uc.score.toString() : 'Non calculé',
      getStatusLabel(uc.status),
      uc.response_count.toString()
    ])

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `usecase-scores-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
  }

  const filteredUsecases = usecases.filter(uc => {
    if (selectedCompany !== 'all' && uc.company_id !== selectedCompany) return false
    if (selectedRiskLevel !== 'all' && uc.risk_level !== selectedRiskLevel) return false
    return true
  })

  // Calculate statistics
  const totalUsecases = filteredUsecases.length
  const completedUsecases = filteredUsecases.filter(uc => uc.status === 'completed').length
  const averageScore = filteredUsecases
    .filter(uc => uc.score !== null)
    .reduce((acc, uc) => acc + (uc.score || 0), 0) / 
    (filteredUsecases.filter(uc => uc.score !== null).length || 1)

  return (
    <AdminProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        <Header />
        
        <div className="container mx-auto px-4 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Scores des Usecases</h1>
            <p className="text-gray-600">
              Vue d'ensemble des scores de conformité AI Act pour tous les usecases
            </p>
          </div>

          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <Bot className="h-10 w-10 text-blue-500 mr-3" />
                <div>
                  <p className="text-sm text-gray-600">Total Usecases</p>
                  <p className="text-2xl font-bold text-gray-900">{totalUsecases}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <Shield className="h-10 w-10 text-green-500 mr-3" />
                <div>
                  <p className="text-sm text-gray-600">Complétés</p>
                  <p className="text-2xl font-bold text-gray-900">{completedUsecases}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <TrendingUp className="h-10 w-10 text-purple-500 mr-3" />
                <div>
                  <p className="text-sm text-gray-600">Score Moyen</p>
                  <p className={`text-2xl font-bold ${getScoreColor(averageScore)}`}>
                    {averageScore.toFixed(0)}%
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <Building2 className="h-10 w-10 text-indigo-500 mr-3" />
                <div>
                  <p className="text-sm text-gray-600">Entreprises</p>
                  <p className="text-2xl font-bold text-gray-900">{companies.length}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Filters and Actions */}
          <div className="bg-white rounded-lg shadow mb-8 p-6">
            <div className="flex flex-wrap items-center gap-4">
              <select
                value={selectedCompany}
                onChange={(e) => setSelectedCompany(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Toutes les entreprises</option>
                {companies.map(company => (
                  <option key={company.id} value={company.id}>{company.name}</option>
                ))}
              </select>

              <select
                value={selectedRiskLevel}
                onChange={(e) => setSelectedRiskLevel(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Tous les niveaux de risque</option>
                <option value="minimal">Risque minimal</option>
                <option value="limited">Risque limité</option>
                <option value="high">Risque élevé</option>
                <option value="systemic">Risque systémique</option>
              </select>

              <div className="ml-auto flex gap-2">
                <button
                  onClick={refreshAllScores}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  Rafraîchir les scores
                </button>
                <button
                  onClick={exportToCSV}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  Exporter CSV
                </button>
              </div>
            </div>
          </div>

          {/* Main Table */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            {loading ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">Chargement des usecases...</p>
              </div>
            ) : error ? (
              <div className="p-8">
                <div className="flex items-center text-red-600">
                  <AlertCircle className="h-5 w-5 mr-2" />
                  <p>{error}</p>
                </div>
              </div>
            ) : filteredUsecases.length === 0 ? (
              <div className="p-8 text-center text-gray-600">
                Aucun usecase trouvé pour les filtres sélectionnés.
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Entreprise / Usecase
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Catégorie IA
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Niveau de risque
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Score
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Statut
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Réponses
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsecases.map((usecase, index) => (
                    <React.Fragment key={usecase.id}>
                      <tr 
                        className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-gray-100 cursor-pointer`}
                        onClick={() => toggleRow(usecase.id)}
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            {expandedRows.has(usecase.id) ? (
                              <ChevronDown className="h-4 w-4 mr-2 text-gray-400" />
                            ) : (
                              <ChevronRight className="h-4 w-4 mr-2 text-gray-400" />
                            )}
                            <div>
                              <div className="text-sm font-medium text-gray-900">{usecase.name}</div>
                              <div className="text-sm text-gray-500">{usecase.company_name}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {getAICategoryLabel(usecase.ai_category)}
                        </td>
                        <td className="px-6 py-4">
                          <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">
                            {getRiskLevelLabel(usecase.risk_level)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          {loadingScores.has(usecase.id) ? (
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 mx-auto"></div>
                          ) : usecase.score !== null ? (
                            <span className={`text-lg font-bold ${getScoreColor(usecase.score)}`}>
                              {usecase.score}%
                            </span>
                          ) : (
                            <span className="text-sm text-gray-400">Non calculé</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={`text-sm font-medium ${getStatusColor(usecase.status)}`}>
                            {getStatusLabel(usecase.status)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center text-sm text-gray-900">
                          {usecase.response_count}
                        </td>
                      </tr>
                      
                      {/* Expanded Details */}
                      {expandedRows.has(usecase.id) && (
                        <tr>
                          <td colSpan={6} className="px-6 py-4 bg-gray-50">
                            <div className="space-y-4">
                              {/* Score Details */}
                              {usecase.score !== null ? (
                                <>
                                  {/* Category Scores */}
                                  <div>
                                    <h4 className="font-medium text-gray-900 mb-2">Scores par catégorie</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                      {usecase.category_scores.map((catScore) => (
                                        <div key={catScore.category} className="bg-white p-4 rounded border">
                                          <div className="text-sm text-gray-600">{catScore.name}</div>
                                          <div className={`text-2xl font-bold ${getScoreColor(catScore.score)}`}>
                                            {catScore.score}%
                                          </div>
                                          <div className="text-xs text-gray-500">
                                            Poids: {catScore.weight}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>

                                  {/* Score Breakdown */}
                                  <div>
                                    <h4 className="font-medium text-gray-900 mb-2">Détail du score par réponse</h4>
                                    <div className="bg-white rounded border overflow-hidden">
                                      <table className="w-full text-sm">
                                        <thead className="bg-gray-100">
                                          <tr>
                                            <th className="px-4 py-2 text-left">Question</th>
                                            <th className="px-4 py-2 text-center">Impact</th>
                                            <th className="px-4 py-2 text-left">Raison</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {usecase.score_breakdown
                                            .filter(item => (item as any).impact !== 0)
                                            .map((item, idx) => (
                                              <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                                <td className="px-4 py-2 font-mono text-xs">{(item as any).question_code}</td>
                                                <td className={`px-4 py-2 text-center font-medium ${
                                                  (item as any).impact > 0 ? 'text-green-600' : 'text-red-600'
                                                }`}>
                                                  {(item as any).impact > 0 ? '+' : ''}{ (item as any).impact}
                                                </td>
                                                <td className="px-4 py-2 text-xs">{(item as any).reason}</td>
                                              </tr>
                                            ))}
                                        </tbody>
                                      </table>
                                    </div>
                                  </div>

                                  {/* Raw Responses (Debug) */}
                                  <div>
                                    <h4 className="font-medium text-gray-900 mb-2">Réponses brutes (Debug)</h4>
                                    <div className="bg-gray-900 text-green-400 p-4 rounded font-mono text-xs overflow-x-auto">
                                      <pre>{JSON.stringify(usecase.responses, null, 2)}</pre>
                                    </div>
                                  </div>
                                </>
                              ) : (
                                <div className="text-center py-4 text-gray-500">
                                  Cliquez pour calculer le score de ce usecase
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </AdminProtectedRoute>
  )
}