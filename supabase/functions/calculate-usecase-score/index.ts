import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';
import QUESTIONS_DATA from './questions-data.json' assert { type: 'json' };

// ===== CONSTANTES =====
// Score de départ pour tous les cas d'usage
// Répartition 2/3 (Questionnaire) - 1/3 (Modèle LLM)
const BASE_SCORE = 100;
// Multiplicateur pour convertir le score COMPL-AI (0-1) en score sur 50
// 5 principes × 10 points = 50 points max
const COMPL_AI_MULTIPLIER = 50;
// Poids du score de base dans le calcul final
const BASE_SCORE_WEIGHT = 100;
// Poids du score modèle dans le calcul final
const MODEL_SCORE_WEIGHT = 50;
// Marge fixe pour le calcul final (actuellement 0)
const MARGIN_SCORE = 0;
// Poids total pour le calcul final
const TOTAL_WEIGHT = 150;

// ===== FONCTIONS UTILITAIRES =====

/**
 * Arrondit un nombre à 2 décimales
 * Exemple: 15.666 devient 15.67
 */
function roundToTwoDecimals(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Crée une réponse d'erreur standardisée
 */
function createErrorResponse(message: string, status: number, corsHeaders: any) {
  return new Response(JSON.stringify({ error: message }), {
    status: status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json'
    }
  });
}

// ===== DONNÉES DES QUESTIONS =====
// Les données des questions sont maintenant importées depuis questions-data.json
// Ce fichier JSON est synchronisé avec app/usecases/[id]/data/questions-with-scores.json

/** Aligné sur `types/questions.ts` — batch E5/E6 sans colonnes dédiées. */
const BPGV_CHECKLIST_RESPONSE_CODE = 'E5.N9._CHECKLIST'
const TRANSPARENCY_CHECKLIST_RESPONSE_CODE = 'E6.N10._CHECKLIST'

function isE5OrE6QuestionCode(questionCode: string): boolean {
  return questionCode.startsWith('E5.N9.') || questionCode.startsWith('E6.N10.')
}

/** Ex. `E5.N9.Q5.B` → `E5.N9.Q5` */
function optionParentQuestionId(optionCode: string): string | null {
  const parts = optionCode.split('.')
  if (parts.length < 4) return null
  return parts.slice(0, 3).join('.')
}

/**
 * Extrait les clés batch (colonnes `bpgv_keys` / `transparency_keys` ou `multiple_codes` sur lignes sentinelles).
 */
function extractBpgvTransparencyChecklistKeys(responses: any[]): {
  bpgvKeys: string[]
  transparencyKeys: string[]
} {
  let bpgvKeys: string[] = []
  let transparencyKeys: string[] = []
  for (const r of responses) {
    const qc = r.question_code as string
    if (Array.isArray(r.bpgv_keys) && r.bpgv_keys.length > 0) {
      bpgvKeys = r.bpgv_keys
    } else if (qc === BPGV_CHECKLIST_RESPONSE_CODE && Array.isArray(r.multiple_codes) && r.multiple_codes.length > 0) {
      bpgvKeys = r.multiple_codes
    }
    if (Array.isArray(r.transparency_keys) && r.transparency_keys.length > 0) {
      transparencyKeys = r.transparency_keys
    } else if (qc === TRANSPARENCY_CHECKLIST_RESPONSE_CODE && Array.isArray(r.multiple_codes) && r.multiple_codes.length > 0) {
      transparencyKeys = r.multiple_codes
    }
  }
  return { bpgvKeys, transparencyKeys }
}

function hasBatchE5E6Checklist(bpgvKeys: string[], transparencyKeys: string[]): boolean {
  return bpgvKeys.length > 0 || transparencyKeys.length > 0
}

/**
 * Impacts pour un ensemble de codes d’options (E5/E6), groupés par question parente.
 * `impact_mode === 'any'` : un seul impact négatif retenu par question (min des impacts numériques).
 */
