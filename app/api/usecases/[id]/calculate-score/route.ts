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
  COMPL_AI_MULTIPLIER,
  type UserResponse 
} from '@/lib/score-calculator-simple';

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
      .select('company_id')
      .eq('id', finalUsecaseId)
      .single();

    if (usecaseError) {
      return createErrorResponse('Cas d\'usage non trouvé', 404);
    }

    // Vérifier que l'utilisateur a accès à ce cas d'usage
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', user.id)
      .single();

    if (profileError || profile.company_id !== usecase.company_id) {
      return createErrorResponse('Accès refusé à ce cas d\'usage', 403);
    }
    
    console.log(`✅ Autorisation confirmée pour l'entreprise: ${usecase.company_id}`);
    
    // ===== ÉTAPE 4: RÉCUPÉRATION DES RÉPONSES =====
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
    
    // ===== ÉTAPE 6: RÉCUPÉRATION DU SCORE MODÈLE COMPL-AI =====
    console.log('🤖 Récupération du score modèle COMPL-AI...');
    
    let modelScore: number | null = null;
    
    try {
      // Récupérer les informations du modèle IA associé au cas d'usage
      const { data: usecaseWithModel, error: modelError } = await supabase
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
        .eq('id', finalUsecaseId)
        .single();
      
      if (modelError) {
        console.warn('⚠️ Impossible de récupérer les infos du modèle:', modelError.message);
      } else if (usecaseWithModel?.compl_ai_models && Array.isArray(usecaseWithModel.compl_ai_models)) {
        // compl_ai_models est un tableau car c'est une relation un-à-plusieurs
        const model = usecaseWithModel.compl_ai_models[0]; // Prendre le premier modèle
        
        if (model?.compl_ai_evaluations && Array.isArray(model.compl_ai_evaluations)) {
          // Filtrer les scores valides (non null)
          const validScores = model.compl_ai_evaluations
            .filter((evaluation: any) => evaluation.score !== null)
            .map((evaluation: any) => evaluation.score);
        
          // Calculer le score moyen si des scores existent
          if (validScores.length > 0) {
            const totalScore = validScores.reduce((sum: number, score: number) => sum + score, 0);
            const averageScore = totalScore / validScores.length;
            
            // Convertir le score (0-1) en score sur 20
            modelScore = averageScore * COMPL_AI_MULTIPLIER;
            
            console.log(`🎯 Score modèle COMPL-AI: ${modelScore}/20 (${Math.round(averageScore * 100)}%)`);
          } else {
            console.log('ℹ️ Aucun score COMPL-AI valide trouvé');
          }
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
    
    // ===== ÉTAPE 8: MISE À JOUR EN BASE DE DONNÉES =====
    console.log('💾 Mise à jour en base de données...');
    
    const { error: updateError } = await supabase
      .from('usecases')
      .update({
        score_base: finalResult.scores.score_base,
        score_model: finalResult.scores.score_model,
        score_final: finalResult.scores.score_final,
        is_eliminated: finalResult.scores.is_eliminated,
        elimination_reason: finalResult.scores.elimination_reason,
        last_calculation_date: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', finalUsecaseId);
    
    if (updateError) {
      console.error('❌ Erreur lors de la mise à jour:', updateError);
      return createErrorResponse('Impossible de mettre à jour les scores', 500);
    }
    
    console.log('✅ Scores mis à jour avec succès');
    
    // ===== ÉTAPE 9: RETOURNER LE RÉSULTAT =====
    console.log('🎉 === CALCUL TERMINÉ AVEC SUCCÈS ===');
    
    return NextResponse.json(finalResult, { status: 200 });
    
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