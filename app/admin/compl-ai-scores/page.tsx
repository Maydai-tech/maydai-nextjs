'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { BarChart3, TrendingUp, Database, RefreshCw, Trash2, Plus, Save, X, Check, Edit } from 'lucide-react'


interface BenchmarkInfo {
  code: string
  name: string
  principle_code: string
  principle_name: string
  principle_category: string
}

interface PrincipleInfo {
  code: string
  name: string
  category: string
  benchmarks: BenchmarkInfo[]
}

interface BenchmarkScore {
  score: number
  score_text: string
  evaluation_date: string
  evaluation_id?: string
}

interface ModelPrincipleMatrix {
  model_id?: string
  model_name: string
  model_provider: string
  model_type: string
  version: string
  principle_scores: Record<string, {
    principle_name: string
    principle_category: string
    benchmark_scores: Record<string, BenchmarkScore>
    avg_score: number
    benchmark_count: number
  }>
  avg_score: number
  evaluation_count: number
  latest_date: number
}

interface ModelFormData {
  model_name: string
  model_provider: string
  model_type: string
  version: string
}

interface ScoreEditData {
  modelId: string
  benchmarkCode: string
  score: number
  evaluation_id?: string
}

interface ScoreDeleteData {
  evaluationId: string
  modelName: string
  benchmarkCode: string
}


