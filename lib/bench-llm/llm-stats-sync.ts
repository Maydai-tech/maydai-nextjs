import type { SupabaseClient } from '@supabase/supabase-js'

const DEFAULT_LLM_STATS_BASE_URL = 'https://api.llm-stats.com/stats'
const MODELS_PAGE_LIMIT = 200
const SCORES_PAGE_LIMIT = 500
const RANKINGS_LIMIT = 50

export interface LlmStatsProviderPricing {
  provider_id: string
  provider_name: string
  input_price_per_m?: number | null
  output_price_per_m?: number | null
  status: string
}

export interface LlmStatsModelSummary {
  id: string
  name: string
  organization: {
    id: string
    name: string
  }
  license?: {
    id: string
    name: string
    allow_commercial?: boolean
  } | null
  open_weight: boolean
  model_type: string
  modalities?: string[]
  context_window?: number | null
  param_count?: number | null
  knowledge_cutoff?: string | null
  release_date?: string | null
  providers?: LlmStatsProviderPricing[]
  top_scores?: Record<string, number>
}

interface LlmStatsModelsResponse {
  models: LlmStatsModelSummary[]
  next_cursor?: string | null
  total: number
}

interface LlmStatsRankedModel {
  rank: number
  model_id: string
  model_name: string
  organization: string
  score: number
}

interface LlmStatsRankingsResponse {
  models?: LlmStatsRankedModel[]
  error?: { code: string; message: string; param?: string }
}

export interface LlmStatsScoreRow {
  model_id: string
  model_name: string
  benchmark_id: string
  benchmark_name: string
  category?: string | null
  score: number
  normalized_score?: number | null
  max_score: number
}

interface LlmStatsScoresResponse {
  scores: LlmStatsScoreRow[]
  next_cursor?: string | null
  total: number
}

interface ModelProviderRow {
  id: number
  name: string
}

interface ExistingModelRow {
  id: string
  model_name: string
  model_provider_id: number | null
  model_provider: string | null
  model_type: string | null
  license: string | null
  context_length: number | null
  release_date: string | null
  knowledge_cutoff: string | null
  input_cost_per_million: number | null
  output_cost_per_million: number | null
  model_size: string | null
  gpqa_score: number | null
  aime_2025_score: number | null
  llm_leader_rank: number | null
}

export interface LlmStatsModelRecord {
  model_name: string
  model_provider: string
  model_provider_id: number
  model_type: string
  license: string | null
  context_length: number | null
  release_date: string | null
  knowledge_cutoff: string | null
  input_cost_per_million: number | null
  output_cost_per_million: number | null
  model_size: string | null
  gpqa_score: number | null
  aime_2025_score: number | null
  llm_leader_rank: number | null
  updated_at: string
}

export interface SyncModelChange {
  id?: string
  model_name: string
  model_provider: string
  changedFields?: string[]
}

export interface LlmStatsSyncResult {
  success: boolean
  startedAt: string
  finishedAt: string
  durationMs: number
  modelsFetched: number
  modelsCreated: number
  modelsUpdated: number
  modelsUnchanged: number
  createdModels: SyncModelChange[]
  updatedModels: SyncModelChange[]
  errors: string[]
}

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim()
  if (!value) {
    throw new Error(`${name} est requis`)
  }
  return value
}

function llmStatsBaseUrl(): string {
  return (
    process.env.LLM_STATS_BASE_URL?.trim() || DEFAULT_LLM_STATS_BASE_URL
  ).replace(/\/+$/, '')
}

function appendParams(url: string, params: Record<string, string | number | undefined>) {
  const nextUrl = new URL(url)
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) {
      nextUrl.searchParams.set(key, String(value))
    }
  }
  return nextUrl.toString()
}

async function fetchLlmStatsJson<T>(
  path: string,
  params: Record<string, string | number | undefined> = {},
): Promise<T> {
  const apiKey = requiredEnv('LLM_STATS_API_KEY')
  const url = appendParams(`${llmStatsBaseUrl()}${path}`, params)
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: 'application/json',
    },
  })

  if (!response.ok) {
    const body = await response.text()
    throw new Error(`LLM Stats ${path} failed (${response.status}): ${body}`)
  }

  return response.json() as Promise<T>
}

export function deriveModelSizeFromParamCount(paramCount?: number | null): string | null {
  if (typeof paramCount !== 'number' || !Number.isFinite(paramCount) || paramCount <= 0) {
    return null
  }
  if (paramCount < 3_000_000_000) return 'XS'
  if (paramCount < 8_000_000_000) return 'S'
  if (paramCount < 30_000_000_000) return 'M'
  if (paramCount < 100_000_000_000) return 'L'
  return 'XL'
}

function minFinite(values: Array<number | null | undefined>): number | null {
  const finiteValues = values.filter((value): value is number => {
    return typeof value === 'number' && Number.isFinite(value)
  })
  if (finiteValues.length === 0) return null
  return Math.min(...finiteValues)
}

function scoreAsPercentage(score?: number | null): number | null {
  if (typeof score !== 'number' || !Number.isFinite(score)) return null
  return score <= 1 ? score * 100 : score
}

