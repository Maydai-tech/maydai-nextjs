export type BenchSourceKey = 'maydai' | 'compl_ai' | 'comparia' | 'llm_stats' | 'ecologits'

export type BenchSourceAvailability = Record<BenchSourceKey, boolean>

export type CanonicalBenchModel = {
  id: string
  model_name: string
  model_provider: string | null
  model_type?: string | null
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
  name: string
  provider: string
  active: boolean
  updatedAt: string | null
  sources: BenchSourceAvailability
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

export function buildUnifiedBenchModels(
  canonicalModels: CanonicalBenchModel[],
  evaluations: BenchEvaluationPresence[],
  ecoModels: EcoCatalogPresence[],
  compariaModels: CompariaCatalogPresence[] = [],
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

  const canonicalRows = canonicalModels.map((model): UnifiedBenchModel => {
    const modelEvaluations = evaluationsByModel.get(model.id) ?? []
    const eco = ecoByMaydai.get(model.id) ?? null
    const comparia = compariaByMaydai.get(model.id) ?? null
    return {
      entityId: `maydai_${model.id}`,
      canonicalModelId: model.id,
      ecoModelId: eco?.id ?? null,
      compariaModelId: comparia?.id ?? null,
      name: model.model_name,
      provider: model.model_provider ?? '—',
      active: eco?.is_active ?? true,
      updatedAt: eco?.last_seen_at ?? model.updated_at ?? null,
      sources: {
        maydai: modelEvaluations.some((row) => row.maydai_score != null),
        compl_ai: modelEvaluations.some((row) => row.score != null),
        comparia:
          Boolean(comparia) ||
          model.comparia_rank != null ||
          modelEvaluations.some((row) => row.rang_compar_ia != null),
        llm_stats: Boolean(model.llm_stats_id),
        ecologits: Boolean(eco),
      },
    }
  })

  const ecoRows = unmatchedEco.map(
    (eco): UnifiedBenchModel => ({
      entityId: `ecologits_${eco.id}`,
      canonicalModelId: null,
      ecoModelId: eco.id,
      compariaModelId: null,
      name: eco.name,
      provider: eco.provider,
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
      name: comparia.source_id,
      provider: comparia.organisation,
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

  return [...canonicalRows, ...ecoRows, ...compariaRows].sort(
    (a, b) => a.provider.localeCompare(b.provider) || a.name.localeCompare(b.name),
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
    if (search && !`${model.provider} ${model.name}`.toLowerCase().includes(search)) return false
    if (filters.provider && model.provider !== filters.provider) return false
    if (filters.active === 'active' && !model.active) return false
    if (filters.active === 'inactive' && model.active) return false
    if (filters.source && filters.availability === 'present' && !model.sources[filters.source]) return false
    if (filters.source && filters.availability === 'missing' && model.sources[filters.source]) return false
    return true
  })
}
