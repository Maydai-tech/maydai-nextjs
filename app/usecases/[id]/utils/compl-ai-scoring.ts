import { supabase } from '@/lib/supabase'
import type { SupabaseClient } from '@supabase/supabase-js'

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
export async function getComplAiScore(modelId: string, supabaseClient?: SupabaseClient): Promise<ComplAiModelScore | null> {
  try {
    const client = supabaseClient || supabase
    
    // Récupérer les informations de base du modèle
    const { data: model, error: modelError } = await client
      .from('compl_ai_models')
      .select('id, model_name, model_provider')
      .eq('id', modelId)
      .single()

    if (modelError || !model) {
      console.warn(`Modèle COMPL-AI non trouvé pour l'ID: ${modelId}`)
      return null
    }

    // Récupérer toutes les évaluations avec les principes
    const { data: evaluations, error: evaluationsError } = await client
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
export function calculateComplAiBonus(complAiScore: number): number {
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
 * Mapping des codes de principes COMPL-AI vers les catégories de risque MaydAI
 */
const PRINCIPLE_TO_CATEGORY_MAPPING: Record<string, string> = {
  'transparency': 'transparency',
  'technical_robustness_safety': 'technical_robustness',
  'privacy_data_governance': 'privacy_data',
  'social_environmental_wellbeing': 'social_environmental',
  'diversity_non_discrimination_fairness': 'diversity_fairness'
}

/**
 * Récupère les scores MaydAI par principe pour un modèle donné
 */
export async function getMaydAiScoresByPrinciple(modelId: string, supabaseClient?: SupabaseClient): Promise<Record<string, number>> {
  try {
    const client = supabaseClient || supabase
    
    const { data: scores, error } = await client
      .from('compl_ai_maydai_scores')
      .select('principle_code, average_maydai_score')
      .eq('model_id', modelId)

    if (error) {
      console.error('Erreur lors de la récupération des scores MaydAI par principe:', error)
      return {}
    }

    if (!scores || scores.length === 0) {
      return {}
    }

    // Mapper les scores vers les catégories de risque MaydAI
    const mappedScores: Record<string, number> = {}
    
    scores.forEach(score => {
      const categoryId = PRINCIPLE_TO_CATEGORY_MAPPING[score.principle_code]
      if (categoryId) {
        // Convertir le score en nombre et s'assurer qu'il ne dépasse pas 4
        const scoreValue = Math.min(Math.max(parseFloat(score.average_maydai_score) || 0, 0), 4)
        mappedScores[categoryId] = scoreValue
      }
    })

    return mappedScores

  } catch (error) {
    console.error('Erreur lors de la récupération des scores MaydAI par principe:', error)
    return {}
  }
}

/**
 * Récupère et calcule le score COMPL-AI complet pour un use case
 */
export async function getUseCaseComplAiBonus(usecaseId: string, supabaseClient?: SupabaseClient): Promise<{
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
    const client = supabaseClient || supabase
    
    // Récupérer le use case avec son modèle associé
    const { data: usecase, error: usecaseError } = await client
      .from('usecases')
      .select('primary_model_id')
      .eq('id', usecaseId)
      .single()

    console.log('usecase:', usecase)
    console.log('usecaseError:', usecaseError)
    console.log('usecaseId:', usecaseId)

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
    const complAiData = await getComplAiScore(usecase.primary_model_id, client)
    
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