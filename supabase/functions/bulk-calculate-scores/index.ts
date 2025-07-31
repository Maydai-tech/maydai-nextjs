import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

// ===== TYPES =====
interface BatchResult {
  usecase_id: string;
  success: boolean;
  error?: string;
  scores?: {
    score_base: number;
    score_model: number | null;
    score_final: number;
  };
}

interface BulkCalculationResponse {
  success: boolean;
  processed_count: number;
  success_count: number;
  error_count: number;
  execution_time_ms: number;
  errors: Array<{ usecase_id: string; error: string }>;
  results: BatchResult[];
  summary: {
    average_base_score: number;
    average_model_score: number | null;
    average_final_score: number;
    eliminated_count: number;
  };
}

// ===== CONSTANTES =====
const DEFAULT_BATCH_SIZE = 10;
const DEFAULT_DELAY_MS = 200;

// ===== FONCTIONS UTILITAIRES =====

/**
 * Pause l'exécution pendant un certain temps
 * @param ms - Nombre de millisecondes
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Divise un tableau en lots de taille fixe
 * @param array - Tableau à diviser
 * @param size - Taille de chaque lot
 */
function chunk<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
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

// ===== FONCTION PRINCIPALE =====
Deno.serve(async (req) => {
  const startTime = Date.now();
  
  // Configuration CORS
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
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceRoleKey) {
      return createErrorResponse('Configuration manquante', 500, corsHeaders);
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
    
    // ===== ÉTAPE 2: VÉRIFICATION DE L'AUTHENTIFICATION =====
    // Récupérer le token d'authentification
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return createErrorResponse('Authentification requise', 401, corsHeaders);
    }
    
    // Vérifier l'utilisateur et ses permissions
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return createErrorResponse('Authentification invalide', 401, corsHeaders);
    }
    
    // Vérifier les permissions admin
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    
    if (profileError || !profile || profile.role !== 'admin') {
      return createErrorResponse('Permissions administrateur requises', 403, corsHeaders);
    }
    
    // ===== ÉTAPE 3: EXTRACTION DES PARAMÈTRES =====
    let company_id: string | undefined;
    let batch_size = DEFAULT_BATCH_SIZE;
    let delay_ms = DEFAULT_DELAY_MS;
    
    try {
      const body = await req.json();
      company_id = body.company_id;
      batch_size = body.batch_size || DEFAULT_BATCH_SIZE;
      delay_ms = body.delay_ms || DEFAULT_DELAY_MS;
    } catch (e) {
      // Corps vide ou invalide, utiliser les valeurs par défaut
    }
    
    // ===== ÉTAPE 4: RÉCUPÉRATION DES USE CASES =====
    console.log('Récupération des use cases...');
    
    let query = supabase
      .from('usecases')
      .select('id, name, score_base, score_model, score_final, is_eliminated');
    
    // Filtrer par company_id si fourni
    if (company_id) {
      query = query.eq('company_id', company_id);
    }
    
    const { data: usecases, error: usecasesError } = await query;
    
    if (usecasesError) {
      console.error('Erreur lors de la récupération des use cases:', usecasesError);
      return createErrorResponse('Impossible de récupérer les use cases', 500, corsHeaders);
    }
    
    if (!usecases || usecases.length === 0) {
      return new Response(JSON.stringify({
        success: true,
        processed_count: 0,
        success_count: 0,
        error_count: 0,
        execution_time_ms: Date.now() - startTime,
        errors: [],
        results: [],
        summary: {
          average_base_score: 0,
          average_model_score: null,
          average_final_score: 0,
          eliminated_count: 0
        }
      }), {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    
    console.log(`${usecases.length} use cases trouvés`);
    
    // ===== ÉTAPE 5: TRAITEMENT PAR BATCH =====
    const results: BatchResult[] = [];
    const errors: Array<{ usecase_id: string; error: string }> = [];
    let successCount = 0;
    let errorCount = 0;
    
    // Diviser les use cases en lots
    const batches = chunk(usecases, batch_size);
    
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      console.log(`Traitement du lot ${i + 1}/${batches.length} (${batch.length} use cases)`);
      
      // Traiter chaque use case du lot
      const batchPromises = batch.map(async (usecase) => {
        try {
          // Appeler la fonction calculate-usecase-score
          const response = await fetch(`${supabaseUrl}/functions/v1/calculate-usecase-score`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${supabaseServiceRoleKey}`
            },
            body: JSON.stringify({ usecase_id: usecase.id })
          });
          
          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP ${response.status}: ${errorText}`);
          }
          
          const result = await response.json();
          
          if (result.success) {
            successCount++;
            results.push({
              usecase_id: usecase.id,
              success: true,
              scores: result.scores
            });
          } else {
            errorCount++;
            const errorMessage = result.error || 'Erreur inconnue';
            errors.push({ usecase_id: usecase.id, error: errorMessage });
            results.push({
              usecase_id: usecase.id,
              success: false,
              error: errorMessage
            });
          }
        } catch (error) {
          errorCount++;
          const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
          console.error(`Erreur pour use case ${usecase.id}:`, errorMessage);
          errors.push({ usecase_id: usecase.id, error: errorMessage });
          results.push({
            usecase_id: usecase.id,
            success: false,
            error: errorMessage
          });
        }
      });
      
      // Attendre que tous les appels du lot soient terminés
      await Promise.all(batchPromises);
      
      // Pause entre les lots (sauf pour le dernier)
      if (i < batches.length - 1) {
        console.log(`Pause de ${delay_ms}ms avant le prochain lot...`);
        await sleep(delay_ms);
      }
    }
    
    // ===== ÉTAPE 6: CALCUL DES STATISTIQUES =====
    const successfulResults = results.filter(r => r.success && r.scores);
    
    const summary = {
      average_base_score: 0,
      average_model_score: null as number | null,
      average_final_score: 0,
      eliminated_count: 0
    };
    
    if (successfulResults.length > 0) {
      const baseScores = successfulResults.map(r => r.scores!.score_base);
      const modelScores = successfulResults
        .filter(r => r.scores!.score_model !== null)
        .map(r => r.scores!.score_model!);
      const finalScores = successfulResults.map(r => r.scores!.score_final);
      
      summary.average_base_score = Math.round((baseScores.reduce((a, b) => a + b, 0) / baseScores.length) * 100) / 100;
      summary.average_final_score = Math.round((finalScores.reduce((a, b) => a + b, 0) / finalScores.length) * 100) / 100;
      
      if (modelScores.length > 0) {
        summary.average_model_score = Math.round((modelScores.reduce((a, b) => a + b, 0) / modelScores.length) * 100) / 100;
      }
      
      // Compter les use cases éliminés (score final = 0)
      summary.eliminated_count = successfulResults.filter(r => r.scores!.score_final === 0).length;
    }
    
    // ===== ÉTAPE 7: RETOURNER LE RÉSULTAT =====
    const response: BulkCalculationResponse = {
      success: true,
      processed_count: usecases.length,
      success_count: successCount,
      error_count: errorCount,
      execution_time_ms: Date.now() - startTime,
      errors: errors,
      results: results,
      summary: summary
    };
    
    console.log(`Traitement terminé: ${successCount} succès, ${errorCount} erreurs en ${response.execution_time_ms}ms`);
    
    return new Response(JSON.stringify(response), {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
    
  } catch (error) {
    console.error('Erreur inattendue:', error);
    return createErrorResponse(
      'Erreur serveur interne',
      500,
      corsHeaders
    );
  }
});