/**
 * Calculateur de score simple pour les cas d'usage IA
 *
 * Ce fichier contient la logique métier pure pour calculer le score d'un cas d'usage
 * basé sur les réponses de l'utilisateur au questionnaire IA Act.
 *
 * Principe :
 * 1. Score de base = 100 points (questionnaire = 2/3 du score)
 * 2. Les réponses peuvent diminuer le score (impacts négatifs)
 * 3. Certaines réponses sont éliminatoires (score = 0)
 * 4. Un bonus COMPL-AI peut être ajouté (jusqu'à 50 points = 1/3 du score)
 * 5. Score final = (score_base + bonus_model) / 150 * 100
 *
 * Répartition 2/3 - 1/3 :
 * - Questionnaire : 100 points max (2/3)
 * - Modèle COMPL-AI : 50 points max (1/3) - 5 principes × 10 points
 */

import { loadQuestions } from '@/app/usecases/[id]/utils/questions-loader';
import type { QuestionOption, UseCaseChecklistResponseFields } from '@/types/questions';
import { mergeChecklistIntoUserResponses } from '@/lib/merge-checklist-into-user-responses';

// Charger les questions depuis le JSON
const QUESTIONS_DATA = loadQuestions();

// ===== CONSTANTES DE CALCUL =====
/**
 * Score de départ pour tous les cas d'usage
 * Tous les cas d'usage commencent avec 90 points (2/3 du score final)
 */
export const BASE_SCORE = 90;

/**
 * Multiplicateur pour convertir le score COMPL-AI (0-1) en score brut sur 20
 */
export const COMPL_AI_MULTIPLIER = 20;

/**
 * Poids appliqué au score COMPL-AI brut pour obtenir la contribution finale
 * score_model_raw (0-20) × 2.5 = contribution (0-50)
 */
export const COMPL_AI_WEIGHT = 2.5;

/**
 * Plafond MaydAI par principe COMPL-AI mappé (5 principes → 20 pts agrégés côté barème catégorie dans `calculateScore`).
 * À n’utiliser que lorsqu’une ligne réelle existe dans `compl_ai_maydai_scores` pour ce principe (pas de max artificiel sinon).
 */
export const MAYDAI_MAX_SCORE_PER_COMPL_AI_PRINCIPLE = 4;

/**
 * Poids du score de base dans le calcul final (sur 150 total)
 */
export const BASE_SCORE_WEIGHT = 90;

/**
 * Poids du score modèle dans le calcul final (sur 150 total)
 */
export const MODEL_SCORE_WEIGHT = 50;

/**
 * Marge fixe pour le calcul final (actuellement 0)
 */
export const MARGIN_SCORE = 0;

/**
 * Poids total pour le calcul final (périmètre historique : questionnaire + emplacement modèle).
 * @see resolveTotalFinalWeight — parcours court V3 avec périmètre actif : dénominateur dynamique.
 */
export const TOTAL_WEIGHT = 150;

/**
 * Dénominateur du score final : 150 par défaut ; parcours court V3 avec questions actives
 * → 90 + 50 pour refléter le plafond questionnaire + contribution modèle sur le même barème.
 */
export function resolveTotalFinalWeight(options?: {
  activeQuestionCodes?: Set<string>
  questionnairePathMode?: 'long' | 'short'
}): number {
  const scoped =
    options?.activeQuestionCodes !== undefined && options.activeQuestionCodes.size > 0
  if (scoped && options?.questionnairePathMode === 'short') {
    return BASE_SCORE + MODEL_SCORE_WEIGHT
  }
  return TOTAL_WEIGHT
}

// ===== TYPES ET INTERFACES =====

/**
 * Statuts d'entreprise possibles selon l'IA Act
 */
export type CompanyStatus = 'utilisateur' | 'fabriquant_produits' | 'distributeur' | 'importateur' | 'fournisseur' | 'mandataire' | 'unknown';

/**
 * Structure d'une réponse utilisateur
 */
