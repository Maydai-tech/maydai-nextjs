import { supabase } from '@/lib/supabase'

// Interface pour le score COMPL-AI d'un modèle
export interface ComplAiModelScore {
  model_id: string
  model_name: string
  model_provider: string
  average_score: number
  principle_scores: Record<string, number>
  evaluation_count: number
}

/**
 * Récupère le score COMPL-AI moyen d'un modèle par son ID
 */
export async function getComplAiScore(modelId: string): Promise<ComplAiModelScore | null> {
  try {
    // Récupérer les informations du modèle
    const { data: model, error: modelError } = await supabase
      .from('compl_ai_models')
      .select('id, model_name, model_provider')
      .eq('id', modelId)
      .single()

    if (modelError || !model) {
      console.warn(`Modèle COMPL-AI non trouvé pour l'ID: ${modelId}`)
      return null
    }

    // Récupérer toutes les évaluations pour ce modèle avec les principes
    const { data: evaluations, error: evaluationsError } = await supabase
      .from('compl_ai_evaluations')
      .select(`
        score,
        compl_ai_principles!inner (
          id,
          code,
          name
        )
      `)
      .eq('model_id', modelId)
      .not('score', 'is', null)

    if (evaluationsError) {
      console.error('Erreur lors de la récupération des évaluations COMPL-AI:', evaluationsError)
      return null
    }

    if (!evaluations || evaluations.length === 0) {
      console.warn(`Aucune évaluation COMPL-AI trouvée pour le modèle: ${model.model_name}`)
      return null
    }

    // Calculer les scores par principe
    const principleScores: Record<string, number[]> = {}
    
    evaluations.forEach(evaluation => {
      const principleCode = evaluation.compl_ai_principles.code
      if (!principleScores[principleCode]) {
        principleScores[principleCode] = []
      }
      principleScores[principleCode].push(evaluation.score)
    })

    // Calculer les moyennes par principe
    const avgPrincipleScores: Record<string, number> = {}
    let totalScore = 0
    let principleCount = 0

    Object.entries(principleScores).forEach(([principleCode, scores]) => {
      const avg = scores.reduce((sum, score) => sum + score, 0) / scores.length
      avgPrincipleScores[principleCode] = avg
      totalScore += avg
      principleCount++
    })

    // Score global = moyenne des moyennes par principe
    const averageScore = principleCount > 0 ? totalScore / principleCount : 0

    return {
      model_id: modelId,
      model_name: model.model_name,
      model_provider: model.model_provider || 'Unknown',
      average_score: averageScore,
      principle_scores: avgPrincipleScores,
      evaluation_count: evaluations.length
    }

  } catch (error) {
    console.error('Erreur lors de la récupération du score COMPL-AI:', error)
    return null
  }
}

/**
 * Calcule le bonus à appliquer basé sur le score COMPL-AI
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
 * Récupère et calcule le score COMPL-AI complet pour un use case
 */
export async function getUseCaseComplAiBonus(usecaseId: string): Promise<{
  bonus: number
  complAiScore: number | null
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
        modelInfo: null
      }
    }

    // Récupérer le score COMPL-AI du modèle
    const complAiData = await getComplAiScore(usecase.primary_model_id)
    
    if (!complAiData) {
      return {
        bonus: 0,
        complAiScore: null,
        modelInfo: null
      }
    }

    const bonus = calculateComplAiBonus(complAiData.average_score)

    return {
      bonus,
      complAiScore: complAiData.average_score,
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
      modelInfo: null
    }
  }
}