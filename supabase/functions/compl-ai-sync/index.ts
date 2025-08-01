import "jsr:@supabase/functions-js/edge-runtime.d.ts";
/// <reference lib="deno.ns" />

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Client } from "https://esm.sh/@gradio/client@1";

// Configuration des catégories et leurs endpoints/paramètres selon la nouvelle API
const CATEGORY_CONFIG = {
  "technical_robustness_safety": {
    endpoint: "/partial",
    params: {
      param_0: ["MMLU: Robustness", "BoolQ Contrast Set", "IMDB Contrast Set", "Monotonicity Checks", "Self-Check Consistency"],
      param_1: ["Goal Hijacking and Prompt Leakage", "Rule Following"]
    },
    benchmarkMapping: [
      { name: "MMLU: Robustness", key: "mmlu_robustness_score", category: "robustness" },
      { name: "BoolQ Contrast Set", key: "boolq_contrast_score", category: "robustness" },
      { name: "IMDB Contrast Set", key: "imdb_contrast_score", category: "robustness" },
      { name: "Monotonicity Checks", key: "monotonicity_checks_score", category: "consistency" },
      { name: "Self-Check Consistency", key: "self_check_consistency_score", category: "consistency" },
      { name: "Goal Hijacking and Prompt Leakage", key: "goal_hijacking_score", category: "security" },
      { name: "Rule Following", key: "rule_following_score", category: "security" }
    ]
  },
  "privacy_data_governance": {
    endpoint: "/partial_2",
    params: {
      param_0: ["Toxicity of the Dataset", "Bias of the Dataset"],
      param_1: ["Copyrighted Material Memorization"],
      param_2: ["PII Extraction by Association"]
    },
    benchmarkMapping: [
      { name: "Toxicity of the Dataset", key: "toxicity_dataset_score", category: "data_quality" },
      { name: "Bias of the Dataset", key: "bias_dataset_score", category: "data_quality" },
      { name: "Copyrighted Material Memorization", key: "copyrighted_material_score", category: "privacy" },
      { name: "PII Extraction by Association", key: "pii_extraction_score", category: "privacy" }
    ]
  },
  "transparency": {
    endpoint: "/partial_5",
    params: {
      param_0: ["General Knowledge: MMLU", "Reasoning: AI2 Reasoning Challenge", "Common Sense Reasoning: HellaSwag", "Truthfulness: TruthfulQA MC2", "Coding: HumanEval"],
      param_1: ["Logit Calibration: BIG-Bench", "Self-Assessment: TriviaQA"],
      param_2: ["Denying Human Presence"],
      param_3: ["Watermark Reliability & Robustness"]
    },
    benchmarkMapping: [
      { name: "General Knowledge: MMLU", key: "mmlu_general_score", category: "capabilities" },
      { name: "Reasoning: AI2 Reasoning Challenge", key: "ai2_reasoning_score", category: "capabilities" },
      { name: "Common Sense Reasoning: HellaSwag", key: "hellaswag_score", category: "capabilities" },
      { name: "Truthfulness: TruthfulQA MC2", key: "truthfulqa_score", category: "truthfulness" },
      { name: "Coding: HumanEval", key: "humaneval_score", category: "capabilities" },
      { name: "Logit Calibration: BIG-Bench", key: "logit_calibration_score", category: "calibration" },
      { name: "Self-Assessment: TriviaQA", key: "self_assessment_score", category: "calibration" },
      { name: "Denying Human Presence", key: "denying_human_presence_score", category: "awareness" },
      { name: "Watermark Reliability & Robustness", key: "watermark_reliability_score", category: "watermark" }
    ]
  },
  "diversity_non_discrimination_fairness": {
    endpoint: "/partial_9",
    params: {
      param_0: ["Representation Bias: RedditBias", "Prejudiced Answers: BBQ", "Biased Completions: BOLD"],
      param_1: ["Income Fairness: DecodingTrust", "Recommendation Consistency: FaiRLLM"]
    },
    benchmarkMapping: [
      { name: "Representation Bias: RedditBias", key: "reddit_bias_score", category: "bias" },
      { name: "Prejudiced Answers: BBQ", key: "bbq_prejudice_score", category: "bias" },
      { name: "Biased Completions: BOLD", key: "bold_completions_score", category: "bias" },
      { name: "Income Fairness: DecodingTrust", key: "income_fairness_score", category: "fairness" },
      { name: "Recommendation Consistency: FaiRLLM", key: "recommendation_consistency_score", category: "fairness" }
    ]
  },
  "social_environmental_wellbeing": {
    endpoint: "/partial_11",
    params: {
      param_0: ["Toxic Completions of Benign Text: RealToxicityPrompts", "Following Harmful Instructions: AdvBench"]
    },
    benchmarkMapping: [
      { name: "Toxic Completions of Benign Text: RealToxicityPrompts", key: "real_toxicity_prompts_score", category: "toxicity" },
      { name: "Following Harmful Instructions: AdvBench", key: "adv_bench_score", category: "safety" }
    ]
  }
};

