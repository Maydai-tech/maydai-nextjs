import { applyLifecycleStatusOverride, resolveProviderLifecycle } from '../provider-lifecycle'

describe('Provider lifecycle from official vendor docs', () => {
  test('marks dated Anthropic snapshots as retired or active', () => {
    expect(resolveProviderLifecycle(['claude-opus-4-20250514'])).toEqual(
      expect.objectContaining({ status: 'retired', label: 'Retiré', source: 'anthropic' }),
    )
    expect(resolveProviderLifecycle(['claude-haiku-4-5-20251001'])).toEqual(
      expect.objectContaining({ status: 'active', label: 'Actif' }),
    )
  })

  test('uses the worst status when a fiche has both an alias and a retired snapshot', () => {
    expect(
      resolveProviderLifecycle(['claude-opus-4-0', 'claude-opus-4-20250514', 'Claude Opus 4']),
    ).toEqual(expect.objectContaining({ status: 'retired', sourceModelId: 'claude-opus-4-20250514' }))
  })

  test('maps Gemini 2.0 product names to retired and Gemini 3.5 to active', () => {
    expect(resolveProviderLifecycle(['gemini-2-0-flash', 'Gemini 2.0 Flash'])).toEqual(
      expect.objectContaining({ status: 'retired', source: 'google' }),
    )
    expect(resolveProviderLifecycle(['gemini-3-5-flash'])).toEqual(
      expect.objectContaining({ status: 'active', source: 'google' }),
    )
  })

  test('fills missing Google statuses from the September 2026 Gemini and Gemma cycle', () => {
    expect(resolveProviderLifecycle(['gemini-2.0-flash-thinking', 'Gemini 2.0 Flash Thinking'])).toEqual(
      expect.objectContaining({ status: 'retired', source: 'google' }),
    )
    expect(resolveProviderLifecycle(['gemini-2-5-pro-preview-06-05'])).toEqual(
      expect.objectContaining({ status: 'retired', source: 'google' }),
    )
    expect(resolveProviderLifecycle(['gemini-diffusion', 'Gemini Diffusion'])).toEqual(
      expect.objectContaining({ status: 'deprecated', replacement: 'diffusiongemma-26b-a4b' }),
    )
    expect(resolveProviderLifecycle(['diffusiongemma-26b-a4b', 'DiffusionGemma 26B-A4B'])).toEqual(
      expect.objectContaining({ status: 'active', source: 'google' }),
    )
    expect(resolveProviderLifecycle(['gemma-4', 'Gemma 4 31B', 'gemma-4-31b'])).toEqual(
      expect.objectContaining({ status: 'active', source: 'google' }),
    )
    expect(resolveProviderLifecycle(['gemma-3-27b', 'Gemma 3 27B'])).toEqual(
      expect.objectContaining({ status: 'deprecated', source: 'google', replacement: 'gemma-4' }),
    )
    expect(resolveProviderLifecycle(['gemma-3n-e4b-instructed'])).toEqual(
      expect.objectContaining({ status: 'deprecated', source: 'google' }),
    )
    expect(resolveProviderLifecycle(['gemma-2-27b', 'Gemma 2 27B'])).toEqual(
      expect.objectContaining({ status: 'retired', source: 'google' }),
    )
    expect(resolveProviderLifecycle(['gemma-2-2b', 'Gemma 2 2B'])).toEqual(
      expect.objectContaining({ status: 'retired', source: 'google' }),
    )
    expect(resolveProviderLifecycle(['medgemma-4b-it', 'MedGemma 4B IT'])).toEqual(
      expect.objectContaining({ status: 'deprecated', source: 'google' }),
    )
  })

  test('returns null when no official lifecycle is known', () => {
    expect(resolveProviderLifecycle(['unknown-vendor-model', 'not-in-snapshot'])).toBeNull()
  })

  test('marks current Mistral flagships as active and retired API snapshots as retired', () => {
    expect(resolveProviderLifecycle(['mistral-medium-3-5', 'Mistral Medium 3.5'])).toEqual(
      expect.objectContaining({ status: 'active', source: 'mistral' }),
    )
    expect(resolveProviderLifecycle(['codestral-2508', 'codestral-latest'])).toEqual(
      expect.objectContaining({ status: 'active', sourceModelId: 'codestral-2508' }),
    )
    expect(resolveProviderLifecycle(['pixtral-12b', 'pixtral-12b-2409'])).toEqual(
      expect.objectContaining({ status: 'retired', source: 'mistral' }),
    )
    expect(resolveProviderLifecycle(['devstral-2512'])).toEqual(
      expect.objectContaining({ status: 'retired', replacement: 'mistral-medium-3-5' }),
    )
  })

  test('resolves magistral-small-latest to Small 4, not Magistral Small 1.2', () => {
    expect(resolveProviderLifecycle(['magistral-small-latest', 'mistral-small-2603'])).toEqual(
      expect.objectContaining({ status: 'active', source: 'mistral' }),
    )
    expect(resolveProviderLifecycle(['magistral-small-2509'])).toEqual(
      expect.objectContaining({ status: 'retired', replacement: 'mistral-small-2603' }),
    )
  })

  test('marks current OpenAI flagships as active and shut-down aliases as retired', () => {
    expect(resolveProviderLifecycle(['gpt-6-astra', 'GPT-6 Astra'])).toEqual(
      expect.objectContaining({ status: 'active', source: 'openai' }),
    )
    expect(resolveProviderLifecycle(['gpt-5.6-sol'])).toEqual(
      expect.objectContaining({ status: 'active', source: 'openai' }),
    )
    expect(resolveProviderLifecycle(['chatgpt-4o-latest', 'ChatGPT-4o Latest'])).toEqual(
      expect.objectContaining({ status: 'retired', source: 'openai' }),
    )
    expect(resolveProviderLifecycle(['chat-latest', 'Chat Latest'])).toEqual(
      expect.objectContaining({ status: 'active', source: 'openai', sourceModelId: 'chat-latest' }),
    )
    expect(resolveProviderLifecycle(['gpt-5-pro', 'GPT-5 Pro'])).toEqual(
      expect.objectContaining({ status: 'active', source: 'openai' }),
    )
    expect(resolveProviderLifecycle(['gpt-4o-mini-search-preview'])).toEqual(
      expect.objectContaining({ status: 'deprecated', source: 'openai' }),
    )
    expect(resolveProviderLifecycle(['gpt-5-codex'])).toEqual(
      expect.objectContaining({ status: 'retired', replacement: 'gpt-5.6-sol' }),
    )
  })

  test('marks OpenAI models with a future shutdown as deprecated', () => {
    expect(resolveProviderLifecycle(['gpt-4-turbo', 'GPT-4 Turbo'])).toEqual(
      expect.objectContaining({ status: 'deprecated', label: 'Déprécié', source: 'openai' }),
    )
    expect(resolveProviderLifecycle(['gpt-4'])).toEqual(
      expect.objectContaining({ status: 'deprecated', source: 'openai' }),
    )
    expect(resolveProviderLifecycle(['o1-mini'])).toEqual(
      expect.objectContaining({ status: 'retired', source: 'openai' }),
    )
  })

  test('applies the 22 September 2026 OpenAI API deprecation calendar', () => {
    expect(resolveProviderLifecycle(['gpt-5', 'GPT-5'])).toEqual(
      expect.objectContaining({ status: 'active', source: 'openai' }),
    )
    expect(resolveProviderLifecycle(['gpt-5-2025-08-07'])).toEqual(
      expect.objectContaining({ status: 'deprecated', replacement: 'gpt-5.6-sol' }),
    )
    expect(resolveProviderLifecycle(['gpt-3.5-turbo-1106', 'gpt-3.5-turbo-instruct'])).toEqual(
      expect.objectContaining({ status: 'deprecated', source: 'openai' }),
    )
    expect(resolveProviderLifecycle(['gpt-3.5-turbo-16k', 'gpt-35-turbo-16k'])).toEqual(
      expect.objectContaining({ status: 'retired', source: 'openai' }),
    )
    expect(resolveProviderLifecycle(['gpt-5-chat-latest', 'gpt-5.1-codex-max'])).toEqual(
      expect.objectContaining({ status: 'retired', source: 'openai' }),
    )
    expect(resolveProviderLifecycle(['gpt-4o-mini-transcribe'])).toEqual(
      expect.objectContaining({ status: 'deprecated', replacement: 'gpt-live-transcribe' }),
    )
    expect(resolveProviderLifecycle(['gpt-35-turbo', 'gpt-3.5-turbo'])).toEqual(
      expect.objectContaining({ status: 'deprecated', source: 'openai' }),
    )
    expect(resolveProviderLifecycle(['gpt-5', 'gpt-5-2025-08-07'])).toEqual(
      expect.objectContaining({ status: 'deprecated', sourceModelId: 'gpt-5-2025-08-07' }),
    )
  })

  test('maps documented xAI models and leaves the others unset', () => {
    expect(resolveProviderLifecycle(['grok-4-6', 'Grok 4.6'])).toEqual(
      expect.objectContaining({ status: 'active', label: 'Actif', source: 'xai' }),
    )
    expect(resolveProviderLifecycle(['grok-4-20', 'Grok-4.20'])).toEqual(
      expect.objectContaining({ status: 'active', source: 'xai', sourceModelId: 'grok-4.20' }),
    )
    expect(resolveProviderLifecycle(['grok-4.20-beta-non-reasoning'])).toEqual(
      expect.objectContaining({ status: 'active', source: 'xai' }),
    )
    expect(resolveProviderLifecycle(['grok-4-20-multi-agent-beta'])).toEqual(
      expect.objectContaining({ status: 'active', source: 'xai' }),
    )
    expect(resolveProviderLifecycle(['grok-3', 'Grok-3'])).toEqual(
      expect.objectContaining({ status: 'retired', label: 'Retiré', source: 'xai', replacement: 'grok-4.3' }),
    )
    expect(resolveProviderLifecycle(['grok-4-1-fast-reasoning'])).toEqual(
      expect.objectContaining({ status: 'retired', replacement: 'grok-4.3' }),
    )
    expect(resolveProviderLifecycle(['grok-code-fast-1', 'Grok Code Fast 1'])).toEqual(
      expect.objectContaining({ status: 'retired', replacement: 'grok-build-0.1' }),
    )
    expect(resolveProviderLifecycle(['grok-2', 'Grok-2'])).toBeNull()
    expect(resolveProviderLifecycle(['grok-1-5', 'Grok-1.5'])).toBeNull()
    expect(resolveProviderLifecycle(['grok-4', 'Grok-4'])).toBeNull()
  })

  test('lets a CSV statut override the official snapshot', () => {
    const official = resolveProviderLifecycle(['mistral-medium-3-5'])
    expect(applyLifecycleStatusOverride(official, 'deprecated')).toEqual(
      expect.objectContaining({ status: 'deprecated', label: 'Déprécié', source: 'mistral' }),
    )
    expect(applyLifecycleStatusOverride(null, 'retired')).toEqual(
      expect.objectContaining({ status: 'retired', source: 'csv' }),
    )
  })
})
