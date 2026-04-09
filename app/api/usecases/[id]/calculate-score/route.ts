/**
 * Route API pour calculer le score d'un cas d'usage
 * 
 * Cette route remplace l'edge function Supabase par une implémentation Next.js simple.
 * Elle calcule le score basé sur les réponses au questionnaire IA Act.
 * 
 * Endpoint: POST /api/usecases/[id]/calculate-score
 * Body: { usecase_id: string }
 * 
 * Étapes du calcul :
 * 1. Authentification et autorisation
 * 2. Récupération des réponses utilisateur
 * 3. Calcul du score de base
 * 4. Récupération du score modèle COMPL-AI
 * 5. Calcul du score final
 * 6. Mise à jour en base de données
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  calculateBaseScore,
  calculateFinalScore,
  determineCompanyStatus,
  getCompanyStatusDefinition,
  COMPL_AI_MULTIPLIER,
  type UserResponse
} from '@/lib/score-calculator-simple';
import { recordUseCaseHistory } from '@/lib/usecase-history';
import {
  resolveCanonicalDocType,
  getDossierDirectBonusSupabaseQueryDocTypes,
  getDossierDirectBonusRawPointsAmount,
  getDirectBonusCanonicalDocTypes,
} from '@/lib/canonical-actions';

import { deriveRiskLevelFromResponses } from '@/lib/risk-level';
import {
  normalizeQuestionnaireVersion,
  QUESTIONNAIRE_VERSION_V2
} from '@/lib/questionnaire-version';
import { buildV2ScoringContextFromDbResponses } from '@/lib/scoring-v2-server';

/**
 * Fonction utilitaire pour créer une réponse d'erreur standardisée
 */
function createErrorResponse(message: string, status: number) {
  console.error(`❌ Erreur API: ${message}`);
  return NextResponse.json({ error: message }, { status });
}