interface BenchmarkDetail {
  name: string;
  key: string;
  category: string;
  score: number;
  position: number;
}

interface ModelScore {
  modelName: string;
  modelProvider: string;
  scores: number[];
  averageScore: number;
  benchmarksCount: number;
  detailedScores: BenchmarkDetail[];
}

async function callGradioAPI(endpoint: string, params: Record<string, any>): Promise<any> {
  console.log(`Calling Gradio API: ${endpoint} with params:`, params);
  
  try {
    // Connexion au client Gradio
    const client = await Client.connect("latticeflow/compl-ai-board");
    
    // Appel à l'endpoint avec les paramètres
    const result = await client.predict(endpoint, params);
    
    console.log(`API response for ${endpoint}:`, result);
    
    // La réponse devrait contenir les données dans result.data
    return result.data;
    
  } catch (error) {
    console.error(`Failed to call Gradio API ${endpoint}:`, error);
    throw error;
  }
}

function parseModelName(rawModelName: string): { name: string; provider: string } {
  if (!rawModelName || typeof rawModelName !== 'string') {
    return { name: '', provider: '' };
  }
  
  // Si c'est une balise HTML, extraire le texte
  let cleanName = rawModelName;
  if (rawModelName.includes('<a') && rawModelName.includes('</a>')) {
    const match = rawModelName.match(/>([^<]+)</);
    cleanName = match ? match[1].trim() : rawModelName.trim();
  } else {
    cleanName = rawModelName.trim();
  }
  
  // Séparer le provider du nom si il y a un slash
  if (cleanName.includes('/')) {
    const [provider, ...nameParts] = cleanName.split('/');
    return {
      name: nameParts.join('/').trim(),
      provider: provider.trim()
    };
  }
  
  // Essayer de détecter le provider à partir du nom
  const detectedProvider = detectProvider(cleanName);
  return {
    name: cleanName,
    provider: detectedProvider
  };
}

function detectProvider(modelName: string): string {
  const name = modelName.toLowerCase();
  
  // Mapping des noms de modèles vers leurs providers
  if (name.includes('gpt') || name.includes('openai')) return 'OpenAI';
  if (name.includes('claude')) return 'Anthropic';
  if (name.includes('gemini') || name.includes('bard')) return 'Google';
  if (name.includes('llama') || name.includes('meta')) return 'Meta';
  if (name.includes('mistral')) return 'Mistral AI';
  if (name.includes('cohere')) return 'Cohere';
  if (name.includes('anthropic')) return 'Anthropic';
  if (name.includes('google')) return 'Google';
  if (name.includes('microsoft')) return 'Microsoft';
  if (name.includes('huggingface')) return 'Hugging Face';
  
  // Retourner 'Unknown' si aucun provider détecté
  return 'Unknown';
}

function mapScoresToBenchmarkDetails(scores: number[], categoryCode: string): BenchmarkDetail[] {
  const config = (CATEGORY_CONFIG as any)[categoryCode];
  if (!config || !config.benchmarkMapping) {
    console.warn(`No benchmark mapping found for category: ${categoryCode}`);
    return [];
  }

  const benchmarkMapping = config.benchmarkMapping;
  const detailedScores: BenchmarkDetail[] = [];

  scores.forEach((score, index) => {
    if (index < benchmarkMapping.length) {
      const benchmark = benchmarkMapping[index];
      detailedScores.push({
        name: benchmark.name,
        key: benchmark.key,
        category: benchmark.category,
        score: score,
        position: index
      });
    }
  });

  return detailedScores;
}

