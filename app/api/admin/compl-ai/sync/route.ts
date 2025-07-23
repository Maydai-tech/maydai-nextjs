import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import fs from 'fs'
import path from 'path'

interface ComplAiResult {
  config: {
    model_name: string
    model_sha: string
    model_report: string
  }
  results: Record<string, {
    aggregate_score: number | null
  }>
}

interface SyncResult {
  success: boolean
  message: string
  stats: {
    modelsProcessed: number
    modelsCreated: number
    modelsUpdated: number
    benchmarksCreated: number
    evaluationsCreated: number
    evaluationsUpdated: number
    errors: string[]
  }
}

// Cette logique de mapping n'est plus utilisée car nous utilisons directement 
// les benchmarks de Supabase avec leurs relations aux principes

function parseModelName(fullModelName: string): { name: string; provider: string; type?: string; version?: string } {
  // Gestion des cas spéciaux
  if (fullModelName.includes('Claude3Opus')) {
    return {
      name: 'Claude-3-Opus',
      provider: 'Anthropic',
      type: 'large-language-model',
      version: '3.0'
    }
  }

  if (fullModelName.includes('gemini-1.5-flash')) {
    return {
      name: 'Gemini-1.5-Flash',
      provider: 'Google',
      type: 'large-language-model',
      version: '1.5'
    }
  }

  if (fullModelName.includes('gpt-')) {
    const parts = fullModelName.split('/')
    const modelName = parts[parts.length - 1]
    return {
      name: modelName,
      provider: 'OpenAI',
      type: 'large-language-model'
    }
  }

  // Gestion générique avec slash (provider/model)
  const parts = fullModelName.split('/')
  if (parts.length === 2) {
    return {
      name: parts[1],
      provider: parts[0],
      type: 'large-language-model'
    }
  }

  // Si pas de slash, prendre le nom complet
  return {
    name: fullModelName,
    provider: 'Unknown',
    type: 'large-language-model'
  }
}

function getBenchmarkPrincipleCode(benchmarkKey: string): string {
  console.log(`Getting principle for benchmark: ${benchmarkKey}`)
  
  // Mapping des benchmarks vers les principes EU AI Act
  const mappings = {
    // Technical Robustness and Safety
    'mmlu_robustness': 'technical_robustness_safety',
    'boolq_contrast_robustness': 'technical_robustness_safety',
    'imdb_contrast_robustness': 'technical_robustness_safety',
    'monotonicity_checks': 'technical_robustness_safety',
    'self_check_consistency': 'technical_robustness_safety',
    'instruction_goal_hijacking': 'technical_robustness_safety',
    'multiturn_goal_hijacking': 'technical_robustness_safety',
    'prompt_leakage': 'technical_robustness_safety',
    'adversarial_attack': 'technical_robustness_safety',
    'forecasting_consistency': 'technical_robustness_safety',

    // Privacy & Data Governance
    'winobias': 'privacy_data_governance',
    'crows_pairs': 'privacy_data_governance',
    'pii_detection': 'privacy_data_governance',
    'copyright_detection': 'privacy_data_governance',
    'memorization': 'privacy_data_governance',
    'privacy': 'privacy_data_governance',
    'human_deception': 'privacy_data_governance',

    // Transparency
    'mmlu': 'transparency',
    'arc_challenge': 'transparency',
    'ai2_reasoning': 'transparency',
    'hellaswag': 'transparency',
    'truthful_qa_mc2': 'transparency',
    'truthfulqa': 'transparency',
    'human_eval': 'transparency',
    'humaneval': 'transparency',
    'calibration_big_bench': 'transparency',
    'calibration_big_bench_i_know': 'transparency',
    'self_assessment': 'transparency',
    'watermark_robustness': 'transparency',

    // Diversity, Non-discrimination and Fairness
    'bbq': 'diversity_non_discrimination_fairness',
    'bold': 'diversity_non_discrimination_fairness',
    'reddit_bias': 'diversity_non_discrimination_fairness',
    'fairllm': 'diversity_non_discrimination_fairness',
    'decoding_trust': 'diversity_non_discrimination_fairness',

    // Social and Environmental Well-being
    'toxicity': 'social_environmental_wellbeing',
    'toxicity_advbench': 'social_environmental_wellbeing'
  }

  // Chercher une correspondance exacte
  const exactMatch = mappings[benchmarkKey as keyof typeof mappings]
  if (exactMatch) {
    console.log(`Found exact match for ${benchmarkKey}: ${exactMatch}`)
    return exactMatch
  }

  // Heuristiques supplémentaires basées sur le nom
  const lowerKey = benchmarkKey.toLowerCase()
  
  if (lowerKey.includes('toxic') || lowerKey.includes('bias') || lowerKey.includes('bbq') || lowerKey.includes('bold')) {
    console.log(`Heuristic match for ${benchmarkKey}: privacy_data_governance (toxic/bias)`)
    return 'privacy_data_governance'
  }
  
  if (lowerKey.includes('robust') || lowerKey.includes('consist') || lowerKey.includes('hijack') || lowerKey.includes('goal')) {
    console.log(`Heuristic match for ${benchmarkKey}: technical_robustness_safety (robust/consist)`)
    return 'technical_robustness_safety'
  }
  
  if (lowerKey.includes('fair') || lowerKey.includes('discrimin') || lowerKey.includes('demographic')) {
    console.log(`Heuristic match for ${benchmarkKey}: diversity_non_discrimination_fairness (fair)`)
    return 'diversity_non_discrimination_fairness'
  }
  
  if (lowerKey.includes('environment') || lowerKey.includes('social') || lowerKey.includes('wellbeing')) {
    console.log(`Heuristic match for ${benchmarkKey}: social_environmental_wellbeing (social)`)
    return 'social_environmental_wellbeing'
  }

  // Défaut: transparence (principe le plus générique)
  console.log(`Default match for ${benchmarkKey}: transparency`)
  return 'transparency'
}

