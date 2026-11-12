import { NextRequest, NextResponse } from 'next/server'

const verifyAdminAuth = jest.fn()
const from = jest.fn()

jest.mock('@/lib/admin-auth', () => ({
  verifyAdminAuth: (...args: unknown[]) => verifyAdminAuth(...args),
}))
jest.mock('@/lib/ecologits/sync', () => ({
  createEcoLogitsServiceClient: () => ({ from }),
}))

import { GET } from '../route'

type QueryResult = {
  data: unknown
  error: { message?: string; details?: string } | null
  count?: number | null
}

type ListedModel = {
  slug: string
  releaseDate: string | null
  metrics: { hasSystemCard: boolean }
  lifecycle: { status: string } | null
}

const CANONICAL_MODELS = [
  {
    id: 'retired-card',
    slug: 'alpha-retired-card',
    model_name: 'Retired Card',
    model_provider: 'OpenAI',
    release_date: null,
    lifecycle_status: 'retired',
  },
  {
    id: 'plain-active',
    slug: 'alpha-plain-active',
    model_name: 'Plain Active',
    model_provider: 'OpenAI',
    release_date: null,
    lifecycle_status: 'active',
  },
  {
    id: 'old',
    slug: 'alpha-old',
    model_name: 'Old',
    model_provider: 'OpenAI',
    release_date: '2024-01-01',
    lifecycle_status: 'active',
  },
  {
    id: 'new',
    slug: 'alpha-new',
    model_name: 'New',
    model_provider: 'OpenAI',
    release_date: '2026-06-01',
    lifecycle_status: 'retired',
  },
  {
    id: 'card-active',
    slug: 'alpha-card-active',
    model_name: 'Card Active',
    model_provider: 'OpenAI',
    release_date: null,
    lifecycle_status: 'active',
  },
  {
    id: 'plain-retired',
    slug: 'alpha-plain-retired',
    model_name: 'Plain Retired',
    model_provider: 'OpenAI',
    release_date: null,
    lifecycle_status: 'retired',
  },
]

const SYSTEM_CARDS = [
  {
    model_identifier: 'alpha-old',
    updated_at: '2026-03-01',
    created_at: '2025-01-01',
  },
  {
    model_identifier: 'alpha-card-active',
    updated_at: null,
    created_at: '2026-08-15',
  },
  {
    model_identifier: 'alpha-retired-card',
    updated_at: '2026-01-01',
    created_at: '2024-06-01',
  },
]

function installCatalog(overrides: Record<string, QueryResult> = {}) {
  const defaults: Record<string, QueryResult> = {
    compl_ai_models: { data: CANONICAL_MODELS, error: null },
    compl_ai_evaluations: { data: [], error: null },
    'compl_ai_evaluations#2': { data: [], error: null },
    ecologits_models: { data: [], error: null },
    comparia_models: { data: [], error: null },
    llm_model_source_ids: { data: [], error: null },
    llm_stats_sync_runs: { data: [], error: null },
    ecologits_sync_runs: { data: [], error: null },
    comparia_import_runs: { data: [], error: null },
    compl_ai_sync_logs: { data: [], error: null },
    compl_ai_benchmarks: { data: null, error: null, count: 31 },
    llm_system_cards: { data: SYSTEM_CARDS, error: null },
    model_providers: { data: [], error: null },
  }
  const calls = new Map<string, number>()
  const selects: Array<{ table: string; columns: unknown }> = []

  from.mockImplementation((table: string) => {
    const seen = (calls.get(table) ?? 0) + 1
    calls.set(table, seen)
    const key = seen === 1 ? table : `${table}#${seen}`
    const result = overrides[key] ?? defaults[key] ?? defaults[table] ?? { data: [], error: null }
    const builder = {
      select: (columns: unknown) => {
        selects.push({ table, columns })
        return builder
      },
      limit: () => builder,
      order: () => builder,
      not: () => builder,
      then: (onFulfilled: (value: QueryResult) => unknown, onRejected?: (reason: unknown) => unknown) =>
        Promise.resolve(result).then(onFulfilled, onRejected),
    }
    return builder
  })

  return { selects }
}

function adminRequest(query = '') {
  verifyAdminAuth.mockResolvedValue({ user: { role: 'admin' } })
  return new NextRequest(`http://localhost/api/admin/bench-llms${query}`)
}

function sortProjection(models: ListedModel[]) {
  return models.map((model) => ({
    slug: model.slug,
    releaseDate: model.releaseDate,
    hasSystemCard: model.metrics.hasSystemCard,
    status: model.lifecycle?.status ?? null,
  }))
}

