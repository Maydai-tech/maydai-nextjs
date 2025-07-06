'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { BarChart3, TrendingUp, Database, RefreshCw, Trash2 } from 'lucide-react'

interface ModelScore {
  id: string
  model_name: string
  model_provider: string
  model_type: string
  version: string
  principle_name: string
  principle_code: string
  principle_category: string
  score: number
  score_text: string
  evaluation_date: string
}

interface ModelMatrix {
  model_name: string
  model_provider: string
  model_type: string
  version: string
  principle_scores: Record<string, number>
  avg_score: number
  evaluation_count: number
  latest_date: number
}

interface Principle {
  code: string
  name: string
  category: string
}

export default function ComplAIScoresPage() {
  const [scores, setScores] = useState<ModelScore[]>([])
  const [modelMatrix, setModelMatrix] = useState<ModelMatrix[]>([])
  const [principles, setPrinciples] = useState<Principle[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [syncMessage, setSyncMessage] = useState<string>('')
  const [cleaning, setCleaning] = useState(false)
  const [cleanMessage, setCleanMessage] = useState<string>('')

  useEffect(() => {
    fetchScores()
  }, [])

  const handleSyncData = async () => {
    setSyncing(true)
    setSyncMessage('')
    
    try {
      // Appeler l'edge function COMPL-AI sync
      const { data, error } = await supabase.functions.invoke('compl-ai-sync', {
        method: 'POST'
      })

      if (error) {
        throw error
      }

      if (data?.success) {
        setSyncMessage(`Synchronisation réussie ! ${data.models_synced} modèles, ${data.evaluations_created} évaluations créées.`)
        
        // Recharger les données après la synchronisation
        setLoading(true)
        await new Promise(resolve => setTimeout(resolve, 1000)) // Attendre 1 seconde
        
        // Refetch data
        await fetchScores()
      } else {
        setSyncMessage('Synchronisation échouée : ' + (data?.error || 'Erreur inconnue'))
      }
    } catch (error) {
      console.error('Erreur lors de la synchronisation:', error)
      setSyncMessage('Erreur lors de la synchronisation : ' + (error instanceof Error ? error.message : 'Erreur inconnue'))
    } finally {
      setSyncing(false)
    }
  }

  const handleCleanData = async () => {
    setCleaning(true)
    setCleanMessage('')
    
    try {
      // Appeler l'edge function de nettoyage
      const { data, error } = await supabase.functions.invoke('clean-html-models', {
        method: 'POST'
      })

      if (error) {
        throw error
      }

      if (data?.success) {
        setCleanMessage(`Nettoyage réussi ! ${data.deleted_models} modèles et ${data.deleted_evaluations} évaluations supprimés.`)
        
        // Recharger les données après le nettoyage
        setLoading(true)
        await new Promise(resolve => setTimeout(resolve, 1000)) // Attendre 1 seconde
        
        // Refetch data
        await fetchScores()
      } else {
        setCleanMessage('Nettoyage échoué : ' + (data?.error || 'Erreur inconnue'))
      }
    } catch (error) {
      console.error('Erreur lors du nettoyage:', error)
      setCleanMessage('Erreur lors du nettoyage : ' + (error instanceof Error ? error.message : 'Erreur inconnue'))
    } finally {
      setCleaning(false)
    }
  }

  const fetchScores = async () => {
    try {
      // Récupérer toutes les évaluations avec les détails des modèles et principes
      const { data: evaluations, error } = await supabase
        .from('compl_ai_evaluations')
        .select(`
          id,
          score,
          score_text,
          evaluation_date,
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
          )
        `)
        .order('evaluation_date', { ascending: false })

      if (error) throw error

      // Transformer les données pour l'affichage
      const transformedScores: ModelScore[] = evaluations?.map((evaluation: unknown) => {
        const evalData = evaluation as {
          id: string
          score: number
          score_text: string
          evaluation_date: string
          compl_ai_models: {
            model_name: string
            model_provider: string
            model_type: string
            version: string
          }
          compl_ai_principles: {
            name: string
            code: string
            category: string
          }
        }
        return {
          id: evalData.id,
          model_name: evalData.compl_ai_models.model_name,
          model_provider: evalData.compl_ai_models.model_provider,
          model_type: evalData.compl_ai_models.model_type,
          version: evalData.compl_ai_models.version,
          principle_name: evalData.compl_ai_principles.name,
          principle_code: evalData.compl_ai_principles.code,
          principle_category: evalData.compl_ai_principles.category,
          score: evalData.score,
          score_text: evalData.score_text,
          evaluation_date: evalData.evaluation_date
        }
      }) || []

      setScores(transformedScores)

      // Extraire tous les principes uniques
      const uniquePrinciples = transformedScores.reduce((acc: Record<string, Principle>, score) => {
        if (!acc[score.principle_code]) {
          acc[score.principle_code] = {
            code: score.principle_code,
            name: score.principle_name,
            category: score.principle_category
          }
        }
        return acc
      }, {})

      const principlesList = Object.values(uniquePrinciples).sort((a, b) => a.code.localeCompare(b.code))
      setPrinciples(principlesList)

      // Créer la matrice modèle x principe
      const modelGroups = transformedScores.reduce((acc: Record<string, {
        model_name: string
        model_provider: string
        model_type: string
        version: string
        principle_scores: Record<string, number>
        scores: number[]
        dates: string[]
      }>, score) => {
        const key = `${score.model_name}-${score.model_provider}-${score.version}`
        if (!acc[key]) {
          acc[key] = {
            model_name: score.model_name,
            model_provider: score.model_provider,
            model_type: score.model_type,
            version: score.version,
            principle_scores: {},
            scores: [],
            dates: []
          }
        }
        acc[key].principle_scores[score.principle_code] = score.score
        acc[key].scores.push(score.score)
        acc[key].dates.push(score.evaluation_date)
        return acc
      }, {})

      const matrix = Object.values(modelGroups).map(group => ({
        model_name: group.model_name,
        model_provider: group.model_provider,
        model_type: group.model_type,
        version: group.version,
        principle_scores: group.principle_scores,
        avg_score: group.scores.reduce((sum, score) => sum + score, 0) / group.scores.length,
        evaluation_count: group.scores.length,
        latest_date: Math.max(...group.dates.map(d => new Date(d).getTime()))
      }))

      setModelMatrix(matrix.sort((a, b) => b.avg_score - a.avg_score))

    } catch (error) {
      console.error('Erreur lors du chargement des scores COMPL-AI:', error)
    } finally {
      setLoading(false)
    }
  }

  const getScoreColor = (score?: number) => {
    if (!score) return 'bg-gray-100 text-gray-500'
    if (score >= 80) return 'bg-green-100 text-green-800'
    if (score >= 60) return 'bg-yellow-100 text-yellow-800'
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
              onClick={handleCleanData}
              disabled={cleaning || syncing}
              className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white ${
                cleaning || syncing
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-red-600 hover:bg-red-700'
              } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500`}
            >
              <Trash2 className={`h-4 w-4 mr-2 ${cleaning ? 'animate-pulse' : ''}`} />
              {cleaning ? 'Nettoyage...' : 'Nettoyer HTML'}
            </button>
            <button
              onClick={handleSyncData}
              disabled={syncing || cleaning}
              className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white ${
                syncing || cleaning
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-blue-600 hover:bg-blue-700'
              } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500`}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Synchronisation...' : 'Mettre à jour les données'}
            </button>
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
        
        {cleanMessage && (
          <div className={`mt-4 p-4 rounded-md ${
            cleanMessage.includes('réussi') 
              ? 'bg-green-50 border-green-200 text-green-800' 
              : 'bg-red-50 border-red-200 text-red-800'
          } border`}>
            {cleanMessage}
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
              <p className="text-2xl font-bold text-gray-900">{modelMatrix.length}</p>
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
                {modelMatrix.length > 0 
                  ? (modelMatrix.reduce((sum, model) => sum + model.avg_score, 0) / modelMatrix.length).toFixed(1)
                  : '0'
                }
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Matrice des scores */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Matrice des Scores par Modèle et Principe</h2>
          <p className="text-sm text-gray-600 mt-1">
            Chaque ligne représente un modèle, chaque colonne un principe de conformité
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="sticky left-0 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50 z-10 border-r border-gray-200">
                  Modèle
                </th>
                <th className="sticky left-20 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50 z-10 border-r border-gray-200">
                  Fournisseur
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Score Moyen
                </th>
                {principles.map((principle) => (
                  <th key={principle.code} className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[100px]">
                    <div className="space-y-1">
                      <div className="font-semibold">{principle.code}</div>
                      <div className="text-[10px] text-gray-400 normal-case leading-tight">
                        {principle.name}
                      </div>
                      <div className="text-[10px] text-gray-400 normal-case">
                        {principle.category}
                      </div>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {modelMatrix.map((model) => (
                <tr key={`${model.model_name}-${model.model_provider}-${model.version}`} className="hover:bg-gray-50">
                  <td className="sticky left-0 px-4 py-4 whitespace-nowrap bg-white z-10 border-r border-gray-200">
                    <div className="text-sm font-medium text-gray-900">{model.model_name}</div>
                    <div className="text-xs text-gray-500">{model.version}</div>
                  </td>
                  <td className="sticky left-20 px-4 py-4 whitespace-nowrap bg-white z-10 border-r border-gray-200">
                    <div className="text-sm text-gray-700">{model.model_provider}</div>
                    <div className="text-xs text-gray-500">{model.model_type}</div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-center">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getScoreColor(model.avg_score)}`}>
                      {model.avg_score.toFixed(1)}
                    </span>
                  </td>
                  {principles.map((principle) => {
                    const score = model.principle_scores[principle.code]
                    return (
                      <td key={principle.code} className="px-3 py-4 whitespace-nowrap text-center">
                        {score ? (
                          <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${getScoreColor(score)}`}>
                            {score}
                          </span>
                        ) : (
                          <span className="text-gray-400 text-xs">N/A</span>
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {modelMatrix.length === 0 && (
          <div className="px-6 py-12 text-center">
            <p className="text-gray-500">Aucune donnée disponible</p>
          </div>
        )}
      </div>
    </div>
  )
}