/**
 * POST /api/usecases/[id]/calculate-score
 * Calcule et met à jour le score d'un cas d'usage
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    console.log('🚀 === DÉBUT DU CALCUL DE SCORE ===');
    
    // ===== ÉTAPE 1: INITIALISATION ET AUTHENTIFICATION =====
    console.log('🔐 Vérification de l\'authentification...');
    
    // Récupérer les variables d'environnement Supabase
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseAnonKey) {
      return createErrorResponse('Variables d\'environnement Supabase manquantes', 500);
    }
    
    // Vérifier le token d'authentification
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return createErrorResponse('Token d\'authentification manquant', 401);
    }

    const token = authHeader.replace('Bearer ', '');
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } }
    });
    
    // Vérifier la validité du token
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return createErrorResponse('Token invalide', 401);
    }
    
    console.log(`✅ Utilisateur authentifié: ${user.id}`);
    
    // ===== ÉTAPE 2: VALIDATION DES PARAMÈTRES =====
    const { id: usecaseId } = await params;
    
    // Optionnel : récupérer usecase_id depuis le body (compatibilité avec l'edge function)
    let bodyUsecaseId: string | undefined;
    try {
      const body = await request.json();
      bodyUsecaseId = body.usecase_id;
    } catch {
      // Pas de body JSON, ce n'est pas grave
    }
    
    // Utiliser l'ID des params par défaut, ou celui du body si fourni
    const finalUsecaseId = bodyUsecaseId || usecaseId;
    
    if (!finalUsecaseId) {
      return createErrorResponse('ID du cas d\'usage requis', 400);
    }
    
    console.log(`🎯 Calcul pour le cas d'usage: ${finalUsecaseId}`);
    
    // ===== ÉTAPE 3: VÉRIFICATION DES AUTORISATIONS =====
    console.log('🔒 Vérification des autorisations...');
    
    // Récupérer les informations du cas d'usage
    const { data: usecase, error: usecaseError } = await supabase
      .from('usecases')
      .select('company_id, questionnaire_version')
      .eq('id', finalUsecaseId)
      .single();

    if (usecaseError) {
      return createErrorResponse('Cas d\'usage non trouvé', 404);
    }

    // Vérifier que l'utilisateur a accès à ce cas d'usage via user_companies
    const { data: userCompany, error: userCompanyError } = await supabase
      .from('user_companies')
      .select('company_id')
      .eq('user_id', user.id)
      .eq('company_id', usecase.company_id)
      .single();

    if (userCompanyError || !userCompany) {
      return createErrorResponse('Accès refusé à ce cas d\'usage', 403);
    }
    
    console.log(`✅ Autorisation confirmée pour l'entreprise: ${usecase.company_id}`);
    
    // ===== ÉTAPE 4: RÉCUPÉRATION DU SCORE ACTUEL (AVANT RECALCUL) =====
    console.log('📊 Récupération du score actuel avant recalcul...');

    const { data: currentScoreData } = await supabase
      .from('usecases')
      .select('score_final, risk_level')
      .eq('id', finalUsecaseId)
      .single();

    const previousScore = currentScoreData?.score_final ?? null;
    const previousRiskLevel = currentScoreData?.risk_level ?? null;

    console.log(`📈 Score actuel: ${previousScore}, Risque: ${previousRiskLevel}`);

    // ===== ÉTAPE 5: RÉCUPÉRATION DES RÉPONSES =====
    console.log('📝 Récupération des réponses utilisateur...');

    const { data: responses, error: responsesError } = await supabase
      .from('usecase_responses')
      .select('*')
      .eq('usecase_id', finalUsecaseId);
    
    if (responsesError) {
      console.error('Erreur lors de la récupération des réponses:', responsesError);
      return createErrorResponse('Impossible de récupérer les réponses', 500);
    }
    
    if (!responses || responses.length === 0) {
      return createErrorResponse('Aucune réponse trouvée pour ce cas d\'usage', 404);
    }
    
    console.log(`📊 ${responses.length} réponses trouvées`);
    
    // ===== ÉTAPE 5: CALCUL DU SCORE DE BASE =====
    console.log('🔢 Calcul du score de base...');
    
    // Convertir les réponses au format attendu par le calculateur
    const userResponses: UserResponse[] = responses.map(response => ({
      question_code: response.question_code,
      single_value: response.single_value,
      multiple_codes: response.multiple_codes,
      conditional_main: response.conditional_main,
      conditional_keys: response.conditional_keys,
      conditional_values: response.conditional_values
    }));
    
    const questionnaireVersion = normalizeQuestionnaireVersion(usecase.questionnaire_version);
    const v2ScoringCtx =
      questionnaireVersion === QUESTIONNAIRE_VERSION_V2
        ? buildV2ScoringContextFromDbResponses(questionnaireVersion, responses)
        : null;

    // Calculer le score de base (V2 : sous-ensemble actif serveur uniquement)
    const baseScoreResult = v2ScoringCtx
      ? calculateBaseScore(userResponses, {
          activeQuestionCodes: v2ScoringCtx.scoringActiveQuestionCodes
        })
      : calculateBaseScore(userResponses);
    console.log(`📈 Score de base calculé: ${baseScoreResult.score_base}`);
    
    if (baseScoreResult.is_eliminated) {
      console.log(`⚠️ Cas d'usage éliminé: ${baseScoreResult.elimination_reason}`);
    }
    
    // ===== ÉTAPE 5.5: DÉTERMINATION DU STATUT D'ENTREPRISE =====
    console.log('🏢 Détermination du statut d\'entreprise...');
    
    const companyStatus = determineCompanyStatus(userResponses);
    console.log(`✅ Statut d'entreprise déterminé: ${companyStatus}`);
    
    // ===== ÉTAPE 6: RÉCUPÉRATION DU SCORE MODÈLE COMPL-AI =====
    console.log('🤖 Récupération du score modèle COMPL-AI...');

    let modelScore: number | null = null;

    try {
      // 1. D'abord récupérer le primary_model_id du cas d'usage
      const { data: usecaseModel, error: modelError } = await supabase
        .from('usecases')
        .select('primary_model_id')
        .eq('id', finalUsecaseId)
        .single();

      if (modelError) {
        console.warn('⚠️ Impossible de récupérer les infos du modèle:', modelError.message);
      } else if (usecaseModel?.primary_model_id) {
        console.log(`📋 Modèle trouvé: ${usecaseModel.primary_model_id}`);

        // 2. Récupérer les évaluations du modèle avec les scores COMPL-AI originaux
        const { data: evaluations, error: evalError } = await supabase
          .from('compl_ai_evaluations')
          .select('score, principle_id')
          .eq('model_id', usecaseModel.primary_model_id)
          .not('score', 'is', null);

        if (evalError) {
          console.warn('⚠️ Erreur lors de la récupération des évaluations:', evalError.message);
        } else if (evaluations && evaluations.length > 0) {
          // 3. Calculer la moyenne des scores COMPL-AI par principe
          const principleScores: Record<string, { sum: number; count: number }> = {};

          evaluations.forEach((evaluation: any) => {
            const principleId = evaluation.principle_id;
            if (!principleScores[principleId]) {
              principleScores[principleId] = { sum: 0, count: 0 };
            }
            principleScores[principleId].sum += evaluation.score;
            principleScores[principleId].count += 1;
          });

          // 4. Calculer la moyenne par principe puis la moyenne globale
          const principleAverages = Object.entries(principleScores).map(([id, data]) => ({
            principleId: id,
            average: data.sum / data.count
          }));

          const globalAverageScore = principleAverages.length > 0
            ? principleAverages.reduce((sum, p) => sum + p.average, 0) / principleAverages.length
            : 0;

          // 5. Convertir en score brut sur 20 : moyenne (0-1) × 20
          modelScore = globalAverageScore * COMPL_AI_MULTIPLIER;

          console.log(`📊 Moyennes par principe:`, principleAverages.map(p => `${p.principleId}: ${(p.average * 100).toFixed(1)}%`));
          console.log(`🎯 Moyenne COMPL-AI globale: ${(globalAverageScore * 100).toFixed(1)}%`);
          console.log(`📈 Score modèle brut: ${modelScore.toFixed(2)}/20`);
          console.log(`📈 Nombre de principes évalués: ${principleAverages.length}`);
        } else {
          console.log('ℹ️ Aucun score COMPL-AI trouvé pour ce modèle');
        }
      } else {
        console.log('ℹ️ Aucun modèle COMPL-AI associé à ce cas d\'usage');
      }
    } catch (error) {
      console.warn('⚠️ Erreur lors de la récupération du score modèle:', error);
      // Continuer sans le score modèle
    }
    
    // ===== ÉTAPE 6.5: CALCUL DU BONUS DIRECT (DOSSIERS) =====
    // system_prompt and training_plan give +3 raw points each when their dossier is completed
    // This bonus is separate from questionnaire impacts
    console.log('📁 Vérification des bonus dossiers (catalogue canonique)...');
    
    let todoBonus = 0;
    const DIRECT_BONUS_RAW_POINTS = getDossierDirectBonusRawPointsAmount();
    const DIRECT_BONUS_QUERY_TYPES = getDossierDirectBonusSupabaseQueryDocTypes();
    const DIRECT_BONUS_CANONICAL = new Set(getDirectBonusCanonicalDocTypes());
    
    try {
      // Get the dossier for this use case
      const { data: dossier } = await supabase
        .from('dossiers')
        .select('id')
        .eq('usecase_id', finalUsecaseId)
        .maybeSingle();
      
      if (dossier?.id) {
        const { data: bonusDocs } = await supabase
          .from('dossier_documents')
          .select('doc_type, status')
          .eq('dossier_id', dossier.id)
          .in('doc_type', DIRECT_BONUS_QUERY_TYPES);

        const completedCanonical = new Set<string>();
        if (bonusDocs) {
          for (const doc of bonusDocs) {
            if (doc.status === 'complete' || doc.status === 'validated') {
              const c = resolveCanonicalDocType(doc.doc_type);
              if (DIRECT_BONUS_CANONICAL.has(c)) {
                completedCanonical.add(c);
              }
            }
          }
        }
        for (const c of completedCanonical) {
          todoBonus += DIRECT_BONUS_RAW_POINTS;
          console.log(`📁 Bonus direct +${DIRECT_BONUS_RAW_POINTS} pts bruts pour ${c}`);
        }
      }
      
      console.log(`📁 Total bonus dossiers: +${todoBonus} pts bruts`);
    } catch (error) {
      console.warn('⚠️ Erreur lors de la vérification des bonus dossiers:', error);
      // Continue without bonus
    }
    
    // Apply the todo bonus to the base score before final calculation
    if (todoBonus > 0 && !baseScoreResult.is_eliminated) {
      baseScoreResult.score_base += todoBonus;
      baseScoreResult.calculation_details.final_base_score += todoBonus;
      console.log(`📈 Score de base après bonus dossiers: ${baseScoreResult.score_base}`);
    }
    
    // ===== ÉTAPE 7: CALCUL DU SCORE FINAL =====
    console.log('🏁 Calcul du score final...');
    
    const finalResult = calculateFinalScore(baseScoreResult, modelScore, finalUsecaseId);
    
    console.log(`✨ Score final: ${finalResult.scores.score_final}%`);
    
    // ===== ÉTAPE 7.5: CALCULER LE NIVEAU DE RISQUE =====
    console.log('🛡️ Calcul du niveau de risque...');
    const riskLevel = deriveRiskLevelFromResponses(responses);
    console.log(`🛡️ Niveau de risque calculé: ${riskLevel}`);
    
    // ===== ÉTAPE 8: MISE À JOUR EN BASE DE DONNÉES =====
    console.log('💾 Mise à jour en base de données...');
    
    // Préparer les données de mise à jour
    const updateData: Record<string, unknown> = {
      score_base: finalResult.scores.score_base,
      score_model: finalResult.scores.score_model,
      score_final: finalResult.scores.score_final,
      is_eliminated: finalResult.scores.is_eliminated,
      elimination_reason: finalResult.scores.elimination_reason,
      risk_level: riskLevel, // ← AJOUT DU RISK_LEVEL
      company_status: companyStatus,
      last_calculation_date: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      updated_by: user.id
    };

    if (v2ScoringCtx) {
      updateData.bpgv_variant = v2ScoringCtx.bpgv_variant;
      updateData.ors_exit = v2ScoringCtx.ors_exit;
      updateData.active_question_codes = v2ScoringCtx.active_question_codes;
    }
    
    console.log('✅ Mise à jour avec le statut d\'entreprise:', companyStatus);
    
    const { error: updateError } = await supabase
      .from('usecases')
      .update(updateData)
      .eq('id', finalUsecaseId);
    
    if (updateError) {
      console.error('❌ Erreur lors de la mise à jour:', updateError);
      return createErrorResponse('Impossible de mettre à jour les scores', 500);
    }

    console.log('✅ Scores mis à jour avec succès');

    // Enregistrer l'événement de réévaluation dans l'historique avec l'évolution du score
    await recordUseCaseHistory(supabase, finalUsecaseId, user.id, 'reevaluated', {
      metadata: {
        previous_score: previousScore,
        new_score: finalResult.scores.score_final,
        score_change: previousScore !== null ? Math.round((finalResult.scores.score_final - previousScore) * 100) / 100 : null,
        previous_risk_level: previousRiskLevel,
        new_risk_level: riskLevel
      }
    });

    // ===== ÉTAPE 9: RETOURNER LE RÉSULTAT =====
    console.log('🎉 === CALCUL TERMINÉ AVEC SUCCÈS ===');
    
    return NextResponse.json({
      ...finalResult,
      company_status: companyStatus,  // NOUVEAU: Inclure le statut d'entreprise dans la réponse
      company_status_definition: getCompanyStatusDefinition(companyStatus)
    }, { status: 200 });
    
  } catch (error) {
    // Gestion des erreurs inattendues
    console.error('💥 Erreur inattendue lors du calcul:', error);
    
    return NextResponse.json({
      error: 'Erreur serveur interne',
      details: error instanceof Error ? error.message : 'Erreur inconnue'
    }, { status: 500 });
  }
}

/**
 * GET /api/usecases/[id]/calculate-score
 * Méthode non supportée - utiliser POST
 */
export async function GET() {
  return NextResponse.json({
    error: 'Méthode non supportée',
    message: 'Utilisez POST pour calculer un score'
  }, { status: 405 });
}