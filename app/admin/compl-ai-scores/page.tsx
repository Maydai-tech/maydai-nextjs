'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { BarChart3, TrendingUp, Database, RefreshCw, Trash2, Plus, Save, X, Check, Edit, Calculator, Download, Upload, FileText } from 'lucide-react'
import ModelTooltip from '@/components/ModelTooltip'


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

interface MaydaiScoreInfo {
  model_name: string
  model_provider: string
  principle_code: string
  average_maydai_score: number
}

interface BenchmarkScore {
  score: number
  score_text: string
  evaluation_date: string
  evaluation_id?: string
  maydai_score?: number
  rang_compar_ia?: number
}

interface ModelPrincipleMatrix {
  model_id?: string
  model_name: string
  model_provider: string
  model_type: string
  version: string
  short_name?: string
  long_name?: string
  launch_date?: string
  notes_short?: string
  notes_long?: string
  variants?: string[]
  principle_scores: Record<string, {
    principle_name: string
    principle_category: string
    benchmark_scores: Record<string, BenchmarkScore>
    avg_score: number
    benchmark_count: number
    avg_maydai_score?: number
    avg_rang_compar_ia?: number
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
  short_name?: string
  long_name?: string
  launch_date?: string
  model_provider_id?: number
  notes_short?: string
  notes_long?: string
  variants?: string
}

interface ScoreEditData {
  modelId: string
  benchmarkCode: string
  score: number
  evaluation_id?: string
}

interface RangComparIaEditData {
  evaluationId: string
  modelId: string
  principleCode: string
  score: number | null
}

interface ScoreDeleteData {
  evaluationId: string
  modelName: string
  benchmarkCode: string
}


export default function ComplAIScoresPage() {
  const [modelPrincipleMatrix, setModelPrincipleMatrix] = useState<ModelPrincipleMatrix[]>([])
  const [principles, setPrinciples] = useState<PrincipleInfo[]>([])
  const [maydaiScores, setMaydaiScores] = useState<MaydaiScoreInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [clearing, setClearing] = useState(false)
  const [calculatingMaydai, setCalculatingMaydai] = useState(false)
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
  const [editingRangComparIa, setEditingRangComparIa] = useState<RangComparIaEditData | null>(null)
  const [saving, setSaving] = useState(false)
  
  // États pour l'import/export CSV
  const [showImportModal, setShowImportModal] = useState(false)
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importMode, setImportMode] = useState<'create' | 'update'>('create')
  const [importing, setImporting] = useState(false)
  const [importResults, setImportResults] = useState<any>(null)
  const [importValidationErrors, setImportValidationErrors] = useState<string[]>([])
  const [csvPreview, setCsvPreview] = useState<{ headers: string[], rowCount: number } | null>(null)

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

  const handleCalculateMaydaiScores = async () => {
    setCalculatingMaydai(true)
    setSyncMessage('')
    
    try {
      // Récupérer le token de session pour l'authentification
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        throw new Error('Session non trouvée. Veuillez vous reconnecter.')
      }

      // Appeler notre endpoint pour recalculer les scores MaydAI
      const response = await fetch('/api/admin/compl-ai/recalculate-maydai-scores', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
      })

      const data = await response.json()

      if (!response.ok) {
        console.error('API Error Response:', {
          status: response.status,
          statusText: response.statusText,
          data
        })
        throw new Error(data.message || data.error || 'Erreur lors du calcul des scores MaydAI')
      }

