import {
  buildUnifiedBenchModels,
  filterUnifiedBenchModels,
  parseBenchEntityId,
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
})
