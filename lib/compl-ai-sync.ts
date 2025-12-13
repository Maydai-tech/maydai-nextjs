/**
 * Utilitaires pour la synchronisation des données COMPL-AI
 */

export interface ComplAiResult {
  config: {
    model_name: string
    model_sha: string
    model_report: string
  }
  results: Record<string, {
    aggregate_score: number | null
  }>
}

export interface ParsedModelInfo {
  name: string
  provider: string
  type?: string
  version?: string
}

export interface PrincipleScoreData {
  scores: number[]
  average: number
  benchmarkDetails: Array<{
    name: string
    key: string
    category: string
    score: number
    position: number
  }>
}

export interface SyncStats {
  modelsProcessed: number
  modelsCreated: number
  modelsUpdated: number
  evaluationsCreated: number
  evaluationsUpdated: number
  errors: string[]
}

/**
 * Mapping des benchmarks COMPL-AI vers les principes EU AI Act
 */
export const BENCHMARK_TO_PRINCIPLE_MAPPING = {
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
  'toxicity': 'privacy_data_governance',
  'toxicity_advbench': 'privacy_data_governance',
  'bbq': 'privacy_data_governance',
  'bold': 'privacy_data_governance',
  'winobias': 'privacy_data_governance',
  'crows_pairs': 'privacy_data_governance',
  'pii_detection': 'privacy_data_governance',
  'copyright_detection': 'privacy_data_governance',

  // Transparency
  'mmlu': 'transparency',
  'arc_challenge': 'transparency',
  'hellaswag': 'transparency',
  'truthfulqa': 'transparency',
  'human_eval': 'transparency',
  'humaneval': 'transparency',
  'calibration_big_bench': 'transparency',
  'calibration_big_bench_i_know': 'transparency',
  'self_assessment': 'transparency',
  'decoding_trust': 'transparency',
  'watermark_robustness': 'transparency',

  // Diversity, Non-discrimination and Fairness
  'bias_detection': 'diversity_non_discrimination_fairness',
  'fairness_evaluation': 'diversity_non_discrimination_fairness',
  'demographic_bias': 'diversity_non_discrimination_fairness',

  // Social and Environmental Well-being
  'environmental_impact': 'social_environmental_wellbeing',
  'social_impact': 'social_environmental_wellbeing',
  'wellbeing_assessment': 'social_environmental_wellbeing',
  // Social and Environmental Well-being - Impact environnemental
  'num_gpus': 'social_environmental_wellbeing',
  'gpu_power_draw': 'social_environmental_wellbeing',
  'time_to_train': 'social_environmental_wellbeing',
  'datacenter_carbon_intensity': 'social_environmental_wellbeing'
} as const

/**
 * Liste des 5 principes EU AI Act supportés
 */
export const EU_AI_ACT_PRINCIPLES = [
  'technical_robustness_safety',
  'privacy_data_governance',
  'transparency',
  'diversity_non_discrimination_fairness',
  'social_environmental_wellbeing'
] as const

/**
 * Parse le nom complet du modèle pour extraire les informations structurées
 */
