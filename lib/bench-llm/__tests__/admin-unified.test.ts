import {
  buildUnifiedBenchModels,
  computeSourceCoverageStats,
  filterUnifiedBenchModels,
  groupUnifiedBenchModelsByProvider,
  parseBenchEntityId,
  splitBenchProviderGroupsByQuestionnaire,
} from '../admin-unified'

describe('Bench LLMs admin unified registry', () => {
  const canonical = [
    {
      id: 'model-1',
      model_name: 'GPT 4o',
      model_provider: 'OpenAI',
      llm_stats_id: 'gpt-4o',
      comparia_rank: null,
    },
    {
      id: 'model-2',
      model_name: 'Claude',
      model_provider: 'Anthropic',
      llm_stats_id: null,
      comparia_rank: 2,
    },
  ]
  const evaluations = [
    { model_id: 'model-1', score: 0.8, maydai_score: 4, rang_compar_ia: null },
    { model_id: 'model-2', score: null, maydai_score: null, rang_compar_ia: 12 },
  ]
  const eco = [
    {
      id: 'eco-linked',
      provider: 'openai',
      name: 'gpt-4o',
      is_active: true,
      last_seen_at: '2026-07-24T12:00:00Z',
      link: [{ maydai_model_id: 'model-1' }],
    },
    {
      id: 'eco-only',
      provider: 'mistralai',
      name: 'mistral-small',
      is_active: true,
      last_seen_at: '2026-07-24T12:00:00Z',
      link: [],
    },
  ]

  test('merges linked EcoLogits rows and preserves unmatched models', () => {
    const rows = buildUnifiedBenchModels(canonical, evaluations, eco)
    expect(rows).toHaveLength(3)
    expect(rows.find((row) => row.entityId === 'maydai_model-1')).toEqual(
      expect.objectContaining({
        ecoModelId: 'eco-linked',
        sources: {
          maydai: true,
          compl_ai: true,
          comparia: false,
          llm_stats: true,
          ecologits: true,
        },
      }),
    )
    expect(rows.find((row) => row.entityId === 'ecologits_eco-only')).toBeDefined()
  })

  test('filters by missing or available source', () => {
    const rows = buildUnifiedBenchModels(canonical, evaluations, eco)
    expect(
      filterUnifiedBenchModels(rows, {
        source: 'llm_stats',
        availability: 'present',
      }),
    ).toHaveLength(1)
  })

  test('resolves unified identifiers', () => {
    expect(parseBenchEntityId('maydai_abc')).toEqual({ kind: 'maydai', id: 'abc' })
    expect(parseBenchEntityId('ecologits_def')).toEqual({ kind: 'ecologits', id: 'def' })
    expect(parseBenchEntityId('invalid')).toBeNull()
  })

  test('reads source badges from llm_model_source_ids instead of denormalized columns', () => {
    const rows = buildUnifiedBenchModels(
      [
        {
          id: 'model-3',
          model_name: 'GPT 5.2',
          model_provider: 'OpenAI',
          source_ids: [
            { source: 'llm_stats', source_id: 'gpt-5.2' },
            { source: 'comparia', source_id: 'gpt-5.2' },
          ],
        },
      ],
      [],
      [],
    )
    expect(rows[0]?.sources).toEqual({
      maydai: false,
      compl_ai: false,
      comparia: true,
      llm_stats: true,
      ecologits: false,
    })
  })

  test('exposes coverage metrics, MaydAI average on 100, and COMPL-AI fill count', () => {
    const [row] = buildUnifiedBenchModels(
      [
        {
          id: 'model-1',
          slug: 'gpt-4o',
          model_name: 'GPT 4o',
          model_provider: 'OpenAI',
          llm_stats_id: 'gpt-4o',
          llm_leader_rank: 4,
          comparia_rank: 12,
        },
      ],
      [
        { model_id: 'model-1', score: 0.7, maydai_score: 3 },
        { model_id: 'model-1', score: 0.5, maydai_score: 2 },
        { model_id: 'model-1', score: null, maydai_score: null },
      ],
      [
        {
          id: 'eco-linked',
          provider: 'openai',
          name: 'gpt-4o',
          is_active: true,
          last_seen_at: '2026-07-24T12:00:00Z',
          link: [{ maydai_model_id: 'model-1' }],
        },
      ],
      [],
      { includeUnmatchedCatalogs: false, systemCardSlugs: ['gpt-4o'] },
    )

    expect(row?.metrics).toEqual({
      sourcesFilled: 5,
      sourcesTotal: 5,
      maydaiScore: 60,
      complAiFilled: 2,
      complAiTotal: 31,
      compariaRank: 12,
      llmStatsRank: 4,
      hasEcologits: true,
      hasSystemCard: true,
    })
  })

  test('groups models by provider and counts scored COMPL-AI rows', () => {
    const groups = groupUnifiedBenchModelsByProvider(
      buildUnifiedBenchModels(canonical, evaluations, eco, [], { includeUnmatchedCatalogs: false }),
    )

    expect(groups.map((group) => group.provider)).toEqual(['Anthropic', 'OpenAI'])
    expect(groups.find((group) => group.provider === 'OpenAI')).toEqual(
      expect.objectContaining({ scoredCount: 1, models: expect.arrayContaining([expect.objectContaining({ slug: 'GPT 4o' })]) }),
    )
    expect(groups.find((group) => group.provider === 'Anthropic')?.scoredCount).toBe(0)
    expect(groups.find((group) => group.provider === 'Anthropic')?.models[0]?.metrics).toEqual(
      expect.objectContaining({
        maydaiScore: null,
        complAiFilled: 0,
        complAiTotal: 31,
        compariaRank: 2,
      }),
    )
  })

  test('marks models whose provider is listed in the MaydAI questionnaire', () => {
    const rows = buildUnifiedBenchModels(
      [
        {
          id: 'model-1',
          model_name: 'GPT 4o',
          model_provider: 'OpenAI',
          model_provider_id: 8,
        },
        {
          id: 'model-2',
          model_name: 'Claude',
          model_provider: 'Anthropic',
          model_provider_id: 2,
        },
        {
          id: 'model-3',
          model_name: 'NVIDIA Nemotron',
          model_provider: 'NVIDIA',
          model_provider_id: 18,
        },
      ],
      [],
      [],
      [],
      { includeUnmatchedCatalogs: false, questionnaireProviderIds: [8, 2] },
    )
    const split = splitBenchProviderGroupsByQuestionnaire(groupUnifiedBenchModelsByProvider(rows))

    expect(rows.find((row) => row.entityId === 'maydai_model-1')?.inQuestionnaire).toBe(true)
    expect(rows.find((row) => row.entityId === 'maydai_model-3')?.inQuestionnaire).toBe(false)
    expect(split.inQuestionnaire.map((group) => group.provider)).toEqual(['Anthropic', 'OpenAI'])
    expect(split.catalogOnly.map((group) => group.provider)).toEqual(['Nvidia'])
  })

  test('attaches official provider lifecycle from linked EcoLogits aliases', () => {
    const [row] = buildUnifiedBenchModels(
      [
        {
          id: 'opus-4',
          slug: 'claude-opus-4',
          model_name: 'Claude Opus 4',
          model_provider: 'Anthropic',
        },
      ],
      [],
      [
        {
          id: 'eco-retired',
          provider: 'anthropic',
          name: 'claude-opus-4-20250514',
          is_active: true,
          last_seen_at: '2026-09-19T00:00:00Z',
          link: [{ maydai_model_id: 'opus-4' }],
        },
      ],
      [],
      { includeUnmatchedCatalogs: false },
    )

    expect(row?.lifecycle).toEqual(
      expect.objectContaining({ status: 'retired', label: 'Retiré', source: 'anthropic' }),
    )
  })
})