function sumChecklistOptionImpacts(
  optionCodes: string[],
  questionsData: Record<string, any>
): { totalImpact: number; isEliminated: boolean; eliminationReason: string } {
  let totalImpact = 0
  let isEliminated = false
  let eliminationReason = ''

  const byQuestion = new Map<string, string[]>()
  for (const code of optionCodes) {
    const qid = optionParentQuestionId(code)
    if (!qid) continue
    if (!byQuestion.has(qid)) byQuestion.set(qid, [])
    byQuestion.get(qid)!.push(code)
  }

  for (const [questionId, codes] of byQuestion) {
    const question = questionsData[questionId]
    if (!question?.options) continue

    const uniqueCodes = [...new Set(codes)]

    for (const selectedCode of uniqueCodes) {
      const option = question.options.find((opt: any) => opt.code === selectedCode)
      if (option?.is_eliminatory) {
        isEliminated = true
        eliminationReason = `Réponse éliminatoire: ${option.label}`
        return { totalImpact, isEliminated, eliminationReason }
      }
    }

    const impacts: number[] = []
    for (const selectedCode of uniqueCodes) {
      const option = question.options.find((opt: any) => opt.code === selectedCode)
      if (option && typeof option.score_impact === 'number') {
        impacts.push(option.score_impact)
      }
    }
    if (impacts.length === 0) continue

    if (question.impact_mode === 'any') {
      const agg = Math.min(...impacts)
      if (agg) totalImpact += agg
    } else {
      for (const selectedCode of uniqueCodes) {
        const option = question.options.find((opt: any) => opt.code === selectedCode)
        if (option?.score_impact) {
          totalImpact += option.score_impact
        }
      }
    }
  }

  return { totalImpact, isEliminated, eliminationReason }
}

/**
 * Codes sélectionnés pour le score — E5/E6 : pas de `conditional_main` / `conditional_keys`.
 */