function parseModelScores(data: any, categoryCode: string): ModelScore[] {
  // La réponse Gradio devrait être un array où le premier élément contient les données
  let tableData = data;
  
  // Si c'est un array, prendre le premier élément
  if (Array.isArray(data) && data.length > 0) {
    tableData = data[0];
  }
  
  if (!tableData || !tableData.headers || !tableData.data) {
    console.error('Invalid data structure from API:', data);
    throw new Error('Invalid data structure from API');
  }

  const headers = tableData.headers;
  const rows = tableData.data;
  
  // Trouver l'index de la colonne "Model"
  const modelIndex = headers.findIndex((h: string) => h.toLowerCase().includes('model'));
  if (modelIndex === -1) {
    throw new Error('Model column not found in headers');
  }

  const results: ModelScore[] = [];
  
  for (const row of rows) {
    const rawModelName = row[modelIndex];
    if (!rawModelName || typeof rawModelName !== 'string') continue;
    
    // Parser le nom du modèle pour extraire le texte des balises HTML et le provider
    const parsedModel = parseModelName(rawModelName);
    if (!parsedModel.name) continue;
    
    // Extraire les scores numériques (ignorer les colonnes non-numériques)
    const scores: number[] = [];
    for (let i = 0; i < row.length; i++) {
      if (i === modelIndex) continue; // Skip model name column
      if (i < 3) continue; // Skip first few columns (usually status, model, report)
      
      const value = row[i];
      if (typeof value === 'number' && !isNaN(value) && value >= 0 && value <= 1) {
        scores.push(value);
      } else if (typeof value === 'string' && value !== 'N/A' && value !== '') {
        const numValue = parseFloat(value);
        if (!isNaN(numValue) && numValue >= 0 && numValue <= 1) {
          scores.push(numValue);
        }
      }
    }
    
    if (scores.length > 0) {
      const averageScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
      const detailedScores = mapScoresToBenchmarkDetails(scores, categoryCode);
      
      results.push({
        modelName: parsedModel.name,
        modelProvider: parsedModel.provider,
        scores,
        averageScore,
        benchmarksCount: scores.length,
        detailedScores
      });
    }
  }
  
  return results;
}

