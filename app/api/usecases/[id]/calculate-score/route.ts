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

import questionsData from '@/app/usecases/[id]/data/questions-with-scores.json';

/**
 * Fonction utilitaire pour créer une réponse d'erreur standardisée
 */
function createErrorResponse(message: string, status: number) {
  console.error(`❌ Erreur API: ${message}`);
  return NextResponse.json({ error: message }, { status });
}

/**
 * Calcule le niveau de risque basé sur les réponses de l'utilisateur
 * @param responses - Toutes les réponses de l'utilisateur
 * @returns Le niveau de risque le plus élevé
 */
function calculateRiskLevel(responses: any[]): string {
  let highestRiskLevel = 'minimal';
  const riskHierarchy = ['minimal', 'limited', 'high', 'unacceptable'];

  for (const response of responses) {
    const questionCode = response.question_code;
    const question = questionsData[questionCode as keyof typeof questionsData];
    
    if (!question) continue;

    let selectedRiskLevel: string = 'minimal';

    // Déterminer le niveau de risque basé sur la réponse
    if (response.single_value) {
      // Pour les questions radio ou avec une seule valeur
      const option = question.options?.find((opt: any) => 
        opt.code === response.single_value || opt.label === response.single_value
      );
      
      if (option && 'risk' in option && option.risk) {
        selectedRiskLevel = option.risk;
      }
    } else if (response.multiple_codes && Array.isArray(response.multiple_codes)) {
      // Pour les questions multiples, prendre le risque le plus élevé parmi les options sélectionnées
      for (const code of response.multiple_codes) {
        const option = question.options?.find((opt: any) => opt.code === code);
        if (option && 'risk' in option && option.risk) {
          const optionRisk = option.risk;
          if (riskHierarchy.indexOf(optionRisk) > riskHierarchy.indexOf(selectedRiskLevel)) {
            selectedRiskLevel = optionRisk;
          }
        }
      }
    } else if (response.conditional_main) {
      // Pour les questions conditionnelles
      const option = question.options?.find((opt: any) => 
        opt.code === response.conditional_main || opt.label === response.conditional_main
      );
      
      if (option && 'risk' in option && option.risk) {
        selectedRiskLevel = option.risk;
      }
    }

    // Mettre à jour le niveau de risque le plus élevé
    if (selectedRiskLevel) {
      const currentIndex = riskHierarchy.indexOf(highestRiskLevel);
      const selectedIndex = riskHierarchy.indexOf(selectedRiskLevel);
      
      if (selectedIndex > currentIndex) {
        highestRiskLevel = selectedRiskLevel;
      }

      // Si on a trouvé "unacceptable", on peut arrêter la recherche
      if (highestRiskLevel === 'unacceptable') {
        break;
      }
    }
  }

  return highestRiskLevel;
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
      .select('company_id')
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
    
    // Calculer le score de base
    const baseScoreResult = calculateBaseScore(userResponses);
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
        
        // 2. Récupérer les évaluations du modèle avec les scores MaydAI
        const { data: evaluations, error: evalError } = await supabase
          .from('compl_ai_evaluations')
          .select('maydai_score, principle_id')
          .eq('model_id', usecaseModel.primary_model_id)
          .not('maydai_score', 'is', null);
        
        if (evalError) {
          console.warn('⚠️ Erreur lors de la récupération des évaluations:', evalError.message);
        } else if (evaluations && evaluations.length > 0) {
          // 3. Calculer la somme des scores MaydAI par principe
          // Les scores MaydAI sont déjà normalisés : chaque principe vaut max 4 points
          const principleScores: Record<string, number> = {};
          
          evaluations.forEach((evaluation: any) => {
            const principleId = evaluation.principle_id;
            if (!principleScores[principleId]) {
              principleScores[principleId] = 0;
            }
            principleScores[principleId] += evaluation.maydai_score;
          });
          
          // 4. Calculer le score total (somme des scores par principe, max 20)
          const totalMaydaiScore = Object.values(principleScores).reduce((sum, score) => sum + score, 0);
          modelScore = Math.min(totalMaydaiScore, 20); // Plafonner à 20
          
          console.log(`📊 Scores par principe:`, principleScores);
          console.log(`🎯 Score modèle COMPL-AI total: ${modelScore.toFixed(2)}/20 (${Math.round(modelScore / 20 * 100)}%)`);
          console.log(`📈 Nombre de principes évalués: ${Object.keys(principleScores).length}`);
        } else {
          console.log('ℹ️ Aucun score MaydAI trouvé pour ce modèle');
        }
      } else {
        console.log('ℹ️ Aucun modèle COMPL-AI associé à ce cas d\'usage');
      }
    } catch (error) {
      console.warn('⚠️ Erreur lors de la récupération du score modèle:', error);
      // Continuer sans le score modèle
    }
    
    // ===== ÉTAPE 7: CALCUL DU SCORE FINAL =====
    console.log('🏁 Calcul du score final...');
    
    const finalResult = calculateFinalScore(baseScoreResult, modelScore, finalUsecaseId);
    
    console.log(`✨ Score final: ${finalResult.scores.score_final}%`);
    
    // ===== ÉTAPE 7.5: CALCULER LE NIVEAU DE RISQUE =====
    console.log('🛡️ Calcul du niveau de risque...');
    const riskLevel = calculateRiskLevel(responses);
    console.log(`🛡️ Niveau de risque calculé: ${riskLevel}`);
    
    // ===== ÉTAPE 8: MISE À JOUR EN BASE DE DONNÉES =====
    console.log('💾 Mise à jour en base de données...');
    
    // Préparer les données de mise à jour
    const updateData = {
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