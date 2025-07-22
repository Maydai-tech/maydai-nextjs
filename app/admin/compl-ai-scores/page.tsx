'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { BarChart3, TrendingUp, Database, RefreshCw, Trash2 } from 'lucide-react'


interface BenchmarkInfo {
  code: string
  name: string
  principle_code: string
  principle_name: string
  principle_category: string
}

interface ModelBenchmarkMatrix {
  model_name: string
  model_provider: string
  model_type: string
  version: string
  benchmark_scores: Record<string, {
    score: number
    score_text: string
    evaluation_date: string
  }>
  avg_score: number
  evaluation_count: number
  latest_date: number
}


export default function ComplAIScoresPage() {
  const [modelBenchmarkMatrix, setModelBenchmarkMatrix] = useState<ModelBenchmarkMatrix[]>([])
  const [benchmarks, setBenchmarks] = useState<BenchmarkInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [clearing, setClearing] = useState(false)
  const [syncMessage, setSyncMessage] = useState<string>('')
  const [showClearConfirm, setShowClearConfirm] = useState(false)

  useEffect(() => {
    fetchScores()
  }, [])


  const handleSyncData = async () => {
    setSyncing(true)
    setSyncMessage('')
    
    try {
      // Récupérer le token de session pour l'authentification
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        throw new Error('Session non trouvée. Veuillez vous reconnecter.')
      }

      // Appeler notre API route locale pour synchroniser les fichiers JSON
      const response = await fetch('/api/admin/compl-ai/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Erreur lors de la synchronisation')
      }

      if (data.success) {
        const { stats } = data
        
        const parts = []
        if (stats.modelsCreated + stats.modelsUpdated > 0) {
          parts.push(`${stats.modelsCreated + stats.modelsUpdated} modèles traités`)
        }
        if (stats.benchmarksCreated > 0) {
          parts.push(`${stats.benchmarksCreated} benchmarks créés`)
        }
        if (stats.evaluationsCreated + stats.evaluationsUpdated > 0) {
          parts.push(`${stats.evaluationsCreated + stats.evaluationsUpdated} évaluations synchronisées`)
        }
        
        setSyncMessage(
          `Synchronisation réussie ! ${parts.join(', ')}.` +
          (stats.errors.length > 0 ? ` (${stats.errors.length} erreurs)` : '')
        )
        
        // Recharger les données après la synchronisation
        setLoading(true)
        await new Promise(resolve => setTimeout(resolve, 1000)) // Attendre 1 seconde
        
        // Refetch data
        await fetchScores()
      } else {
        setSyncMessage(`Synchronisation échouée : ${data.message}`)
        
        // Afficher les erreurs détaillées si disponibles
        if (data.stats?.errors?.length > 0) {
          console.error('Erreurs de synchronisation:', data.stats.errors)
        }
      }
    } catch (error) {
      console.error('Erreur lors de la synchronisation:', error)
      setSyncMessage('Erreur lors de la synchronisation : ' + (error instanceof Error ? error.message : 'Erreur inconnue'))
    } finally {
      setSyncing(false)
    }
  }

  const handleClearData = async () => {
    setClearing(true)
    setSyncMessage('')
    
    try {
      // Récupérer le token de session pour l'authentification
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        throw new Error('Session non trouvée. Veuillez vous reconnecter.')
      }

      // Appeler notre API route pour effacer toutes les données
      const response = await fetch('/api/admin/compl-ai/clear', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
      })

      const data = await response.json()

      if (!response.ok) {
        const errorDetails = {
          status: response.status,
          statusText: response.statusText,
          message: data.message || 'Erreur lors de la suppression',
          errors: data.stats?.errors || []
        }
        console.error('Erreur de suppression détaillée:', errorDetails)
        throw new Error(`${errorDetails.message} (Status: ${errorDetails.status})`)
      }

      if (data.success) {
        const stats = data.stats || { 
          modelsCreated: 0, modelsUpdated: 0, benchmarksCreated: 0, 
          evaluationsCreated: 0, evaluationsUpdated: 0, errors: [] 
        }
        
        const parts = []
        if (stats.modelsCreated + stats.modelsUpdated > 0) {
          parts.push(`${stats.modelsCreated + stats.modelsUpdated} modèles traités`)
        }
        if (stats.benchmarksCreated > 0) {
          parts.push(`${stats.benchmarksCreated} benchmarks créés`)
        }
        if (stats.evaluationsCreated + stats.evaluationsUpdated > 0) {
          parts.push(`${stats.evaluationsCreated + stats.evaluationsUpdated} évaluations synchronisées`)
        }
        
        setSyncMessage(
          `Synchronisation réussie ! ${parts.join(', ')}.` +
          (stats.errors && stats.errors.length > 0 ? ` (${stats.errors.length} erreurs)` : '')
        )
        
        // Recharger les données après la suppression
        setLoading(true)
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        // Refetch data
        await fetchScores()
      } else {
        setSyncMessage(`Suppression échouée : ${data.message}`)
        
        // Afficher les erreurs détaillées si disponibles
        if (data.stats?.errors?.length > 0) {
          console.error('Erreurs de suppression:', data.stats.errors)
        }
      }
    } catch (error) {
      console.error('Erreur lors de la suppression:', error)
      setSyncMessage('Erreur lors de la suppression : ' + (error instanceof Error ? error.message : 'Erreur inconnue'))
    } finally {
      setClearing(false)
      setShowClearConfirm(false)
    }
  }

  const fetchScores = async () => {
    try {
      // Récupérer toutes les évaluations avec modèles, benchmarks et principes
      const { data: evaluations, error } = await supabase
        .from('compl_ai_evaluations')
        .select(`
          id,
          score,
          score_text,
          evaluation_date,
          raw_data,
          compl_ai_models!inner (
            model_name,
            model_provider,
            model_type,
            version
          ),
          compl_ai_principles!inner (
            name,
            code,
            category
          ),
          compl_ai_benchmarks (
            code,
            name
          )
        `)
        .order('evaluation_date', { ascending: false })

      if (error) throw error

      if (!evaluations || evaluations.length === 0) {
        setModelBenchmarkMatrix([])
        setBenchmarks([])
        return
      }

      // Extraire tous les benchmarks uniques
      const uniqueBenchmarks = new Map<string, BenchmarkInfo>()
      
      evaluations.forEach((evaluation: any) => {
        const benchmarkCode = evaluation.compl_ai_benchmarks?.code || evaluation.raw_data?.benchmark_code
        const benchmarkName = evaluation.compl_ai_benchmarks?.name || evaluation.raw_data?.benchmark_name || benchmarkCode
        
        if (benchmarkCode && !uniqueBenchmarks.has(benchmarkCode)) {
          uniqueBenchmarks.set(benchmarkCode, {
            code: benchmarkCode,
            name: benchmarkName,
            principle_code: evaluation.compl_ai_principles.code,
            principle_name: evaluation.compl_ai_principles.name,
            principle_category: evaluation.compl_ai_principles.category
          })
        }
      })

      const benchmarksList = Array.from(uniqueBenchmarks.values()).sort((a, b) => {
        // Trier d'abord par principe puis par benchmark
        if (a.principle_code !== b.principle_code) {
          return a.principle_code.localeCompare(b.principle_code)
        }
        return a.code.localeCompare(b.code)
      })

      setBenchmarks(benchmarksList)

      // Créer la matrice modèle x benchmark
      const modelGroups = new Map<string, {
        model_name: string
        model_provider: string
        model_type: string
        version: string
        benchmark_scores: Record<string, { score: number; score_text: string; evaluation_date: string }>
        scores: number[]
        dates: string[]
      }>()

      evaluations.forEach((evaluation: any) => {
        const modelKey = `${evaluation.compl_ai_models.model_name}-${evaluation.compl_ai_models.model_provider}-${evaluation.compl_ai_models.version}`
        const benchmarkCode = evaluation.compl_ai_benchmarks?.code || evaluation.raw_data?.benchmark_code

        if (!benchmarkCode) return

        if (!modelGroups.has(modelKey)) {
          modelGroups.set(modelKey, {
            model_name: evaluation.compl_ai_models.model_name,
            model_provider: evaluation.compl_ai_models.model_provider,
            model_type: evaluation.compl_ai_models.model_type || 'N/A',
            version: evaluation.compl_ai_models.version || 'N/A',
            benchmark_scores: {},
            scores: [],
            dates: []
          })
        }

        const modelData = modelGroups.get(modelKey)!
        modelData.benchmark_scores[benchmarkCode] = {
          score: evaluation.score,
          score_text: evaluation.score_text || `${Math.round(evaluation.score * 100)}%`,
          evaluation_date: evaluation.evaluation_date
        }
        modelData.scores.push(evaluation.score)
        modelData.dates.push(evaluation.evaluation_date)
      })

      // Convertir en array et calculer les moyennes
      const matrix = Array.from(modelGroups.values()).map(group => ({
        model_name: group.model_name,
        model_provider: group.model_provider,
        model_type: group.model_type,
        version: group.version,
        benchmark_scores: group.benchmark_scores,
        avg_score: group.scores.reduce((sum, score) => sum + score, 0) / group.scores.length,
        evaluation_count: group.scores.length,
        latest_date: Math.max(...group.dates.map(d => new Date(d).getTime()))
      }))

      setModelBenchmarkMatrix(matrix.sort((a, b) => b.avg_score - a.avg_score))

    } catch (error) {
      console.error('Erreur lors du chargement des scores COMPL-AI:', error)
    } finally {
      setLoading(false)
    }
  }

  const getScoreColor = (score?: number) => {
    if (!score) return 'bg-gray-100 text-gray-500'
    if (score >= 0.8) return 'bg-green-100 text-green-800'
    if (score >= 0.6) return 'bg-yellow-100 text-yellow-800'
    return 'bg-red-100 text-red-800'
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
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Scores COMPL-AI</h1>
            <p className="mt-2 text-gray-600">
              Scores de conformité des modèles IA selon les principes européens
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={handleSyncData}
              disabled={syncing || clearing}
              className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white ${
                syncing || clearing
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-blue-600 hover:bg-blue-700'
              } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500`}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Synchronisation...' : 'Mettre à jour les résultats'}
            </button>
            
            {!showClearConfirm ? (
              <button
                onClick={() => setShowClearConfirm(true)}
                disabled={syncing || clearing}
                className={`ml-3 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white ${
                  syncing || clearing
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-red-600 hover:bg-red-700'
                } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500`}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Effacer toutes les données
              </button>
            ) : (
              <div className="ml-3 inline-flex items-center space-x-2">
                <span className="text-sm text-red-600 font-medium">Êtes-vous sûr ?</span>
                <button
                  onClick={handleClearData}
                  disabled={clearing}
                  className={`inline-flex items-center px-3 py-2 border border-transparent text-xs font-medium rounded-md text-white ${
                    clearing
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-red-600 hover:bg-red-700'
                  } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500`}
                >
                  <Trash2 className={`h-3 w-3 mr-1 ${clearing ? 'animate-pulse' : ''}`} />
                  {clearing ? 'Suppression...' : 'Confirmer'}
                </button>
                <button
                  onClick={() => setShowClearConfirm(false)}
                  disabled={clearing}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 text-xs font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Annuler
                </button>
              </div>
            )}
          </div>
        </div>
        
        {syncMessage && (
          <div className={`mt-4 p-4 rounded-md ${
            syncMessage.includes('réussie') 
              ? 'bg-green-50 border-green-200 text-green-800' 
              : 'bg-red-50 border-red-200 text-red-800'
          } border`}>
            {syncMessage}
          </div>
        )}
      </div>

      {/* Statistiques rapides */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Database className="h-8 w-8 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Modèles évalués</p>
              <p className="text-2xl font-bold text-gray-900">{modelBenchmarkMatrix.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <BarChart3 className="h-8 w-8 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Benchmarks évalués</p>
              <p className="text-2xl font-bold text-gray-900">{benchmarks.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <TrendingUp className="h-8 w-8 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Score moyen</p>
              <p className="text-2xl font-bold text-gray-900">
                {modelBenchmarkMatrix.length > 0 
                  ? (modelBenchmarkMatrix.reduce((sum, model) => sum + model.avg_score, 0) / modelBenchmarkMatrix.length).toFixed(3)
                  : '0'
                }
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Matrice des scores par benchmark */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Matrice des Scores par Modèle et Benchmark</h2>
          <p className="text-sm text-gray-600 mt-1">
            Chaque ligne représente un modèle, chaque colonne un benchmark individuel
          </p>
        </div>
        <div className="overflow-x-auto max-h-screen">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50 sticky top-0 z-20">
              <tr>
                <th className="sticky left-0 px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50 z-30 border-r border-gray-200 min-w-[150px]">
                  Modèle
                </th>
                <th className="sticky left-[150px] px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50 z-30 border-r border-gray-200 min-w-[120px]">
                  Fournisseur
                </th>
                <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[100px]">
                  Score Moyen
                </th>
                {benchmarks.map((benchmark) => (
                  <th key={benchmark.code} className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[80px] max-w-[120px]">
                    <div className="space-y-1">
                      <div className="font-semibold text-[10px] leading-tight">{benchmark.code}</div>
                      <div className="text-[8px] text-gray-400 normal-case leading-tight truncate" title={benchmark.name}>
                        {benchmark.name.length > 15 ? benchmark.name.substring(0, 12) + '...' : benchmark.name}
                      </div>
                      <div className="text-[8px] text-blue-600 normal-case leading-tight truncate" title={benchmark.principle_name}>
                        {benchmark.principle_code}
                      </div>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {modelBenchmarkMatrix.map((model) => (
                <tr key={`${model.model_name}-${model.model_provider}-${model.version}`} className="hover:bg-gray-50">
                  <td className="sticky left-0 px-3 py-3 whitespace-nowrap bg-white z-10 border-r border-gray-200 min-w-[150px]">
                    <div className="text-sm font-medium text-gray-900 truncate" title={model.model_name}>
                      {model.model_name}
                    </div>
                    <div className="text-xs text-gray-500">{model.version}</div>
                  </td>
                  <td className="sticky left-[150px] px-3 py-3 whitespace-nowrap bg-white z-10 border-r border-gray-200 min-w-[120px]">
                    <div className="text-sm text-gray-700 truncate" title={model.model_provider}>
                      {model.model_provider}
                    </div>
                    <div className="text-xs text-gray-500 truncate">{model.model_type}</div>
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap text-center">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getScoreColor(model.avg_score)}`}>
                      {model.avg_score.toFixed(3)}
                    </span>
                  </td>
                  {benchmarks.map((benchmark) => (
                    <td key={benchmark.code} className="px-2 py-3 text-center min-w-[80px] max-w-[120px]">
                      {model.benchmark_scores[benchmark.code] ? (
                        <div className="space-y-1">
                          <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${getScoreColor(model.benchmark_scores[benchmark.code].score)}`}>
                            {model.benchmark_scores[benchmark.code].score.toFixed(3)}
                          </span>
                          <div className="text-[8px] text-gray-500">
                            {model.benchmark_scores[benchmark.code].score_text}
                          </div>
                        </div>
                      ) : (
                        <span className="text-gray-400 text-xs">N/A</span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {modelBenchmarkMatrix.length === 0 && (
          <div className="px-6 py-12 text-center">
            <p className="text-gray-500">Aucune donnée disponible</p>
          </div>
        )}
      </div>

    </div>
  )
}