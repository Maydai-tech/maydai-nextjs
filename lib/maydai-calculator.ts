/**
 * Calculateur de scores MaydAI
 * 
 * Logique de normalisation des scores COMPL-AI :
 * - Chaque principe EU AI Act vaut 4 points maximum
 * - Score total maximum = 20 points (5 principes × 4 points)
 * - Les benchmarks N/A sont ignorés dans le calcul
 * - Formule : (somme des scores valides) × (4 / nombre de benchmarks valides)
 */

import { supabase } from '@/lib/supabase'

// Interface pour une évaluation COMPL-AI
export interface ComplAiEvaluation {
  id: string
  model_id: string
  principle_id: string
  benchmark_id: string | null
  score: number | null
  maydai_score: number | null
}

// Interface pour les informations d'un principe
export interface PrincipleInfo {
  id: string
  code: string
  name: string
}

// Interface pour les résultats de calcul par principe
export interface PrincipleScoreResult {
  principle_id: string
  principle_code: string
  total_benchmarks: number
  valid_benchmarks: number
  original_scores: number[]
  maydai_score: number
  individual_maydai_scores: (number | null)[] // Scores individuels pour chaque évaluation
}

// Interface pour les résultats de calcul par modèle
export interface ModelScoreResult {
  model_id: string
  model_name: string
  model_provider: string
  principle_scores: PrincipleScoreResult[]
  total_maydai_score: number
  avg_maydai_score_per_principle: number
  valid_benchmarks_percentage: number
  evaluations_updated: number
}

/**
 * Calcule le score MaydAI individuel pour une évaluation
 */
export function calculateIndividualMaydaiScore(score: number, totalValidScores: number): number {
  // Chaque évaluation reçoit son score original multiplié par le facteur de normalisation
  // Facteur = 4 points maximum du principe / nombre d'évaluations valides
  return score * (4 / totalValidScores)
}

/**
 * Calcule les scores MaydAI pour toutes les évaluations d'un principe
 */
export function calculatePrincipleMaydaiScores(scores: (number | null)[]): (number | null)[] {
  // Filtrer pour compter les scores valides
  const validScores = scores.filter((score): score is number => score !== null && score !== undefined)
  
  // Si aucun score valide, retourner le tableau original avec des null
  if (validScores.length === 0) {
    return scores.map(() => null)
  }
  
  // Calculer le score MaydAI pour chaque évaluation en tenant compte de sa performance
  return scores.map(score => {
    if (score === null || score === undefined) {
      return null
    }
    return calculateIndividualMaydaiScore(score, validScores.length)
  })
}

/**
 * Récupère toutes les évaluations d'un modèle avec les informations des principes
 */
export async function getModelEvaluations(modelId: string): Promise<{
  evaluations: ComplAiEvaluation[]
  principles: Record<string, PrincipleInfo>
}> {
  // Récupérer toutes les évaluations du modèle (ordonnées par ID pour cohérence avec saveMaydaiScores)
  const { data: evaluations, error: evalError } = await supabase
    .from('compl_ai_evaluations')
    .select(`
      id,
      model_id,
      principle_id,
      benchmark_id,
      score,
      maydai_score
    `)
    .eq('model_id', modelId)
    .order('id')

  if (evalError) {
    throw new Error(`Erreur lors de la récupération des évaluations: ${evalError.message}`)
  }

  // Récupérer les informations des principes
  const principleIds = [...new Set(evaluations?.map(e => e.principle_id) || [])]
  const { data: principlesData, error: principlesError } = await supabase
    .from('compl_ai_principles')
    .select('id, code, name')
    .in('id', principleIds)

  if (principlesError) {
    throw new Error(`Erreur lors de la récupération des principes: ${principlesError.message}`)
  }

  // Créer un mapping des principes par ID
  const principles: Record<string, PrincipleInfo> = {}
  principlesData?.forEach(p => {
    principles[p.id] = p
  })

  return {
    evaluations: evaluations || [],
    principles
  }
}

/**
 * Calcule les scores MaydAI pour un modèle donné
 */
