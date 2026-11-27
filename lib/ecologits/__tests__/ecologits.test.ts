import {
  buildCatalogModelRow,
  planExactEcoLogitsLinks,
  shouldDeactivateMissingModels,
} from '../sync'
import { exactEcoLogitsMatchKey, normalizeEcoLogitsProvider } from '../normalization'
import { flattenEcoLogitsEstimate, parseEcoLogitsImpact } from '../parsing'
import { filterEcoLogitsModels, paginateEcoLogitsModels } from '../admin-query'

describe('EcoLogits parsing and synchronization rules', () => {
  test('preserves min/max intervals and units', () => {
    expect(parseEcoLogitsImpact({ value: { min: 0.001, max: 0.002 }, unit: 'kWh' })).toEqual({
      min: 0.001,
      max: 0.002,
      unit: 'kWh',
    })
    expect(
      flattenEcoLogitsEstimate({
        impacts: { gwp: { value: { min: 1, max: 2 }, unit: 'kgCO2eq' } },
      }),
    ).toEqual(expect.objectContaining({ gwp_min: 1, gwp_max: 2, gwp_unit: 'kgCO2eq' }))
  })

  test('normalizes known provider aliases for exact matching', () => {
    expect(normalizeEcoLogitsProvider('Google GenAI')).toBe('googlegenai')
    expect(exactEcoLogitsMatchKey('Mistral', 'Mistral Large')).toBe(
      exactEcoLogitsMatchKey('mistralai', 'mistral-large'),
    )
  })

  test('reactivates a model row when it is seen again', () => {
    const row = buildCatalogModelRow(
      { provider: 'openai', name: 'gpt-4o-mini', warnings: [] },
      '2026-07-24T10:00:00.000Z',
    )
    expect(row).toEqual(
      expect.objectContaining({ is_active: true, missing_since: null }),
    )
  })

  test('does not deactivate missing models after any partial failure', () => {
    expect(shouldDeactivateMissingModels([])).toBe(true)
    expect(shouldDeactivateMissingModels(['Estimation échouée'])).toBe(false)
  })

  test('ne planifie aucun lien pour un modèle EcoLogits ignoré', () => {
    const planned = planExactEcoLogitsLinks(
      [
        {
          id: 'eco-ignored-alias',
          provider: 'google_genai',
          name: 'gemini-flash-latest',
          link_status: 'ignored',
        },
        {
          id: 'eco-ignored-name',
          provider: 'mistralai',
          name: 'mistral-medium-3',
          link_status: 'ignored',
        },
        {
          id: 'eco-open',
          provider: 'openai',
          name: 'gpt-4o',
          link_status: 'unmatched',
        },
      ],
      [
        { id: 'maydai-gemini', model_provider: 'Google', model_name: 'Gemini Flash Latest' },
        { id: 'maydai-mistral', model_provider: 'Mistral', model_name: 'Mistral Medium 3' },
        { id: 'maydai-gpt', model_provider: 'OpenAI', model_name: 'GPT 4o' },
      ],
      [],
      [
        {
          modelId: 'maydai-gemini',
          source: 'ecologits',
          sourceId: 'eco-ignored-alias',
          normalizedName: 'geminiflashlatest',
        },
      ],
    )

    expect(planned).toEqual([
      {
        ecologits_model_id: 'eco-open',
        maydai_model_id: 'maydai-gpt',
        match_method: 'exact',
      },
    ])
  })

  test('creates unambiguous exact links without overwriting a manual link', () => {
    const planned = planExactEcoLogitsLinks(
      [
        { id: 'eco-manual', provider: 'openai', name: 'gpt-4o' },
        { id: 'eco-exact', provider: 'anthropic', name: 'claude-3-5-sonnet' },
      ],
      [
        { id: 'maydai-manual', model_provider: 'OpenAI', model_name: 'GPT 4o' },
        { id: 'maydai-exact', model_provider: 'Anthropic', model_name: 'Claude 3.5 Sonnet' },
      ],
      [
        {
          ecologits_model_id: 'eco-manual',
          maydai_model_id: 'maydai-manual',
          match_method: 'manual',
        },
      ],
    )
    expect(planned).toEqual([
      {
        ecologits_model_id: 'eco-exact',
        maydai_model_id: 'maydai-exact',
        match_method: 'exact',
      },
    ])
  })

  test('filters and paginates the admin catalog', () => {
    const models = [
      { provider: 'openai', name: 'gpt', is_active: true, warnings: [], link: [{ id: 1 }] },
      { provider: 'anthropic', name: 'claude', is_active: true, warnings: [{}], link: [] },
      { provider: 'openai', name: 'legacy', is_active: false, warnings: [], link: [] },
    ]
    const filtered = filterEcoLogitsModels(models, {
      search: 'claude',
      provider: 'anthropic',
      linked: 'unlinked',
      active: 'active',
      warning: true,
    })
    expect(filtered).toEqual([models[1]])
    expect(paginateEcoLogitsModels(models, 2, 2)).toEqual([models[2]])
  })
})