export function parseModelName(fullModelName: string): ParsedModelInfo {
  // Nettoyage du nom
  const cleanName = fullModelName.trim()

  // Cas spéciaux connus
  const specialCases: Record<string, ParsedModelInfo> = {
    'Claude3Opus': {
      name: 'Claude-3-Opus',
      provider: 'Anthropic',
      type: 'large-language-model',
      version: '3.0'
    },
    'result_Claude3Opus': {
      name: 'Claude-3-Opus',
      provider: 'Anthropic',
      type: 'large-language-model',
      version: '3.0'
    },
    'gemini-1.5-flash-001': {
      name: 'Gemini-1.5-Flash',
      provider: 'Google',
      type: 'large-language-model',
      version: '1.5-flash-001'
    },
    'result_gemini-1.5-flash-001': {
      name: 'Gemini-1.5-Flash',
      provider: 'Google',
      type: 'large-language-model',
      version: '1.5-flash-001'
    }
  }

  // Vérifier les cas spéciaux
  for (const [pattern, info] of Object.entries(specialCases)) {
    if (cleanName.includes(pattern)) {
      return info
    }
  }

  // Gestion des modèles OpenAI
  if (cleanName.includes('gpt-')) {
    const parts = cleanName.split('/')
    const modelName = parts[parts.length - 1].replace('result_', '')
    
    return {
      name: modelName,
      provider: 'OpenAI',
      type: 'large-language-model',
      version: modelName.includes('-') ? modelName.split('-').slice(-1)[0] : undefined
    }
  }

  // Gestion générique avec slash (provider/model)
  const slashParts = cleanName.split('/')
  if (slashParts.length >= 2) {
    const provider = slashParts[0]
    const model = slashParts[slashParts.length - 1]
    
    // Mapping des fournisseurs connus
    const providerMap: Record<string, string> = {
      '01-ai': '01.AI',
      'mistralai': 'Mistral AI',
      'meta-llama': 'Meta',
      'google': 'Google',
      'Qwen': 'Alibaba',
      'speakleash': 'SpeakLeash'
    }

    return {
      name: model,
      provider: providerMap[provider] || provider,
      type: 'large-language-model',
      version: model.includes('-v') ? model.split('-v')[1] : undefined
    }
  }

  // Fallback: utiliser le nom complet
  return {
    name: cleanName.replace('result_', ''),
    provider: 'Unknown',
    type: 'large-language-model'
  }
}

/**
 * Détermine le principe EU AI Act pour un benchmark donné
 */
export function getBenchmarkPrinciple(benchmarkKey: string): string {
  // Chercher une correspondance exacte ou partielle
  for (const [pattern, principle] of Object.entries(BENCHMARK_TO_PRINCIPLE_MAPPING)) {
    if (benchmarkKey.includes(pattern) || pattern.includes(benchmarkKey)) {
      return principle
    }
  }

  // Heuristiques supplémentaires basées sur le nom
  const lowerKey = benchmarkKey.toLowerCase()
  
  if (lowerKey.includes('toxic') || lowerKey.includes('bias') || lowerKey.includes('bbq') || lowerKey.includes('bold')) {
    return 'privacy_data_governance'
  }
  
  if (lowerKey.includes('robust') || lowerKey.includes('consist') || lowerKey.includes('hijack') || lowerKey.includes('goal')) {
    return 'technical_robustness_safety'
  }
  
  if (lowerKey.includes('fair') || lowerKey.includes('discrimin') || lowerKey.includes('demographic')) {
    return 'diversity_non_discrimination_fairness'
  }
  
  if (lowerKey.includes('environment') || lowerKey.includes('social') || lowerKey.includes('wellbeing')) {
    return 'social_environmental_wellbeing'
  }

  // Défaut: transparence (principe le plus générique)
  return 'transparency'
}

/**
 * Calcule les scores agrégés par principe EU AI Act
 */
export function calculatePrincipleScores(results: ComplAiResult['results']): Record<string, PrincipleScoreData> {
  const principleData: Record<string, { scores: number[]; benchmarks: Array<{ name: string; key: string; score: number }> }> = {}

  // Grouper les benchmarks par principe
  for (const [benchmarkKey, benchmarkData] of Object.entries(results)) {
    if (benchmarkData.aggregate_score === null || benchmarkData.aggregate_score === undefined) {
      continue
    }

    const principle = getBenchmarkPrinciple(benchmarkKey)
    
    if (!principleData[principle]) {
      principleData[principle] = { scores: [], benchmarks: [] }
    }
    
    principleData[principle].scores.push(benchmarkData.aggregate_score)
    principleData[principle].benchmarks.push({
      name: benchmarkKey,
      key: benchmarkKey,
      score: benchmarkData.aggregate_score
    })
  }

  // Calculer les moyennes et formater les résultats
  const result: Record<string, PrincipleScoreData> = {}
  
  for (const [principle, data] of Object.entries(principleData)) {
    const average = data.scores.reduce((sum, score) => sum + score, 0) / data.scores.length
    
    result[principle] = {
      scores: data.scores,
      average,
      benchmarkDetails: data.benchmarks.map((benchmark, index) => ({
        name: benchmark.name,
        key: benchmark.key,
        category: principle,
        score: benchmark.score,
        position: index
      }))
    }
  }

  return result
}

