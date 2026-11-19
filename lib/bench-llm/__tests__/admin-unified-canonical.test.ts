import {
  attachSourceIdsToCanonicalModels,
  buildUnifiedBenchModels,
  countDistinctEvaluatedModels,
  modelsCountFromHistoryRow,
  overlayLatestModelsCount,
  withNormalizedModelsFetched,
} from '../admin-unified'

describe('Bench LLMs canonical aggregation', () => {
  test('keeps one row per canonical model and aggregates source_ids', () => {
    const models = attachSourceIdsToCanonicalModels(
      [
        { id: 'model-1', slug: 'gpt-4o', model_name: 'GPT 4o', model_provider: 'openai' },
        { id: 'model-1', slug: 'gpt-4o', model_name: 'GPT 4o', model_provider: 'openai' },
      ],
      [
        { model_id: 'model-1', source: 'llm_stats', source_id: 'gpt-4o' },
        { model_id: 'model-1', source: 'comparia', source_id: 'gpt-4o' },
        { model_id: 'model-1', source: 'llm_stats', source_id: 'gpt-4o' },
      ],
    )

    expect(models).toHaveLength(1)
    expect(models[0]?.source_ids).toEqual([
      { source: 'llm_stats', source_id: 'gpt-4o' },
      { source: 'comparia', source_id: 'gpt-4o' },
    ])
  })

  test('excludes unmatched EcoLogits and Compar:IA catalogs from the admin registry', () => {
    const rows = buildUnifiedBenchModels(
      [
        { id: 'model-1', slug: 'gpt-4o', model_name: 'GPT 4o', model_provider: 'openai' },
        { id: 'model-2', slug: 'claude-3-5-sonnet', model_name: 'Claude', model_provider: 'anthropic' },
      ],
      [],
      [
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
      ],
      [
        {
          id: 'comparia-orphan',
          source_id: 'orphan-model',
          organisation: 'acme',
          rank: 9,
          is_active: true,
          last_imported_at: '2026-07-24T12:00:00Z',
        },
      ],
      { includeUnmatchedCatalogs: false },
    )

    expect(rows).toHaveLength(2)
    expect(rows.map((row) => row.entityId).sort()).toEqual(['maydai_model-1', 'maydai_model-2'])
    expect(rows.find((row) => row.entityId === 'ecologits_eco-only')).toBeUndefined()
    expect(rows.find((row) => row.entityId === 'comparia_comparia-orphan')).toBeUndefined()
    expect(rows.find((row) => row.entityId === 'maydai_model-1')?.sources.ecologits).toBe(true)
  })

  test('exposes kebab-case slug and Title Case provider', () => {
    const [row] = buildUnifiedBenchModels(
      [{ id: 'model-1', slug: 'gpt-4o', model_name: 'GPT 4o', model_provider: 'anthropic' }],
      [],
      [],
      [],
      { includeUnmatchedCatalogs: false },
    )

    expect(row?.slug).toBe('gpt-4o')
    expect(row?.name).toBe('gpt-4o')
    expect(row?.rawName).toBe('GPT 4o')
    expect(row?.provider).toBe('Anthropic')
  })
})

describe('Bench LLMs sync history counts', () => {
  test('maps Compar:IA rows_imported and COMPL-AI models_synced onto models_fetched', () => {
    expect(modelsCountFromHistoryRow({ rows_imported: 69 })).toBe(69)
    expect(modelsCountFromHistoryRow({ models_synced: 378 })).toBe(378)
    expect(modelsCountFromHistoryRow({ models_fetched: 12 })).toBe(12)
    expect(modelsCountFromHistoryRow({})).toBeNull()

    const [comparia, complAi] = withNormalizedModelsFetched([
      { id: 'comparia-run', rows_imported: 69 },
      { id: 'compl-run', models_synced: 378 },
    ])
    expect(comparia?.models_fetched).toBe(69)
    expect(complAi?.models_fetched).toBe(378)
  })

  test('counts distinct evaluated models and overlays the COMPL-AI card', () => {
    expect(
      countDistinctEvaluatedModels([
        { model_id: 'a', score: 0.8 },
        { model_id: 'a', score: 0.2 },
        { model_id: 'b', score: 0.9 },
        { model_id: 'c', score: null },
      ]),
    ).toBe(2)
    expect(countDistinctEvaluatedModels([{ model_id: 'a' }, { model_id: 'a' }, { model_id: 'b' }])).toBe(2)

    const [latest] = overlayLatestModelsCount(
      [{ id: 'compl-run', models_synced: 15, models_fetched: 15 }],
      90,
    )
    expect(latest?.models_fetched).toBe(90)
  })
})
