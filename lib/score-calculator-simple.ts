/**
 * Calculateur de score simple pour les cas d'usage IA
 * 
 * Ce fichier contient la logique métier pure pour calculer le score d'un cas d'usage
 * basé sur les réponses de l'utilisateur au questionnaire IA Act.
 * 
 * Principe :
 * 1. Score de base = 90 points
 * 2. Les réponses peuvent diminuer le score (impacts négatifs)  
 * 3. Certaines réponses sont éliminatoires (score = 0)
 * 4. Un bonus COMPL-AI peut être ajouté (jusqu'à 20 points)
 * 5. Score final = (score_base + bonus_model) avec pondération
 */

import { QUESTIONS_DATA, type QuestionOption } from './questions-data';

// ===== CONSTANTES DE CALCUL =====
/**
 * Score de départ pour tous les cas d'usage
 * Tous les cas d'usage commencent avec 90 points
 */
export const BASE_SCORE = 90;

/**
 * Multiplicateur pour convertir le score COMPL-AI (0-1) en score sur 20
 */
export const COMPL_AI_MULTIPLIER = 20;

/**
 * Poids du score de base dans le calcul final (sur 120 total)
 */
export const BASE_SCORE_WEIGHT = 100;

/**
 * Poids du score modèle dans le calcul final (sur 120 total)
 */
export const MODEL_SCORE_WEIGHT = 20;

/**
 * Poids total pour le calcul final
 */
export const TOTAL_WEIGHT = 120;

// ===== TYPES ET INTERFACES =====

/**
 * Structure d'une réponse utilisateur
 */
export interface UserResponse {
  question_code: string;
  single_value?: string;        // Pour les questions radio/conditional
  multiple_codes?: string[];    // Pour les questions checkbox/tags
  conditional_main?: string;    // Pour les questions conditionnelles
  conditional_keys?: string[];  // Clés des champs conditionnels
  conditional_values?: string[]; // Valeurs des champs conditionnels
}

/**
 * Résultat du calcul de score de base
 */
export interface BaseScoreResult {
  score_base: number;
  is_eliminated: boolean;
  elimination_reason: string;
  calculation_details: {
    base_score: number;
    total_impact: number;
    final_base_score: number;
  };
}

/**
 * Résultat complet du calcul de score
 */
export interface CompleteScoreResult {
  success: boolean;
  usecase_id: string;
  scores: {
    score_base: number;
    score_model: number | null;
    score_final: number;
    is_eliminated: boolean;
    elimination_reason: string;
  };
  calculation_details: {
    base_score: number;
    total_impact: number;
    final_base_score: number;
    model_score: number | null;
    model_percentage: number | null;
    has_model_score: boolean;
    formula_used: string;
    weights: {
      base_score_weight: number;
      model_score_weight: number;
      total_weight: number;
    };
  };
}

// ===== FONCTIONS UTILITAIRES =====

/**
 * Arrondit un nombre à 2 décimales
 * Exemple: 15.666 devient 15.67
 */