export function normalizedScoreValue(score: LlmStatsScoreRow): number | null {
  if (typeof score.normalized_score === 'number' && Number.isFinite(score.normalized_score)) {
    return score.normalized_score
  }
  if (
    typeof score.score === 'number' &&
    Number.isFinite(score.score) &&
    typeof score.max_score === 'number' &&
    Number.isFinite(score.max_score) &&
    score.max_score > 0
  ) {
    return score.score / score.max_score
  }
  return null
}

export function buildBestScoreMap(scores: LlmStatsScoreRow[]): Map<string, number> {
  const bestByModel = new Map<string, number>()
  for (const score of scores) {
    const normalized = normalizedScoreValue(score)
    if (normalized === null) continue
    const current = bestByModel.get(score.model_id)
    if (current === undefined || normalized > current) {
      bestByModel.set(score.model_id, normalized)
    }
  }
  return bestByModel
}

export function buildFallbackGeneralRankMap(
  models: LlmStatsModelSummary[],
): Map<string, number> {
  const sortable = models
    .map((model) => ({
      id: model.id,
      score: model.top_scores?.general,
      name: model.name,
    }))
    .filter((entry): entry is { id: string; score: number; name: string } => {
      return typeof entry.score === 'number' && Number.isFinite(entry.score)
    })
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score
      return a.name.localeCompare(b.name)
    })

  return new Map(sortable.map((entry, index) => [entry.id, index + 1]))
}

export function mapLlmStatsModelToRecord(params: {
  model: LlmStatsModelSummary
  providerId: number
  rank?: number | null
  gpqaScore?: number | null
  aime2025Score?: number | null
  now: string
}): LlmStatsModelRecord {
  const providers = params.model.providers || []

  return {
    model_name: params.model.name,
    model_provider: params.model.organization.name,
    model_provider_id: params.providerId,
    model_type: params.model.model_type || 'large-language-model',
    license: params.model.open_weight ? 'Open' : params.model.license?.name || null,
    context_length: params.model.context_window ?? null,
    release_date: params.model.release_date ?? null,
    knowledge_cutoff: params.model.knowledge_cutoff ?? null,
    input_cost_per_million: minFinite(providers.map((provider) => provider.input_price_per_m)),
    output_cost_per_million: minFinite(providers.map((provider) => provider.output_price_per_m)),
    model_size: deriveModelSizeFromParamCount(params.model.param_count),
    gpqa_score: scoreAsPercentage(params.gpqaScore),
    aime_2025_score: scoreAsPercentage(params.aime2025Score),
    llm_leader_rank: params.rank ?? null,
    updated_at: params.now,
  }
}

function existingModelKey(providerId: number, modelName: string): string {
  return `${providerId}:${modelName}`
}

function valuesEqual(a: unknown, b: unknown): boolean {
  if (typeof a === 'number' || typeof b === 'number') {
    if (a === null && b === null) return true
    if (typeof a !== 'number' || typeof b !== 'number') return false
    return Math.abs(a - b) < 0.000001
  }
  return a === b
}

function changedFieldsForRecord(
  existing: ExistingModelRow,
  record: LlmStatsModelRecord,
): string[] {
  const fields = [
    'model_provider',
    'model_provider_id',
    'model_type',
    'license',
    'context_length',
    'release_date',
    'knowledge_cutoff',
    'input_cost_per_million',
    'output_cost_per_million',
    'model_size',
    'gpqa_score',
    'aime_2025_score',
    'llm_leader_rank',
  ] as const

  return fields.filter((field) => !valuesEqual(existing[field], record[field]))
}

async function fetchAllModels(): Promise<LlmStatsModelSummary[]> {
  const models: LlmStatsModelSummary[] = []
  let cursor: string | undefined

  do {
    const response = await fetchLlmStatsJson<LlmStatsModelsResponse>('/v1/models', {
      limit: MODELS_PAGE_LIMIT,
      cursor,
    })
    models.push(...(response.models || []))
    cursor = response.next_cursor || undefined
  } while (cursor)

  return models
}

async function fetchAllScores(benchmark: string): Promise<LlmStatsScoreRow[]> {
  const scores: LlmStatsScoreRow[] = []
  let cursor: string | undefined

  do {
    const response = await fetchLlmStatsJson<LlmStatsScoresResponse>('/v1/scores', {
      benchmark,
      limit: SCORES_PAGE_LIMIT,
      cursor,
    })
    scores.push(...(response.scores || []))
    cursor = response.next_cursor || undefined
  } while (cursor)

  return scores
}

async function fetchGeneralRankMap(models: LlmStatsModelSummary[]): Promise<Map<string, number>> {
  const fallback = buildFallbackGeneralRankMap(models)

  try {
    const response = await fetchLlmStatsJson<LlmStatsRankingsResponse>('/v1/rankings', {
      category: 'general',
      limit: RANKINGS_LIMIT,
    })
    for (const model of response.models || []) {
      fallback.set(model.model_id, model.rank)
    }
  } catch (error) {
    console.warn('[LLM Stats Sync] Impossible de récupérer le ranking general:', error)
  }

  return fallback
}

