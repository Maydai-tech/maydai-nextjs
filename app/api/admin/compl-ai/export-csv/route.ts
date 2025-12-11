import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedSupabaseClient } from '@/lib/api-auth'

export async function GET(request: NextRequest) {
  try {
    console.log('Debug: Début de l\'export CSV - VERSION SIMPLIFIÉE')

    // Authentification avec le client Supabase authentifié
    const { supabase, user } = await getAuthenticatedSupabaseClient(request)

    // Vérifier les droits admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || (profile.role !== 'admin' && profile.role !== 'super_admin')) {
      return NextResponse.json({ error: 'Droits insuffisants' }, { status: 403 })
    }

    console.log('Debug: Authentification OK, récupération des données...')

    // Récupérer tous les modèles
    const { data: allModels, error: modelsError } = await supabase
      .from('compl_ai_models')
      .select('id, model_name, model_provider, model_type, version')
      .order('model_name')

    if (modelsError) throw modelsError
    console.log('Debug: Modèles récupérés:', allModels?.length || 0)

    // Récupérer tous les principes et benchmarks (inclure l'id des benchmarks)
    const { data: principlesData, error: principlesError } = await supabase
      .from('compl_ai_principles')
      .select(`
        code,
        name,
        category,
        compl_ai_benchmarks (
          id,
          code,
          name
        )
      `)
      .order('code')

    if (principlesError) throw principlesError
    console.log('Debug: Principes récupérés:', principlesData?.length || 0)

    // Récupérer TOUTES les évaluations avec pagination (limite Supabase: 1000 lignes par requête)
    const PAGE_SIZE = 1000
    let allEvaluations: any[] = []
    let page = 0
    let hasMore = true

    console.log('Debug: Début de la récupération paginée des évaluations...')

    while (hasMore) {
      const { data: evaluationsPage, error: evaluationsError } = await supabase
        .from('compl_ai_evaluations')
        .select(`
          id,
          score,
          score_text,
          evaluation_date,
          raw_data,
          benchmark_id,
          compl_ai_models (
            id,
            model_name,
            model_provider,
            model_type,
            version
          ),
          compl_ai_principles (
            name,
            code,
            category
          ),
          compl_ai_benchmarks (
            id,
            code,
            name
          )
        `)
        .order('evaluation_date', { ascending: false })
        .order('id', { ascending: false })  // Tri secondaire pour stabilité
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)

      if (evaluationsError) throw evaluationsError

      if (evaluationsPage && evaluationsPage.length > 0) {
        allEvaluations = [...allEvaluations, ...evaluationsPage]
        console.log(`Debug: Page ${page + 1} récupérée: ${evaluationsPage.length} évaluations (total: ${allEvaluations.length})`)
        page++
        hasMore = evaluationsPage.length === PAGE_SIZE
      } else {
        hasMore = false
      }
    }

    console.log(`Debug: Total évaluations récupérées: ${allEvaluations.length}`)

    // Debug: Afficher la structure des premières évaluations
    console.log('Debug: Structure des premières évaluations:', allEvaluations.slice(0, 2)?.map(e => ({
      id: e.id,
      score: e.score,
      benchmark_id: e.benchmark_id,
      model: e.compl_ai_models,
      principle: e.compl_ai_principles,
      benchmark: e.compl_ai_benchmarks,
      raw_data_keys: Object.keys(e.raw_data || {})
    })))

    // Créer un mapping des évaluations - CONSERVER LA PLUS RÉCENTE en cas de doublon
    // Les évaluations sont triées par date DESC, donc la première rencontrée est la plus récente
    const evaluationMap = new Map<string, any>()
    let duplicatesSkipped = 0
    
    allEvaluations.forEach(evaluation => {
      // Vérifier que nous avons les données nécessaires
      const model = Array.isArray(evaluation.compl_ai_models) ? evaluation.compl_ai_models[0] : evaluation.compl_ai_models
      const principle = Array.isArray(evaluation.compl_ai_principles) ? evaluation.compl_ai_principles[0] : evaluation.compl_ai_principles
      const benchmark = Array.isArray(evaluation.compl_ai_benchmarks) ? evaluation.compl_ai_benchmarks[0] : evaluation.compl_ai_benchmarks
      
      if (!model || !principle || !benchmark) {
        console.log('Debug: Évaluation ignorée - données manquantes:', {
          id: evaluation.id,
          hasModel: !!model,
          hasPrinciple: !!principle,
          hasBenchmark: !!benchmark
        })
        return
      }

      // Utiliser benchmark.id pour la clé (plus fiable que benchmark.code)
      const key = `${model.id}-${benchmark.id}`
      
      // NE PAS écraser si une évaluation existe déjà (garder la plus récente)
      if (!evaluationMap.has(key)) {
        evaluationMap.set(key, {
          ...evaluation,
          model,
          principle,
          benchmark
        })
      } else {
        duplicatesSkipped++
      }
    })

    console.log(`Debug: Total évaluations mappées: ${evaluationMap.size}, doublons ignorés: ${duplicatesSkipped}`)

    // Créer la structure des données CSV
    const csvRows = []
    
    // En-têtes CSV - VERSION SIMPLIFIÉE
    const headers = [
      'Modèle ID',
      'Nom du Modèle',
      'Fournisseur',
      'Type',
      'Version',
      'Principe Code',
      'Principe Nom',
      'Catégorie Principe',
      'Benchmark Code',
      'Benchmark Nom',
      'Score Original',
      'Score Text',
      'Date d\'Évaluation',
      'Statut'
    ]
    csvRows.push(headers.join(','))

    // Parcourir tous les modèles et tous les benchmarks pour créer une matrice complète
    allModels?.forEach(model => {
      principlesData?.forEach(principle => {
        principle.compl_ai_benchmarks?.forEach(benchmark => {
          // Utiliser benchmark.id pour la cohérence avec la Map
          const evaluationKey = `${model.id}-${benchmark.id}`
          const evaluation = evaluationMap.get(evaluationKey)
          
          const row = [
            model.id,
            `"${model.model_name || 'N/A'}"`,
            `"${model.model_provider || 'N/A'}"`,
            `"${model.model_type || 'N/A'}"`,
            `"${model.version || 'N/A'}"`,
            `"${principle.code}"`,
            `"${principle.name}"`,
            `"${principle.category || 'N/A'}"`,
            `"${benchmark.code}"`,
            `"${benchmark.name}"`,
            evaluation?.score?.toString() || 'N/A',
            `"${evaluation?.score_text || 'N/A'}"`,
            `"${evaluation?.evaluation_date || 'N/A'}"`,
            evaluation ? 'Évalué' : 'Non évalué'
          ]
          
          csvRows.push(row.join(','))
        })
      })
    })

    // Convertir en CSV
    const csvContent = csvRows.join('\n')
    
    console.log(`Debug: CSV généré avec ${csvRows.length - 1} lignes de données`)
    
    // Retourner le fichier CSV
    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="compl-ai-scores-export-${new Date().toISOString().split('T')[0]}.csv"`
      }
    })

  } catch (error) {
    console.error('Erreur export CSV COMPL-AI:', error)

    // Gérer les erreurs d'authentification
    if (error instanceof Error && (error.message === 'No authorization header' || error.message === 'Invalid token')) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Erreur interne du serveur'
    }, { status: 500 })
  }
}