describe('Bench LLMs in-service lifecycle', () => {
  const rows = buildUnifiedBenchModels(
    [
      {
        id: 'active',
        slug: 'svc-active',
        model_name: 'Service Active',
        model_provider: 'OpenAI',
        lifecycle_status: 'active',
        source_ids: [{ source: 'llm_stats', source_id: 'svc-active' }],
      },
      {
        id: 'deprecated',
        slug: 'svc-deprecated',
        model_name: 'Service Deprecated',
        model_provider: 'OpenAI',
        lifecycle_status: 'deprecated',
        source_ids: [{ source: 'llm_stats', source_id: 'svc-deprecated' }],
      },
      {
        id: 'retired',
        slug: 'svc-retired',
        model_name: 'Service Retired',
        model_provider: 'OpenAI',
        lifecycle_status: 'retired',
      },
    ],
    [],
    [],
    [],
    { includeUnmatchedCatalogs: false, systemCardSlugs: ['svc-active'] },
  )

  test('counts deprecated models inside in-service provider totals', () => {
    const [group] = groupUnifiedBenchModelsByProvider(rows)
    expect(group?.provider).toBe('OpenAI')
    expect(group).toEqual(
      expect.objectContaining({
        activeCount: 1,
        activeMissingSystemCardCount: 0,
        deprecatedCount: 1,
        inServiceCount: 2,
        inServiceMissingSystemCardCount: 1,
      }),
    )
  })

  test('filters active and deprecated models and drops retired ones', () => {
    expect(
      filterUnifiedBenchModels(rows, { lifecycleStatus: 'in_service' }).map((model) => model.slug),
    ).toEqual(['svc-deprecated', 'svc-active'])
  })

  test('computes in-service coverage against the whole catalog', () => {
    const coverage = computeSourceCoverageStats(rows)
    expect(coverage.llm_stats).toEqual({
      source: 'llm_stats',
      totalInCatalog: 2,
      activeInCatalog: 1,
      deprecatedInCatalog: 1,
      inServiceInCatalog: 2,
      catalogInServiceTotal: 2,
      inServiceCompletionPercent: 100,
      crossCoverage: {
        llm_stats: 2,
        ecologits: 0,
        comparia: 0,
        compl_ai: 0,
        maydai: 0,
        system_card: 1,
      },
      inServiceCrossCoverage: {
        llm_stats: 2,
        ecologits: 0,
        comparia: 0,
        compl_ai: 0,
        maydai: 0,
        system_card: 1,
      },
    })
    expect(coverage.system_card).toEqual(
      expect.objectContaining({
        totalInCatalog: 1,
        activeInCatalog: 1,
        deprecatedInCatalog: 0,
        inServiceInCatalog: 1,
        catalogInServiceTotal: 2,
        inServiceCompletionPercent: 50,
        inServiceCrossCoverage: expect.objectContaining({ system_card: 1, llm_stats: 1 }),
      }),
    )
  })
})