export default function ComplAIScoresPage() {
  const [modelPrincipleMatrix, setModelPrincipleMatrix] = useState<ModelPrincipleMatrix[]>([])
  const [principles, setPrinciples] = useState<PrincipleInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [clearing, setClearing] = useState(false)
  const [syncMessage, setSyncMessage] = useState<string>('')
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  
  // États pour l'édition
  const [showModelForm, setShowModelForm] = useState(false)
  const [editingModel, setEditingModel] = useState<ModelPrincipleMatrix | null>(null)
  const [modelFormData, setModelFormData] = useState<ModelFormData>({
    model_name: '',
    model_provider: '',
    model_type: 'large-language-model',
    version: ''
  })
  const [editingScore, setEditingScore] = useState<ScoreEditData | null>(null)
  const [deletingScore, setDeletingScore] = useState<ScoreDeleteData | null>(null)
  const [saving, setSaving] = useState(false)

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
      // Récupérer tous les modèles
      const { data: allModels, error: modelsError } = await supabase
        .from('compl_ai_models')
        .select('id, model_name, model_provider, model_type, version')
        .order('model_name')

      if (modelsError) throw modelsError

      // Récupérer toutes les évaluations avec benchmarks et principes
      const { data: evaluations, error } = await supabase
        .from('compl_ai_evaluations')
        .select(`
          id,
          score,
          score_text,
          evaluation_date,
          raw_data,
          compl_ai_models!inner (
            id,
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

      // Si aucun modèle n'existe, retourner un état vide
      if (!allModels || allModels.length === 0) {
        setModelPrincipleMatrix([])
        setPrinciples([])
        return
      }

      // Extraire tous les principes et leurs benchmarks
      const principleMap = new Map<string, PrincipleInfo>()
      const benchmarkMap = new Map<string, BenchmarkInfo>()
      
      // Si nous avons des évaluations, extraire les principes et benchmarks
      if (evaluations && evaluations.length > 0) {
        evaluations.forEach((evaluation: any) => {
          const principleCode = evaluation.compl_ai_principles.code
          const benchmarkCode = evaluation.compl_ai_benchmarks?.code || evaluation.raw_data?.benchmark_code
          const benchmarkName = evaluation.compl_ai_benchmarks?.name || evaluation.raw_data?.benchmark_name || benchmarkCode
          
          if (!principleMap.has(principleCode)) {
            principleMap.set(principleCode, {
              code: principleCode,
              name: evaluation.compl_ai_principles.name,
              category: evaluation.compl_ai_principles.category,
              benchmarks: []
            })
          }

          if (benchmarkCode && !benchmarkMap.has(benchmarkCode)) {
            const benchmarkInfo: BenchmarkInfo = {
              code: benchmarkCode,
              name: benchmarkName,
              principle_code: principleCode,
              principle_name: evaluation.compl_ai_principles.name,
              principle_category: evaluation.compl_ai_principles.category
            }
            benchmarkMap.set(benchmarkCode, benchmarkInfo)
            principleMap.get(principleCode)!.benchmarks.push(benchmarkInfo)
          }
        })
      } else {
        // Si pas d'évaluations, récupérer au moins la structure des principes et benchmarks
        const { data: principlesData } = await supabase
          .from('compl_ai_principles')
          .select(`
            code,
            name,
            category,
            compl_ai_benchmarks (
              code,
              name
            )
          `)
          .order('code')

        if (principlesData) {
          principlesData.forEach((principle: any) => {
            principleMap.set(principle.code, {
              code: principle.code,
              name: principle.name,
              category: principle.category,
              benchmarks: (principle.compl_ai_benchmarks || []).map((benchmark: any) => ({
                code: benchmark.code,
                name: benchmark.name,
                principle_code: principle.code,
                principle_name: principle.name,
                principle_category: principle.category
              }))
            })
          })
        }
      }

      const principlesList = Array.from(principleMap.values()).sort((a, b) => a.code.localeCompare(b.code))
      principlesList.forEach(principle => {
        principle.benchmarks.sort((a, b) => a.code.localeCompare(b.code))
      })

      setPrinciples(principlesList)

      // Créer la matrice modèle x principe - inclure TOUS les modèles
      const modelGroups = new Map<string, {
        model_id?: string
        model_name: string
        model_provider: string
        model_type: string
        version: string
        principle_scores: Record<string, {
          principle_name: string
          principle_category: string
          benchmark_scores: Record<string, BenchmarkScore>
          avg_score: number
          benchmark_count: number
        }>
        all_scores: number[]
        all_dates: string[]
      }>()

      // D'abord, ajouter tous les modèles avec des structures vides
      allModels.forEach((model: any) => {
        const modelKey = `${model.model_name}-${model.model_provider}-${model.version}`
        modelGroups.set(modelKey, {
          model_id: model.id,
          model_name: model.model_name,
          model_provider: model.model_provider,
          model_type: model.model_type || 'N/A',
          version: model.version || 'N/A',
          principle_scores: {},
          all_scores: [],
          all_dates: []
        })
      })

      // Ensuite, remplir avec les données d'évaluations si elles existent
      if (evaluations && evaluations.length > 0) {
        evaluations.forEach((evaluation: any) => {
          const modelKey = `${evaluation.compl_ai_models.model_name}-${evaluation.compl_ai_models.model_provider}-${evaluation.compl_ai_models.version}`
          const principleCode = evaluation.compl_ai_principles.code
          const benchmarkCode = evaluation.compl_ai_benchmarks?.code || evaluation.raw_data?.benchmark_code

          if (!benchmarkCode) return

          const modelData = modelGroups.get(modelKey)
          if (!modelData) return // Skip si le modèle n'est plus dans la base

          if (!modelData.principle_scores[principleCode]) {
            modelData.principle_scores[principleCode] = {
              principle_name: evaluation.compl_ai_principles.name,
              principle_category: evaluation.compl_ai_principles.category,
              benchmark_scores: {},
              avg_score: 0,
              benchmark_count: 0
            }
          }

          const principleData = modelData.principle_scores[principleCode]
          principleData.benchmark_scores[benchmarkCode] = {
            score: evaluation.score,
            score_text: evaluation.score_text || `${Math.round(evaluation.score * 100)}%`,
            evaluation_date: evaluation.evaluation_date,
            evaluation_id: evaluation.id
          }

          modelData.all_scores.push(evaluation.score)
          modelData.all_dates.push(evaluation.evaluation_date)
        })
      }

      // Calculer les moyennes par principe et globales
      const matrix: ModelPrincipleMatrix[] = Array.from(modelGroups.values()).map(group => {
        // Calculer la moyenne par principe
        Object.keys(group.principle_scores).forEach(principleCode => {
          const principleData = group.principle_scores[principleCode]
          const scores = Object.values(principleData.benchmark_scores).map(b => b.score)
          if (scores.length > 0) {
            principleData.avg_score = scores.reduce((sum, score) => sum + score, 0) / scores.length
            principleData.benchmark_count = scores.length
          } else {
            principleData.avg_score = 0
            principleData.benchmark_count = 0
          }
        })

        return {
          model_id: group.model_id,
          model_name: group.model_name,
          model_provider: group.model_provider,
          model_type: group.model_type,
          version: group.version,
          principle_scores: group.principle_scores,
          avg_score: group.all_scores.length > 0 
            ? group.all_scores.reduce((sum, score) => sum + score, 0) / group.all_scores.length 
            : 0,
          evaluation_count: group.all_scores.length,
          latest_date: group.all_dates.length > 0 
            ? Math.max(...group.all_dates.map(d => new Date(d).getTime()))
            : 0
        }
      })

      // Trier : d'abord les modèles avec des scores (par score décroissant), puis ceux sans scores (par nom)
      const sortedMatrix = matrix.sort((a, b) => {
        if (a.evaluation_count === 0 && b.evaluation_count === 0) {
          // Les deux n'ont pas de scores, trier par nom
          return a.model_name.localeCompare(b.model_name)
        }
        if (a.evaluation_count === 0) return 1  // a sans score va après
        if (b.evaluation_count === 0) return -1 // b sans score va après
        // Les deux ont des scores, trier par score décroissant
        return b.avg_score - a.avg_score
      })

      setModelPrincipleMatrix(sortedMatrix)

    } catch (error) {
      console.error('Erreur lors du chargement des scores COMPL-AI:', error)
    } finally {
      setLoading(false)
    }
  }

  // Fonctions pour gérer les modèles
  const handleCreateModel = async () => {
    setSaving(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        throw new Error('Session non trouvée. Veuillez vous reconnecter.')
      }

      const response = await fetch('/api/admin/compl-ai/models', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(modelFormData)
      })

      const result = await response.json()
      if (!response.ok) {
        throw new Error(result.message || 'Erreur lors de la création du modèle')
      }

      setSyncMessage(`Modèle "${modelFormData.model_name}" créé avec succès`)
      setShowModelForm(false)
      setModelFormData({ model_name: '', model_provider: '', model_type: 'large-language-model', version: '' })
      await fetchScores()
    } catch (error) {
      setSyncMessage('Erreur lors de la création : ' + (error instanceof Error ? error.message : 'Erreur inconnue'))
    } finally {
      setSaving(false)
    }
  }

  const handleUpdateModel = async () => {
    if (!editingModel?.model_id) return
    
    setSaving(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        throw new Error('Session non trouvée. Veuillez vous reconnecter.')
      }

      const response = await fetch(`/api/admin/compl-ai/models/${editingModel.model_id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(modelFormData)
      })

      const result = await response.json()
      if (!response.ok) {
        throw new Error(result.message || 'Erreur lors de la modification du modèle')
      }

      setSyncMessage(`Modèle "${modelFormData.model_name}" modifié avec succès`)
      setEditingModel(null)
      setShowModelForm(false)
      await fetchScores()
    } catch (error) {
      setSyncMessage('Erreur lors de la modification : ' + (error instanceof Error ? error.message : 'Erreur inconnue'))
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteModel = async (modelId: string, modelName: string) => {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer le modèle "${modelName}" et toutes ses évaluations ?`)) {
      return
    }

    setSaving(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        throw new Error('Session non trouvée. Veuillez vous reconnecter.')
      }

      const response = await fetch(`/api/admin/compl-ai/models/${modelId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        }
      })

      const result = await response.json()
      if (!response.ok) {
        throw new Error(result.message || 'Erreur lors de la suppression du modèle')
      }

      setSyncMessage(`Modèle "${modelName}" supprimé avec succès`)
      await fetchScores()
    } catch (error) {
      setSyncMessage('Erreur lors de la suppression : ' + (error instanceof Error ? error.message : 'Erreur inconnue'))
    } finally {
      setSaving(false)
    }
  }

  // Fonctions pour gérer les scores
  const handleEditScore = (modelId: string, benchmarkCode: string, currentScore: number, evaluationId?: string) => {
    setEditingScore({
      modelId,
      benchmarkCode,
      score: currentScore,
      evaluation_id: evaluationId
    })
  }

  const handleDeleteScore = (evaluationId: string, modelName: string, benchmarkCode: string) => {
    setDeletingScore({ evaluationId, modelName, benchmarkCode })
  }

  const confirmDeleteScore = async () => {
    if (!deletingScore) return

    setSaving(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        throw new Error('Session non trouvée. Veuillez vous reconnecter.')
      }

      const response = await fetch(`/api/admin/compl-ai/scores/${deletingScore.evaluationId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        }
      })

      const result = await response.json()
      if (!response.ok) {
        throw new Error(result.message || 'Erreur lors de la suppression du score')
      }

      setSyncMessage(`Score supprimé avec succès`)
      setDeletingScore(null)
      await fetchScores()
    } catch (error) {
      setSyncMessage('Erreur lors de la suppression : ' + (error instanceof Error ? error.message : 'Erreur inconnue'))
    } finally {
      setSaving(false)
    }
  }

  const handleSaveScore = async () => {
    if (!editingScore) return

    setSaving(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        throw new Error('Session non trouvée. Veuillez vous reconnecter.')
      }

      const response = await fetch('/api/admin/compl-ai/scores', {
        method: editingScore.evaluation_id ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(editingScore)
      })

      const result = await response.json()
      if (!response.ok) {
        throw new Error(result.message || 'Erreur lors de la sauvegarde du score')
      }

      setSyncMessage(`Score mis à jour avec succès`)
      setEditingScore(null)
      await fetchScores()
    } catch (error) {
      setSyncMessage('Erreur lors de la sauvegarde : ' + (error instanceof Error ? error.message : 'Erreur inconnue'))
    } finally {
      setSaving(false)
    }
  }

  const openModelForm = (model?: ModelPrincipleMatrix) => {
    if (model) {
      setEditingModel(model)
      setModelFormData({
        model_name: model.model_name,
        model_provider: model.model_provider,
        model_type: model.model_type,
        version: model.version
      })
    } else {
      setEditingModel(null)
      setModelFormData({ model_name: '', model_provider: '', model_type: 'large-language-model', version: '' })
    }
    setShowModelForm(true)
  }

  const getScoreColor = (score?: number, hasEvaluations = true) => {
    if (!score || !hasEvaluations) return 'bg-gray-100 text-gray-500'
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
              onClick={() => openModelForm()}
              disabled={syncing || clearing || saving}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              <Plus className="h-4 w-4 mr-2" />
              Ajouter un modèle
            </button>
            
            <button
              onClick={handleSyncData}
              disabled={syncing || clearing || saving}
              className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white ${
                syncing || clearing || saving
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
              <p className="text-2xl font-bold text-gray-900">{modelPrincipleMatrix.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <BarChart3 className="h-8 w-8 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Principes évalués</p>
              <p className="text-2xl font-bold text-gray-900">{principles.length}</p>
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
                {modelPrincipleMatrix.length > 0 
                  ? (modelPrincipleMatrix.reduce((sum, model) => sum + model.avg_score, 0) / modelPrincipleMatrix.length).toFixed(3)
                  : '0'
                }
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Matrice des scores par principe */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Matrice des Scores par Modèle et Principe</h2>
          <p className="text-sm text-gray-600 mt-1">
            Chaque ligne représente un modèle, chaque colonne un principe avec ses benchmarks
          </p>
        </div>
        <div className="overflow-x-auto max-h-screen">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50 sticky top-0 z-20">
              <tr>
                <th className="sticky left-0 px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50 z-30 border-r border-gray-200 min-w-[200px]">
                  Modèle
                </th>
                <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[100px]">
                  Score Moyen
                </th>
                {principles.map((principle) => (
                  <th key={principle.code} className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[220px] border-l border-gray-300">
                    <div className="space-y-1">
                      <div className="font-bold text-[12px] text-purple-600">
                        {principle.code}
                      </div>
                      <div className="text-[10px] text-gray-700 normal-case font-medium px-2">
                        {principle.name}
                      </div>
                      <div className="text-[9px] text-gray-500 normal-case italic">
                        {principle.category}
                      </div>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {modelPrincipleMatrix.map((model) => (
                <tr key={`${model.model_name}-${model.model_provider}-${model.version}`} className="hover:bg-gray-50">
                  <td className="sticky left-0 px-3 py-3 whitespace-nowrap bg-white z-10 border-r border-gray-200 min-w-[200px]">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900 truncate" title={model.model_name}>
                          {model.model_name}
                        </div>
                        <div className="text-xs text-gray-600" title={model.model_provider}>
                          {model.model_provider}
                        </div>
                      </div>
                      <div className="flex items-center space-x-1 ml-2">
                        <button
                          onClick={() => openModelForm(model)}
                          disabled={saving}
                          className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors disabled:opacity-50"
                          title="Modifier le modèle"
                        >
                          <Edit className="h-3 w-3" />
                        </button>
                        <button
                          onClick={() => model.model_id && handleDeleteModel(model.model_id, model.model_name)}
                          disabled={saving}
                          className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                          title="Supprimer le modèle"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap text-center">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getScoreColor(model.avg_score, model.evaluation_count > 0)}`}>
                      {model.evaluation_count > 0 ? model.avg_score.toFixed(3) : 'N/A'}
                    </span>
                  </td>
                  {principles.map((principle) => (
                    <td key={principle.code} className="px-3 py-3 text-center min-w-[220px] border-l border-gray-300">
                      <div className="space-y-2">
                        {/* Score moyen du principe */}
                        <div className="flex justify-center">
                          {model.principle_scores[principle.code] && model.principle_scores[principle.code].benchmark_count > 0 ? (
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${getScoreColor(model.principle_scores[principle.code].avg_score, true)}`}>
                              {model.principle_scores[principle.code].avg_score.toFixed(3)}
                            </span>
                          ) : (
                            <span className="text-gray-400 text-xs">N/A</span>
                          )}
                        </div>
                        
                        {/* Benchmarks du principe */}
                        <div className="space-y-0.5">
                          {principle.benchmarks.map((benchmark) => (
                            <div key={benchmark.code} className="border-t border-gray-100 pt-1">
                              {editingScore?.modelId === model.model_id && editingScore?.benchmarkCode === benchmark.code ? (
                                <div className="space-y-1">
                                  <div className="text-[8px] font-medium text-gray-600">{benchmark.name}</div>
                                  <input
                                    type="number"
                                    min="0"
                                    max="1"
                                    step="0.001"
                                    value={editingScore.score}
                                    onChange={(e) => setEditingScore({
                                      ...editingScore,
                                      score: parseFloat(e.target.value) || 0
                                    })}
                                    className="w-16 px-1 py-0.5 text-xs border rounded text-center"
                                    autoFocus
                                  />
                                  <div className="flex justify-center space-x-1">
                                    <button
                                      onClick={handleSaveScore}
                                      disabled={saving}
                                      className="p-0.5 text-green-600 hover:text-green-800"
                                      title="Sauvegarder"
                                    >
                                      <Save className="h-2 w-2" />
                                    </button>
                                    <button
                                      onClick={() => setEditingScore(null)}
                                      className="p-0.5 text-gray-600 hover:text-gray-800"
                                      title="Annuler"
                                    >
                                      <X className="h-2 w-2" />
                                    </button>
                                  </div>
                                </div>
                              ) : model.principle_scores[principle.code]?.benchmark_scores[benchmark.code] ? (
                                <div className="flex items-center gap-1">
                                  <div 
                                    className="cursor-pointer hover:bg-gray-50 rounded px-1 py-0.5 flex items-center gap-1 flex-1"
                                    onClick={() => model.model_id && handleEditScore(
                                      model.model_id, 
                                      benchmark.code, 
                                      model.principle_scores[principle.code].benchmark_scores[benchmark.code].score,
                                      model.principle_scores[principle.code].benchmark_scores[benchmark.code].evaluation_id
                                    )}
                                    title={`${benchmark.name} - Cliquer pour modifier`}
                                  >
                                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${getScoreColor(model.principle_scores[principle.code].benchmark_scores[benchmark.code].score)}`}>
                                      {model.principle_scores[principle.code].benchmark_scores[benchmark.code].score.toFixed(3)}
                                    </span>
                                    <div className="text-[9px] text-gray-600 truncate flex-1" title={benchmark.name}>
                                      {benchmark.name.length > 18 ? benchmark.name.substring(0, 18) + '...' : benchmark.name}
                                    </div>
                                  </div>
                                  {model.principle_scores[principle.code].benchmark_scores[benchmark.code].evaluation_id && (
                                    deletingScore?.evaluationId === model.principle_scores[principle.code].benchmark_scores[benchmark.code].evaluation_id ? (
                                      <div className="flex items-center space-x-1">
                                        <button
                                          onClick={confirmDeleteScore}
                                          disabled={saving}
                                          className="p-0.5 text-green-600 hover:text-green-800 hover:bg-green-50 rounded"
                                          title="Confirmer la suppression"
                                        >
                                          <Check className="h-2.5 w-2.5" />
                                        </button>
                                        <button
                                          onClick={() => setDeletingScore(null)}
                                          disabled={saving}
                                          className="p-0.5 text-gray-600 hover:text-gray-800 hover:bg-gray-50 rounded"
                                          title="Annuler"
                                        >
                                          <X className="h-2.5 w-2.5" />
                                        </button>
                                      </div>
                                    ) : (
                                      <button
                                        onClick={() => handleDeleteScore(
                                          model.principle_scores[principle.code].benchmark_scores[benchmark.code].evaluation_id!,
                                          model.model_name,
                                          benchmark.code
                                        )}
                                        className="p-0.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded"
                                        title="Supprimer ce score"
                                      >
                                        <Trash2 className="h-2.5 w-2.5" />
                                      </button>
                                    )
                                  )}
                                </div>
                              ) : (
                                <div 
                                  className="cursor-pointer hover:bg-gray-50 rounded px-1 py-0.5 flex items-center gap-1"
                                  onClick={() => model.model_id && handleEditScore(model.model_id, benchmark.code, 0.5)}
                                  title={`${benchmark.name} - Cliquer pour ajouter un score`}
                                >
                                  <span className="text-gray-400 text-[9px]">+ Score</span>
                                  <span className="text-[9px] text-gray-500">{benchmark.name.length > 15 ? benchmark.name.substring(0, 15) + '...' : benchmark.name}</span>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {modelPrincipleMatrix.length === 0 && (
          <div className="px-6 py-12 text-center">
            <p className="text-gray-500">Aucune donnée disponible</p>
          </div>
        )}
      </div>

      {/* Modal de création/édition de modèle */}
      {showModelForm && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 backdrop-blur-sm z-[100] transition-all"
            onClick={() => setShowModelForm(false)}
          />
          
          {/* Modal */}
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 pointer-events-none">
            <div 
              className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] transform transition-all pointer-events-auto relative"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Plus className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">
                      {editingModel ? 'Modifier le modèle' : 'Créer un nouveau modèle'}
                    </h2>
                    <p className="text-sm text-gray-600">
                      {editingModel ? 'Modifiez les informations du modèle' : 'Ajoutez un nouveau modèle à la base de données'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowModelForm(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 transition-colors rounded-lg hover:bg-gray-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Content */}
              <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
                <div className="space-y-4">
                  <div>
                    <label htmlFor="model_name" className="block text-sm font-medium text-gray-700 mb-2">
                      Nom du modèle *
                    </label>
                    <input
                      type="text"
                      id="model_name"
                      value={modelFormData.model_name}
                      onChange={(e) => setModelFormData({...modelFormData, model_name: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition-colors"
                      placeholder="Ex: GPT-4, Claude-3-Opus"
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="model_provider" className="block text-sm font-medium text-gray-700 mb-2">
                      Fournisseur *
                    </label>
                    <input
                      type="text"
                      id="model_provider"
                      value={modelFormData.model_provider}
                      onChange={(e) => setModelFormData({...modelFormData, model_provider: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition-colors"
                      placeholder="Ex: OpenAI, Anthropic, Google"
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="model_type" className="block text-sm font-medium text-gray-700 mb-2">
                      Type de modèle
                    </label>
                    <select
                      id="model_type"
                      value={modelFormData.model_type}
                      onChange={(e) => setModelFormData({...modelFormData, model_type: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition-colors"
                    >
                      <option value="large-language-model">Large Language Model</option>
                      <option value="multimodal-model">Modèle Multimodal</option>
                      <option value="vision-model">Modèle de Vision</option>
                      <option value="embedding-model">Modèle d'Embedding</option>
                      <option value="other">Autre</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="version" className="block text-sm font-medium text-gray-700 mb-2">
                      Version
                    </label>
                    <input
                      type="text"
                      id="version"
                      value={modelFormData.version}
                      onChange={(e) => setModelFormData({...modelFormData, version: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition-colors"
                      placeholder="Ex: 1.0, 1106-preview, 3.0"
                    />
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
                <button
                  onClick={() => setShowModelForm(false)}
                  disabled={saving}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  Annuler
                </button>
                <button
                  onClick={editingModel ? handleUpdateModel : handleCreateModel}
                  disabled={saving || !modelFormData.model_name || !modelFormData.model_provider}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {saving ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      {editingModel ? 'Modification...' : 'Création...'}
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      {editingModel ? 'Modifier' : 'Créer'}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

    </div>
  )
}