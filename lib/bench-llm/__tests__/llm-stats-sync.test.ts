import { VEILLE_COLUMNS } from '../veille-columns'
import {
  buildBestScoreMap,
  deriveModelSizeFromParamCount,
  llmStatsDatabaseInsert,
  llmStatsDatabaseUpdate,
  mapLlmStatsModelToRecord,
  selectCanonicalLlmStatsModels,
} from '../llm-stats-sync'
import type { LlmStatsModelRecord } from '../llm-stats-sync'

describe('LLM Stats sync mapping', () => {
  test('derive model size from parameter count', () => {
    expect(deriveModelSizeFromParamCount(null)).toBeNull()
    expect(deriveModelSizeFromParamCount(2_000_000_000)).toBe('XS')
    expect(deriveModelSizeFromParamCount(7_000_000_000)).toBe('S')
    expect(deriveModelSizeFromParamCount(20_000_000_000)).toBe('M')
    expect(deriveModelSizeFromParamCount(70_000_000_000)).toBe('L')
    expect(deriveModelSizeFromParamCount(120_000_000_000)).toBe('XL')
  })

  test('deduplicates scores by keeping the best normalized score per model', () => {
    const scores = buildBestScoreMap([
      {
        model_id: 'model-a',
        model_name: 'Model A',
        benchmark_id: 'gpqa',
        benchmark_name: 'GPQA',
        score: 0.7,
        normalized_score: 0.7,
        max_score: 1,
      },
      {
        model_id: 'model-a',
        model_name: 'Model A',
        benchmark_id: 'gpqa',
        benchmark_name: 'GPQA',
        score: 80,
        normalized_score: null,
        max_score: 100,
      },
      {
        model_id: 'model-b',
        model_name: 'Model B',
        benchmark_id: 'gpqa',
        benchmark_name: 'GPQA',
        score: 18,
        max_score: 30,
      },
    ])

    expect(scores.get('model-a')).toBe(0.8)
    expect(scores.get('model-b')).toBe(0.6)
  })

  test('maps LLM Stats model data to compl_ai_models fields', () => {
    const record = mapLlmStatsModelToRecord({
      providerId: 42,
      rank: 3,
      gpqaScore: 0.946,
      aime2025Score: 1,
      now: '2026-07-11T10:00:00.000Z',
      model: {
        id: 'claude-mythos-preview',
        name: 'Claude Mythos Preview',
        organization: { id: 'anthropic', name: 'Anthropic' },
        license: { id: 'proprietary', name: 'Proprietary' },
        open_weight: false,
        model_type: 'chat',
        context_window: 200_000,
        param_count: 70_000_000_000,
        release_date: '2026-01-15',
        knowledge_cutoff: '2025-12-31',
        providers: [
          {
            provider_id: 'a',
            provider_name: 'Provider A',
            input_price_per_m: 10,
            output_price_per_m: 40,
            status: 'available',
          },
          {
            provider_id: 'b',
            provider_name: 'Provider B',
            input_price_per_m: 8,
            output_price_per_m: 50,
            status: 'available',
          },
        ],
      },
    })

    expect(record).toMatchObject({
      model_name: 'Claude Mythos Preview',
      llm_stats_id: 'claude-mythos-preview',
      model_provider: 'Anthropic',
      model_provider_id: 42,
      model_type: 'chat',
      license: 'Proprietary',
      context_length: 200_000,
      release_date: '2026-01-15',
      knowledge_cutoff: '2025-12-31',
      input_cost_per_million: 8,
      output_cost_per_million: 40,
      model_size: 'L',
      gpqa_score: 94.6,
      aime_2025_score: 100,
      llm_leader_rank: 3,
    })
  })

  test('uses Open license for open-weight models and keeps absent values null', () => {
    const record = mapLlmStatsModelToRecord({
      providerId: 7,
      now: '2026-07-11T10:00:00.000Z',
      model: {
        id: 'open-model',
        name: 'Open Model',
        organization: { id: 'open-org', name: 'Open Org' },
        license: null,
        open_weight: true,
        model_type: 'text',
        providers: [],
      },
    })

    expect(record.license).toBe('Open')
    expect(record.context_length).toBeNull()
    expect(record.input_cost_per_million).toBeNull()
    expect(record.output_cost_per_million).toBeNull()
    expect(record.gpqa_score).toBeNull()
    expect(record.aime_2025_score).toBeNull()
  })

  test('keeps one canonical LLM Stats model per provider and display name', () => {
    const canonicalModels = selectCanonicalLlmStatsModels([
      {
        id: 'gpt-4o-2024-05-13',
        name: 'GPT-4o',
        organization: { id: 'openai', name: 'OpenAI' },
        open_weight: false,
        model_type: 'chat',
        release_date: '2024-05-13',
        top_scores: { general: 0.9 },
      },
      {
        id: 'gpt-4o-2024-08-06',
        name: 'GPT-4o',
        organization: { id: 'openai', name: 'OpenAI' },
        open_weight: false,
        model_type: 'chat',
        release_date: '2024-08-06',
        top_scores: { general: 0.8 },
      },
      {
        id: 'gpt-4o-mini-2024-07-18',
        name: 'GPT-4o mini',
        organization: { id: 'openai', name: 'OpenAI' },
        open_weight: false,
        model_type: 'chat',
        release_date: '2024-07-18',
      },
    ])

    expect(canonicalModels.map((model) => model.id)).toEqual([
      'gpt-4o-2024-08-06',
      'gpt-4o-mini-2024-07-18',
    ])
  })

  test('un update llm-stats ne réécrit ni l’identité ni les colonnes de veille', () => {
    const record = mapLlmStatsModelToRecord({
      providerId: 42,
      rank: 3,
      gpqaScore: 0.5,
      aime2025Score: 0.25,
      now: '2026-11-22T18:00:00.000Z',
      model: {
        id: 'gpt-4',
        name: 'GPT-4',
        organization: { id: 'openai', name: 'OpenAI' },
        license: { id: 'proprietary', name: 'Proprietary' },
        open_weight: false,
        model_type: 'chat',
        context_window: 8_192,
        param_count: 20_000_000_000,
        release_date: '2023-03-14',
        knowledge_cutoff: '2021-09-01',
        providers: [
          {
            provider_id: 'openai',
            provider_name: 'OpenAI',
            input_price_per_m: 30,
            output_price_per_m: 60,
            status: 'available',
          },
        ],
      },
    })
    const enriched = {
      ...record,
      slug: 'gpt-4',
      lifecycle_status: 'retired',
      launch_date: '2023-03-14',
      deprecation_date: '2026-04-22',
      retirement_date: '2026-10-23',
      replacement_model_id: 'gpt-4o',
      lifecycle_checked_at: '2026-11-20T00:00:00.000Z',
    } as LlmStatsModelRecord

    const update = llmStatsDatabaseUpdate(enriched)
    const insert = llmStatsDatabaseInsert(enriched)

    for (const column of [
      ...VEILLE_COLUMNS,
      'model_name',
      'model_provider',
      'model_provider_id',
      'slug',
      'model_type',
      'license',
    ]) {
      expect(update).not.toHaveProperty(column)
    }
    expect(update).toMatchObject({
      context_length: 8_192,
      input_cost_per_million: 30,
      output_cost_per_million: 60,
      gpqa_score: 50,
      aime_2025_score: 25,
      llm_leader_rank: 3,
      model_size: 'M',
      release_date: '2023-03-14',
      knowledge_cutoff: '2021-09-01',
      updated_at: '2026-11-22T18:00:00.000Z',
    })

    expect(insert).not.toHaveProperty('llm_stats_id')
    for (const column of VEILLE_COLUMNS) {
      expect(insert).not.toHaveProperty(column)
    }
    expect(insert).toMatchObject({
      model_name: 'GPT-4',
      model_provider: 'OpenAI',
      model_provider_id: 42,
      model_type: 'chat',
      license: 'Proprietary',
    })
  })
})