async function loadProviderMap(
  supabase: SupabaseClient,
): Promise<Map<string, ModelProviderRow>> {
  const { data, error } = await supabase
    .from('model_providers')
    .select('id, name')

  if (error) {
    throw new Error(`Erreur récupération model_providers: ${error.message}`)
  }

  return new Map(((data || []) as ModelProviderRow[]).map((provider) => [provider.name, provider]))
}

async function ensureProvider(
  supabase: SupabaseClient,
  providers: Map<string, ModelProviderRow>,
  name: string,
): Promise<ModelProviderRow> {
  const existing = providers.get(name)
  if (existing) return existing

  const { data, error } = await supabase
    .from('model_providers')
    .insert({ name })
    .select('id, name')
    .single()

  if (error || !data) {
    const retry = await supabase
      .from('model_providers')
      .select('id, name')
      .eq('name', name)
      .single()

    if (retry.error || !retry.data) {
      throw new Error(`Erreur création provider ${name}: ${error?.message || retry.error?.message}`)
    }

    const provider = retry.data as ModelProviderRow
    providers.set(name, provider)
    return provider
  }

  const provider = data as ModelProviderRow
  providers.set(name, provider)
  return provider
}

async function loadExistingModels(
  supabase: SupabaseClient,
): Promise<Map<string, ExistingModelRow>> {
  const { data, error } = await supabase
    .from('compl_ai_models')
    .select(`
      id,
      model_name,
      model_provider_id,
      model_provider,
      model_type,
      license,
      context_length,
      release_date,
      knowledge_cutoff,
      input_cost_per_million,
      output_cost_per_million,
      model_size,
      gpqa_score,
      aime_2025_score,
      llm_leader_rank
    `)

  if (error) {
    throw new Error(`Erreur récupération compl_ai_models: ${error.message}`)
  }

  const map = new Map<string, ExistingModelRow>()
  for (const model of (data || []) as ExistingModelRow[]) {
    if (model.model_provider_id === null) continue
    map.set(existingModelKey(model.model_provider_id, model.model_name), model)
  }
  return map
}

export async function syncLlmStatsModels(
  supabase: SupabaseClient,
): Promise<LlmStatsSyncResult> {
  const startedAt = new Date().toISOString()
  const startTime = Date.now()
  const errors: string[] = []
  const createdModels: SyncModelChange[] = []
  const updatedModels: SyncModelChange[] = []
  let modelsUnchanged = 0

  const [models, gpqaScores, aimeScores] = await Promise.all([
    fetchAllModels(),
    fetchAllScores('gpqa'),
    fetchAllScores('aime-2025'),
  ])

  const [rankMap, providerMap, existingModels] = await Promise.all([
    fetchGeneralRankMap(models),
    loadProviderMap(supabase),
    loadExistingModels(supabase),
  ])

  const gpqaScoreMap = buildBestScoreMap(gpqaScores)
  const aimeScoreMap = buildBestScoreMap(aimeScores)
  const now = new Date().toISOString()

  for (const model of models) {
    try {
      const provider = await ensureProvider(supabase, providerMap, model.organization.name)
      const record = mapLlmStatsModelToRecord({
        model,
        providerId: provider.id,
        rank: rankMap.get(model.id) ?? null,
        gpqaScore: gpqaScoreMap.get(model.id) ?? null,
        aime2025Score: aimeScoreMap.get(model.id) ?? null,
        now,
      })

      const key = existingModelKey(provider.id, model.name)
      const existing = existingModels.get(key)

      if (!existing) {
        const { data, error } = await supabase
          .from('compl_ai_models')
          .insert(record)
          .select('id')
          .single()

        if (error) {
          errors.push(`Création ${model.organization.name}/${model.name}: ${error.message}`)
          continue
        }

        const created = {
          id: (data as { id?: string } | null)?.id,
          model_name: model.name,
          model_provider: model.organization.name,
        }
        createdModels.push(created)
        existingModels.set(key, { ...record, id: created.id || '', model_provider_id: provider.id })
        continue
      }

      const changedFields = changedFieldsForRecord(existing, record)
      if (changedFields.length === 0) {
        modelsUnchanged++
        continue
      }

      const { error } = await supabase
        .from('compl_ai_models')
        .update(record)
        .eq('id', existing.id)

      if (error) {
        errors.push(`Mise à jour ${model.organization.name}/${model.name}: ${error.message}`)
        continue
      }

      updatedModels.push({
        id: existing.id,
        model_name: model.name,
        model_provider: model.organization.name,
        changedFields,
      })
    } catch (error) {
      errors.push(
        `${model.organization.name}/${model.name}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      )
    }
  }

  const finishedAt = new Date().toISOString()

  return {
    success: errors.length === 0,
    startedAt,
    finishedAt,
    durationMs: Date.now() - startTime,
    modelsFetched: models.length,
    modelsCreated: createdModels.length,
    modelsUpdated: updatedModels.length,
    modelsUnchanged,
    createdModels,
    updatedModels,
    errors,
  }
}