      if (data.success) {
        setSyncMessage(
          `Calcul des scores MaydAI réussi ! ${data.total_models || 0} modèles traités, ${data.total_evaluations_updated || 0} évaluations mises à jour en ${data.execution_time_ms}ms.`
        )
        
        // Recharger les données après le calcul
        setLoading(true)
        await new Promise(resolve => setTimeout(resolve, 1000)) // Attendre 1 seconde
        
        // Refetch data
        await fetchScores()
      } else {
        setSyncMessage(`Calcul des scores MaydAI échoué : ${data.message}`)
      }
    } catch (error) {
      console.error('Erreur lors du calcul des scores MaydAI:', error)
      setSyncMessage('Erreur lors du calcul des scores MaydAI : ' + (error instanceof Error ? error.message : 'Erreur inconnue'))
    } finally {
      setCalculatingMaydai(false)
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

  // Fonction pour parser le CSV
  const parseCSV = (csvText: string): any[] => {
    const rows: any[] = []
    const headers: string[] = []
    let currentField = ''
    let currentRow: string[] = []
    let insideQuotes = false

    const pushField = () => {
      currentRow.push(currentField.trim())
      currentField = ''
    }

    const pushRow = () => {
      if (currentRow.length > 0 && currentRow.some(field => field !== '')) {
        rows.push(currentRow)
      }
      currentRow = []
    }

    for (let i = 0; i < csvText.length; i++) {
      const char = csvText[i]
      const nextChar = csvText[i + 1]

      if (char === '"' && nextChar === '"') {
        currentField += '"'
        i++
      } else if (char === '"') {
        insideQuotes = !insideQuotes
      } else if (char === ',' && !insideQuotes) {
        pushField()
      } else if ((char === '\n' || char === '\r') && !insideQuotes) {
        if (char === '\r' && nextChar === '\n') {
          i++
        }
        pushField()
        pushRow()
      } else {
        currentField += char
      }
    }

    if (currentField !== '' || insideQuotes) {
      pushField()
    }
    if (currentRow.length > 0) {
      pushRow()
    }

    if (rows.length === 0) {
      return []
    }

    rows[0].forEach((header: string) => headers.push(header.replace(/^"|"$/g, '').trim()))

    return rows.slice(1).map(row => {
      const entry: Record<string, string | null> = {}
      headers.forEach((header, index) => {
        const rawValue = row[index] ?? ''
        const cleanedValue = rawValue.replace(/^"|"$/g, '')
        entry[header] = cleanedValue === '' ? null : cleanedValue
      })
      return entry
    })
  }

  // Fonction pour l'export CSV
  const handleExportCSV = async () => {
    try {
      // Récupérer le token de session pour l'authentification
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        setSyncMessage('Erreur: Session non trouvée')
        return
      }

      // Appeler l'API d'export
      const response = await fetch('/api/admin/compl-ai/export-csv', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        let errorMessage = 'Erreur lors de l\'export'
        try {
          const errorData = await response.json()
          errorMessage = errorData?.error || errorMessage
        } catch (jsonError) {
          // Si on ne peut pas parser le JSON, utiliser le message d'erreur par défaut
          errorMessage = `Erreur ${response.status}: ${response.statusText}`
        }
        throw new Error(errorMessage)
      }

      // Créer un blob et télécharger le fichier
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `compl-ai-scores-export-${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)

      setSyncMessage('Export CSV réussi !')
      setTimeout(() => setSyncMessage(''), 3000)

    } catch (error) {
      console.error('Erreur export CSV:', error)
      setSyncMessage(`Erreur export: ${error instanceof Error ? error.message : 'Erreur inconnue'}`)
      setTimeout(() => setSyncMessage(''), 5000)
    }
  }

  // Fonction pour télécharger le template CSV
  const handleDownloadTemplate = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        setSyncMessage('Erreur: Session non trouvée')
        return
      }

      const response = await fetch('/api/admin/compl-ai/import-csv', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erreur lors du téléchargement')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = 'compl-ai-import-template.csv'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)

    } catch (error) {
      console.error('Erreur téléchargement template:', error)
      setSyncMessage(`Erreur template: ${error instanceof Error ? error.message : 'Erreur inconnue'}`)
    }
  }

  // Fonction pour normaliser les clés d'en-têtes (insensible à la casse, sans accents)
  const normalizeHeaderKey = (key: string): string => {
    return key
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Supprimer les accents
      .trim()
  }

  // Fonction pour mapper les en-têtes CSV vers les noms de champs normalisés
  const getHeaderMapping = (): Record<string, string> => {
    // Mapping flexible supportant plusieurs formats
    const mapping: Record<string, string> = {}
    
    // Formats français (avec et sans accents, majuscules/minuscules)
    const frenchMappings = [
      { from: ['modèle id', 'modele id', 'model id'], to: 'model_id' },
      { from: ['nom du modèle', 'nom du modele', 'model name', 'nom modele'], to: 'model_name' },
      { from: ['fournisseur', 'provider', 'model provider'], to: 'model_provider' },
      { from: ['type', 'model type'], to: 'model_type' },
      { from: ['version'], to: 'version' },
      { from: ['principe code', 'principle code'], to: 'principle_code' },
      { from: ['principe nom', 'principe name', 'principle name'], to: 'principle_name' },
      { from: ['catégorie principe', 'categorie principe', 'principle category'], to: 'principle_category' },
      { from: ['benchmark code'], to: 'benchmark_code' },
      { from: ['benchmark nom', 'benchmark name'], to: 'benchmark_name' },
      { from: ['score original', 'score', 'original score'], to: 'score' },
      { from: ['score text'], to: 'score_text' },
      { from: ["date d'évaluation", "date d'evaluation", "evaluation date", 'date evaluation'], to: 'evaluation_date' },
      { from: ['statut', 'status'], to: 'status' }
    ]

    frenchMappings.forEach(({ from, to }) => {
      from.forEach(key => {
        mapping[key] = to
      })
    })

    return mapping
  }

  // Fonction pour gérer l'import CSV
  const handleImportCSV = async () => {
    if (!importFile) {
      setSyncMessage('Erreur: Aucun fichier sélectionné')
      return
    }

    setImporting(true)
    setImportResults(null)
    setSyncMessage('')

    try {
      console.log('📄 Début import CSV:', { fileName: importFile.name, fileSize: importFile.size })
      
      const csvText = await importFile.text()
      console.log('📝 CSV texte lu:', { length: csvText.length, preview: csvText.substring(0, 200) })
      
      const csvData = parseCSV(csvText)
      console.log('✅ CSV parsé:', { rowCount: csvData.length, firstRow: csvData[0] })

      // Validation : vérifier que le CSV n'est pas vide
      if (!csvData || csvData.length === 0) {
        throw new Error('Le fichier CSV est vide ou ne contient aucune donnée. Vérifiez que le fichier contient au moins une ligne de données après l\'en-tête.')
      }

      // Récupérer les en-têtes du CSV
      const csvHeaders = Object.keys(csvData[0] || {})
      console.log('📋 En-têtes détectés:', csvHeaders)

      if (csvHeaders.length === 0) {
        throw new Error('Aucun en-tête détecté dans le fichier CSV. Vérifiez le format du fichier.')
      }

      // En-têtes requis pour l'import
      const requiredHeaders = ['model_name', 'principle_code', 'benchmark_code']
      const headerMapping = getHeaderMapping()
      const normalizedHeaders = new Set<string>()

      // Normaliser et mapper les en-têtes
      csvHeaders.forEach(header => {
        const normalizedKey = normalizeHeaderKey(header)
        const mappedKey = headerMapping[normalizedKey] || normalizedKey
        normalizedHeaders.add(mappedKey)
      })

      console.log('🔀 En-têtes normalisés:', Array.from(normalizedHeaders))

      // Vérifier que les en-têtes requis sont présents
      const missingHeaders = requiredHeaders.filter(req => !normalizedHeaders.has(req))
      if (missingHeaders.length > 0) {
        throw new Error(
          `En-têtes requis manquants: ${missingHeaders.join(', ')}. ` +
          `En-têtes détectés: ${csvHeaders.join(', ')}. ` +
          `Vérifiez que votre CSV contient les colonnes nécessaires.`
        )
      }

      // Normaliser les données CSV
      const normalizedCsvData = csvData.map((row, index) => {
        const normalizedRow: Record<string, any> = {}

        Object.entries(row).forEach(([key, value]) => {
          const normalizedKey = normalizeHeaderKey(key)
          const mappedKey = headerMapping[normalizedKey] || normalizedKey
          normalizedRow[mappedKey] = value
        })

        // Validation des champs obligatoires pour chaque ligne
        if (!normalizedRow.model_name || !normalizedRow.principle_code || !normalizedRow.benchmark_code) {
          console.warn(`⚠️ Ligne ${index + 2}: Champs obligatoires manquants`, normalizedRow)
        }

        return normalizedRow
      })

      console.log('✅ Données normalisées:', { 
        count: normalizedCsvData.length, 
        sample: normalizedCsvData[0],
        requiredFields: normalizedCsvData.every(row => row.model_name && row.principle_code && row.benchmark_code)
      })

      // Récupérer le token de session
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        throw new Error('Session non trouvée. Veuillez vous reconnecter.')
      }

      console.log('🚀 Envoi des données à l\'API...', { 
        rowCount: normalizedCsvData.length, 
        updateMode: importMode 
      })

      // Appeler l'API d'import
      const response = await fetch('/api/admin/compl-ai/import-csv', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          csvData: normalizedCsvData,
          updateMode: importMode
        })
      })

      const result = await response.json()
      console.log('📥 Réponse API:', { ok: response.ok, result })

      if (!response.ok) {
        throw new Error(result.error || `Erreur lors de l'import (${response.status})`)
      }

      setImportResults(result.stats)
      
      // Message de succès détaillé
      const successMessage = `Import terminé avec succès ! ` +
        `${result.stats.modelsCreated} modèle(s) créé(s), ` +
        `${result.stats.modelsUpdated} modèle(s) mis à jour, ` +
        `${result.stats.evaluationsCreated} évaluation(s) créée(s), ` +
        `${result.stats.evaluationsUpdated} évaluation(s) mise(s) à jour. ` +
        (result.stats.errors.length > 0 ? `${result.stats.errors.length} erreur(s) détectée(s).` : '') +
        (result.stats.warnings.length > 0 ? `${result.stats.warnings.length} avertissement(s).` : '')
      
      setSyncMessage(successMessage)
      
      // Recharger les données
      await fetchScores()

    } catch (error) {
      console.error('❌ Erreur import CSV:', error)
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Erreur inconnue lors de l\'import CSV'
      setSyncMessage(`Erreur import: ${errorMessage}`)
      setImportResults(null)
    } finally {
      setImporting(false)
    }
  }

  const fetchScores = async () => {
    try {
      // Récupérer tous les modèles
      const { data: allModels, error: modelsError} = await supabase
        .from('compl_ai_models')
        .select('id, model_name, model_provider, model_type, version, short_name, long_name, launch_date, notes_short, notes_long, variants')
        .order('model_name')

      if (modelsError) throw modelsError

      console.log('Debug: Modèles récupérés:', {
        count: allModels?.length || 0,
        sampleModels: allModels?.slice(0, 3)?.map(m => ({
          name: m.model_name,
          provider: m.model_provider,
          version: m.version
        }))
      })

      // Récupérer les scores moyens MaydAI par principe depuis la vue compl_ai_maydai_scores
      console.log('Debug: Récupération des scores moyens MaydAI depuis la vue...')

      // Récupérer toutes les évaluations avec benchmarks et principes
      const { data: evaluations, error } = await supabase
        .from('compl_ai_evaluations')
        .select(`
          id,
          score,
          score_text,
          evaluation_date,
          raw_data,
          maydai_score,
          rang_compar_ia,
          compl_ai_models!inner (
            id,
            model_name,
            model_provider,
            model_type,
            version,
            short_name,
            long_name,
            launch_date
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

      // Debug: Vérifier les scores MaydAI
      console.log('Debug evaluations - premier échantillon:', evaluations?.slice(0, 3)?.map(e => ({
        id: e.id,
        score: e.score,
        maydai_score: e.maydai_score,
        model_name: e.compl_ai_models?.[0]?.model_name || 'N/A',
        benchmark_code: e.compl_ai_benchmarks?.[0]?.code || e.raw_data?.benchmark_code || 'N/A'
      })))

      // Si aucun modèle n'existe, retourner un état vide
      if (!allModels || allModels.length === 0) {
        setModelPrincipleMatrix([])
        setPrinciples([])
        return
      }

      // TOUJOURS récupérer tous les principes et benchmarks depuis la base de données
      // Cela garantit que tous les benchmarks sont affichés, même sans évaluations
      const principleMap = new Map<string, PrincipleInfo>()
      const benchmarkMap = new Map<string, BenchmarkInfo>()
      
      // D'abord, récupérer TOUS les principes et benchmarks depuis la base
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
          const benchmarks = (principle.compl_ai_benchmarks || []).map((benchmark: any) => {
            const benchmarkInfo: BenchmarkInfo = {
              code: benchmark.code,
              name: benchmark.name,
              principle_code: principle.code,
              principle_name: principle.name,
              principle_category: principle.category
            }
            benchmarkMap.set(benchmark.code, benchmarkInfo)
            return benchmarkInfo
          })
          
          principleMap.set(principle.code, {
            code: principle.code,
            name: principle.name,
            category: principle.category,
            benchmarks: benchmarks
          })
        })
      }
      
      // Ensuite, si nous avons des évaluations, mettre à jour avec les données manquantes
      // (au cas où des benchmarks seraient créés dynamiquement via les évaluations)
      if (evaluations && evaluations.length > 0) {
        evaluations.forEach((evaluation: any) => {
          const principleCode = evaluation.compl_ai_principles.code
          const benchmarkCode = evaluation.compl_ai_benchmarks?.code || evaluation.raw_data?.benchmark_code
          const benchmarkName = evaluation.compl_ai_benchmarks?.name || evaluation.raw_data?.benchmark_name || benchmarkCode
          
          // Si le principe n'existe pas encore (ne devrait pas arriver), l'ajouter
          if (!principleMap.has(principleCode)) {
            principleMap.set(principleCode, {
              code: principleCode,
              name: evaluation.compl_ai_principles.name,
              category: evaluation.compl_ai_principles.category,
              benchmarks: []
            })
          }

          // Si le benchmark n'existe pas encore (peut arriver pour des benchmarks créés dynamiquement)
          if (benchmarkCode && !benchmarkMap.has(benchmarkCode)) {
            const benchmarkInfo: BenchmarkInfo = {
              code: benchmarkCode,
              name: benchmarkName,
              principle_code: principleCode,
              principle_name: evaluation.compl_ai_principles.name,
              principle_category: evaluation.compl_ai_principles.category
            }
            benchmarkMap.set(benchmarkCode, benchmarkInfo)
            // Ajouter ce benchmark au principe correspondant
            const principle = principleMap.get(principleCode)
            if (principle && !principle.benchmarks.some(b => b.code === benchmarkCode)) {
              principle.benchmarks.push(benchmarkInfo)
            }
          }
        })
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
        short_name?: string
        long_name?: string
        launch_date?: string
        notes_short?: string
        notes_long?: string
        variants?: string[]
        principle_scores: Record<string, {
          principle_name: string
          principle_category: string
          benchmark_scores: Record<string, BenchmarkScore>
          avg_score: number
          benchmark_count: number
          avg_maydai_score?: number
          avg_rang_compar_ia?: number
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
          short_name: model.short_name,
          long_name: model.long_name,
          launch_date: model.launch_date,
          notes_short: model.notes_short,
          notes_long: model.notes_long,
          variants: model.variants,
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
              benchmark_count: 0,
              avg_maydai_score: undefined
            }
          }

          const principleData = modelData.principle_scores[principleCode]
          
          // Debug: Vérifier les données MaydAI lors du traitement
          if (evaluation.maydai_score !== null && evaluation.maydai_score !== undefined) {
            console.log('MaydAI score trouvé:', {
              model: evaluation.compl_ai_models.model_name,
              benchmark: benchmarkCode,
              original_score: evaluation.score,
              maydai_score: evaluation.maydai_score
            })
          }
          
          principleData.benchmark_scores[benchmarkCode] = {
            score: evaluation.score,
            score_text: evaluation.score_text || `${Math.round(evaluation.score * 100)}%`,
            evaluation_date: evaluation.evaluation_date,
            evaluation_id: evaluation.id,
            maydai_score: evaluation.maydai_score,
            rang_compar_ia: evaluation.rang_compar_ia
          }

          modelData.all_scores.push(evaluation.score)
          modelData.all_dates.push(evaluation.evaluation_date)
        })
      }

      // Récupérer les scores moyens MaydAI par principe depuis la vue
      const { data: maydaiScoresData, error: maydaiError } = await supabase
        .from('compl_ai_maydai_scores')
        .select(`
          model_name,
          model_provider,
          principle_code,
          average_maydai_score
        `)
        .order('model_name')

      if (maydaiError) {
        console.error('Erreur lors de la récupération des scores MaydAI:', maydaiError)
        setMaydaiScores([])
      } else {
        console.log('Debug: Scores MaydAI récupérés depuis la vue:', {
          totalScores: maydaiScoresData?.length || 0,
          sampleData: maydaiScoresData?.slice(0, 3)
        })
        setMaydaiScores(maydaiScoresData || [])
      }

      // Debug: Comparer les données avant la construction de la matrice
      console.log('Debug: Comparaison des données avant construction matrice:', {
        totalModelsInGroups: Array.from(modelGroups.keys()).length,
        sampleModelKeys: Array.from(modelGroups.keys()).slice(0, 3),
        maydaiScoresAvailable: maydaiScoresData?.length || 0,
        sampleMaydaiData: maydaiScoresData?.slice(0, 3)
      })

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

          // Ajouter le score moyen MaydAI pour ce principe si disponible
          const maydaiScoreMatch = (maydaiScoresData || []).find((maydai: MaydaiScoreInfo) => 
            maydai.model_name === group.model_name &&
            maydai.model_provider === group.model_provider &&
            maydai.principle_code === principleCode
          )
          
          console.log('Debug MaydAI matching:', {
            model: group.model_name,
            provider: group.model_provider,
            version: group.version,
            principle: principleCode,
            maydaiScoreMatch,
            availableScores: (maydaiScoresData || []).length
          })
          
          if (maydaiScoreMatch) {
            principleData.avg_maydai_score = maydaiScoreMatch.average_maydai_score
            console.log('MaydAI score trouvé:', {
              model: group.model_name,
              principle: principleCode,
              score: maydaiScoreMatch.average_maydai_score
            })
          }
          
          // Calculer le score moyen Rang Compar:IA pour ce principe
          const rangComparIaScores = Object.values(principleData.benchmark_scores)
            .map(b => b.rang_compar_ia)
            .filter((score): score is number => score !== null && score !== undefined)
          
          if (rangComparIaScores.length > 0) {
            principleData.avg_rang_compar_ia = rangComparIaScores.reduce((sum, score) => sum + score, 0) / rangComparIaScores.length
          }
        })

        return {
          model_id: group.model_id,
          model_name: group.model_name,
          model_provider: group.model_provider,
          model_type: group.model_type,
          version: group.version,
          short_name: group.short_name,
          long_name: group.long_name,
          launch_date: group.launch_date,
          notes_short: group.notes_short,
          notes_long: group.notes_long,
          variants: group.variants,
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

  const handleSaveRangComparIa = async () => {
    if (!editingRangComparIa) return

    setSaving(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        throw new Error('Session non trouvée. Veuillez vous reconnecter.')
      }

      const response = await fetch(`/api/admin/compl-ai/evaluations/${editingRangComparIa.evaluationId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          rang_compar_ia: editingRangComparIa.score
        })
      })

      const result = await response.json()
      if (!response.ok) {
        throw new Error(result.error || 'Erreur lors de la sauvegarde du score Rang Compar:IA')
      }

      setSyncMessage(`Score Rang Compar:IA mis à jour avec succès`)
      setEditingRangComparIa(null)
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
        version: model.version,
        short_name: model.short_name,
        long_name: model.long_name,
        launch_date: model.launch_date,
        notes_short: model.notes_short,
        notes_long: model.notes_long,
        variants: model.variants?.join(', ') || ''
      })
    } else {
      setEditingModel(null)
      setModelFormData({ 
        model_name: '', 
        model_provider: '', 
        model_type: 'large-language-model', 
        version: '',
        short_name: '',
        long_name: '',
        launch_date: '',
        notes_short: '',
        notes_long: '',
        variants: ''
      })
    }
    setShowModelForm(true)
  }

  const getScoreColor = (score?: number, hasEvaluations = true) => {
    if (!score || !hasEvaluations) return 'bg-gray-100 text-gray-500'
    if (score >= 0.75) return 'bg-green-100 text-green-800'
    if (score >= 0.55) return 'bg-yellow-100 text-yellow-800'
    if (score >= 0.40) return 'bg-orange-100 text-orange-800'
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
              disabled={syncing || clearing || saving || calculatingMaydai}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              <Plus className="h-4 w-4 mr-2" />
              Ajouter un modèle
            </button>
            
            <button
              onClick={handleSyncData}
              disabled={syncing || clearing || saving || calculatingMaydai}
              className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white ${
                syncing || clearing || saving || calculatingMaydai
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-blue-600 hover:bg-blue-700'
              } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500`}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Synchronisation...' : 'Mettre à jour les résultats'}
            </button>

            <button
              onClick={handleCalculateMaydaiScores}
              disabled={syncing || clearing || saving || calculatingMaydai}
              className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white ${
                syncing || clearing || saving || calculatingMaydai
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-purple-600 hover:bg-purple-700'
              } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500`}
            >
              <Calculator className={`h-4 w-4 mr-2 ${calculatingMaydai ? 'animate-pulse' : ''}`} />
              {calculatingMaydai ? 'Calcul en cours...' : 'Calculer scores MaydAI'}
            </button>

            <button
              onClick={handleExportCSV}
              disabled={syncing || clearing || saving || calculatingMaydai}
              className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white ${
                syncing || clearing || saving || calculatingMaydai
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-orange-600 hover:bg-orange-700'
              } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500`}
            >
              <Download className="h-4 w-4 mr-2" />
              Exporter CSV
            </button>

            <button
              onClick={() => setShowImportModal(true)}
              disabled={syncing || clearing || saving || calculatingMaydai}
              className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white ${
                syncing || clearing || saving || calculatingMaydai
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-green-600 hover:bg-green-700'
              } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500`}
            >
              <Upload className="h-4 w-4 mr-2" />
              Importer CSV
            </button>

            <button
              onClick={handleDownloadTemplate}
              disabled={syncing || clearing || saving || calculatingMaydai}
              className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white ${
                syncing || clearing || saving || calculatingMaydai
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-indigo-600 hover:bg-indigo-700'
              } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500`}
            >
              <FileText className="h-4 w-4 mr-2" />
              Template CSV
            </button>
            
            {!showClearConfirm ? (
              <button
                onClick={() => setShowClearConfirm(true)}
                disabled={syncing || clearing || calculatingMaydai}
                className={`ml-3 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white ${
                  syncing || clearing || calculatingMaydai
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
                  disabled={clearing || calculatingMaydai}
                  className={`inline-flex items-center px-3 py-2 border border-transparent text-xs font-medium rounded-md text-white ${
                    clearing || calculatingMaydai
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-red-600 hover:bg-red-700'
                  } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500`}
                >
                  <Trash2 className={`h-3 w-3 mr-1 ${clearing ? 'animate-pulse' : ''}`} />
                  {clearing ? 'Suppression...' : 'Confirmer'}
                </button>
                <button
                  onClick={() => setShowClearConfirm(false)}
                  disabled={clearing || calculatingMaydai}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 text-xs font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Annuler
                </button>
              </div>
            )}
          </div>
        </div>
        
        {syncMessage && (
          <div className={`mt-4 p-4 rounded-md border ${
            (syncMessage.includes('réussie') || syncMessage.includes('terminé avec succès') || (syncMessage.includes('créé') && !syncMessage.includes('Erreur')))
              ? 'bg-green-50 border-green-200 text-green-800' 
              : (syncMessage.includes('Erreur') || syncMessage.includes('erreur'))
              ? 'bg-red-50 border-red-200 text-red-800'
              : 'bg-blue-50 border-blue-200 text-blue-800'
          }`}>
            <div className="flex items-start">
              {(syncMessage.includes('réussie') || syncMessage.includes('terminé avec succès')) ? (
                <Check className="h-5 w-5 mr-2 text-green-600 flex-shrink-0 mt-0.5" />
              ) : (syncMessage.includes('Erreur') || syncMessage.includes('erreur')) ? (
                <X className="h-5 w-5 mr-2 text-red-600 flex-shrink-0 mt-0.5" />
              ) : null}
              <p className="text-sm">{syncMessage}</p>
            </div>
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
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-lg font-medium text-gray-900">Matrice des Scores par Modèle et Principe</h2>
              <p className="text-sm text-gray-600 mt-1">
                Chaque ligne représente un modèle, chaque colonne un principe avec ses benchmarks
              </p>
            </div>
            <div className="flex items-center space-x-4 text-xs">
              <div className="flex items-center space-x-2">
                <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800">0.750</span>
                <span className="text-gray-600">Score original</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-purple-100 text-purple-800 border border-purple-200">MaydAI: 3.2</span>
                <span className="text-gray-600">Score MaydAI (normalisé sur 4)</span>
              </div>
            </div>
          </div>
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
                  <th key={principle.code} className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[280px] border-l border-gray-300">
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
                        <div className="flex items-center gap-1">
                          <span className="text-sm font-medium text-gray-900 truncate" title={model.long_name || model.model_name}>
                            {model.short_name || model.model_name}
                          </span>
                          <ModelTooltip 
                            notesShort={model.notes_short} 
                            notesLong={model.notes_long}
                          />
                        </div>
                        <div className="text-xs text-gray-600" title={model.model_provider}>
                          {model.model_provider}
                        </div>
                        {model.launch_date && (
                          <div className="text-[10px] text-blue-600 mt-0.5">
                            🚀 {new Date(model.launch_date).toLocaleDateString('fr-FR')}
                          </div>
                        )}
                        {model.variants && model.variants.length > 0 && (
                          <div className="text-[10px] text-gray-500 italic mt-1 leading-tight">
                            Variantes : {model.variants.join(', ')}
                          </div>
                        )}
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
                    <td key={principle.code} className="px-3 py-3 text-center min-w-[280px] border-l border-gray-300">
                      <div className="space-y-2">
                        
                        {/* Scores moyens MaydAI et Rang Compar:IA du principe */}
                        <div className="flex justify-center gap-2 mt-1 flex-wrap">
                          {model.principle_scores[principle.code]?.avg_maydai_score !== undefined ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-800 border border-purple-200">
                              MaydAI: {model.principle_scores[principle.code].avg_maydai_score!.toFixed(2)}
                            </span>
                          ) : (
                            <span className="text-gray-400 text-xs italic">MaydAI: N/A</span>
                          )}
                          
                          {/* Édition du score Rang Compar:IA */}
                          {model.principle_scores[principle.code] && (
                            editingRangComparIa?.modelId === model.model_id && editingRangComparIa?.principleCode === principle.code ? (
                              <div className="flex items-center gap-1">
                                <input
                                  type="number"
                                  min="0"
                                  max="20"
                                  step="0.1"
                                  value={editingRangComparIa.score ?? ''}
                                  onChange={(e) => setEditingRangComparIa({
                                    ...editingRangComparIa,
                                    score: e.target.value ? parseFloat(e.target.value) : null
                                  })}
                                  className="w-16 px-1 py-0.5 text-xs border rounded text-center"
                                  placeholder="0-20"
                                  autoFocus
                                />
                                <button
                                  onClick={handleSaveRangComparIa}
                                  disabled={saving}
                                  className="p-0.5 text-green-600 hover:text-green-800"
                                  title="Sauvegarder"
                                >
                                  <Save className="h-3 w-3" />
                                </button>
                                <button
                                  onClick={() => setEditingRangComparIa(null)}
                                  className="p-0.5 text-gray-600 hover:text-gray-800"
                                  title="Annuler"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => {
                                  // Trouver une évaluation de ce principe pour ce modèle
                                  const benchmarkScores = Object.values(model.principle_scores[principle.code]?.benchmark_scores || {})
                                  const firstEvaluation = benchmarkScores.find(bs => bs.evaluation_id)
                                  
                                  if (firstEvaluation?.evaluation_id) {
                                    setEditingRangComparIa({
                                      evaluationId: firstEvaluation.evaluation_id,
                                      modelId: model.model_id!,
                                      principleCode: principle.code,
                                      score: model.principle_scores[principle.code]?.avg_rang_compar_ia ?? null
                                    })
                                  }
                                }}
                                disabled={!model.model_id || saving}
                                className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200 hover:bg-blue-200 transition-colors cursor-pointer disabled:opacity-50"
                                title="Cliquer pour éditer le score Rang Compar:IA"
                              >
                                {model.principle_scores[principle.code]?.avg_rang_compar_ia !== undefined 
                                  ? `Compar:IA: ${model.principle_scores[principle.code].avg_rang_compar_ia!.toFixed(2)}`
                                  : 'Compar:IA: --'}
                              </button>
                            )
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
                                    className="cursor-pointer hover:bg-gray-50 rounded px-1 py-0.5 flex-1 space-y-1"
                                    onClick={() => model.model_id && handleEditScore(
                                      model.model_id, 
                                      benchmark.code, 
                                      model.principle_scores[principle.code].benchmark_scores[benchmark.code].score,
                                      model.principle_scores[principle.code].benchmark_scores[benchmark.code].evaluation_id
                                    )}
                                    title={`${benchmark.name} - Cliquer pour modifier`}
                                  >
                                    {/* Benchmark name */}
                                    <div className="text-[9px] text-gray-600 truncate text-center" title={benchmark.name}>
                                      {benchmark.name.length > 18 ? benchmark.name.substring(0, 18) + '...' : benchmark.name}
                                    </div>
                                    
                                    {/* Original score */}
                                    <div className="flex justify-center">
                                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${model.principle_scores[principle.code].benchmark_scores[benchmark.code].score == null ? 'bg-gray-100 text-gray-500' : getScoreColor(model.principle_scores[principle.code].benchmark_scores[benchmark.code].score)}`}>
                                        {model.principle_scores[principle.code].benchmark_scores[benchmark.code].score == null
                                          ? ''
                                          : model.principle_scores[principle.code].benchmark_scores[benchmark.code].score.toFixed(3)}
                                      </span>
                                    </div>
                                    
                                    {/* MaydAI score */}
                                    <div className="flex justify-center">
                                      {(() => {
                                        const maydaiScore = model.principle_scores[principle.code].benchmark_scores[benchmark.code].maydai_score;
                                        console.log('Debug render MaydAI:', {
                                          model: model.model_name,
                                          benchmark: benchmark.code,
                                          maydaiScore,
                                          type: typeof maydaiScore,
                                          isNull: maydaiScore === null,
                                          isUndefined: maydaiScore === undefined
                                        });
                                        
                                        if (maydaiScore !== null && maydaiScore !== undefined) {
                                          return (
                                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-medium bg-purple-100 text-purple-800 border border-purple-200">
                                              MaydAI: {maydaiScore.toFixed(2)}
                                            </span>
                                          );
                                        } else {
                                          return (
                                            <span className="text-[9px] text-gray-400 italic">MaydAI: N/A</span>
                                          );
                                        }
                                      })()}
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

                  <div>
                    <label htmlFor="short_name" className="block text-sm font-medium text-gray-700 mb-2">
                      Nom court
                    </label>
                    <input
                      type="text"
                      id="short_name"
                      value={modelFormData.short_name || ''}
                      onChange={(e) => setModelFormData({...modelFormData, short_name: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition-colors"
                      placeholder="Ex: Sonar, GPT-4"
                    />
                  </div>

                  <div>
                    <label htmlFor="long_name" className="block text-sm font-medium text-gray-700 mb-2">
                      Nom long
                    </label>
                    <input
                      type="text"
                      id="long_name"
                      value={modelFormData.long_name || ''}
                      onChange={(e) => setModelFormData({...modelFormData, long_name: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition-colors"
                      placeholder="Ex: Sonar (Standard), GPT-4 Turbo"
                    />
                  </div>

                  <div>
                    <label htmlFor="launch_date" className="block text-sm font-medium text-gray-700 mb-2">
                      Date de lancement
                    </label>
                    <input
                      type="date"
                      id="launch_date"
                      value={modelFormData.launch_date || ''}
                      onChange={(e) => setModelFormData({...modelFormData, launch_date: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition-colors"
                    />
                  </div>

                  <div>
                    <label htmlFor="notes_short" className="block text-sm font-medium text-gray-700 mb-2">
                      Description courte
                      <span className="text-xs text-gray-500 ml-2">
                        ({modelFormData.notes_short?.length || 0}/150)
                      </span>
                    </label>
                    <input
                      type="text"
                      id="notes_short"
                      value={modelFormData.notes_short || ''}
                      onChange={(e) => setModelFormData({...modelFormData, notes_short: e.target.value})}
                      maxLength={150}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition-colors"
                      placeholder="Ex: Modèle multimodal état de l'art..."
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      S'affiche en gras dans l'infobulle
                    </p>
                  </div>

                  <div>
                    <label htmlFor="notes_long" className="block text-sm font-medium text-gray-700 mb-2">
                      Description complète
                      <span className="text-xs text-gray-500 ml-2">
                        ({modelFormData.notes_long?.length || 0}/1000)
                      </span>
                    </label>
                    <textarea
                      id="notes_long"
                      value={modelFormData.notes_long || ''}
                      onChange={(e) => setModelFormData({...modelFormData, notes_long: e.target.value})}
                      maxLength={1000}
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition-colors resize-none"
                      placeholder="Description complète affichée dans l'infobulle..."
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      S'affiche dans l'infobulle au survol de l'icône ℹ️
                    </p>
                  </div>

                  <div>
                    <label htmlFor="variants" className="block text-sm font-medium text-gray-700 mb-2">
                      Variantes
                    </label>
                    <input
                      type="text"
                      id="variants"
                      value={modelFormData.variants || ''}
                      onChange={(e) => setModelFormData({...modelFormData, variants: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition-colors"
                      placeholder="Séparez par des virgules : variant1, variant2, variant3"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Ces variantes s'afficheront sous le nom du modèle
                    </p>
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

      {/* Modal d'import CSV */}
      {showImportModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Importer des données CSV</h3>
                <button
                  onClick={() => {
                    setShowImportModal(false)
                    setImportFile(null)
                    setImportResults(null)
                    setImportValidationErrors([])
                    setCsvPreview(null)
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="space-y-4">
                {/* Mode d'import */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Mode d'import
                  </label>
                  <div className="space-y-2">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        value="create"
                        checked={importMode === 'create'}
                        onChange={(e) => setImportMode(e.target.value as 'create' | 'update')}
                        className="mr-2"
                      />
                      <span className="text-sm">Créer uniquement (ignorer les existants)</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        value="update"
                        checked={importMode === 'update'}
                        onChange={(e) => setImportMode(e.target.value as 'create' | 'update')}
                        className="mr-2"
                      />
                      <span className="text-sm">Mettre à jour les existants</span>
                    </label>
                  </div>
                </div>

                {/* Upload de fichier */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Fichier CSV
                  </label>
                  <input
                    type="file"
                    accept=".csv"
                    onChange={async (e) => {
                      const file = e.target.files?.[0] || null
                      setImportFile(file)
                      setImportValidationErrors([])
                      setCsvPreview(null)
                      setImportResults(null)
                      
                      if (file) {
                        try {
                          const csvText = await file.text()
                          const csvData = parseCSV(csvText)
                          
                          if (csvData && csvData.length > 0) {
                            const headers = Object.keys(csvData[0])
                            setCsvPreview({
                              headers,
                              rowCount: csvData.length
                            })
                            
                            // Validation préalable
                            const errors: string[] = []
                            if (headers.length === 0) {
                              errors.push('Aucun en-tête détecté dans le fichier CSV')
                            }
                            
                            const headerMapping = getHeaderMapping()
                            const normalizedHeaders = new Set<string>()
                            headers.forEach(header => {
                              const normalizedKey = normalizeHeaderKey(header)
                              const mappedKey = headerMapping[normalizedKey] || normalizedKey
                              normalizedHeaders.add(mappedKey)
                            })
                            
                            const requiredHeaders = ['model_name', 'principle_code', 'benchmark_code']
                            const missingHeaders = requiredHeaders.filter(req => !normalizedHeaders.has(req))
                            if (missingHeaders.length > 0) {
                              errors.push(`En-têtes requis manquants: ${missingHeaders.join(', ')}`)
                            }
                            
                            setImportValidationErrors(errors)
                          } else {
                            setImportValidationErrors(['Le fichier CSV est vide ou ne contient aucune donnée'])
                          }
                        } catch (error) {
                          setImportValidationErrors([`Erreur lors de la lecture du fichier: ${error instanceof Error ? error.message : 'Erreur inconnue'}`])
                        }
                      }
                    }}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />
                  {importFile && (
                    <div className="mt-2 space-y-1">
                      <p className="text-sm text-gray-600">
                        Fichier sélectionné: <span className="font-medium">{importFile.name}</span>
                      </p>
                      {csvPreview && (
                        <p className="text-xs text-gray-500">
                          {csvPreview.rowCount} ligne(s) détectée(s) • {csvPreview.headers.length} colonne(s)
                        </p>
                      )}
                    </div>
                  )}
                  
                  {/* Erreurs de validation */}
                  {importValidationErrors.length > 0 && (
                    <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-md">
                      <p className="text-sm font-medium text-red-800 mb-1">Erreurs de validation:</p>
                      <ul className="text-xs text-red-700 list-disc list-inside space-y-1">
                        {importValidationErrors.map((error, index) => (
                          <li key={index}>{error}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {/* Aperçu des en-têtes */}
                  {csvPreview && importValidationErrors.length === 0 && (
                    <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded-md">
                      <p className="text-xs font-medium text-green-800 mb-1">✓ Fichier valide</p>
                      <p className="text-xs text-green-700">
                        En-têtes détectés: {csvPreview.headers.slice(0, 5).join(', ')}
                        {csvPreview.headers.length > 5 && ` ... (+${csvPreview.headers.length - 5})`}
                      </p>
                    </div>
                  )}
                </div>

                {/* Boutons d'action */}
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => {
                      setShowImportModal(false)
                      setImportFile(null)
                      setImportResults(null)
                      setImportValidationErrors([])
                      setCsvPreview(null)
                    }}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={handleImportCSV}
                    disabled={!importFile || importing || importValidationErrors.length > 0}
                    className={`px-4 py-2 text-sm font-medium text-white rounded-md ${
                      !importFile || importing || importValidationErrors.length > 0
                        ? 'bg-gray-400 cursor-not-allowed'
                        : 'bg-green-600 hover:bg-green-700'
                    }`}
                  >
                    {importing ? (
                      <span className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Import en cours...
                      </span>
                    ) : (
                      'Importer'
                    )}
                  </button>
                </div>

                {/* Résultats de l'import */}
                {importResults && (
                  <div className={`mt-4 p-4 rounded-md border ${
                    importResults.errors.length > 0 
                      ? 'bg-red-50 border-red-200' 
                      : importResults.warnings.length > 0
                      ? 'bg-yellow-50 border-yellow-200'
                      : 'bg-green-50 border-green-200'
                  }`}>
                    <h4 className={`text-sm font-medium mb-3 ${
                      importResults.errors.length > 0 
                        ? 'text-red-900' 
                        : importResults.warnings.length > 0
                        ? 'text-yellow-900'
                        : 'text-green-900'
                    }`}>
                      {importResults.errors.length > 0 ? '⚠️ Import terminé avec erreurs' : 
                       importResults.warnings.length > 0 ? '✓ Import terminé avec avertissements' :
                       '✓ Import réussi'}
                    </h4>
                    <div className="text-sm space-y-2">
                      <div className="grid grid-cols-2 gap-2 text-gray-700">
                        <div>
                          <span className="font-medium">Lignes traitées:</span> {importResults.totalRows}
                        </div>
                        <div>
                          <span className="font-medium">Modèles créés:</span> <span className="text-green-700 font-semibold">{importResults.modelsCreated}</span>
                        </div>
                        <div>
                          <span className="font-medium">Modèles mis à jour:</span> <span className="text-blue-700 font-semibold">{importResults.modelsUpdated}</span>
                        </div>
                        <div>
                          <span className="font-medium">Évaluations créées:</span> <span className="text-green-700 font-semibold">{importResults.evaluationsCreated}</span>
                        </div>
                        <div className="col-span-2">
                          <span className="font-medium">Évaluations mises à jour:</span> <span className="text-blue-700 font-semibold">{importResults.evaluationsUpdated}</span>
                        </div>
                      </div>
                      
                      {importResults.errors.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-red-200">
                          <p className="text-red-800 font-medium mb-2">Erreurs ({importResults.errors.length}):</p>
                          <div className="max-h-32 overflow-y-auto">
                            <ul className="text-red-700 text-xs list-disc list-inside space-y-1">
                              {importResults.errors.slice(0, 10).map((error: string, index: number) => (
                                <li key={index} className="break-words">{error}</li>
                              ))}
                              {importResults.errors.length > 10 && (
                                <li className="text-red-600 italic">... et {importResults.errors.length - 10} autre(s) erreur(s)</li>
                              )}
                            </ul>
                          </div>
                        </div>
                      )}
                      
                      {importResults.warnings.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-yellow-200">
                          <p className="text-yellow-800 font-medium mb-2">Avertissements ({importResults.warnings.length}):</p>
                          <div className="max-h-24 overflow-y-auto">
                            <ul className="text-yellow-700 text-xs list-disc list-inside space-y-1">
                              {importResults.warnings.slice(0, 5).map((warning: string, index: number) => (
                                <li key={index} className="break-words">{warning}</li>
                              ))}
                              {importResults.warnings.length > 5 && (
                                <li className="text-yellow-600 italic">... et {importResults.warnings.length - 5} autre(s) avertissement(s)</li>
                              )}
                            </ul>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}