async function upsertModelScores(supabase: any, categoryCode: string, modelScores: ModelScore[], evaluationDate: string) {
  // Récupérer l'ID de la catégorie
  const { data: principle, error: principleError } = await supabase
    .from('compl_ai_principles')
    .select('id')
    .eq('code', categoryCode)
    .single();

  if (principleError || !principle) {
    throw new Error(`Category not found: ${categoryCode}`);
  }

  const categoryId = principle.id;

  // Supprimer les anciennes données pour cette catégorie et date
  await supabase
    .from('compl_ai_evaluations')
    .delete()
    .eq('principle_id', categoryId)
    .eq('evaluation_date', evaluationDate)
    .eq('data_source', 'compl-ai-api');

  // Insérer les nouveaux scores pour chaque modèle
  for (const modelScore of modelScores) {
    // Upsert model
    const { data: model, error: modelError } = await supabase
      .from('compl_ai_models')
      .upsert([{
        model_name: modelScore.modelName,
        model_provider: modelScore.modelProvider,
        model_type: null,
        version: null
      }], {
        onConflict: 'model_name'
      })
      .select()
      .single();

    if (modelError || !model) {
      console.error(`Failed to upsert model ${modelScore.modelName}:`, modelError);
      continue;
    }

    // Insérer l'évaluation (sans benchmark_id car plus nécessaire)
    const { error: evalError } = await supabase
      .from('compl_ai_evaluations')
      .insert([{
        model_id: model.id,
        principle_id: categoryId,
        benchmark_id: null, // Plus besoin de benchmark spécifique
        score: modelScore.averageScore,
        score_text: modelScore.averageScore.toFixed(3),
        evaluation_date: evaluationDate,
        data_source: 'compl-ai-api',
        raw_data: {
          scores: modelScore.scores,
          benchmarks_count: modelScore.benchmarksCount,
          average_score: modelScore.averageScore,
          category_code: categoryCode,
          gradio_endpoint: (CATEGORY_CONFIG as any)[categoryCode]?.endpoint,
          detailed_scores: modelScore.detailedScores,
          benchmark_details: modelScore.detailedScores.map(ds => ({
            name: ds.name,
            key: ds.key,
            category: ds.category,
            score: ds.score,
            position: ds.position
          }))
        }
      }]);

    if (evalError) {
      console.error(`Failed to insert evaluation for ${modelScore.modelName}:`, evalError);
    }
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { 
      headers: { 
        'Access-Control-Allow-Origin': '*', 
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
      } 
    });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const startTime = Date.now();
  const evaluationDate = new Date().toISOString().split('T')[0];

  try {
    // Initialiser le client Supabase
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    console.log('Starting COMPL-AI sync...');
    
    const results = {
      categories_processed: 0,
      models_synced: new Set<string>(),
      evaluations_created: 0,
      errors: [] as string[]
    };

    // Traiter chaque catégorie
    for (const [categoryCode, config] of Object.entries(CATEGORY_CONFIG)) {
      try {
        console.log(`Processing category: ${categoryCode}`);
        
        // Délai pour éviter le rate limiting
        if (results.categories_processed > 0) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }

        // Appeler l'API Gradio
        const data = await callGradioAPI(config.endpoint, config.params);
        
        // Parser les scores
        const modelScores = parseModelScores(data, categoryCode);
        console.log(`Parsed ${modelScores.length} model scores for ${categoryCode}`);

        // Stocker en base
        await upsertModelScores(supabaseClient, categoryCode, modelScores, evaluationDate);
        
        // Mettre à jour les résultats
        results.categories_processed++;
        results.evaluations_created += modelScores.length;
        modelScores.forEach(ms => results.models_synced.add(ms.modelName));

      } catch (error) {
        const errorMsg = `Failed to process ${categoryCode}: ${error instanceof Error ? error.message : String(error)}`;
        console.error(errorMsg);
        results.errors.push(errorMsg);
      }
    }

    // Recalculer tous les scores MaydAI après synchronisation
    console.log('Recalculating MaydAI scores with TypeScript logic...');
    try {
      // Note: Dans une Edge Function, nous devons implémenter la logique directement
      // car nous ne pouvons pas importer de modules Next.js
      // Pour l'instant, nous sautons le recalcul automatique ici
      // et nous le ferons via l'API admin après la synchronisation
      console.log('MaydAI recalculation skipped in Edge Function - use admin API endpoint');
      
    } catch (error) {
      console.error('Error recalculating MaydAI scores:', error);
      results.errors.push(`MaydAI recalc error: ${error instanceof Error ? error.message : String(error)}`);
    }

    const executionTime = Date.now() - startTime;

    // Enregistrer le log de synchronisation
    const logStatus = results.errors.length === 0 ? 'success' : 
                     results.categories_processed > 0 ? 'partial' : 'error';
    
    await supabaseClient
      .from('compl_ai_sync_logs')
      .insert([{
        sync_date: evaluationDate,
        status: logStatus,
        models_synced: results.models_synced.size,
        evaluations_synced: results.evaluations_created,
        error_message: results.errors.length > 0 ? results.errors.join('; ') : null,
        execution_time_ms: executionTime
      }]);

    const response = {
      success: true,
      sync_date: evaluationDate,
      execution_time_ms: executionTime,
      categories_processed: results.categories_processed,
      models_synced: results.models_synced.size,
      evaluations_created: results.evaluations_created,
      errors: results.errors
    };

    console.log('COMPL-AI sync completed:', response);

    return new Response(JSON.stringify(response), {
      headers: { 'Content-Type': 'application/json' },
      status: 200
    });

  } catch (error) {
    const executionTime = Date.now() - startTime;
    
    console.error('COMPL-AI sync failed:', error);

    // Enregistrer le log d'erreur
    try {
      const supabaseClient = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      );

      await supabaseClient
        .from('compl_ai_sync_logs')
        .insert([{
          sync_date: evaluationDate,
          status: 'error',
          models_synced: 0,
          evaluations_synced: 0,
          error_message: error instanceof Error ? error.message : String(error),
          execution_time_ms: executionTime
        }]);
    } catch (logError) {
      console.error('Failed to log error:', logError);
    }

    return new Response(JSON.stringify({ 
      success: false, 
      error: error instanceof Error ? error.message : String(error),
      execution_time_ms: executionTime 
    }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500
    });
  }
});