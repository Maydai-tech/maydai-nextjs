'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import {
  Users,
  FileText,
  Settings,
  BarChart3,
  TrendingUp,
  Activity,
  LineChart,
  ShieldCheck,
  History,
} from 'lucide-react'

interface AdminStats {
  sectionsCount: number
  questionsCount: number
  usecasesCount: number
  responsesCount: number
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<AdminStats>({
    sectionsCount: 0,
    questionsCount: 0,
    usecasesCount: 0,
    responsesCount: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchStats() {
      try {
        const [sections, questions, usecases, responses] = await Promise.all([
          supabase.from('questionnaire_sections').select('id', { count: 'exact' }),
          supabase.from('questionnaire_questions').select('id', { count: 'exact' }),
          supabase.from('usecases').select('id', { count: 'exact' }),
          supabase.from('usecase_questionnaire_responses').select('id', { count: 'exact' }),
        ])

        setStats({
          sectionsCount: sections.count || 0,
          questionsCount: questions.count || 0,
          usecasesCount: usecases.count || 0,
          responsesCount: responses.count || 0,
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
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600"></div>
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

      <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg bg-white p-6 shadow">
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

        <div className="rounded-lg bg-white p-6 shadow">
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

        <div className="rounded-lg bg-white p-6 shadow">
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

        <div className="rounded-lg bg-white p-6 shadow">
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

      <div className="rounded-lg bg-white shadow">
        <div className="border-b border-gray-200 px-6 py-4">
          <h2 className="text-lg font-medium text-gray-900">Actions rapides</h2>
        </div>
        <div className="p-6">
          <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            <a
              href="/admin/sections"
              className="block rounded-lg border border-gray-200 p-4 transition-colors hover:border-blue-500 hover:shadow-md"
            >
              <Settings className="mb-2 h-6 w-6 text-blue-600" />
              <h3 className="font-medium text-gray-900">Gérer les sections</h3>
              <p className="mt-1 text-sm text-gray-500">
                Organiser les sections du questionnaire
              </p>
            </a>

            <a
              href="/admin/questions"
              className="block rounded-lg border border-gray-200 p-4 transition-colors hover:border-green-500 hover:shadow-md"
            >
              <FileText className="mb-2 h-6 w-6 text-green-600" />
              <h3 className="font-medium text-gray-900">Créer des questions</h3>
              <p className="mt-1 text-sm text-gray-500">Ajouter et modifier les questions</p>
            </a>

            <a
              href="/admin/usecases"
              className="block rounded-lg border border-gray-200 p-4 transition-colors hover:border-purple-500 hover:shadow-md"
            >
              <TrendingUp className="mb-2 h-6 w-6 text-purple-600" />
              <h3 className="font-medium text-gray-900">Voir les cas d'usage</h3>
              <p className="mt-1 text-sm text-gray-500">Consulter les cas d'usage soumis</p>
            </a>

            <a
              href="/admin/users"
              className="block rounded-lg border border-gray-200 p-4 transition-colors hover:border-indigo-500 hover:shadow-md"
            >
              <Users className="mb-2 h-6 w-6 text-indigo-600" />
              <h3 className="font-medium text-gray-900">Gérer les utilisateurs</h3>
              <p className="mt-1 text-sm text-gray-500">
                Voir et gérer tous les utilisateurs de l'application
              </p>
            </a>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Link
              href="/admin/marketing"
              className="block rounded-lg border border-gray-200 p-4 transition-colors hover:border-[#0080A3] hover:shadow-md"
            >
              <TrendingUp className="mb-2 h-6 w-6 text-[#0080A3]" />
              <h3 className="font-medium text-gray-900">Marketing & LTV</h3>
              <p className="mt-1 text-sm text-gray-500">
                Leads, cohortes mensuelles et revenus (Google Ads / Stripe)
              </p>
            </Link>

            <Link
              href="/admin/analytics"
              className="block rounded-lg border border-gray-200 p-4 transition-colors hover:border-[#0080A3] hover:shadow-md"
            >
              <LineChart className="mb-2 h-6 w-6 text-[#0080A3]" />
              <h3 className="font-medium text-gray-900">Analytics</h3>
              <p className="mt-1 text-sm text-gray-500">
                Inscriptions, utilisateurs et cas d&apos;usage dans le temps (filtres plan, rôle,
                abonnement)
              </p>
            </Link>

            <Link
              href="/admin/analytics/v3-short-path"
              className="block rounded-lg border border-teal-200 bg-teal-50/40 p-4 transition-colors hover:border-[#0080A3] hover:shadow-md"
            >
              <LineChart className="mb-2 h-6 w-6 text-teal-700" />
              <h3 className="font-medium text-gray-900">Parcours court V3 (pilotage)</h3>
              <p className="mt-1 text-sm text-gray-500">
                Lecture produit des événements GTM / GA4 : entrées, funnel, conversion, partages
              </p>
            </Link>

            <Link
              href="/admin/evaluation-path-runs"
              className="block rounded-lg border border-cyan-200 bg-cyan-50/50 p-4 transition-colors hover:border-[#0080A3] hover:shadow-md"
            >
              <Activity className="mb-2 h-6 w-6 text-cyan-800" />
              <h3 className="font-medium text-gray-900">Parcours court / long (Supabase)</h3>
              <p className="mt-1 text-sm text-gray-500">
                Démarrages, complétions, durées et résultats — mesure métier first-party
              </p>
            </Link>

            <Link
              href="/admin/llm-stats-sync-runs"
              className="block rounded-lg border border-sky-200 bg-sky-50/50 p-4 transition-colors hover:border-[#0080A3] hover:shadow-md"
            >
              <History className="mb-2 h-6 w-6 text-sky-800" />
              <h3 className="font-medium text-gray-900">Cron LLM Stats</h3>
              <p className="mt-1 text-sm text-gray-500">
                Historique des synchronisations quotidiennes, emails et erreurs
              </p>
            </Link>

            <a
              href="/admin/usecase-scores"
              className="block rounded-lg border border-gray-200 p-4 transition-colors hover:border-indigo-500 hover:shadow-md"
            >
              <Activity className="mb-2 h-6 w-6 text-indigo-600" />
              <h3 className="font-medium text-gray-900">Scores des Usecases</h3>
              <p className="mt-1 text-sm text-gray-500">
                Vue d'ensemble des scores de conformité IA Act pour tous les cas d'usage
              </p>
            </a>

            <a
              href="/admin/compl-ai-scores"
              className="block rounded-lg border border-gray-200 p-4 transition-colors hover:border-orange-500 hover:shadow-md"
            >
              <TrendingUp className="mb-2 h-6 w-6 text-orange-600" />
              <h3 className="font-medium text-gray-900">Scores COMPL-AI</h3>
              <p className="mt-1 text-sm text-gray-500">
                Consulter les scores de conformité des modèles IA
              </p>
            </a>

            <a
              href="/admin/monitoring"
              className="block rounded-lg border border-gray-200 p-4 transition-colors hover:border-teal-500 hover:shadow-md"
            >
              <ShieldCheck className="mb-2 h-6 w-6 text-teal-600" />
              <h3 className="font-medium text-gray-900">Monitoring</h3>
              <p className="mt-1 text-sm text-gray-500">
                Superviser les alertes disque et les protections opérationnelles
              </p>
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
