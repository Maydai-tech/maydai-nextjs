import { supabase } from '@/lib/supabase'

// Interface pour le score COMPL-AI d'un modèle
export interface ComplAiModelScore {
  model_id: string
  model_name: string
  model_provider: string
  average_score: number
  principle_scores: Record<string, number>
  evaluation_count: number
  // Nouveaux champs pour les scores MaydAI
  total_maydai_score: number // Score total MaydAI (max 20 points)
  avg_maydai_score_per_principle: number // Score moyen par principe (max 4 points)
  maydai_principle_scores: Record<string, number> // Scores MaydAI par principe
  valid_benchmarks_percentage: number // Pourcentage de benchmarks valides
}

/**
 * Récupère le score COMPL-AI complet d'un modèle par son ID (avec scores MaydAI calculés en TypeScript)
 */
export async function getComplAiScore(modelId: string): Promise<ComplAiModelScore | null> {
  try {
    // Récupérer les informations de base du modèle
    const { data: model, error: modelError } = await supabase
      .from('compl_ai_models')
      .select('id, model_name, model_provider')
      .eq('id', modelId)
      .single()

    if (modelError || !model) {
      console.warn(`Modèle COMPL-AI non trouvé pour l'ID: ${modelId}`)
      return null
    }

    // Récupérer toutes les évaluations avec les principes
    const { data: evaluations, error: evaluationsError } = await supabase
      .from('compl_ai_evaluations')
      .select(`
        score,
        maydai_score,
        compl_ai_principles!inner (
          code,
          name
        )
      `)
      .eq('model_id', modelId)

    if (evaluationsError) {
      console.error('Erreur lors de la récupération des évaluations COMPL-AI:', evaluationsError)
      return null
    }

    if (!evaluations || evaluations.length === 0) {
      console.warn(`Aucune évaluation COMPL-AI trouvée pour le modèle: ${model.model_name}`)
      return null
    }

    // Organiser les scores par principe
    const principleData: Record<string, { originalScores: number[], maydaiScores: number[] }> = {}
    
    evaluations.forEach(evaluation => {
      const principleCode = (evaluation.compl_ai_principles as any).code
      if (!principleData[principleCode]) {
        principleData[principleCode] = { originalScores: [], maydaiScores: [] }
      }
      
      if (evaluation.score !== null) {
        principleData[principleCode].originalScores.push(evaluation.score)
      }
      
      if (evaluation.maydai_score !== null) {
        principleData[principleCode].maydaiScores.push(evaluation.maydai_score)
      }
    })

    // Calculer les moyennes par principe
    const avgPrincipleScores: Record<string, number> = {}
    const maydaiPrincipleScores: Record<string, number> = {}
    let totalOriginalScore = 0
    let totalMaydaiScore = 0
    let principleCount = 0

    Object.entries(principleData).forEach(([principleCode, data]) => {
      // Score original moyen
      const avgOriginal = data.originalScores.length > 0 
        ? data.originalScores.reduce((sum, score) => sum + score, 0) / data.originalScores.length 
        : 0
      avgPrincipleScores[principleCode] = avgOriginal
      totalOriginalScore += avgOriginal
      
      // Score MaydAI : somme de tous les scores individuels pour ce principe
      const maydaiScore = data.maydaiScores.reduce((sum, score) => sum + score, 0)
      maydaiPrincipleScores[principleCode] = maydaiScore
      totalMaydaiScore += maydaiScore
      
      principleCount++
    })

    // Calculer les pourcentages
    const averageScore = principleCount > 0 ? totalOriginalScore / principleCount : 0
    const avgMaydaiScorePerPrinciple = principleCount > 0 ? totalMaydaiScore / principleCount : 0
    
    const totalEvaluations = evaluations.length
    const validEvaluations = evaluations.filter(e => e.score !== null).length
    const validBenchmarksPercentage = totalEvaluations > 0 ? (validEvaluations / totalEvaluations) * 100 : 0

    return {
      model_id: modelId,
      model_name: model.model_name,
      model_provider: model.model_provider || 'Unknown',
      average_score: averageScore,
      principle_scores: avgPrincipleScores,
      evaluation_count: totalEvaluations,
      // Champs MaydAI
      total_maydai_score: totalMaydaiScore,
      avg_maydai_score_per_principle: avgMaydaiScorePerPrinciple,
      maydai_principle_scores: maydaiPrincipleScores,
      valid_benchmarks_percentage: validBenchmarksPercentage
    }

  } catch (error) {
    console.error('Erreur lors de la récupération du score COMPL-AI:', error)
    return null
  }
}

/**
 * Calcule le bonus à appliquer basé sur le score COMPL-AI original
 * Selon la formule fournie : Score final = (Score de base + Bonus) / Score maximum possible
 */
export function calculateComplAiBonus(complAiScore: number, baseScore: number = 90): number {
  // Le score COMPL-AI est un pourcentage (0-1), on le convertit en points sur 20
  const bonusPoints = complAiScore * 20
  
  // Appliquer la formule : Score final = (Score de base + Bonus) / Score maximum possible
  // Score maximum possible = 120 (90 de base + 20 de bonus max)
  // Mais on retourne juste le bonus pour l'ajouter au score de base
  return bonusPoints
}

/**
 * Calcule le bonus à appliquer basé sur le score MaydAI (normalisé sur 20 points)
 * Le score MaydAI est déjà normalisé : chaque principe vaut 4 points max, total 20 points
 */
export function calculateMaydAiBonus(maydaiScore: number): number {
  // Le score MaydAI est déjà sur 20 points, on le retourne directement
  return Math.min(Math.max(maydaiScore, 0), 20)
}

/**
 * Récupère et calcule le score COMPL-AI complet pour un use case
 */
export async function getUseCaseComplAiBonus(usecaseId: string): Promise<{
  bonus: number
  complAiScore: number | null
  maydaiBonus: number
  maydaiScore: number | null
  modelInfo: {
    id: string
    name: string
    provider: string
  } | null
}> {
  try {
    // Récupérer le use case avec son modèle associé
    const { data: usecase, error: usecaseError } = await supabase
      .from('usecases')
      .select('primary_model_id')
      .eq('id', usecaseId)
      .single()

    if (usecaseError || !usecase || !usecase.primary_model_id) {
      return {
        bonus: 0,
        complAiScore: null,
        maydaiBonus: 0,
        maydaiScore: null,
        modelInfo: null
      }
    }

    // Récupérer le score COMPL-AI du modèle
    const complAiData = await getComplAiScore(usecase.primary_model_id)
    
    if (!complAiData) {
      return {
        bonus: 0,
        complAiScore: null,
        maydaiBonus: 0,
        maydaiScore: null,
        modelInfo: null
      }
    }

    const bonus = calculateComplAiBonus(complAiData.average_score)
    const maydaiBonus = calculateMaydAiBonus(complAiData.total_maydai_score)

    return {
      bonus,
      complAiScore: complAiData.average_score,
      maydaiBonus,
      maydaiScore: complAiData.total_maydai_score,
      modelInfo: {
        id: complAiData.model_id,
        name: complAiData.model_name,
        provider: complAiData.model_provider
      }
    }

  } catch (error) {
    console.error('Erreur lors du calcul du bonus COMPL-AI:', error)
    return {
      bonus: 0,
      complAiScore: null,
      maydaiBonus: 0,
      maydaiScore: null,
      modelInfo: null
    }
  }
}