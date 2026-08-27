import { toTitleCase } from '@/lib/utils'

export type BenchSourceKey = 'maydai' | 'compl_ai' | 'comparia' | 'llm_stats' | 'ecologits'

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
  model_type?: string | null
  source_ids?: BenchSourceLink[]
  llm_stats_id?: string | null
  comparia_rank?: number | null
  updated_at?: string | null
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
  sources: BenchSourceAvailability
}

export type BuildUnifiedBenchModelsOptions = {
  /** Conservé à true pour les tests ; le dashboard n’affiche que les fiches canoniques. */
  includeUnmatchedCatalogs?: boolean
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
  const unmatchedEco: EcoCatalogPresence[] = []
  for (const eco of ecoModels) {
    const link = firstRelation(eco.link)
    if (link?.maydai_model_id) ecoByMaydai.set(link.maydai_model_id, eco)
    else unmatchedEco.push(eco)
  }

  const compariaByMaydai = new Map<string, CompariaCatalogPresence>()
  const unmatchedComparia: CompariaCatalogPresence[] = []
  for (const comparia of compariaModels) {
    if (comparia.maydai_model_id) compariaByMaydai.set(comparia.maydai_model_id, comparia)
    else unmatchedComparia.push(comparia)
  }

  const includeUnmatchedCatalogs = options?.includeUnmatchedCatalogs ?? true

  const canonicalRows = uniqueById(canonicalModels).map((model): UnifiedBenchModel => {
    const modelEvaluations = evaluationsByModel.get(model.id) ?? []
    const eco = ecoByMaydai.get(model.id) ?? null
    const comparia = compariaByMaydai.get(model.id) ?? null
    const slug = model.slug?.trim() || model.model_name
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
      sources: {
        maydai: modelEvaluations.some((row) => row.maydai_score != null),
        compl_ai: modelEvaluations.some((row) => row.score != null),
        comparia:
          Boolean(comparia) ||
          hasSourceLink(model, 'comparia') ||
          model.comparia_rank != null ||
          modelEvaluations.some((row) => row.rang_compar_ia != null),
        llm_stats: hasSourceLink(model, 'llm_stats') || Boolean(model.llm_stats_id),
        ecologits: Boolean(eco) || hasSourceLink(model, 'ecologits'),
      },
    }
  })

  const ecoRows = unmatchedEco.map(
    (eco): UnifiedBenchModel => ({
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
      sources: {
        maydai: false,
        compl_ai: false,
        comparia: false,
        llm_stats: false,
        ecologits: true,
      },
    }),
  )

  const compariaRows = unmatchedComparia.map(
    (comparia): UnifiedBenchModel => ({
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
      sources: {
        maydai: false,
        compl_ai: false,
        comparia: true,
        llm_stats: false,
        ecologits: false,
      },
    }),
  )

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