function getSelectedCodesForScoring(response: any, questionCode: string): string[] {
  const isE56 = isE5OrE6QuestionCode(questionCode)

  if (response.single_value) {
    const cleanValue = response.single_value
      .replace(/^"|"$/g, '')
      .replace(/\\"/g, '"')
    return [cleanValue]
  }

  if (response.multiple_codes && Array.isArray(response.multiple_codes)) {
    return response.multiple_codes
  }

  if (!isE56 && response.conditional_main) {
    return [response.conditional_main]
  }

  return []
}

// ===== FONCTION PRINCIPALE =====
Deno.serve(async (req) => {
  // Configuration CORS pour permettre les appels depuis le frontend
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
  };
  
  // Gérer les requêtes OPTIONS (preflight CORS)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  
  try {
    // ===== ÉTAPE 1: INITIALISATION =====
    // Récupérer les variables d'environnement
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    // Créer le client Supabase
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
    
    // ===== ÉTAPE 2: VALIDATION DE LA REQUÊTE =====
    // Extraire l'ID du use case depuis la requête
    const { usecase_id } = await req.json();
    
    if (!usecase_id) {
      return createErrorResponse('usecase_id est requis', 400, corsHeaders);
    }
    // ===== ÉTAPE 3: RÉCUPÉRATION DES RÉPONSES =====
    // Récupérer toutes les réponses de l'utilisateur pour ce use case
    const { data: responses, error: responsesError } = await supabase
      .from('usecase_responses')
      .select('*')
      .eq('usecase_id', usecase_id);
    
    if (responsesError) {
      console.error('Erreur lors de la récupération des réponses:', responsesError);
      return createErrorResponse('Impossible de récupérer les réponses', 500, corsHeaders);
    }
    
    if (!responses || responses.length === 0) {
      return createErrorResponse('Aucune réponse trouvée pour ce use case', 404, corsHeaders);
    }
    // ===== ÉTAPE 4: CALCUL DU SCORE DE BASE =====
    // Calculer le score basé sur les réponses
    const baseScoreResult = calculateBaseScore(responses);
    // ===== ÉTAPE 5: RÉCUPÉRATION DU MODÈLE COMPL-AI =====
    // Récupérer les informations du modèle IA associé au use case
    const { data: usecase, error: usecaseError } = await supabase
      .from('usecases')
      .select(`
        primary_model_id,
        compl_ai_models (
          model_name,
          compl_ai_evaluations (
            score
          )
        )
      `)
      .eq('id', usecase_id)
      .single();
    
    if (usecaseError) {
      console.warn('Impossible de récupérer les infos du modèle:', usecaseError);
    }
    // ===== ÉTAPE 6: CALCUL DU SCORE DU MODÈLE =====
    let modelScore = null;
    let hasValidModelScore = false;
    
    // Vérifier si le use case a un modèle associé avec des évaluations
    if (usecase?.compl_ai_models?.compl_ai_evaluations) {
      // Filtrer les scores valides (non null)
      const validScores = usecase.compl_ai_models.compl_ai_evaluations
        .filter((evaluation: any) => evaluation.score !== null)
        .map((evaluation: any) => evaluation.score);
      
      // Calculer le score moyen si des scores existent
      if (validScores.length > 0) {
        const totalScore = validScores.reduce((sum: number, score: number) => sum + score, 0);
        const averageScore = totalScore / validScores.length;
        
        // Convertir le score (0-1) en score sur 20
        modelScore = averageScore * COMPL_AI_MULTIPLIER;
        hasValidModelScore = true;
      }
    }
    // ===== ÉTAPE 7: CALCUL DU SCORE FINAL =====
    // Formule : ((Score_base + Score_model + Marge) / 150) * 100
    // Exemple: base 60, modèle 40.25, marge 0 → ((60 + 40.25 + 0) / 150) * 100 = 66.83%
    let finalScore = 0;
    
    if (baseScoreResult.is_eliminated) {
      // Si éliminé, le score final est toujours 0
      finalScore = 0;
    } else {
      // Calculer le score brut (score_base + model_score + marge)
      const scoreBrut = baseScoreResult.score_base + (modelScore || 0) + MARGIN_SCORE;
      
      // Formule finale : (score_brut / 150) * 100
      finalScore = (scoreBrut / TOTAL_WEIGHT) * 100;
    }
    
    // ===== ÉTAPE 7.5: CALCULER LE NIVEAU DE RISQUE =====
    const riskLevel = calculateRiskLevel(responses);
    
    // ===== ÉTAPE 8: MISE À JOUR EN BASE DE DONNÉES =====
    const { error: updateError } = await supabase
      .from('usecases')
      .update({
        score_base: baseScoreResult.score_base,
        score_model: modelScore !== null ? roundToTwoDecimals(modelScore) : null,
        score_final: roundToTwoDecimals(finalScore),
        is_eliminated: baseScoreResult.is_eliminated,
        elimination_reason: baseScoreResult.elimination_reason,
        risk_level: riskLevel,
        last_calculation_date: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', usecase_id);
    
    if (updateError) {
      console.error('Erreur lors de la mise à jour:', updateError);
      return createErrorResponse('Impossible de mettre à jour les scores', 500, corsHeaders);
    }
    // ===== ÉTAPE 9: RETOURNER LE RÉSULTAT =====
    return new Response(JSON.stringify({
      success: true,
      usecase_id,
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
        formula_used: hasValidModelScore && modelScore !== null 
          ? `((${baseScoreResult.score_base} + (${roundToTwoDecimals(modelScore / COMPL_AI_MULTIPLIER * 100)}% * ${MODEL_SCORE_WEIGHT})) / ${TOTAL_WEIGHT}) * 100`
          : `((${baseScoreResult.score_base} + 0) / ${TOTAL_WEIGHT}) * 100`,
        weights: {
          base_score_weight: BASE_SCORE_WEIGHT,
          model_score_weight: MODEL_SCORE_WEIGHT,
          total_weight: TOTAL_WEIGHT
        }
      }
    }), {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    // Gestion des erreurs inattendues
    console.error('Erreur inattendue:', error);
    return createErrorResponse(
      'Erreur serveur interne',
      500,
      corsHeaders
    );
  }
});
/**
 * Calcule le score de base à partir des réponses de l'utilisateur
 * @param responses - Toutes les réponses de l'utilisateur
 * @returns Objet contenant le score et les détails du calcul
 */
function calculateBaseScore(responses: any[]) {
  let totalImpact = 0;
  let isEliminated = false;
  let eliminationReason = '';

  const { bpgvKeys, transparencyKeys } = extractBpgvTransparencyChecklistKeys(responses);
  const useBatchE5E6 = hasBatchE5E6Checklist(bpgvKeys, transparencyKeys);

  if (useBatchE5E6) {
    const batch = sumChecklistOptionImpacts([...bpgvKeys, ...transparencyKeys], QUESTIONS_DATA as any);
    totalImpact += batch.totalImpact;
    if (batch.isEliminated) {
      isEliminated = true;
      eliminationReason = batch.eliminationReason;
    }
  }

  if (!isEliminated) {
    for (const response of responses) {
      const qc = response.question_code as string;

      if (useBatchE5E6) {
        if (isE5OrE6QuestionCode(qc)) continue;
        if (qc === BPGV_CHECKLIST_RESPONSE_CODE || qc === TRANSPARENCY_CHECKLIST_RESPONSE_CODE) continue;
      }

      const question = QUESTIONS_DATA[qc as keyof typeof QUESTIONS_DATA];

      if (!question) {
        console.warn(`Question ${qc} non trouvée`);
        continue;
      }

      const selectedCodes = getSelectedCodesForScoring(response, qc);

      for (const selectedCode of selectedCodes) {
        const option = question.options.find((opt: any) => opt.code === selectedCode);
        if (!option) {
          console.warn(`Option ${selectedCode} non trouvée`);
          continue;
        }
        if (option.is_eliminatory) {
          isEliminated = true;
          eliminationReason = `Réponse éliminatoire: ${option.label}`;
          break;
        }
      }
      if (isEliminated) break;

      if (selectedCodes.length === 0) continue;

      if ((question as any).impact_mode === 'any') {
        const impacts: number[] = [];
        for (const selectedCode of selectedCodes) {
          const option = question.options.find((opt: any) => opt.code === selectedCode);
          if (option && typeof option.score_impact === 'number') {
            impacts.push(option.score_impact);
          }
        }
        if (impacts.length > 0) {
          const agg = Math.min(...impacts);
          if (agg) totalImpact += agg;
        }
      } else {
        for (const selectedCode of selectedCodes) {
          const option = question.options.find((opt: any) => opt.code === selectedCode);
          if (!option) continue;
          if (option.score_impact) {
            totalImpact += option.score_impact;
          }
        }
      }
    }
  }

  const finalScore = isEliminated ? 0 : Math.max(0, BASE_SCORE + totalImpact);

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
 * Calcule le niveau de risque basé sur les réponses de l'utilisateur
 * @param responses - Toutes les réponses de l'utilisateur
 * @returns Le niveau de risque le plus élevé
 */
function calculateRiskLevel(responses: any[]): string {
  let highestRiskLevel = 'minimal';
  const riskHierarchy = ['minimal', 'limited', 'high', 'unacceptable'];

  const bumpFromOptionCode = (optionCode: string) => {
    const qid = optionParentQuestionId(optionCode);
    if (!qid) return;
    const question = QUESTIONS_DATA[qid as keyof typeof QUESTIONS_DATA];
    if (!question?.options) return;
    const option = question.options.find((opt: any) => opt.code === optionCode);
    if (option && 'risk' in option && typeof (option as any).risk === 'string') {
      const optionRisk = (option as any).risk;
      if (riskHierarchy.indexOf(optionRisk) > riskHierarchy.indexOf(highestRiskLevel)) {
        highestRiskLevel = optionRisk;
      }
    }
  };

  const { bpgvKeys, transparencyKeys } = extractBpgvTransparencyChecklistKeys(responses);
  const useBatchE5E6 = hasBatchE5E6Checklist(bpgvKeys, transparencyKeys);
  if (useBatchE5E6) {
    for (const code of [...bpgvKeys, ...transparencyKeys]) {
      bumpFromOptionCode(code);
    }
  }

  for (const response of responses) {
    const questionCode = response.question_code as string;
    if (useBatchE5E6) {
      if (isE5OrE6QuestionCode(questionCode)) continue;
      if (questionCode === BPGV_CHECKLIST_RESPONSE_CODE || questionCode === TRANSPARENCY_CHECKLIST_RESPONSE_CODE) {
        continue;
      }
    }

    const question = QUESTIONS_DATA[questionCode as keyof typeof QUESTIONS_DATA];

    if (!question) continue;

    let selectedRiskLevel: string | undefined;

    const selectedCodes = getSelectedCodesForScoring(response, questionCode);
    for (const code of selectedCodes) {
      const option = question.options?.find((opt: any) => opt.code === code);
      if (option && 'risk' in option) {
        const optionRisk = option.risk;
        if (riskHierarchy.indexOf(optionRisk) > riskHierarchy.indexOf(selectedRiskLevel || 'minimal')) {
          selectedRiskLevel = optionRisk;
        }
      }
    }

    if (selectedRiskLevel && riskHierarchy.indexOf(selectedRiskLevel) > riskHierarchy.indexOf(highestRiskLevel)) {
      highestRiskLevel = selectedRiskLevel;
    }
  }

  return highestRiskLevel;
}
