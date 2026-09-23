import { toTitleCase } from '@/lib/utils'
import {
  applyLifecycleStatusOverride,
  resolveProviderLifecycle,
  type ProviderLifecycle,
  type ProviderLifecycleStatus,
} from '@/lib/bench-llm/provider-lifecycle'

export type BenchSourceKey = 'maydai' | 'compl_ai' | 'comparia' | 'llm_stats' | 'ecologits'

export const BENCH_SOURCE_KEYS: BenchSourceKey[] = [
  'maydai',
  'compl_ai',
  'comparia',
  'llm_stats',
  'ecologits',
]

export const DEFAULT_COMPL_AI_BENCHMARK_TOTAL = 31

export type BenchSourceAvailability = Record<BenchSourceKey, boolean>

export type BenchSourceLink = {
  source: 'llm_stats' | 'ecologits' | 'comparia'
  source_id: string
}

export type CanonicalBenchModel = {
  id: string
  slug?: string | null
  model_name: string
  model_provider: string | null
  model_provider_id?: number | null
  model_type?: string | null
  source_ids?: BenchSourceLink[]
  llm_stats_id?: string | null
  llm_leader_rank?: number | null
  comparia_rank?: number | null
  updated_at?: string | null
  lifecycle_status?: ProviderLifecycleStatus | null
}

export type BenchEvaluationPresence = {
  model_id: string
  score?: number | null
  maydai_score?: number | null
  rang_compar_ia?: number | null
}

export type EcoCatalogPresence = {
  id: string
  provider: string
  name: string
  is_active: boolean
  last_seen_at: string
  link?: Array<{ maydai_model_id: string }> | { maydai_model_id: string } | null
  estimate?: unknown[] | unknown | null
}

export type CompariaCatalogPresence = {
  id: string
  source_id: string
  organisation: string
  rank: number
  is_active: boolean
  last_imported_at: string
  maydai_model_id?: string | null
}

export type BenchModelMetrics = {
  sourcesFilled: number
  sourcesTotal: 5
  maydaiScore: number | null
  complAiFilled: number
  complAiTotal: number
  compariaRank: number | null
  llmStatsRank: number | null
  hasEcologits: boolean
  hasSystemCard: boolean
}

export type UnifiedBenchModel = {
  entityId: string
  canonicalModelId: string | null
  ecoModelId: string | null
  compariaModelId: string | null
  slug: string
  name: string
  rawName: string
  provider: string
  active: boolean
  updatedAt: string | null
  inQuestionnaire: boolean
  sources: BenchSourceAvailability
  metrics: BenchModelMetrics
  lifecycle: ProviderLifecycle | null
}

export type BenchProviderGroup = {
  provider: string
  models: UnifiedBenchModel[]
  scoredCount: number
  inQuestionnaire: boolean
}

export type BuildUnifiedBenchModelsOptions = {
  /** Conservé à true pour les tests ; le dashboard n’affiche que les fiches canoniques. */
  includeUnmatchedCatalogs?: boolean
  complAiBenchmarkTotal?: number
  systemCardSlugs?: Iterable<string>
  /** IDs `model_providers` proposés à la création d’un cas d’usage (tooltip renseigné). */
  questionnaireProviderIds?: Iterable<number>
}

export function countFilledBenchSources(sources: BenchSourceAvailability): number {
  return BENCH_SOURCE_KEYS.reduce((count, key) => count + (sources[key] ? 1 : 0), 0)
}

export function maydaiScoreFromEvaluations(evaluations: BenchEvaluationPresence[]): number | null {
  const scores = evaluations
    .map((row) => row.score)
    .filter((score): score is number => typeof score === 'number' && Number.isFinite(score))
  if (scores.length === 0) return null
  return Math.round((scores.reduce((sum, score) => sum + score, 0) / scores.length) * 100)
}

export function buildBenchModelMetrics(params: {
  sources: BenchSourceAvailability
  evaluations?: BenchEvaluationPresence[]
  compariaRank?: number | null
  llmStatsRank?: number | null
  hasSystemCard?: boolean
  complAiTotal?: number
}): BenchModelMetrics {
  const evaluations = params.evaluations ?? []
  const filled = evaluations.filter((row) => row.score != null).length
  return {
    sourcesFilled: countFilledBenchSources(params.sources),
    sourcesTotal: 5,
    maydaiScore: maydaiScoreFromEvaluations(evaluations),
    complAiFilled: filled,
    complAiTotal: params.complAiTotal ?? DEFAULT_COMPL_AI_BENCHMARK_TOTAL,
    compariaRank: params.compariaRank ?? null,
    llmStatsRank: params.llmStatsRank ?? null,
    hasEcologits: params.sources.ecologits,
    hasSystemCard: Boolean(params.hasSystemCard),
  }
}