export function roundToTwoDecimals(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Récupère les codes de réponse sélectionnés par l'utilisateur
 * Gère les différents types de réponses (radio, checkbox, conditional)
 * 
 * @param response - Réponse de l'utilisateur à une question
 * @returns Liste des codes de réponse sélectionnés
 */
export function getSelectedCodes(response: UserResponse): string[] {
  // Cas 1: Réponse unique (radio)
  if (response.single_value) {
    // Nettoyer la valeur des guillemets éventuels
    const cleanValue = response.single_value
      .replace(/^"|"$/g, '')       // Enlever les guillemets de début/fin
      .replace(/\\"/g, '"');       // Remplacer les guillemets échappés
    return [cleanValue];
  }
  
  // Cas 2: Réponses multiples (checkbox/tags)
  if (response.multiple_codes && Array.isArray(response.multiple_codes)) {
    return response.multiple_codes;
  }
  
  // Cas 3: Réponse conditionnelle
  if (response.conditional_main) {
    return [response.conditional_main];
  }
  
  // Cas 4: Aucune réponse
  return [];
}

/**
 * Trouve une option de réponse dans les données de questions
 * 
 * @param questionCode - Code de la question (ex: "E4.N7.Q1")
 * @param answerCode - Code de la réponse (ex: "E4.N7.Q1.A")
 * @returns L'option trouvée ou null
 */
export function findQuestionOption(questionCode: string, answerCode: string): QuestionOption | null {
  const question = QUESTIONS_DATA[questionCode];
  if (!question) {
    console.warn(`Question ${questionCode} non trouvée`);
    return null;
  }
  
  const option = question.options.find(opt => opt.code === answerCode);
  if (!option) {
    console.warn(`Option ${answerCode} non trouvée dans la question ${questionCode}`);
    return null;
  }
  
  return option;
}

// ===== FONCTIONS PRINCIPALES =====

/**
 * Calcule le score de base à partir des réponses de l'utilisateur
 * 
 * Logique :
 * 1. Commence avec BASE_SCORE (90 points)
 * 2. Vérifie d'abord les réponses éliminatoires
 * 3. Si pas éliminé, applique tous les impacts négatifs
 * 4. Le score ne peut pas descendre en dessous de 0
 * 
 * @param responses - Toutes les réponses de l'utilisateur
 * @returns Résultat du calcul avec détails
 */
export function calculateBaseScore(responses: UserResponse[]): BaseScoreResult {
  console.log(`🔍 Début du calcul de score de base pour ${responses.length} réponses`);
  
  let totalImpact = 0;
  let isEliminated = false;
  let eliminationReason = '';
  
  // ÉTAPE 1 : Parcourir toutes les réponses
  for (const response of responses) {
    console.log(`📝 Analyse de la réponse pour la question ${response.question_code}`);
    
    // Vérifier que la question existe dans nos données
    const question = QUESTIONS_DATA[response.question_code];
    if (!question) {
      console.warn(`⚠️ Question ${response.question_code} non trouvée - ignorée`);
      continue;
    }
    
    // ÉTAPE 2 : Récupérer les codes de réponse sélectionnés
    const selectedCodes = getSelectedCodes(response);
    console.log(`✅ Codes sélectionnés pour ${response.question_code}:`, selectedCodes);
    
    // ÉTAPE 3 : Analyser chaque réponse sélectionnée
    for (const selectedCode of selectedCodes) {
      const option = findQuestionOption(response.question_code, selectedCode);
      if (!option) {
        continue; // Option non trouvée, passer à la suivante
      }
      
      console.log(`🎯 Analyse de l'option ${selectedCode}: ${option.label}`);
      
      // ÉTAPE 4 : Vérifier si c'est une réponse éliminatoire
      if (option.is_eliminatory) {
        console.log(`❌ RÉPONSE ÉLIMINATOIRE DÉTECTÉE : ${option.label}`);
        isEliminated = true;
        eliminationReason = `Réponse éliminatoire: ${option.label}`;
        break; // Arrêter l'analyse immédiatement
      }
      
      // ÉTAPE 5 : Ajouter l'impact au score total
      if (option.score_impact) {
        totalImpact += option.score_impact;
        console.log(`📊 Impact ajouté: ${option.score_impact} (total: ${totalImpact})`);
      }
    }
    
    // Si une réponse éliminatoire a été trouvée, arrêter complètement
    if (isEliminated) {
      console.log(`🛑 Calcul arrêté - cas d'usage éliminé`);
      break;
    }
  }
  
  // ÉTAPE 6 : Calculer le score final
  let finalScore = 0;
  
  if (isEliminated) {
    // Si éliminé, le score est toujours 0
    finalScore = 0;
    console.log(`💀 Score final : 0 (éliminé)`);
  } else {
    // Sinon, calculer : BASE_SCORE + impacts (minimum 0)
    finalScore = Math.max(0, BASE_SCORE + totalImpact);
    console.log(`✨ Score final : ${finalScore} (base: ${BASE_SCORE} + impacts: ${totalImpact})`);
  }
  
  return {
    score_base: finalScore,
    is_eliminated: isEliminated,
    elimination_reason: eliminationReason,
    calculation_details: {
      base_score: BASE_SCORE,
      total_impact: totalImpact,
      final_base_score: finalScore
    }
  };
}

/**
 * Calcule le score final complet incluant le bonus COMPL-AI
 * 
 * Formule Excel : ((Score_base + (Score_model_% * 20)) / 120) * 100
 * 
 * @param baseScoreResult - Résultat du calcul de score de base
 * @param modelScore - Score du modèle COMPL-AI (0-20) ou null
 * @param usecaseId - ID du cas d'usage
 * @returns Résultat complet du calcul
 */
export function calculateFinalScore(
  baseScoreResult: BaseScoreResult,
  modelScore: number | null,
  usecaseId: string
): CompleteScoreResult {
  console.log(`🎯 Calcul du score final pour le cas d'usage ${usecaseId}`);
  console.log(`📊 Score de base: ${baseScoreResult.score_base}`);
  console.log(`🤖 Score modèle: ${modelScore !== null ? modelScore : 'N/A'}`);
  
  let finalScore = 0;
  let hasValidModelScore = modelScore !== null && modelScore !== undefined;
  
  if (baseScoreResult.is_eliminated) {
    // Si éliminé, le score final est toujours 0
    finalScore = 0;
    console.log(`💀 Score final : 0 (cas éliminé)`);
  } else {
    // ÉTAPE 1 : Calculer la contribution du modèle
    let modelContribution = 0;
    
    if (hasValidModelScore && modelScore !== null) {
      // Convertir le score modèle (0-20) en pourcentage (0-1)
      const modelPercentage = modelScore / COMPL_AI_MULTIPLIER;
      console.log(`🔢 Pourcentage modèle: ${roundToTwoDecimals(modelPercentage * 100)}%`);
      
      // Contribution du modèle : pourcentage * poids du modèle
      modelContribution = modelPercentage * MODEL_SCORE_WEIGHT;
      console.log(`➕ Contribution modèle: ${roundToTwoDecimals(modelContribution)}`);
    }
    
    // ÉTAPE 2 : Appliquer la formule finale
    // Formule : ((score_base + model_contribution) / total_weight) * 100
    finalScore = ((baseScoreResult.score_base + modelContribution) / TOTAL_WEIGHT) * 100;
    console.log(`✨ Score final calculé: ${roundToTwoDecimals(finalScore)}%`);
  }
  
  // ÉTAPE 3 : Construire la formule utilisée pour debug
  const formulaUsed = hasValidModelScore && modelScore !== null 
    ? `((${baseScoreResult.score_base} + (${roundToTwoDecimals(modelScore / COMPL_AI_MULTIPLIER * 100)}% * ${MODEL_SCORE_WEIGHT})) / ${TOTAL_WEIGHT}) * 100`
    : `((${baseScoreResult.score_base} + 0) / ${TOTAL_WEIGHT}) * 100`;
  
  console.log(`📐 Formule utilisée: ${formulaUsed}`);
  
  return {
    success: true,
    usecase_id: usecaseId,
    scores: {
      score_base: baseScoreResult.score_base,
      score_model: modelScore !== null ? roundToTwoDecimals(modelScore) : null,
      score_final: roundToTwoDecimals(finalScore),
      is_eliminated: baseScoreResult.is_eliminated,
      elimination_reason: baseScoreResult.elimination_reason
    },
    calculation_details: {
      ...baseScoreResult.calculation_details,
      model_score: modelScore !== null ? roundToTwoDecimals(modelScore) : null,
      model_percentage: modelScore !== null ? roundToTwoDecimals(modelScore / COMPL_AI_MULTIPLIER * 100) : null,
      has_model_score: hasValidModelScore,
      formula_used: formulaUsed,
      weights: {
        base_score_weight: BASE_SCORE_WEIGHT,
        model_score_weight: MODEL_SCORE_WEIGHT,
        total_weight: TOTAL_WEIGHT
      }
    }
  };
}