export interface UserResponse extends UseCaseChecklistResponseFields {
  question_code: string;
  single_value?: string;        // Pour les questions radio/conditional
  multiple_codes?: string[];    // Pour les questions checkbox/tags
  conditional_main?: string;    // Pour les questions conditionnelles
  conditional_keys?: string[];  // Clés des champs conditionnels
  conditional_values?: string[]; // Valeurs des champs conditionnels
}

/** Options scoring questionnaire V2 (sous-ensemble de questions actives, source serveur). */
export interface CalculateBaseScoreOptions {
  activeQuestionCodes?: Set<string>
  /** Codes d’options E5 (gouvernance entreprise) — fusion avant calcul. */
  checklistGovEnterprise?: string[] | null
  /** Codes d’options E6 (transparence cas) — fusion avant calcul. */
  checklistGovUsecase?: string[] | null
}

/** Options du score final (dénominateur dynamique parcours court). */
export interface CalculateFinalScoreOptions {
  activeQuestionCodes?: Set<string>
  questionnairePathMode?: 'long' | 'short'
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
 * Converts raw score points to normalized points on a 100-basis scale.
 *
 * The final score formula is: ((score_base + score_model) / TOTAL_WEIGHT) * 100
 * This function applies the same ratio to any raw point value.
 *
 * Example: If TOTAL_WEIGHT=150 and rawPoints=10, result = (10/150)*100 = 6.67 → 7
 *
 * @param rawPoints - Raw score impact points (e.g., 10)
 * @returns Normalized points as they appear in final score (e.g., 8)
 */
export function normalizeScoreTo100(rawPoints: number): number {
  return Math.round((rawPoints / TOTAL_WEIGHT) * 100);
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
  
  if (response.conditional_main) {
    // E5/E6 : préférer `multiple_codes` (checklist / batch) — ignorer un `conditional_main` orphelin.
    if (
      response.question_code.startsWith('E5.') ||
      response.question_code.startsWith('E6.')
    ) {
      return [];
    }
    return [response.conditional_main];
  }

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
  
  const option = question.options.find((opt: any) => opt.code === answerCode);
  if (!option) {
    console.warn(`Option ${answerCode} non trouvée dans la question ${questionCode}`);
    return null;
  }
  
  return option;
}

/**
 * Détermine le statut d'entreprise basé sur les labels des réponses au questionnaire
 * 
 * Logique basée sur les codes (E4.N7.Q1) puis les labels des réponses affinées :
 * - E4.N7.Q1.B (Déployeur) → "utilisateur"
 * - E4.N7.Q1.C (intégrateur / marque blanche) → "fournisseur"
 * - "Je suis fabricant d'un produit intégrant un système d'IA" → "fabriquant_produits"
 * - "Je distribue et/ou déploie un système d'IA pour d'autres entreprises" → "distributeur"
 * - "Je suis importateur d'un système d'IA" → "importateur"
 * - "Je suis un fournisseur d'un système d'IA" → "fournisseur"
 * - "Je suis représentant autorisé d'un fournisseur de système d'IA" → "mandataire"
 * - "Je suis éditeur d'un logiciel intégrant un système d'IA" → "distributeur"
 * 
 * @param responses - Toutes les réponses de l'utilisateur
 * @returns Statut d'entreprise déterminé
 */
export function determineCompanyStatus(responses: UserResponse[]): CompanyStatus {
  // Parcourir toutes les réponses pour trouver les labels correspondants
  for (const response of responses) {
    const question = QUESTIONS_DATA[response.question_code];
    if (!question) continue;
    
    const selectedCodes = getSelectedCodes(response);
    
    // Analyser chaque réponse sélectionnée
    for (const selectedCode of selectedCodes) {
      if (response.question_code === 'E4.N7.Q1') {
        if (selectedCode === 'E4.N7.Q1.B') {
          return 'utilisateur';
        }
        if (selectedCode === 'E4.N7.Q1.C') {
          return 'fournisseur';
        }
        continue;
      }

      const option = findQuestionOption(response.question_code, selectedCode);
      if (!option) continue;
      
      // Vérifier chaque label pour déterminer le statut
      switch (option.label) {
        case "Mon entreprise utilise des systèmes d'IA tiers":
          return 'utilisateur';
          
        case "Je suis fabricant d'un produit intégrant un système d'IA":
          return 'fabriquant_produits';
          
        case "Je distribue et/ou déploie un système d'IA pour d'autres entreprises":
          return 'distributeur';
          
        case "Je suis importateur d'un système d'IA":
          return 'importateur';
          
        case "Je suis un fournisseur d'un système d'IA":
          return 'fournisseur';
          
        case "Je suis représentant autorisé d'un fournisseur de système d'IA":
          return 'mandataire';
          
        case "Je suis éditeur d'un logiciel intégrant un système d'IA":
          return 'distributeur';
      }
    }
  }
  
  return 'unknown';
}

/**
 * Retourne la définition du statut d'entreprise selon l'IA Act
 */
export function getCompanyStatusDefinition(status: CompanyStatus): string {
  switch (status) {
    case 'utilisateur':
      return 'Déployeur (utilisateur) : Toute personne physique ou morale, autorité publique, agence ou autre organisme qui utilise un système d\'IA sous sa propre autorité, sauf si ce système est utilisé dans le cadre d\'une activité personnelle et non professionnelle.';
    case 'fabriquant_produits':
      return 'Fabricant de Produits : Il s\'agit d\'un fabricant qui met sur le marché européen un système d\'IA avec son propre produit et sous sa propre marque. Si un système d\'IA à haut risque constitue un composant de sécurité d\'un produit couvert par la législation d\'harmonisation de l\'Union, le fabricant de ce produit est considéré comme le fournisseur du système d\'IA à haut risque.';
    case 'distributeur':
      return 'Distributeur : Une personne physique ou morale faisant partie de la chaîne d\'approvisionnement, autre que le fournisseur ou l\'importateur, qui met un système d\'IA à disposition sur le marché de l\'Union.';
    case 'importateur':
      return 'Importateur : Une personne physique ou morale située ou établie dans l\'Union qui met sur le marché un système d\'IA portant le nom ou la marque d\'une personne physique ou morale établie dans un pays tiers.';
    case 'fournisseur':
      return 'Fournisseur : Une personne physique ou morale, une autorité publique, une agence ou tout autre organisme qui développe (ou fait développer) un système d\'IA ou un modèle d\'IA à usage général et le met sur le marché ou le met en service sous son propre nom ou sa propre marque, que ce soit à titre onéreux ou gratuit.';
    case 'mandataire':
      return 'Représentant autorisé (Mandataire) : Une personne physique ou morale située ou établie dans l\'Union qui a reçu et accepté un mandat écrit d\'un fournisseur de système d\'IA ou de modèle d\'IA à usage général pour s\'acquitter en son nom des obligations et des procédures établies par le règlement.';
    case 'unknown':
    default:
      return 'Statut non déterminé : Impossible de déterminer le statut d\'entreprise basé sur les réponses actuelles.';
  }
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
 * @param options - Si `activeQuestionCodes` est défini (V2), seules ces questions comptent (hors périmètre ignoré).
 * @returns Résultat du calcul avec détails
 */
export function calculateBaseScore(
  responses: UserResponse[],
  options?: CalculateBaseScoreOptions
): BaseScoreResult {
  const enriched = mergeChecklistIntoUserResponses(
    responses,
    options?.checklistGovEnterprise,
    options?.checklistGovUsecase
  ) as UserResponse[]

  const scoped =
    options?.activeQuestionCodes !== undefined
      ? enriched.filter(r => options.activeQuestionCodes!.has(r.question_code))
      : enriched

  let totalImpact = 0;
  let isEliminated = false;
  let eliminationReason = '';
  
  // ÉTAPE 1 : Parcourir les réponses du périmètre (V1 = toutes)
  for (const response of scoped) {
    // Vérifier que la question existe dans nos données
    const question = QUESTIONS_DATA[response.question_code];
    if (!question) {
      console.warn(`⚠️ Question ${response.question_code} non trouvée - ignorée`);
      continue;
    }
    
    // ÉTAPE 2 : Récupérer les codes de réponse sélectionnés
    const selectedCodes = getSelectedCodes(response);

    // ÉTAPE 3 : Élimination — toutes les options sélectionnées
    for (const selectedCode of selectedCodes) {
      const option = findQuestionOption(response.question_code, selectedCode);
      if (!option) continue;
      if (option.is_eliminatory) {
        isEliminated = true;
        eliminationReason = `Réponse éliminatoire: ${option.label}`;
        break;
      }
    }
    if (isEliminated) {
      break;
    }

    if (selectedCodes.length === 0) continue;

    // ÉTAPE 4 : Impacts — `impact_mode: any` = une seule prise en compte (min des impacts numériques)
    if (question.impact_mode === 'any') {
      const impacts: number[] = [];
      for (const selectedCode of selectedCodes) {
        const option = findQuestionOption(response.question_code, selectedCode);
        if (option && typeof option.score_impact === 'number') {
          impacts.push(option.score_impact);
        }
      }
      if (impacts.length > 0) {
        const agg = Math.min(...impacts);
        if (agg) {
          totalImpact += agg;
        }
      }
    } else {
      for (const selectedCode of selectedCodes) {
        const option = findQuestionOption(response.question_code, selectedCode);
        if (!option) continue;
        if (option.score_impact) {
          totalImpact += option.score_impact;
        }
      }
    }
  }
  
  // ÉTAPE 6 : Calculer le score final
  let finalScore = 0;
  
  if (isEliminated) {
    // Si éliminé, le score est toujours 0
    finalScore = 0;
  } else {
    // Sinon, calculer : BASE_SCORE + impacts (minimum 0)
    finalScore = Math.max(0, BASE_SCORE + totalImpact);
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
 * Formule : ((Score_base + Score_model × 2.5) / 150) * 100
 *
 * Répartition 2/3 - 1/3 :
 * - Score de base (questionnaire) : max 90 points (60%)
 * - Score modèle (COMPL-AI) : max 20 brut × 2.5 = 50 points (33%)
 *
 * @param baseScoreResult - Résultat du calcul de score de base
 * @param modelScore - Score du modèle COMPL-AI brut (0-20) ou null
 * @param usecaseId - ID du cas d'usage
 * @param options - Dénominateur dynamique (parcours court + périmètre actif)
 * @returns Résultat complet du calcul
 */
export function calculateFinalScore(
  baseScoreResult: BaseScoreResult,
  modelScore: number | null,
  usecaseId: string,
  options?: CalculateFinalScoreOptions
): CompleteScoreResult {
  let finalScore = 0;
  let hasValidModelScore = modelScore !== null && modelScore !== undefined;

  const totalWeight = resolveTotalFinalWeight(options)

  // Calculer la contribution pondérée du modèle (score_model × 2.5)
  const modelContribution = (modelScore || 0) * COMPL_AI_WEIGHT;

  if (baseScoreResult.is_eliminated) {
    // Si éliminé, le score final est toujours 0
    finalScore = 0;
  } else {
    // ÉTAPE 1 : Calculer le score brut (score_base + model_score × 2.5)
    const scoreBrut = baseScoreResult.score_base + modelContribution + MARGIN_SCORE;

    // ÉTAPE 2 : Appliquer la formule finale
    finalScore = (scoreBrut / totalWeight) * 100;
  }

  // Formule exposée dans le résultat (traçabilité calcul)
  const formulaUsed = hasValidModelScore && modelScore !== null
    ? `((${baseScoreResult.score_base} + ${roundToTwoDecimals(modelScore)} × ${COMPL_AI_WEIGHT}) / ${totalWeight}) * 100`
    : `((${baseScoreResult.score_base} + 0) / ${totalWeight}) * 100`;

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
      model_percentage: modelScore !== null ? roundToTwoDecimals((modelScore / COMPL_AI_MULTIPLIER) * 100) : null,
      has_model_score: hasValidModelScore,
      formula_used: formulaUsed,
      weights: {
        base_score_weight: BASE_SCORE_WEIGHT,
        model_score_weight: MODEL_SCORE_WEIGHT,
        total_weight: totalWeight
      }
    }
  };
}