describe('GET /api/admin/bench-llms', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    from.mockReset()
  })

  test('returns the authentication error', async () => {
    verifyAdminAuth.mockResolvedValue({
      error: NextResponse.json({ error: 'Admin requis' }, { status: 403 }),
    })
    const response = await GET(new NextRequest('http://localhost/api/admin/bench-llms'))
    expect(response.status).toBe(403)
    expect(from).not.toHaveBeenCalled()
  })

  test('returns release dates, the default sort, source coverage and the system card history', async () => {
    const { selects } = installCatalog()

    const response = await GET(adminRequest('?pageSize=50'))
    expect(response.status).toBe(200)
    const body = await response.json()

    expect(selects).toEqual(
      expect.arrayContaining([
        {
          table: 'compl_ai_models',
          columns:
            'id, slug, model_name, model_provider, model_provider_id, model_type, updated_at, release_date, llm_leader_rank, comparia_rank, lifecycle_status',
        },
        {
          table: 'llm_system_cards',
          columns: 'model_identifier, updated_at, created_at',
        },
      ]),
    )
    expect(sortProjection(body.models)).toEqual([
      { slug: 'alpha-new', releaseDate: '2026-06-01', hasSystemCard: false, status: 'retired' },
      { slug: 'alpha-old', releaseDate: '2024-01-01', hasSystemCard: true, status: 'active' },
      { slug: 'alpha-plain-active', releaseDate: null, hasSystemCard: false, status: 'active' },
      { slug: 'alpha-plain-retired', releaseDate: null, hasSystemCard: false, status: 'retired' },
      { slug: 'alpha-card-active', releaseDate: null, hasSystemCard: true, status: 'active' },
      { slug: 'alpha-retired-card', releaseDate: null, hasSystemCard: true, status: 'retired' },
    ])
    expect(body.sourceCoverage.system_card).toEqual({
      source: 'system_card',
      totalInCatalog: 3,
      activeInCatalog: 2,
      deprecatedInCatalog: 0,
      inServiceInCatalog: 2,
      catalogInServiceTotal: 3,
      inServiceCompletionPercent: 67,
      crossCoverage: {
        llm_stats: 0,
        ecologits: 0,
        comparia: 0,
        compl_ai: 0,
        maydai: 0,
        system_card: 3,
      },
      inServiceCrossCoverage: {
        llm_stats: 0,
        ecologits: 0,
        comparia: 0,
        compl_ai: 0,
        maydai: 0,
        system_card: 2,
      },
    })
    expect(body.histories.systemCard).toEqual([
      { status: 'terminé', models_fetched: 3, started_at: '2026-08-15' },
    ])
  })

  test('filters active models and models missing a system card without shrinking coverage', async () => {
    installCatalog()

    const activeResponse = await GET(adminRequest('?pageSize=50&lifecycleStatus=active'))
    const activeBody = await activeResponse.json()
    expect(activeBody.models.map((model: ListedModel) => model.slug)).toEqual([
      'alpha-old',
      'alpha-plain-active',
      'alpha-card-active',
    ])
    expect(activeBody.sourceCoverage.system_card.totalInCatalog).toBe(3)
    expect(activeBody.histories.systemCard[0].models_fetched).toBe(3)

    installCatalog()
    const missingResponse = await GET(adminRequest('?pageSize=50&source=system_card&availability=missing'))
    const missingBody = await missingResponse.json()
    expect(missingBody.models.map((model: ListedModel) => model.slug)).toEqual([
      'alpha-new',
      'alpha-plain-active',
      'alpha-plain-retired',
    ])
    expect(missingBody.sourceCoverage.system_card.totalInCatalog).toBe(3)
  })

  test('keeps active and deprecated models when lifecycleStatus is in_service', async () => {
    installCatalog({
      compl_ai_models: {
        data: [
          {
            id: 'beta-retired',
            slug: 'beta-retired',
            model_name: 'Beta Retired',
            model_provider: 'OpenAI',
            release_date: null,
            lifecycle_status: 'retired',
          },
          {
            id: 'beta-deprecated',
            slug: 'beta-deprecated',
            model_name: 'Beta Deprecated',
            model_provider: 'OpenAI',
            release_date: null,
            lifecycle_status: 'deprecated',
          },
          {
            id: 'beta-active',
            slug: 'beta-active',
            model_name: 'Beta Active',
            model_provider: 'OpenAI',
            release_date: null,
            lifecycle_status: 'active',
          },
        ],
        error: null,
      },
    })

    const response = await GET(adminRequest('?pageSize=50&lifecycleStatus=in_service'))
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.models.map((model: ListedModel) => model.slug)).toEqual(['beta-active', 'beta-deprecated'])
    expect(body.models.map((model: ListedModel) => model.lifecycle?.status)).toEqual(['active', 'deprecated'])
  })

  test('prefixes a PostgREST failure with its query context', async () => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined)
    installCatalog({
      compl_ai_models: { data: null, error: { message: 'relation missing' } },
    })

    const response = await GET(adminRequest())
    errorSpy.mockRestore()
    expect(response.status).toBe(500)
    const body = await response.json()
    expect(body.error).toBe('[compl_ai_models] relation missing')
  })
})