function formatBenchmarkName(benchmarkCode: string): string {
  // Convertir le code en nom lisible
  return benchmarkCode
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
    .replace(/([A-Z])/g, ' $1')
    .trim()
}

export async function POST(request: NextRequest) {
  try {
    // Vérifier l'authentification via l'en-tête Authorization
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Token d\'authentification manquant' }, { status: 401 })
    }

    // Obtenir l'utilisateur connecté avec le token
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Token invalide' }, { status: 401 })
    }

    // Vérifier les droits admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || (profile.role !== 'admin' && profile.role !== 'super_admin')) {
      return NextResponse.json({ error: 'Droits insuffisants' }, { status: 403 })
    }

    const startTime = Date.now()
    const stats = {
      modelsProcessed: 0,
      modelsCreated: 0,
      modelsUpdated: 0,
      benchmarksCreated: 0,
      evaluationsCreated: 0,
      evaluationsUpdated: 0,
      errors: [] as string[]
    }

    // Lire les fichiers JSON du dossier data/compl-ai/results
    const resultsDir = path.join(process.cwd(), 'data', 'compl-ai', 'results')
    
    if (!fs.existsSync(resultsDir)) {
      return NextResponse.json({
        success: false,
        message: 'Dossier data/compl-ai/results non trouvé',
        stats
      } as SyncResult, { status: 404 })
    }

    // Récupérer tous les principes existants
    const { data: principles } = await supabase
      .from('compl_ai_principles')
      .select('*')

    // Récupérer tous les benchmarks existants  
    const { data: benchmarks } = await supabase
      .from('compl_ai_benchmarks')
      .select('id, code, name, description, principle_id')

    if (!principles) {
      return NextResponse.json({
        success: false,
        message: 'Impossible de récupérer les principes',
        stats
      } as SyncResult, { status: 500 })
    }

    const principleMap = new Map(principles.map(p => [p.code, p]))
    const benchmarkMap = new Map<string, any>((benchmarks || []).map(b => [b.code, b]))
    
    console.log(`Trouvé ${principles.length} principes et ${benchmarks?.length || 0} benchmarks dans Supabase`)

    // Parcourir récursivement tous les fichiers JSON
    function findJsonFiles(dir: string): string[] {
      const files: string[] = []
      const items = fs.readdirSync(dir)

      for (const item of items) {
        const fullPath = path.join(dir, item)
        const stat = fs.statSync(fullPath)

        if (stat.isDirectory()) {
          files.push(...findJsonFiles(fullPath))
        } else if (item.endsWith('.json')) {
          files.push(fullPath)
        }
      }

      return files
    }

    const jsonFiles = findJsonFiles(resultsDir)
    console.log(`Trouvé ${jsonFiles.length} fichiers JSON à traiter`)

    for (const filePath of jsonFiles) {
      try {
        const fileContent = fs.readFileSync(filePath, 'utf-8')
        const data: ComplAiResult = JSON.parse(fileContent)

        if (!data.config || !data.results) {
          stats.errors.push(`Fichier ${path.basename(filePath)}: Structure invalide`)
          continue
        }

        stats.modelsProcessed++

        // Parser le nom du modèle
        const modelInfo = parseModelName(data.config.model_name)

        // Créer ou mettre à jour le modèle
        let modelId: string

        // D'abord, essayer de trouver le modèle existant par model_name uniquement 
        // (puisque c'est là qu'est la contrainte unique)
        const { data: existingModel } = await supabase
          .from('compl_ai_models')
          .select('*')
          .eq('model_name', modelInfo.name)
          .single()

        if (existingModel) {
          // Modèle existant trouvé, le mettre à jour avec les nouvelles infos
          const { error: updateError } = await supabase
            .from('compl_ai_models')
            .update({
              model_provider: modelInfo.provider, // Mettre à jour le provider aussi
              model_type: modelInfo.type,
              version: modelInfo.version,
              updated_at: new Date().toISOString()
            })
            .eq('id', existingModel.id)

          if (updateError) {
            stats.errors.push(`Erreur mise à jour modèle ${modelInfo.name}: ${updateError.message}`)
            continue
          }

          modelId = existingModel.id
          stats.modelsUpdated++
        } else {
          // Créer un nouveau modèle
          const { data: newModel, error: insertError } = await supabase
            .from('compl_ai_models')
            .insert({
              model_name: modelInfo.name,
              model_provider: modelInfo.provider,
              model_type: modelInfo.type,
              version: modelInfo.version
            })
            .select()
            .single()

          if (insertError) {
            stats.errors.push(`Erreur création modèle ${modelInfo.name}: ${insertError.message}`)
            continue
          }

          modelId = newModel.id
          stats.modelsCreated++
        }

        // Créer des évaluations individuelles pour chaque benchmark
        const currentDate = new Date().toISOString().split('T')[0]

        for (const [benchmarkCode, benchmarkResult] of Object.entries(data.results)) {
          if (benchmarkResult.aggregate_score === null || benchmarkResult.aggregate_score === undefined) {
            continue // Ignorer les benchmarks sans score
          }

          // Déterminer le principe associé au benchmark
          const principleCode = getBenchmarkPrincipleCode(benchmarkCode)
          const principle = principleMap.get(principleCode)
          
          if (!principle) {
            stats.errors.push(`Principe ${principleCode} non trouvé pour benchmark ${benchmarkCode}`)
            continue
          }

          // Créer ou récupérer le benchmark dans Supabase
          let benchmark = benchmarkMap.get(benchmarkCode)
          
          if (!benchmark) {
            // Créer le benchmark s'il n'existe pas
            const { data: newBenchmark, error: benchmarkError } = await supabase
              .from('compl_ai_benchmarks')
              .insert({
                code: benchmarkCode,
                name: formatBenchmarkName(benchmarkCode),
                description: `Benchmark ${formatBenchmarkName(benchmarkCode)} pour le principe ${principle.name}`,
                principle_id: principle.id
              })
              .select()
              .single()

            if (benchmarkError || !newBenchmark) {
              stats.errors.push(`Erreur création benchmark ${benchmarkCode}: ${benchmarkError?.message || 'Benchmark non créé'}`)
              continue
            }

            benchmark = newBenchmark as any
            benchmarkMap.set(benchmarkCode, benchmark)
            stats.benchmarksCreated++
            console.log(`Benchmark créé: ${benchmarkCode} (${benchmark.id})`)
          }

          // Vérifier si l'évaluation existe déjà pour ce modèle + benchmark
          const { data: existingEvaluation } = await supabase
            .from('compl_ai_evaluations')
            .select('*')
            .eq('model_id', modelId)
            .eq('benchmark_id', benchmark.id)
            .single()

          const evaluationData = {
            model_id: modelId,
            principle_id: principle.id,
            benchmark_id: benchmark.id, // Maintenant on lie correctement au benchmark
            score: benchmarkResult.aggregate_score,
            score_text: `${Math.round(benchmarkResult.aggregate_score * 100)}%`,
            evaluation_date: currentDate,
            data_source: 'local-json-sync',
            raw_data: {
              benchmark_code: benchmarkCode,
              benchmark_name: formatBenchmarkName(benchmarkCode),
              principle_code: principle.code,
              principle_name: principle.name,
              raw_score: benchmarkResult.aggregate_score,
              file_path: path.relative(process.cwd(), filePath),
              sync_timestamp: new Date().toISOString(),
              model_info: {
                original_name: data.config.model_name,
                parsed_name: modelInfo.name,
                provider: modelInfo.provider
              }
            }
          }

          if (existingEvaluation) {
            // Mettre à jour l'évaluation existante
            const { error: updateError } = await supabase
              .from('compl_ai_evaluations')
              .update({
                ...evaluationData,
                updated_at: new Date().toISOString()
              })
              .eq('id', existingEvaluation.id)

            if (updateError) {
              stats.errors.push(`Erreur mise à jour évaluation ${modelInfo.name}/${benchmarkCode}: ${updateError.message}`)
            } else {
              stats.evaluationsUpdated++
            }
          } else {
            // Créer une nouvelle évaluation
            const { error: insertError } = await supabase
              .from('compl_ai_evaluations')
              .insert(evaluationData)

            if (insertError) {
              stats.errors.push(`Erreur création évaluation ${modelInfo.name}/${benchmarkCode}: ${insertError.message}`)
            } else {
              stats.evaluationsCreated++
            }
          }
        }

      } catch (error) {
        stats.errors.push(`Erreur traitement ${path.basename(filePath)}: ${error instanceof Error ? error.message : 'Erreur inconnue'}`)
      }
    }

    const executionTime = Date.now() - startTime

    // Enregistrer le log de synchronisation
    await supabase.from('compl_ai_sync_logs').insert({
      sync_date: new Date().toISOString().split('T')[0],
      status: stats.errors.length === 0 ? 'success' : 'partial',
      models_synced: stats.modelsCreated + stats.modelsUpdated,
      evaluations_synced: stats.evaluationsCreated + stats.evaluationsUpdated,
      error_message: stats.errors.length > 0 ? stats.errors.join('; ') : null,
      execution_time_ms: executionTime
    })

    const result: SyncResult = {
      success: stats.errors.length === 0,
      message: stats.errors.length === 0 
        ? `Synchronisation réussie en ${executionTime}ms. ${stats.modelsCreated + stats.modelsUpdated} modèles, ${stats.benchmarksCreated} benchmarks créés, ${stats.evaluationsCreated + stats.evaluationsUpdated} évaluations.`
        : `Synchronisation terminée avec ${stats.errors.length} erreurs`,
      stats
    }

    return NextResponse.json(result)

  } catch (error) {
    console.error('Erreur synchronisation COMPL-AI:', error)
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : 'Erreur interne du serveur',
      stats: {
        modelsProcessed: 0,
        modelsCreated: 0,
        modelsUpdated: 0,
        evaluationsCreated: 0,
        evaluationsUpdated: 0,
        errors: [error instanceof Error ? error.message : 'Erreur inconnue']
      }
    } as SyncResult, { status: 500 })
  }
}