export function groupUnifiedBenchModelsByProvider(models: UnifiedBenchModel[]): BenchProviderGroup[] {
  const groups = new Map<string, UnifiedBenchModel[]>()
  for (const model of models) {
    const rows = groups.get(model.provider) ?? []
    rows.push(model)
    groups.set(model.provider, rows)
  }

  return [...groups.entries()]
    .sort(([left], [right]) => left.localeCompare(right, 'fr'))
    .map(([provider, providerModels]) => ({
      provider,
      models: providerModels,
      scoredCount: providerModels.filter((model) => model.sources.compl_ai).length,
      inQuestionnaire: providerModels.some((model) => model.inQuestionnaire),
    }))
}

export function splitBenchProviderGroupsByQuestionnaire(groups: BenchProviderGroup[]): {
  inQuestionnaire: BenchProviderGroup[]
  catalogOnly: BenchProviderGroup[]
} {
  return {
    inQuestionnaire: groups.filter((group) => group.inQuestionnaire),
    catalogOnly: groups.filter((group) => !group.inQuestionnaire),
  }
}

function firstRelation<T>(value: T | T[] | null | undefined): T | null {
  return Array.isArray(value) ? value[0] ?? null : value ?? null
}

export function parseBenchEntityId(entityId: string):
  | { kind: 'maydai'; id: string }
  | { kind: 'ecologits'; id: string }
  | { kind: 'comparia'; id: string }
  | null {
  if (entityId.startsWith('maydai_')) return { kind: 'maydai', id: entityId.slice(7) }
  if (entityId.startsWith('ecologits_')) return { kind: 'ecologits', id: entityId.slice(10) }
  if (entityId.startsWith('comparia_')) return { kind: 'comparia', id: entityId.slice(9) }
  return null
}

function hasSourceLink(model: CanonicalBenchModel, source: BenchSourceKey): boolean {
  return model.source_ids?.some((link) => link.source === source) ?? false
}

function uniqueById<T extends { id: string }>(rows: T[]): T[] {
  const seen = new Set<string>()
  const unique: T[] = []
  for (const row of rows) {
    if (seen.has(row.id)) continue
    seen.add(row.id)
    unique.push(row)
  }
  return unique
}