/**
 * Valide la structure d'un fichier de résultats COMPL-AI
 */
export function validateComplAiResult(data: unknown): data is ComplAiResult {
  if (!data || typeof data !== 'object') {
    return false
  }

  const obj = data as Record<string, unknown>

  if (!obj.config || typeof obj.config !== 'object') {
    return false
  }

  const config = obj.config as Record<string, unknown>
  if (!config.model_name || typeof config.model_name !== 'string') {
    return false
  }

  if (!obj.results || typeof obj.results !== 'object') {
    return false
  }

  // Vérifier qu'au moins un résultat existe
  const results = obj.results as Record<string, unknown>
  const resultEntries = Object.entries(results)
  if (resultEntries.length === 0) {
    return false
  }

  // Vérifier la structure des résultats
  for (const [, result] of resultEntries) {
    if (!result || typeof result !== 'object') {
      return false
    }
    
    const resultObj = result as Record<string, unknown>
    if (!('aggregate_score' in resultObj)) {
      return false
    }
    
    if (resultObj.aggregate_score !== null && typeof resultObj.aggregate_score !== 'number') {
      return false
    }
  }

  return true
}

/**
 * Génère un nom de fichier sûr pour les logs
 */
export function generateLogFileName(modelName: string, timestamp: Date): string {
  const cleanName = modelName
    .replace(/[^a-zA-Z0-9-_]/g, '-')
    .replace(/--+/g, '-')
    .toLowerCase()
  
  const isoDate = timestamp.toISOString().replace(/[:.]/g, '-')
  return `compl-ai-sync-${cleanName}-${isoDate}.log`
}

/**
 * Formate un score en pourcentage
 */
export function formatScore(score: number): string {
  return `${Math.round(score * 100)}%`
}

/**
 * Formate la durée d'exécution
 */
export function formatDuration(milliseconds: number): string {
  if (milliseconds < 1000) {
    return `${milliseconds}ms`
  }
  
  if (milliseconds < 60000) {
    return `${(milliseconds / 1000).toFixed(1)}s`
  }
  
  return `${Math.round(milliseconds / 60000)}m ${Math.round((milliseconds % 60000) / 1000)}s`
}

/**
 * Obtient les statistiques résumées d'une synchronisation
 */
export function getSyncSummary(stats: SyncStats): {
  totalOperations: number
  successRate: number
  hasErrors: boolean
  summary: string
} {
  const totalOperations = stats.modelsProcessed + stats.evaluationsCreated + stats.evaluationsUpdated
  const successfulOperations = stats.modelsCreated + stats.modelsUpdated + stats.evaluationsCreated + stats.evaluationsUpdated
  const successRate = totalOperations > 0 ? (successfulOperations / totalOperations) * 100 : 0
  
  const summary = [
    `${stats.modelsProcessed} modèles traités`,
    stats.modelsCreated > 0 ? `${stats.modelsCreated} créés` : null,
    stats.modelsUpdated > 0 ? `${stats.modelsUpdated} mis à jour` : null,
    `${stats.evaluationsCreated + stats.evaluationsUpdated} évaluations synchronisées`,
    stats.errors.length > 0 ? `${stats.errors.length} erreurs` : null
  ].filter(Boolean).join(', ')
  
  return {
    totalOperations,
    successRate,
    hasErrors: stats.errors.length > 0,
    summary
  }
}