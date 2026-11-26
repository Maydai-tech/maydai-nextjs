import type { SupabaseClient } from '@supabase/supabase-js'

import { normalizeLlmModelSlug } from '@/lib/bench-llm/model-slug'
import { followMergedModelId, type AliasRecord } from '@/lib/bench-llm/model-lineage'
import { omitImmutableExternalUpdateColumns, omitVeilleColumns } from '@/lib/bench-llm/veille-columns'
import { toExplicitError } from '@/lib/errors/postgrest-error'

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
  slug: string | null
  llm_stats_id: string | null
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
  merged_into_id?: string | null
}

type ExistingModelsIndex = {
  byLlmStatsId: Map<string, ExistingModelRow>
  bySlug: Map<string, ExistingModelRow>
  byProviderAndName: Map<string, ExistingModelRow>
  modelsById: Map<string, ExistingModelRow>
  aliases: AliasRecord[]
}

export interface LlmStatsModelRecord {
  llm_stats_id: string
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

function modelDisplayKey(model: LlmStatsModelSummary): string {
  return `${model.organization.name}:${model.name}`.toLowerCase()
}

function dateValue(date?: string | null): number {
  if (!date) return Number.NEGATIVE_INFINITY
  const time = Date.parse(date)
  return Number.isFinite(time) ? time : Number.NEGATIVE_INFINITY
}

function compareCanonicalModels(
  candidate: LlmStatsModelSummary,
  current: LlmStatsModelSummary,
): number {
  const dateDiff = dateValue(candidate.release_date) - dateValue(current.release_date)
  if (dateDiff !== 0) return dateDiff

  const candidateScore = candidate.top_scores?.general
  const currentScore = current.top_scores?.general
  const candidateHasScore = typeof candidateScore === 'number' && Number.isFinite(candidateScore)
  const currentHasScore = typeof currentScore === 'number' && Number.isFinite(currentScore)
  if (candidateHasScore || currentHasScore) {
    if (!candidateHasScore) return -1
    if (!currentHasScore) return 1
    if (candidateScore !== currentScore) return candidateScore! - currentScore!
  }

  return candidate.id.localeCompare(current.id)
}

export function selectCanonicalLlmStatsModels(
  models: LlmStatsModelSummary[],
): LlmStatsModelSummary[] {
  const byDisplayKey = new Map<string, LlmStatsModelSummary>()

  for (const model of models) {
    const key = modelDisplayKey(model)
    const current = byDisplayKey.get(key)
    if (!current || compareCanonicalModels(model, current) > 0) {
      byDisplayKey.set(key, model)
    }
  }

  return [...byDisplayKey.values()]
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
    llm_stats_id: params.model.id,
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

export function normalizeLlmStatsMatchValue(value: string): string {
  const normalized = value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')

  const aliases: Record<string, string> = {
    claude37sonnet: 'claudesonnet37',
    claude3opus: 'claudeopus3',
  }

  return aliases[normalized] || normalized
}

const PROVIDER_ALIASES = new Map<string, string>([
  [normalizeLlmStatsMatchValue('Alibaba Cloud / Qwen Team'), 'Qwen'],
  [normalizeLlmStatsMatchValue('Alibaba (Qwen)'), 'Qwen'],
  [normalizeLlmStatsMatchValue('Mistral AI'), 'Mistral'],
])

export function canonicalLlmStatsProviderName(providerName: string): string {
  return PROVIDER_ALIASES.get(normalizeLlmStatsMatchValue(providerName)) || providerName.trim()
}

function providerMatchKey(providerName: string): string {
  return normalizeLlmStatsMatchValue(canonicalLlmStatsProviderName(providerName))
}

function existingModelKey(providerId: number, modelName: string): string {
  return `${providerId}:${normalizeLlmStatsMatchValue(modelName)}`
}

export function llmStatsDatabaseInsert(record: LlmStatsModelRecord): Record<string, unknown> {
  const { llm_stats_id: _llmStatsId, ...databaseRecord } = record
  return omitVeilleColumns(databaseRecord as Record<string, unknown>)
}

export function llmStatsDatabaseUpdate(record: LlmStatsModelRecord): Record<string, unknown> {
  const { llm_stats_id: _llmStatsId, ...databaseRecord } = record
  return omitImmutableExternalUpdateColumns(databaseRecord as Record<string, unknown>)
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
  const update = llmStatsDatabaseUpdate(record)
  const current = existing as unknown as Record<string, unknown>
  return Object.keys(update).filter(
    (field) => field !== 'updated_at' && !valuesEqual(current[field], update[field]),
  )
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

  return new Map(
    ((data || []) as ModelProviderRow[]).map((provider) => [providerMatchKey(provider.name), provider]),
  )
}

async function ensureProvider(
  supabase: SupabaseClient,
  providers: Map<string, ModelProviderRow>,
  name: string,
): Promise<ModelProviderRow> {
  const canonicalName = canonicalLlmStatsProviderName(name)
  const matchKey = providerMatchKey(canonicalName)
  const existing = providers.get(matchKey)
  if (existing) return existing

  const { data, error } = await supabase
    .from('model_providers')
    .insert({ name: canonicalName })
    .select('id, name')
    .single()

  if (error || !data) {
    const retry = await supabase
      .from('model_providers')
      .select('id, name')
      .eq('name', canonicalName)
      .single()

    if (retry.error || !retry.data) {
      throw new Error(
        `Erreur création provider ${canonicalName}: ${error?.message || retry.error?.message}`,
      )
    }

    const provider = retry.data as ModelProviderRow
    providers.set(matchKey, provider)
    return provider
  }

  const provider = data as ModelProviderRow
  providers.set(matchKey, provider)
  return provider
}

async function loadExistingModels(
  supabase: SupabaseClient,
): Promise<ExistingModelsIndex> {
  const [
    { data, error },
    { data: sourceIds, error: sourceError },
    { data: aliasRows, error: aliasError },
  ] = await Promise.all([
    supabase.from('compl_ai_models').select(`
      id,
      slug,
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
      llm_leader_rank,
      merged_into_id
    `),
    supabase
      .from('llm_model_source_ids')
      .select('model_id, source_id')
      .eq('source', 'llm_stats'),
    supabase
      .from('llm_model_aliases')
      .select('model_id, source, source_id, normalized_name, raw_name')
      .eq('source', 'llm_stats'),
  ])

  if (error) throw toExplicitError('LLM Stats Sync - compl_ai_models', error)
  if (sourceError) throw toExplicitError('LLM Stats Sync - llm_model_source_ids', sourceError)
  if (aliasError) throw toExplicitError('LLM Stats Sync - llm_model_aliases', aliasError)

  const modelsById = new Map(
    ((data || []) as Omit<ExistingModelRow, 'llm_stats_id'>[]).map((model) => [
      model.id,
      { ...model, llm_stats_id: null as string | null },
    ]),
  )

  const byLlmStatsId = new Map<string, ExistingModelRow>()
  for (const link of sourceIds || []) {
    const model = modelsById.get(link.model_id)
    if (!model) continue
    if (!model.llm_stats_id) model.llm_stats_id = link.source_id
    byLlmStatsId.set(link.source_id, model)
  }

  const bySlug = new Map<string, ExistingModelRow>()
  const byProviderAndName = new Map<string, ExistingModelRow>()
  for (const model of modelsById.values()) {
    if (model.slug && !bySlug.has(model.slug)) {
      bySlug.set(model.slug, model)
    }
    if (model.model_provider_id === null) continue
    const key = existingModelKey(model.model_provider_id, model.model_name)
    if (!byProviderAndName.has(key)) {
      byProviderAndName.set(key, model)
    }
  }

  return { byLlmStatsId, bySlug, byProviderAndName, modelsById, aliases: (aliasRows ?? []).map((alias) => ({
    modelId: alias.model_id,
    source: alias.source,
    sourceId: alias.source_id,
    normalizedName: alias.normalized_name,
    rawName: alias.raw_name,
  })) }
}

function findExistingLlmStatsModel(
  existingModels: ExistingModelsIndex,
  model: LlmStatsModelSummary,
  providerId: number,
): { row: ExistingModelRow; matchMethod: 'exact' | 'slug' } | null {
  const lineage = new Map(
    [...existingModels.modelsById.entries()].map(([id, row]) => [id, {
      id,
      mergedIntoId: row.merged_into_id ?? null,
    }]),
  )
  const normalizedName = normalizeLlmModelSlug(model.name)
  const nameMatches = normalizedName
    ? existingModels.aliases.filter((item) => item.normalizedName === normalizedName)
    : []
  const alias = existingModels.aliases.find((item) => item.sourceId === model.id)
    ?? (nameMatches.length === 1 ? nameMatches[0] : null)
  if (alias) {
    const resolvedId = followMergedModelId(alias.modelId, lineage)
    const resolved = existingModels.modelsById.get(resolvedId)
    if (resolved) return { row: resolved, matchMethod: 'exact' }
  }

  const bySourceId = existingModels.byLlmStatsId.get(model.id)
  if (bySourceId) return { row: bySourceId, matchMethod: 'exact' }

  const nameSlug = normalizeLlmModelSlug(model.name)
  if (nameSlug) {
    const byNameSlug = existingModels.bySlug.get(nameSlug)
    if (byNameSlug) return { row: byNameSlug, matchMethod: 'slug' }
  }

  const idSlug = normalizeLlmModelSlug(model.id)
  if (idSlug && idSlug !== nameSlug) {
    const byIdSlug = existingModels.bySlug.get(idSlug)
    if (byIdSlug) return { row: byIdSlug, matchMethod: 'slug' }
  }

  const byName = existingModels.byProviderAndName.get(existingModelKey(providerId, model.name))
  if (byName) return { row: byName, matchMethod: 'exact' }

  return null
}

function rememberExistingModel(
  existingModels: ExistingModelsIndex,
  row: ExistingModelRow,
  providerId: number,
) {
  if (row.llm_stats_id) existingModels.byLlmStatsId.set(row.llm_stats_id, row)
  if (row.slug) existingModels.bySlug.set(row.slug, row)
  existingModels.byProviderAndName.set(existingModelKey(providerId, row.model_name), row)
  existingModels.modelsById.set(row.id, row)
}

async function upsertLlmStatsSourceLink(
  supabase: SupabaseClient,
  existingModels: ExistingModelsIndex,
  params: {
    modelId: string
    sourceId: string
    matchMethod: 'exact' | 'slug'
    previousSourceId: string | null
  },
): Promise<void> {
  const owner = existingModels.byLlmStatsId.get(params.sourceId)
  if (owner && owner.id !== params.modelId) {
    throw new Error(
      `Identifiant LLM Stats « ${params.sourceId} » déjà lié à un autre modèle`,
    )
  }

  if (!owner) {
    const { error } = await supabase.from('llm_model_source_ids').insert({
      model_id: params.modelId,
      source: 'llm_stats',
      source_id: params.sourceId,
      match_method: params.matchMethod,
    })
    if (error) throw toExplicitError('LLM Stats Sync - source_ids', error)
  } else if (owner.id === params.modelId) {
    const { error } = await supabase
      .from('llm_model_source_ids')
      .update({
        match_method: params.matchMethod,
        updated_at: new Date().toISOString(),
      })
      .eq('source', 'llm_stats')
      .eq('source_id', params.sourceId)
    if (error) throw toExplicitError('LLM Stats Sync - source_ids', error)
  }

  if (params.previousSourceId && params.previousSourceId !== params.sourceId) {
    const { error } = await supabase
      .from('llm_model_source_ids')
      .delete()
      .eq('source', 'llm_stats')
      .eq('source_id', params.previousSourceId)
      .eq('model_id', params.modelId)
    if (error) throw toExplicitError('LLM Stats Sync - source_ids', error)
    existingModels.byLlmStatsId.delete(params.previousSourceId)
  }
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

  const canonicalModels = selectCanonicalLlmStatsModels(models)
  const gpqaScoreMap = buildBestScoreMap(gpqaScores)
  const aimeScoreMap = buildBestScoreMap(aimeScores)
  const now = new Date().toISOString()

  for (const model of canonicalModels) {
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
      record.model_provider = provider.name

      const matched = findExistingLlmStatsModel(existingModels, model, provider.id)
      const existing = matched?.row ?? null

      if (!existing) {
        const { data, error } = await supabase
          .from('compl_ai_models')
          .insert({ ...llmStatsDatabaseInsert(record), role: 'a_classer' })
          .select('id, slug')
          .single()

        if (error) {
          const explicit = toExplicitError('LLM Stats Sync', error)
          errors.push(`Création ${model.organization.name}/${model.name}: ${explicit.message}`)
          continue
        }

        const createdId = (data as { id?: string } | null)?.id
        const createdSlug =
          (data as { slug?: string } | null)?.slug ?? normalizeLlmModelSlug(model.name)
        if (!createdId) {
          errors.push(`Création ${model.organization.name}/${model.name}: id manquant`)
          continue
        }

        await upsertLlmStatsSourceLink(supabase, existingModels, {
          modelId: createdId,
          sourceId: record.llm_stats_id,
          matchMethod: 'exact',
          previousSourceId: null,
        })
        const normalizedName = normalizeLlmModelSlug(model.name) ?? model.name.toLowerCase()
        const { error: aliasError } = await supabase.from('llm_model_aliases').upsert({
          model_id: createdId,
          source: 'llm_stats',
          source_id: record.llm_stats_id,
          raw_name: model.name,
          normalized_name: normalizedName,
          match_method: 'exact',
        }, { onConflict: 'source,source_id' })
        if (aliasError) {
          const explicit = toExplicitError('LLM Stats Sync', aliasError)
          errors.push(`Alias ${model.organization.name}/${model.name}: ${explicit.message}`)
        }

        createdModels.push({
          id: createdId,
          model_name: model.name,
          model_provider: provider.name || model.organization.name || 'Inconnu',
        })
        rememberExistingModel(
          existingModels,
          {
            ...record,
            id: createdId,
            slug: createdSlug,
            model_provider_id: provider.id,
          },
          provider.id,
        )
        continue
      }

      const metricTarget = existing.merged_into_id
        ? existingModels.modelsById.get(existing.merged_into_id) ?? existing
        : existing
      const changedFields = changedFieldsForRecord(metricTarget, record)
      const needsSourceLink = existing.llm_stats_id !== record.llm_stats_id
      if (needsSourceLink) changedFields.push('source_id')

      if (changedFields.length === 0) {
        modelsUnchanged++
        continue
      }

      const modelFieldChanges = changedFields.filter((field) => field !== 'source_id')
      if (modelFieldChanges.length > 0) {
        const { error } = await supabase
          .from('compl_ai_models')
          .update(llmStatsDatabaseUpdate(record))
          .eq('id', metricTarget.id)

        if (error) {
          const explicit = toExplicitError('LLM Stats Sync', error)
          errors.push(`Mise à jour ${model.organization.name}/${model.name}: ${explicit.message}`)
          continue
        }
      }

      if (needsSourceLink) {
        await upsertLlmStatsSourceLink(supabase, existingModels, {
          modelId: existing.id,
          sourceId: record.llm_stats_id,
          matchMethod: matched?.matchMethod ?? 'exact',
          previousSourceId: existing.llm_stats_id,
        })
      }

      updatedModels.push({
        id: metricTarget.id,
        model_name: model.name,
        model_provider: provider.name || model.organization.name || 'Inconnu',
        changedFields,
      })

      const updatePayload = llmStatsDatabaseUpdate(record)
      const updatedRow: ExistingModelRow = {
        ...metricTarget,
        context_length: updatePayload.context_length as number | null,
        release_date: updatePayload.release_date as string | null,
        knowledge_cutoff: updatePayload.knowledge_cutoff as string | null,
        input_cost_per_million: updatePayload.input_cost_per_million as number | null,
        output_cost_per_million: updatePayload.output_cost_per_million as number | null,
        model_size: updatePayload.model_size as string | null,
        gpqa_score: updatePayload.gpqa_score as number | null,
        aime_2025_score: updatePayload.aime_2025_score as number | null,
        llm_leader_rank: updatePayload.llm_leader_rank as number | null,
        id: metricTarget.id,
        slug: metricTarget.slug,
        model_name: metricTarget.model_name,
        model_provider: metricTarget.model_provider,
        model_provider_id: metricTarget.model_provider_id,
        model_type: metricTarget.model_type,
        license: metricTarget.license,
      }
      rememberExistingModel(existingModels, updatedRow, metricTarget.model_provider_id ?? provider.id)
    } catch (error) {
      const explicit = toExplicitError('LLM Stats Sync', error)
      errors.push(`${model.organization.name}/${model.name}: ${explicit.message}`)
    }
  }

  const finishedAt = new Date().toISOString()

  return {
    success: errors.length === 0,
    startedAt,
    finishedAt,
    durationMs: Date.now() - startTime,
    modelsFetched: canonicalModels.length,
    modelsCreated: createdModels.length,
    modelsUpdated: updatedModels.length,
    modelsUnchanged,
    createdModels,
    updatedModels,
    errors,
  }
}
