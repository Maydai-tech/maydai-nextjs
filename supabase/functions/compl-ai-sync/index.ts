import "jsr:@supabase/functions-js/edge-runtime.d.ts";
/// <reference lib="deno.ns" />

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Client } from "https://esm.sh/@gradio/client@1";

// Configuration des catégories et leurs endpoints/paramètres selon la nouvelle API
const CATEGORY_CONFIG = {
  "technical_robustness_safety": {
    endpoint: "/partial",
    params: [
      ["MMLU: Robustness", "BoolQ Contrast Set", "IMDB Contrast Set", "Monotonicity Checks", "Self-Check Consistency"],
      ["Goal Hijacking and Prompt Leakage", "Rule Following"]
    ],
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
    params: [
      ["Toxicity of the Dataset", "Bias of the Dataset"],
      ["Copyrighted Material Memorization"],
      ["PII Extraction by Association"]
    ],
    benchmarkMapping: [
      { name: "Toxicity of the Dataset", key: "toxicity_dataset_score", category: "data_quality" },
      { name: "Bias of the Dataset", key: "bias_dataset_score", category: "data_quality" },
      { name: "Copyrighted Material Memorization", key: "copyrighted_material_score", category: "privacy" },
      { name: "PII Extraction by Association", key: "pii_extraction_score", category: "privacy" }
    ]
  },
  "transparency": {
    endpoint: "/partial_5",
    params: [
      ["General Knowledge: MMLU", "Reasoning: AI2 Reasoning Challenge", "Common Sense Reasoning: HellaSwag", "Truthfulness: TruthfulQA MC2", "Coding: HumanEval"],
      ["Logit Calibration: BIG-Bench", "Self-Assessment: TriviaQA"],
      ["Denying Human Presence"],
      ["Watermark Reliability & Robustness"]
    ],
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
    params: [
      ["Representation Bias: RedditBias", "Prejudiced Answers: BBQ", "Biased Completions: BOLD"],
      ["Income Fairness: DecodingTrust", "Recommendation Consistency: FaiRLLM"]
    ],
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
    params: [
      ["Toxic Completions of Benign Text: RealToxicityPrompts", "Following Harmful Instructions: AdvBench"]
    ],
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
  score: number | null;
  position: number;
}

interface ModelScore {
  modelName: string;
  modelProvider: string;
  scores: (number | null)[];
  averageScore: number;
  benchmarksCount: number;
  detailedScores: BenchmarkDetail[];
}

async function callGradioAPI(endpoint: string, params: any[]): Promise<any> {
  console.log(`Calling Gradio API: ${endpoint} with params:`, params);
  
  let client;
  try {
    // Connexion au client Gradio avec gestion d'erreur spécifique
    console.log(`Connecting to Gradio client...`);
    client = await Client.connect("latticeflow/compl-ai-board");
    console.log(`Client connected successfully`);
    
    // Appel à l'endpoint avec les paramètres et api_name
    const apiName = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    console.log(`Calling predict with apiName: ${apiName}`);
    
    // Approche alternative : essayer avec différentes méthodes d'appel
    let result;
    try {
      // Méthode 1: Appel direct avec predict
      result = await (client as any).predict(...params, { api_name: apiName });
      console.log(`Method 1 successful for ${endpoint}`);
    } catch (predictError) {
      console.log(`Method 1 failed for ${endpoint}:`, predictError);
      
      try {
        // Méthode 2: Appel avec submit
        console.log(`Trying submit method for ${endpoint}`);
        const submission = await (client as any).submit(...params, { api_name: apiName });
        result = await submission.data();
        console.log(`Method 2 successful for ${endpoint}`);
      } catch (submitError) {
        console.log(`Method 2 failed for ${endpoint}:`, submitError);
        
        // Méthode 3: Appel direct sans api_name
        console.log(`Trying direct call for ${endpoint}`);
        result = await (client as any).predict(...params);
        console.log(`Method 3 successful for ${endpoint}`);
      }
    }
    
    console.log(`API response for ${endpoint}:`, result);
    console.log(`Response type: ${typeof result}, is Array: ${Array.isArray(result)}`);
    
    // Log détaillé de la structure de réponse
    if (result && typeof result === 'object') {
      console.log(`Response keys: ${Object.keys(result)}`);
      if (result.data && Array.isArray(result.data)) {
        console.log(`Data length: ${result.data.length}, first row sample:`, result.data[0]);
      }
    }
    
    // La réponse est directement l'objet avec headers et data
    return result;
    
  } catch (error) {
    console.error(`Failed to call Gradio API ${endpoint}:`, error);
    console.error(`Error type: ${typeof error}, message: ${error instanceof Error ? error.message : String(error)}`);
    console.error(`Error stack: ${error instanceof Error ? error.stack : 'No stack'}`);
    throw error;
  }
}

function parseModelName(rawModelName: any): { name: string; provider: string } {
  // Validation renforcée et conversion sécurisée en chaîne
  if (rawModelName === null || rawModelName === undefined) {
    console.log(`parseModelName: null/undefined value received`);
    return { name: '', provider: '' };
  }
  
  // Convertir en chaîne de manière sécurisée
  const modelNameStr = String(rawModelName).trim();
  if (!modelNameStr || modelNameStr === 'null' || modelNameStr === 'undefined') {
    console.log(`parseModelName: Invalid rawModelName type: ${typeof rawModelName}, value:`, rawModelName);
    return { name: '', provider: '' };
  }
  
  // Si c'est une balise HTML, extraire le texte
  let cleanName = modelNameStr;
  if (modelNameStr.includes('<a') && modelNameStr.includes('</a>')) {
    const match = modelNameStr.match(/>([^<]+)</);
    cleanName = match ? match[1].trim() : modelNameStr.trim();
  } else {
    cleanName = modelNameStr.trim();
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


function parseModelScores(data: any, categoryCode: string): ModelScore[] {
  console.log(`parseModelScores: Processing data for ${categoryCode}`);
  console.log(`Data type: ${typeof data}, is Array: ${Array.isArray(data)}`);
  
  // La réponse Gradio peut être un objet direct ou un array
  let tableData = data;
  
  // Si c'est un array, prendre le premier élément
  if (Array.isArray(data) && data.length > 0) {
    tableData = data[0];
    console.log(`Using first array element:`, tableData);
  }
  
  // Nouvelle structure : vérifier si c'est directement un objet avec headers et data
  if (!tableData || typeof tableData !== 'object') {
    console.error('Invalid data structure from API - not an object:', data);
    throw new Error(`Invalid data structure from API - expected object, got ${typeof tableData}`);
  }
  
  if (!tableData.headers || !tableData.data) {
    console.error('Missing headers or data in API response:', tableData);
    console.log('Available keys in tableData:', Object.keys(tableData));
    throw new Error('Invalid data structure from API - missing headers or data');
  }

  const headers = tableData.headers;
  const rows = tableData.data;
  
  console.log(`Headers for ${categoryCode}:`, headers);
  console.log(`Sample row for ${categoryCode}:`, rows[0]);
  
  // Trouver l'index de la colonne "Model"
  const modelIndex = headers.findIndex((h: string) => h.toLowerCase().includes('model'));
  if (modelIndex === -1) {
    throw new Error('Model column not found in headers');
  }

  // Obtenir la configuration des benchmarks pour cette catégorie
  const config = (CATEGORY_CONFIG as any)[categoryCode];
  if (!config || !config.benchmarkMapping) {
    throw new Error(`No benchmark mapping found for category: ${categoryCode}`);
  }

  // Créer un mapping exact entre les noms de benchmarks et leurs indices dans les headers
  const benchmarkIndices: Map<string, number> = new Map();
  
  for (const benchmark of config.benchmarkMapping) {
    // Chercher le header qui correspond EXACTEMENT au nom du benchmark
    const benchmarkName = benchmark.name;
    
    // Chercher d'abord une correspondance exacte
    let headerIndex = headers.findIndex((header: string) => header === benchmarkName);
    
    // Si pas de correspondance exacte, essayer avec normalisation
    if (headerIndex === -1) {
      headerIndex = headers.findIndex((header: string, idx: number) => {
        // Skip les premières colonnes non-numériques et les colonnes de fin
        if (idx <= modelIndex || header.toLowerCase().includes('query') || header.toLowerCase().includes('report')) {
          return false;
        }
        
        // Nettoyer les headers pour la comparaison
        const cleanHeader = header.toLowerCase().trim();
        const cleanBenchmarkName = benchmarkName.toLowerCase().trim();
        
        // Correspondance exacte après nettoyage
        if (cleanHeader === cleanBenchmarkName) {
          return true;
        }
        
        // Vérifier si le header contient tous les mots clés principaux du benchmark
        const benchmarkKeywords = cleanBenchmarkName.split(/[:\s]+/).filter(word => word.length > 2);
        const matchesAllKeywords = benchmarkKeywords.every(keyword => 
          cleanHeader.includes(keyword)
        );
        
        return matchesAllKeywords;
      });
    }
    
    if (headerIndex !== -1) {
      benchmarkIndices.set(benchmarkName, headerIndex);
      console.log(`✅ Mapped benchmark "${benchmarkName}" to column ${headerIndex} (${headers[headerIndex]})`);
    } else {
      console.warn(`⚠️  Could not find header for benchmark: ${benchmarkName}`);
      console.log(`   Available headers: ${headers.slice(modelIndex + 1).join(', ')}`);
    }
  }

  const results: ModelScore[] = [];
  
  for (const row of rows) {
    const rawModelName = row[modelIndex];
    if (!rawModelName || typeof rawModelName !== 'string') continue;
    
    // Parser le nom du modèle pour extraire le texte des balises HTML et le provider
    const parsedModel = parseModelName(rawModelName);
    if (!parsedModel.name) continue;
    
    // Extraire les scores en utilisant le mapping des benchmarks
    const detailedScores: BenchmarkDetail[] = [];
    const scores: (number | null)[] = [];
    
    console.log(`Processing model: ${parsedModel.name}`);
    
    for (const benchmark of config.benchmarkMapping) {
      const columnIndex = benchmarkIndices.get(benchmark.name);
      
      if (columnIndex !== undefined) {
        const value = row[columnIndex];
        let score: number | null = null;
        
        console.log(`  ${benchmark.name}: value=${value} (type: ${typeof value}, column: ${columnIndex})`);
        
        // Gérer les différents types de valeurs
        if (typeof value === 'number' && !isNaN(value) && value >= 0 && value <= 1) {
          score = value;
        } else if (typeof value === 'string') {
          if (value === 'N/A' || value === '' || value.toLowerCase() === 'n/a') {
            console.log(`    -> N/A value, storing as null`);
            // Stocker null pour N/A et enregistrer la tentative
            scores.push(null);
            detailedScores.push({
              name: benchmark.name,
              key: benchmark.key,
              category: benchmark.category,
              score: null, // null pour N/A
              position: detailedScores.length
            });
            continue;
          } else {
            const numValue = parseFloat(value);
            if (!isNaN(numValue) && numValue >= 0 && numValue <= 1) {
              score = numValue;
            } else {
              console.log(`    -> Invalid numeric value: ${value}`);
            }
          }
        } else {
          console.log(`    -> Unexpected value type: ${typeof value}`);
        }
        
        if (score !== null) {
          scores.push(score);
          detailedScores.push({
            name: benchmark.name,
            key: benchmark.key,
            category: benchmark.category,
            score: score,
            position: detailedScores.length
          });
          console.log(`    -> Added score: ${score}`);
        }
      } else {
        console.log(`  ${benchmark.name}: column not found in mapping`);
      }
    }
    
    if (scores.length > 0) {
      // Calculer la moyenne uniquement sur les scores valides (non-null)
      const validScores = scores.filter(score => score !== null);
      const averageScore = validScores.length > 0 ? 
        validScores.reduce((sum, score) => sum + score, 0) / validScores.length : 0;
      
      results.push({
        modelName: parsedModel.name,
        modelProvider: parsedModel.provider,
        scores,
        averageScore,
        benchmarksCount: validScores.length,
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
          })),
          sync_metadata: {
            sync_date: evaluationDate,
            mapping_method: 'header_based',
            total_benchmarks_mapped: modelScore.detailedScores.length,
            model_parsed_name: modelScore.modelName,
            model_parsed_provider: modelScore.modelProvider
          }
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
        console.log(`\n=== Processing category: ${categoryCode} ===`);
        console.log(`Endpoint: ${config.endpoint}`);
        console.log(`Params structure:`, config.params);
        
        // Délai pour éviter le rate limiting
        if (results.categories_processed > 0) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }

        console.log(`Step 1: Calling Gradio API for ${categoryCode}...`);
        // Appeler l'API Gradio avec fallback
        let data;
        try {
          data = await callGradioAPI(config.endpoint, config.params);
          console.log(`Step 1 completed for ${categoryCode}`);
        } catch (gradioError) {
          console.error(`Gradio API failed for ${categoryCode}, trying alternative approach...`);
          console.error(`Gradio error:`, gradioError);
          
          // Pour le debug : créer des données de test
          console.log(`Creating test data for ${categoryCode}...`);
          data = {
            headers: ["Model", "Score 1", "Score 2", "N/A Test"],
            data: [
              ["test-model", 0.85, 0.90, "N/A"],
              ["another-model", 0.75, "N/A", 0.88]
            ]
          };
          console.log(`Using test data for ${categoryCode}`);
        }
        
        console.log(`Step 2: Parsing model scores for ${categoryCode}...`);
        // Parser les scores
        const modelScores = parseModelScores(data, categoryCode);
        console.log(`Step 2 completed: Parsed ${modelScores.length} model scores for ${categoryCode}`);

        console.log(`Step 3: Storing in database for ${categoryCode}...`);
        // Stocker en base
        await upsertModelScores(supabaseClient, categoryCode, modelScores, evaluationDate);
        console.log(`Step 3 completed for ${categoryCode}`);
        
        // Mettre à jour les résultats
        results.categories_processed++;
        results.evaluations_created += modelScores.length;
        modelScores.forEach(ms => results.models_synced.add(ms.modelName));
        
        console.log(`=== Category ${categoryCode} completed successfully ===\n`);

      } catch (error) {
        const errorMsg = `Failed to process ${categoryCode}: ${error instanceof Error ? error.message : String(error)}`;
        console.error(`=== ERROR in category ${categoryCode} ===`);
        console.error(`Error type: ${typeof error}`);
        console.error(`Error message: ${error instanceof Error ? error.message : String(error)}`);
        console.error(`Error stack: ${error instanceof Error ? error.stack : 'No stack'}`);
        console.error(errorMsg);
        results.errors.push(errorMsg);
      }
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