export async function calculateModelMaydaiScores(modelId: string): Promise<ModelScoreResult> {
  console.log(`calculateModelMaydaiScores - Start for model ID: ${modelId}`)
  
  // Récupérer les informations du modèle
  const { data: model, error: modelError } = await supabase
    .from('compl_ai_models')
    .select('id, model_name, model_provider')
    .eq('id', modelId)
    .single()

  console.log('Model lookup result:', { model, error: modelError })

  if (modelError || !model) {
    console.error('Model not found:', { modelId, error: modelError })
    throw new Error(`Modèle non trouvé: ${modelId}`)
  }

  // Récupérer toutes les évaluations du modèle
  const { evaluations, principles } = await getModelEvaluations(modelId)

  // Grouper les évaluations par principe (en préservant l'ordre des IDs)
  const evaluationsByPrinciple: Record<string, ComplAiEvaluation[]> = {}
  evaluations.forEach(evaluation => {
    if (!evaluationsByPrinciple[evaluation.principle_id]) {
      evaluationsByPrinciple[evaluation.principle_id] = []
    }
    evaluationsByPrinciple[evaluation.principle_id].push(evaluation)
  })
  
  // S'assurer que chaque groupe est trié par ID (cohérence avec saveMaydaiScores)
  Object.keys(evaluationsByPrinciple).forEach(principleId => {
    evaluationsByPrinciple[principleId].sort((a, b) => a.id.localeCompare(b.id))
  })

  // Calculer les scores pour chaque principe
  const principleResults: PrincipleScoreResult[] = []
  let totalValidBenchmarks = 0
  let totalBenchmarks = 0

  for (const [principleId, principleEvaluations] of Object.entries(evaluationsByPrinciple)) {
    const principleInfo = principles[principleId]
    if (!principleInfo) continue

    const scores = principleEvaluations.map(e => e.score)
    const validScores = scores.filter((score): score is number => score !== null)
    
    // Calculer les scores MaydAI individuels pour chaque évaluation
    const maydaiScores = calculatePrincipleMaydaiScores(scores)
    
    // Le score total du principe est la somme des scores MaydAI valides
    const validMaydaiScores = maydaiScores.filter((score): score is number => score !== null)
    const totalPrincipleScore = validMaydaiScores.reduce((sum, score) => sum + score, 0)

    totalBenchmarks += scores.length
    totalValidBenchmarks += validScores.length

    principleResults.push({
      principle_id: principleId,
      principle_code: principleInfo.code,
      total_benchmarks: scores.length,
      valid_benchmarks: validScores.length,
      original_scores: validScores,
      maydai_score: totalPrincipleScore,
      individual_maydai_scores: maydaiScores
    })
  }

  // Calculer les scores totaux
  const totalMaydaiScore = principleResults.reduce((sum, p) => sum + p.maydai_score, 0)
  const avgMaydaiScorePerPrinciple = principleResults.length > 0 ? totalMaydaiScore / principleResults.length : 0
  const validBenchmarksPercentage = totalBenchmarks > 0 ? (totalValidBenchmarks / totalBenchmarks) * 100 : 0

  return {
    model_id: modelId,
    model_name: model.model_name,
    model_provider: model.model_provider || 'Unknown',
    principle_scores: principleResults,
    total_maydai_score: totalMaydaiScore,
    avg_maydai_score_per_principle: avgMaydaiScorePerPrinciple,
    valid_benchmarks_percentage: validBenchmarksPercentage,
    evaluations_updated: 0 // Sera mis à jour lors de la sauvegarde
  }
}

/**
 * Sauvegarde les scores MaydAI calculés dans la base de données
 */
export async function saveMaydaiScores(modelId: string, results: ModelScoreResult): Promise<number> {
  let updatedCount = 0

  // Pour chaque principe, récupérer les évaluations et mettre à jour individuellement
  for (const principleResult of results.principle_scores) {
    // Récupérer les évaluations dans l'ordre pour les associer aux scores calculés
    const { data: evaluations, error: fetchError } = await supabase
      .from('compl_ai_evaluations')
      .select('id, score')
      .eq('model_id', modelId)
      .eq('principle_id', principleResult.principle_id)
      .order('id')

    if (fetchError) {
      console.error(`Erreur lors de la récupération des évaluations pour le principe ${principleResult.principle_code}:`, fetchError)
      continue
    }

    if (!evaluations || evaluations.length !== principleResult.individual_maydai_scores.length) {
      console.error(`Incohérence dans le nombre d'évaluations pour le principe ${principleResult.principle_code}`)
      continue
    }

    // Mettre à jour chaque évaluation avec son score MaydAI individuel
    for (let i = 0; i < evaluations.length; i++) {
      const evaluation = evaluations[i]
      const maydaiScore = principleResult.individual_maydai_scores[i]

      const { error: updateError } = await supabase
        .from('compl_ai_evaluations')
        .update({ 
          maydai_score: maydaiScore,
          updated_at: new Date().toISOString()
        })
        .eq('id', evaluation.id)

      if (updateError) {
        console.error(`Erreur lors de la mise à jour de l'évaluation ${evaluation.id}:`, updateError)
        continue
      }

      updatedCount++
    }
  }

  return updatedCount
}

