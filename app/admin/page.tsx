'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Users, FileText, Settings, BarChart3, TrendingUp, Activity } from 'lucide-react'

interface AdminStats {
  sectionsCount: number
  questionsCount: number
  usecasesCount: number
  responsesCount: number
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats>({
    sectionsCount: 0,
    questionsCount: 0,
    usecasesCount: 0,
    responsesCount: 0
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchStats() {
      try {
        // Récupérer les statistiques
        const [sections, questions, usecases, responses] = await Promise.all([
          supabase.from('questionnaire_sections').select('id', { count: 'exact' }),
          supabase.from('questionnaire_questions').select('id', { count: 'exact' }),
          supabase.from('usecases').select('id', { count: 'exact' }),
          supabase.from('usecase_questionnaire_responses').select('id', { count: 'exact' })
        ])

        setStats({
          sectionsCount: sections.count || 0,
          questionsCount: questions.count || 0,
          usecasesCount: usecases.count || 0,
          responsesCount: responses.count || 0
        })
      } catch (error) {
        console.error('Erreur lors du chargement des statistiques:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [])

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
        <h1 className="text-2xl font-bold text-gray-900">Tableau de bord</h1>
        <p className="mt-2 text-gray-600">
          Vue d'ensemble de votre questionnaire de conformité IA Act
        </p>
      </div>

      {/* Statistiques principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Settings className="h-8 w-8 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Sections</p>
              <p className="text-2xl font-bold text-gray-900">{stats.sectionsCount}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <FileText className="h-8 w-8 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Questions</p>
              <p className="text-2xl font-bold text-gray-900">{stats.questionsCount}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Users className="h-8 w-8 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Cas d'usage</p>
              <p className="text-2xl font-bold text-gray-900">{stats.usecasesCount}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <BarChart3 className="h-8 w-8 text-orange-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Réponses</p>
              <p className="text-2xl font-bold text-gray-900">{stats.responsesCount}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Actions rapides */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Actions rapides</h2>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
            <a
              href="/admin/sections"
              className="block p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:shadow-md transition-colors"
            >
              <Settings className="h-6 w-6 text-blue-600 mb-2" />
              <h3 className="font-medium text-gray-900">Gérer les sections</h3>
              <p className="text-sm text-gray-500 mt-1">
                Organiser les sections du questionnaire
              </p>
            </a>

            <a
              href="/admin/questions"
              className="block p-4 border border-gray-200 rounded-lg hover:border-green-500 hover:shadow-md transition-colors"
            >
              <FileText className="h-6 w-6 text-green-600 mb-2" />
              <h3 className="font-medium text-gray-900">Créer des questions</h3>
              <p className="text-sm text-gray-500 mt-1">
                Ajouter et modifier les questions
              </p>
            </a>

            <a
              href="/admin/usecases"
              className="block p-4 border border-gray-200 rounded-lg hover:border-purple-500 hover:shadow-md transition-colors"
            >
              <Users className="h-6 w-6 text-purple-600 mb-2" />
              <h3 className="font-medium text-gray-900">Voir les cas d'usage</h3>
              <p className="text-sm text-gray-500 mt-1">
                Consulter les cas d'usage soumis
              </p>
            </a>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <a
              href="/admin/usecase-scores"
              className="block p-4 border border-gray-200 rounded-lg hover:border-indigo-500 hover:shadow-md transition-colors"
            >
              <Activity className="h-6 w-6 text-indigo-600 mb-2" />
              <h3 className="font-medium text-gray-900">Scores des Usecases</h3>
              <p className="text-sm text-gray-500 mt-1">
                Vue d'ensemble des scores de conformité IA Act pour tous les cas d'usage
              </p>
            </a>

            <a
              href="/admin/compl-ai-scores"
              className="block p-4 border border-gray-200 rounded-lg hover:border-orange-500 hover:shadow-md transition-colors"
            >
              <TrendingUp className="h-6 w-6 text-orange-600 mb-2" />
              <h3 className="font-medium text-gray-900">Scores COMPL-AI</h3>
              <p className="text-sm text-gray-500 mt-1">
                Consulter les scores de conformité des modèles IA
              </p>
            </a>
          </div>
        </div>
      </div>
    </div>
  )
} 