function uniqueSourceLinks(links: BenchSourceLink[]): BenchSourceLink[] {
  const seen = new Set<string>()
  return links.filter((link) => {
    const key = `${link.source}:${link.source_id}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

export function attachSourceIdsToCanonicalModels(
  models: CanonicalBenchModel[],
  sourceIds: Array<{ model_id: string; source: string; source_id: string }>,
): CanonicalBenchModel[] {
  const byModel = new Map<string, BenchSourceLink[]>()
  for (const link of sourceIds) {
    if (link.source !== 'llm_stats' && link.source !== 'ecologits' && link.source !== 'comparia') {
      continue
    }
    const links = byModel.get(link.model_id) ?? []
    links.push({ source: link.source, source_id: link.source_id })
    byModel.set(link.model_id, links)
  }

  return uniqueById(models).map((model) => {
    const links = uniqueSourceLinks(byModel.get(model.id) ?? model.source_ids ?? [])
    return {
      ...model,
      source_ids: links,
      llm_stats_id:
        links.find((link) => link.source === 'llm_stats')?.source_id ?? model.llm_stats_id ?? null,
    }
  })
}

const HISTORY_MODEL_COUNT_KEYS = [
  'models_fetched',
  'rows_imported',
  'models_synced',
  'rows_received',
] as const

export function modelsCountFromHistoryRow(row: Record<string, unknown> | null | undefined): number | null {
  if (!row) return null
  for (const key of HISTORY_MODEL_COUNT_KEYS) {
    const value = row[key]
    if (typeof value === 'number' && Number.isFinite(value)) return value
  }
  return null
}

export function withNormalizedModelsFetched(
  rows: unknown[] | null | undefined,
): Array<Record<string, unknown> & { models_fetched: number | null }> {
  return ((rows ?? []) as Record<string, unknown>[]).map((row) => ({
    ...row,
    models_fetched: modelsCountFromHistoryRow(row),
  }))
}

export function countDistinctEvaluatedModels(
  evaluations: Array<{ model_id: string; score?: number | null }>,
): number {
  const ids = new Set<string>()
  for (const evaluation of evaluations) {
    if (!evaluation.model_id) continue
    if ('score' in evaluation && evaluation.score == null) continue
    ids.add(evaluation.model_id)
  }
  return ids.size
}

export function overlayLatestModelsCount(
  rows: Array<Record<string, unknown> & { models_fetched: number | null }>,
  count: number,
): Array<Record<string, unknown> & { models_fetched: number | null }> {
  if (rows.length === 0) {
    return [{ status: 'terminé', models_fetched: count }]
  }
  return [{ ...rows[0], models_fetched: count }, ...rows.slice(1)]
}

export function buildUnifiedBenchModels(
  canonicalModels: CanonicalBenchModel[],
  evaluations: BenchEvaluationPresence[],
  ecoModels: EcoCatalogPresence[],
  compariaModels: CompariaCatalogPresence[] = [],
  options?: BuildUnifiedBenchModelsOptions,
): UnifiedBenchModel[] {
  const evaluationsByModel = new Map<string, BenchEvaluationPresence[]>()
  for (const evaluation of evaluations) {
    const rows = evaluationsByModel.get(evaluation.model_id) ?? []
    rows.push(evaluation)
    evaluationsByModel.set(evaluation.model_id, rows)
  }

  const ecoByMaydai = new Map<string, EcoCatalogPresence>()
  const ecoNamesByMaydai = new Map<string, string[]>()
  const unmatchedEco: EcoCatalogPresence[] = []
  for (const eco of ecoModels) {
    const link = firstRelation(eco.link)
    if (link?.maydai_model_id) {
      ecoByMaydai.set(link.maydai_model_id, eco)
      const names = ecoNamesByMaydai.get(link.maydai_model_id) ?? []
      names.push(eco.name)
      ecoNamesByMaydai.set(link.maydai_model_id, names)
    } else unmatchedEco.push(eco)
  }

  const compariaByMaydai = new Map<string, CompariaCatalogPresence>()
  const unmatchedComparia: CompariaCatalogPresence[] = []
  for (const comparia of compariaModels) {
    if (comparia.maydai_model_id) compariaByMaydai.set(comparia.maydai_model_id, comparia)
    else unmatchedComparia.push(comparia)
  }

  const includeUnmatchedCatalogs = options?.includeUnmatchedCatalogs ?? true
  const complAiTotal = options?.complAiBenchmarkTotal ?? DEFAULT_COMPL_AI_BENCHMARK_TOTAL
  const systemCardSlugs = new Set(
    [...(options?.systemCardSlugs ?? [])].map((slug) => slug.trim()).filter(Boolean),
  )
  const questionnaireProviderIds = new Set(
    [...(options?.questionnaireProviderIds ?? [])].filter((id) => Number.isInteger(id)),
  )

  const canonicalRows = uniqueById(canonicalModels).map((model): UnifiedBenchModel => {
    const modelEvaluations = evaluationsByModel.get(model.id) ?? []
    const eco = ecoByMaydai.get(model.id) ?? null
    const comparia = compariaByMaydai.get(model.id) ?? null
    const slug = model.slug?.trim() || model.model_name
    const sources: BenchSourceAvailability = {
      maydai: maydaiScoreFromEvaluations(modelEvaluations) != null,
      compl_ai: modelEvaluations.some((row) => row.score != null),
      comparia:
        Boolean(comparia) ||
        hasSourceLink(model, 'comparia') ||
        model.comparia_rank != null ||
        modelEvaluations.some((row) => row.rang_compar_ia != null),
      llm_stats: hasSourceLink(model, 'llm_stats') || Boolean(model.llm_stats_id),
      ecologits: Boolean(eco) || hasSourceLink(model, 'ecologits'),
    }
    const compariaRank =
      comparia?.rank ??
      model.comparia_rank ??
      modelEvaluations.find((row) => row.rang_compar_ia != null)?.rang_compar_ia ??
      null
    return {
      entityId: `maydai_${model.id}`,
      canonicalModelId: model.id,
      ecoModelId: eco?.id ?? null,
      compariaModelId: comparia?.id ?? null,
      slug,
      name: slug,
      rawName: model.model_name,
      provider: toTitleCase(model.model_provider ?? '') || '—',
      active: eco?.is_active ?? true,
      updatedAt: eco?.last_seen_at ?? model.updated_at ?? null,
      inQuestionnaire:
        model.model_provider_id != null && questionnaireProviderIds.has(model.model_provider_id),
      lifecycle: applyLifecycleStatusOverride(
        resolveProviderLifecycle([
          slug,
          model.model_name,
          ...(ecoNamesByMaydai.get(model.id) ?? []),
          eco?.name,
          ...(model.source_ids?.map((link) => link.source_id) ?? []),
        ]),
        model.lifecycle_status,
      ),
      sources,
      metrics: buildBenchModelMetrics({
        sources,
        evaluations: modelEvaluations,
        compariaRank,
        llmStatsRank: model.llm_leader_rank ?? null,
        hasSystemCard: systemCardSlugs.has(slug),
        complAiTotal,
      }),
    }
  })

  const ecoRows = unmatchedEco.map((eco): UnifiedBenchModel => {
    const sources: BenchSourceAvailability = {
      maydai: false,
      compl_ai: false,
      comparia: false,
      llm_stats: false,
      ecologits: true,
    }
    return {
      entityId: `ecologits_${eco.id}`,
      canonicalModelId: null,
      ecoModelId: eco.id,
      compariaModelId: null,
      slug: eco.name,
      name: eco.name,
      rawName: eco.name,
      provider: toTitleCase(eco.provider) || eco.provider,
      active: eco.is_active,
      updatedAt: eco.last_seen_at,
      inQuestionnaire: false,
      lifecycle: resolveProviderLifecycle([eco.name]),
      sources,
      metrics: buildBenchModelMetrics({
        sources,
        hasSystemCard: systemCardSlugs.has(eco.name),
        complAiTotal,
      }),
    }
  })

  const compariaRows = unmatchedComparia.map((comparia): UnifiedBenchModel => {
    const sources: BenchSourceAvailability = {
      maydai: false,
      compl_ai: false,
      comparia: true,
      llm_stats: false,
      ecologits: false,
    }
    return {
      entityId: `comparia_${comparia.id}`,
      canonicalModelId: null,
      ecoModelId: null,
      compariaModelId: comparia.id,
      slug: comparia.source_id,
      name: comparia.source_id,
      rawName: comparia.source_id,
      provider: toTitleCase(comparia.organisation) || comparia.organisation,
      active: comparia.is_active,
      updatedAt: comparia.last_imported_at,
      inQuestionnaire: false,
      lifecycle: resolveProviderLifecycle([comparia.source_id]),
      sources,
      metrics: buildBenchModelMetrics({
        sources,
        compariaRank: comparia.rank,
        hasSystemCard: systemCardSlugs.has(comparia.source_id),
        complAiTotal,
      }),
    }
  })

  const rows = includeUnmatchedCatalogs
    ? [...canonicalRows, ...ecoRows, ...compariaRows]
    : canonicalRows

  return rows.sort(
    (a, b) => a.provider.localeCompare(b.provider) || a.slug.localeCompare(b.slug),
  )
}

export function filterUnifiedBenchModels(
  models: UnifiedBenchModel[],
  filters: {
    search?: string
    provider?: string
    active?: 'all' | 'active' | 'inactive'
    source?: BenchSourceKey
    availability?: 'all' | 'present' | 'missing'
  },
): UnifiedBenchModel[] {
  const search = filters.search?.trim().toLowerCase() ?? ''
  return models.filter((model) => {
    if (
      search &&
      !`${model.provider} ${model.slug} ${model.name} ${model.rawName}`.toLowerCase().includes(search)
    ) {
      return false
    }
    if (filters.provider && model.provider !== filters.provider) return false
    if (filters.active === 'active' && !model.active) return false
    if (filters.active === 'inactive' && model.active) return false
    if (filters.source && filters.availability === 'present' && !model.sources[filters.source]) return false
    if (filters.source && filters.availability === 'missing' && model.sources[filters.source]) return false
    return true
  })
}