/**
 * Calcule et sauvegarde les scores MaydAI pour un modèle
 */
export async function recalculateModelMaydaiScores(modelId: string): Promise<ModelScoreResult> {
  // Calculer les scores
  const results = await calculateModelMaydaiScores(modelId)
  
  // Sauvegarder en base
  const updatedCount = await saveMaydaiScores(modelId, results)
  results.evaluations_updated = updatedCount

  console.log(`Scores MaydAI recalculés pour ${results.model_name}: ${updatedCount} évaluations mises à jour`)
  
  return results
}

/**
 * Calcule les scores MaydAI pour tous les modèles
 */
export async function recalculateAllMaydaiScores(): Promise<ModelScoreResult[]> {
  console.log('recalculateAllMaydaiScores - Start')
  
  // D'abord récupérer tous les model_id distincts
  console.log('Fetching distinct model IDs from compl_ai_evaluations...')
  const { data: modelIds, error: modelIdsError } = await supabase
    .from('compl_ai_evaluations')
    .select('model_id')
    .not('model_id', 'is', null)

  console.log('Model IDs query result:', { 
    count: modelIds?.length, 
    error: modelIdsError,
    sample: modelIds?.slice(0, 3)
  })

  if (modelIdsError) {
    console.error('Error fetching model IDs:', modelIdsError)
    throw new Error(`Erreur lors de la récupération des IDs de modèles: ${modelIdsError.message}`)
  }

  // Extraire les IDs uniques
  const uniqueModelIds = [...new Set(modelIds?.map(m => m.model_id) || [])]
  console.log(`Found ${uniqueModelIds.length} unique model IDs`)

  if (uniqueModelIds.length === 0) {
    console.log('Aucun modèle trouvé avec des évaluations')
    return []
  }

  // Puis récupérer les modèles
  console.log('Fetching models from compl_ai_models...')
  const { data: models, error } = await supabase
    .from('compl_ai_models')
    .select(`
      id,
      model_name,
      model_provider
    `)
    .in('id', uniqueModelIds)

  console.log('Models query result:', { 
    count: models?.length, 
    error,
    sample: models?.slice(0, 3)
  })

  if (error) {
    console.error('Error fetching models:', error)
    throw new Error(`Erreur lors de la récupération des modèles: ${error.message}`)
  }

  const results: ModelScoreResult[] = []
  
  // Traiter chaque modèle
  console.log(`Processing ${models?.length || 0} models...`)
  for (const model of models || []) {
    try {
      console.log(`Processing model: ${model.model_name} (${model.id})`)
      const result = await recalculateModelMaydaiScores(model.id)
      results.push(result)
      console.log(`Successfully processed model ${model.model_name}`)
    } catch (error) {
      console.error(`Erreur lors du calcul pour le modèle ${model.model_name}:`, error)
      // Continuer avec les autres modèles même en cas d'erreur
    }
  }

  console.log(`Recalcul terminé pour ${results.length} modèles`)
  
  return results
}

/**
 * Obtient les statistiques globales des scores MaydAI
 */
export async function getMaydaiStatistics(): Promise<{
  total_models: number
  total_evaluations: number
  evaluations_with_maydai: number
  avg_maydai_score: number
  min_maydai_score: number
  max_maydai_score: number
}> {
  const { data, error } = await supabase
    .from('compl_ai_evaluations')
    .select('maydai_score')
    .not('maydai_score', 'is', null)

  if (error) {
    throw new Error(`Erreur lors de la récupération des statistiques: ${error.message}`)
  }

  const { data: totalEvaluations } = await supabase
    .from('compl_ai_evaluations')
    .select('id', { count: 'exact' })

  const { data: totalModels } = await supabase
    .from('compl_ai_models')
    .select('id', { count: 'exact' })

  const maydaiScores = data?.map(d => d.maydai_score) || []
  
  return {
    total_models: totalModels?.length || 0,
    total_evaluations: totalEvaluations?.length || 0,
    evaluations_with_maydai: maydaiScores.length,
    avg_maydai_score: maydaiScores.length > 0 ? maydaiScores.reduce((sum, score) => sum + score, 0) / maydaiScores.length : 0,
    min_maydai_score: maydaiScores.length > 0 ? Math.min(...maydaiScores) : 0,
    max_maydai_score: maydaiScores.length > 0 ? Math.max(...maydaiScores) : 0
  }
}