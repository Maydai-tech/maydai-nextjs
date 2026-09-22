/**
 * Statut fournisseur (actif / déprécié / retiré) d’après les pages officielles.
 * Snapshot au 2026-09-22. Ce n’est pas le `is_active` EcoLogits (présence catalogue).
 *
 * Sources :
 * - https://platform.claude.com/docs/en/about-claude/model-deprecations
 * - https://developers.openai.com/api/docs/deprecations
 * - https://developers.openai.com/api/docs/models
 * - https://ai.google.dev/gemini-api/docs/deprecations
 * - https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/model-versions
 * - https://docs.mistral.ai/getting-started/models/models_overview
 * - https://docs.x.ai/developers/models
 * - https://docs.x.ai/developers/migration/may-15-retirement
 */

export type ProviderLifecycleStatus = 'active' | 'legacy' | 'deprecated' | 'retired'

export type ProviderLifecycleSource = 'anthropic' | 'openai' | 'google' | 'mistral' | 'xai' | 'csv'

export type ProviderLifecycle = {
  status: ProviderLifecycleStatus
  label: 'Actif' | 'Legacy' | 'Déprécié' | 'Retiré'
  source: ProviderLifecycleSource
  sourceModelId: string
  replacement: string | null
}

type LifecycleRecord = {
  id: string
  status: ProviderLifecycleStatus
  source: ProviderLifecycleSource
  replacement?: string | null
}

const STATUS_RANK: Record<ProviderLifecycleStatus, number> = {
  retired: 4,
  deprecated: 3,
  legacy: 2,
  active: 1,
}

const STATUS_LABEL: Record<ProviderLifecycleStatus, ProviderLifecycle['label']> = {
  active: 'Actif',
  legacy: 'Legacy',
  deprecated: 'Déprécié',
  retired: 'Retiré',
}

const LIFECYCLE_RECORDS: LifecycleRecord[] = [
  { id: 'claude-fable-5-1', status: 'active', source: 'anthropic' },
  { id: 'claude-mythos-5-1', status: 'active', source: 'anthropic' },
  { id: 'claude-fable-5', status: 'active', source: 'anthropic' },
  { id: 'claude-mythos-5', status: 'active', source: 'anthropic' },
  { id: 'claude-mythos-preview', status: 'deprecated', source: 'anthropic', replacement: 'claude-mythos-5' },
  { id: 'claude-opus-5', status: 'active', source: 'anthropic' },
  { id: 'claude-opus-4-8', status: 'active', source: 'anthropic' },
  { id: 'claude-opus-4-7', status: 'active', source: 'anthropic' },
  { id: 'claude-opus-4-6', status: 'active', source: 'anthropic' },
  { id: 'claude-opus-4-5-20251101', status: 'active', source: 'anthropic' },
  { id: 'claude-opus-4-1-20250805', status: 'retired', source: 'anthropic', replacement: 'claude-opus-4-8' },
  { id: 'claude-opus-4-20250514', status: 'retired', source: 'anthropic', replacement: 'claude-opus-4-8' },
  { id: 'claude-sonnet-5', status: 'active', source: 'anthropic' },
  { id: 'claude-sonnet-4-6', status: 'active', source: 'anthropic' },
  { id: 'claude-sonnet-4-5-20250929', status: 'active', source: 'anthropic' },
  { id: 'claude-sonnet-4-20250514', status: 'retired', source: 'anthropic', replacement: 'claude-sonnet-4-6' },
  { id: 'claude-3-7-sonnet-20250219', status: 'retired', source: 'anthropic', replacement: 'claude-sonnet-4-6' },
  { id: 'claude-haiku-4-5-20251001', status: 'active', source: 'anthropic' },
  { id: 'claude-3-5-haiku-20241022', status: 'retired', source: 'anthropic', replacement: 'claude-haiku-4-5-20251001' },
  { id: 'claude-3-haiku-20240307', status: 'retired', source: 'anthropic', replacement: 'claude-haiku-4-5-20251001' },
  { id: 'claude-3-5-sonnet-20240620', status: 'retired', source: 'anthropic', replacement: 'claude-sonnet-4-6' },
  { id: 'claude-3-5-sonnet-20241022', status: 'retired', source: 'anthropic', replacement: 'claude-sonnet-4-6' },
  { id: 'claude-3-opus-20240229', status: 'retired', source: 'anthropic', replacement: 'claude-opus-4-8' },
  { id: 'claude-2.0', status: 'retired', source: 'anthropic', replacement: 'claude-opus-4-8' },
  { id: 'claude-2.1', status: 'retired', source: 'anthropic', replacement: 'claude-opus-4-8' },
  { id: 'claude-3-sonnet-20240229', status: 'retired', source: 'anthropic', replacement: 'claude-sonnet-4-6' },

  { id: 'gemini-3.8-flash', status: 'active', source: 'google' },
  { id: 'gemini-3.8-flash-cyber', status: 'active', source: 'google' },
  { id: 'gemini-3.7-flash', status: 'active', source: 'google' },
  { id: 'gemini-3.6-flash', status: 'active', source: 'google' },
  { id: 'gemini-3.5-flash', status: 'active', source: 'google' },
  { id: 'gemini-3.5-flash-cyber', status: 'active', source: 'google' },
  { id: 'gemini-3.5-flash-lite', status: 'active', source: 'google' },
  { id: 'gemini-3.1-pro', status: 'active', source: 'google' },
  { id: 'gemini-3-flash', status: 'active', source: 'google' },
  { id: 'gemini-3-pro', status: 'active', source: 'google' },
  { id: 'diffusiongemma-26b-a4b', status: 'active', source: 'google' },
  { id: 'gemma-4', status: 'active', source: 'google' },
  { id: 'gemma-4-12b', status: 'active', source: 'google' },
  { id: 'gemma-4-26b-a4b', status: 'active', source: 'google' },
  { id: 'gemma-4-31b', status: 'active', source: 'google' },
  { id: 'gemma-4-e2b', status: 'active', source: 'google' },
  { id: 'gemma-4-e4b', status: 'active', source: 'google' },
  { id: 'gemini-3.1-flash-lite', status: 'deprecated', source: 'google', replacement: 'gemini-3.5-flash-lite' },
  { id: 'gemini-2.5-pro', status: 'deprecated', source: 'google', replacement: 'gemini-3.5-flash' },
  { id: 'gemini-2.5-flash', status: 'deprecated', source: 'google', replacement: 'gemini-3.5-flash-lite' },
  { id: 'gemini-2.5-flash-lite', status: 'deprecated', source: 'google', replacement: 'gemini-3.1-flash-lite' },
  { id: 'gemini-diffusion', status: 'deprecated', source: 'google', replacement: 'diffusiongemma-26b-a4b' },
  { id: 'gemma-3-1b', status: 'deprecated', source: 'google', replacement: 'gemma-4' },
  { id: 'gemma-3-4b', status: 'deprecated', source: 'google', replacement: 'gemma-4' },
  { id: 'gemma-3-12b', status: 'deprecated', source: 'google', replacement: 'gemma-4' },
  { id: 'gemma-3-27b', status: 'deprecated', source: 'google', replacement: 'gemma-4' },
  { id: 'gemma-3n-e2b', status: 'deprecated', source: 'google', replacement: 'gemma-4-e2b' },
  { id: 'gemma-3n-e2b-instructed', status: 'deprecated', source: 'google', replacement: 'gemma-4-e2b' },
  { id: 'gemma-3n-e2b-instructed-litert-preview', status: 'deprecated', source: 'google', replacement: 'gemma-4-e2b' },
  { id: 'gemma-3n-e4b', status: 'deprecated', source: 'google', replacement: 'gemma-4-e4b' },
  { id: 'gemma-3n-e4b-instructed', status: 'deprecated', source: 'google', replacement: 'gemma-4-e4b' },
  { id: 'gemma-3n-e4b-instructed-litert-preview', status: 'deprecated', source: 'google', replacement: 'gemma-4-e4b' },
  { id: 'medgemma-4b-it', status: 'deprecated', source: 'google', replacement: 'gemma-4' },
  { id: 'gemini-2.5-pro-preview-06-05', status: 'retired', source: 'google', replacement: 'gemini-2.5-pro' },
  { id: 'gemini-2.0-flash', status: 'retired', source: 'google', replacement: 'gemini-3.1-flash-lite' },
  { id: 'gemini-2.0-flash-lite', status: 'retired', source: 'google', replacement: 'gemini-3.1-flash-lite' },
  { id: 'gemini-2.0-flash-thinking', status: 'retired', source: 'google', replacement: 'gemini-3-flash' },
  { id: 'gemini-1.5-pro', status: 'retired', source: 'google', replacement: 'gemini-2.5-flash' },
  { id: 'gemini-1.5-flash', status: 'retired', source: 'google', replacement: 'gemini-2.5-flash-lite' },
  { id: 'gemini-1.5-flash-8b', status: 'retired', source: 'google', replacement: 'gemini-2.5-flash-lite' },
  { id: 'gemini-1.0-pro', status: 'retired', source: 'google', replacement: 'gemini-2.5-flash' },
  { id: 'gemma-2-27b', status: 'retired', source: 'google', replacement: 'gemma-4' },
  { id: 'gemma-2-9b', status: 'retired', source: 'google', replacement: 'gemma-4' },
  { id: 'gemma-2-2b', status: 'retired', source: 'google', replacement: 'gemma-4' },
  { id: 'gemma-2b', status: 'retired', source: 'google', replacement: 'gemma-4' },
  { id: 'gemma-1.1-2b', status: 'retired', source: 'google', replacement: 'gemma-4' },
  { id: 'gemma-7b', status: 'retired', source: 'google', replacement: 'gemma-4' },
  { id: 'codegemma-2b', status: 'retired', source: 'google', replacement: 'gemma-4' },
  { id: 'codegemma-7b', status: 'retired', source: 'google', replacement: 'gemma-4' },

  { id: 'gpt-6-astra', status: 'active', source: 'openai' },
  { id: 'gpt-5.6-sol', status: 'active', source: 'openai' },
  { id: 'gpt-5.6', status: 'active', source: 'openai' },
  { id: 'gpt-5.6-terra', status: 'active', source: 'openai' },
  { id: 'gpt-5.6-luna', status: 'active', source: 'openai' },
  { id: 'gpt-5.6-cyber', status: 'active', source: 'openai' },
  { id: 'gpt-oss-120b', status: 'active', source: 'openai' },
  { id: 'gpt-oss-20b', status: 'active', source: 'openai' },
  { id: 'o3', status: 'deprecated', source: 'openai', replacement: 'gpt-5.6-sol' },
  { id: 'o3-2025-04-16', status: 'deprecated', source: 'openai', replacement: 'gpt-5.6-sol' },
  { id: 'o3-pro', status: 'deprecated', source: 'openai', replacement: 'gpt-5.6-sol' },
  { id: 'o1-pro', status: 'deprecated', source: 'openai', replacement: 'gpt-5.6-sol' },
  { id: 'sora-2', status: 'deprecated', source: 'openai' },
  { id: 'chatgpt-4o-latest', status: 'retired', source: 'openai', replacement: 'gpt-5.6-sol' },
  { id: 'gpt-4.5', status: 'retired', source: 'openai', replacement: 'gpt-4.1' },
  { id: 'gpt-4.5-preview', status: 'retired', source: 'openai', replacement: 'gpt-4.1' },
  { id: 'o1-preview', status: 'retired', source: 'openai', replacement: 'o3' },
  { id: 'o1-mini', status: 'retired', source: 'openai', replacement: 'o4-mini' },
  { id: 'gpt-5-chat', status: 'retired', source: 'openai', replacement: 'gpt-5.6-sol' },
  { id: 'gpt-5.1-chat', status: 'retired', source: 'openai', replacement: 'gpt-5.6-sol' },
  { id: 'gpt-5.2-chat', status: 'retired', source: 'openai', replacement: 'gpt-5.6-sol' },
  { id: 'gpt-5.3-chat', status: 'retired', source: 'openai', replacement: 'gpt-5.6-sol' },

  { id: 'chat-latest', status: 'active', source: 'openai' },
  { id: 'gpt-4.1', status: 'active', source: 'openai' },
  { id: 'gpt-4.1-2025-04-14', status: 'active', source: 'openai' },
  { id: 'gpt-4.1-mini', status: 'active', source: 'openai' },
  { id: 'gpt-4.1-mini-2025-04-14', status: 'active', source: 'openai' },
  { id: 'gpt-4o', status: 'active', source: 'openai' },
  { id: 'gpt-4o-2024-08-06', status: 'active', source: 'openai' },
  { id: 'gpt-4o-2024-11-20', status: 'active', source: 'openai' },
  { id: 'gpt-4o-mini', status: 'active', source: 'openai' },
  { id: 'gpt-4o-mini-2024-07-18', status: 'active', source: 'openai' },
  { id: 'gpt-4o-mini-tts', status: 'active', source: 'openai' },
  { id: 'gpt-4o-mini-tts-2025-03-20', status: 'active', source: 'openai' },
  { id: 'gpt-4o-mini-tts-2025-12-15', status: 'active', source: 'openai' },
  { id: 'gpt-5', status: 'active', source: 'openai' },
  { id: 'gpt-5-mini', status: 'active', source: 'openai' },
  { id: 'gpt-5-nano', status: 'active', source: 'openai' },
  { id: 'gpt-5-pro', status: 'active', source: 'openai' },
  { id: 'gpt-5-search-api', status: 'active', source: 'openai' },
  { id: 'gpt-5-search-api-2025-10-14', status: 'active', source: 'openai' },
  { id: 'gpt-5.1', status: 'active', source: 'openai' },
  { id: 'gpt-5.1-2025-11-13', status: 'active', source: 'openai' },
  { id: 'gpt-5.2', status: 'active', source: 'openai' },
  { id: 'gpt-5.2-2025-12-11', status: 'active', source: 'openai' },
  { id: 'gpt-5.2-pro', status: 'active', source: 'openai' },
  { id: 'gpt-5.2-pro-2025-12-11', status: 'active', source: 'openai' },
  { id: 'gpt-5.3-codex', status: 'active', source: 'openai' },
  { id: 'gpt-5.4', status: 'active', source: 'openai' },
  { id: 'gpt-5.4-2026-03-05', status: 'active', source: 'openai' },
  { id: 'gpt-5.4-mini', status: 'active', source: 'openai' },
  { id: 'gpt-5.4-mini-2026-03-17', status: 'active', source: 'openai' },
  { id: 'gpt-5.4-nano', status: 'active', source: 'openai' },
  { id: 'gpt-5.4-nano-2026-03-17', status: 'active', source: 'openai' },
  { id: 'gpt-5.4-pro', status: 'active', source: 'openai' },
  { id: 'gpt-5.4-pro-2026-03-05', status: 'active', source: 'openai' },
  { id: 'gpt-5.5', status: 'active', source: 'openai' },
  { id: 'gpt-5.5-2026-04-23', status: 'active', source: 'openai' },
  { id: 'gpt-5.5-pro', status: 'active', source: 'openai' },
  { id: 'gpt-5.5-pro-2026-04-23', status: 'active', source: 'openai' },

  { id: 'gpt-3.5-turbo', status: 'deprecated', source: 'openai', replacement: 'gpt-5.6-terra' },
  { id: 'gpt-3.5-turbo-0125', status: 'deprecated', source: 'openai', replacement: 'gpt-5.6-terra' },
  { id: 'gpt-3.5-turbo-1106', status: 'deprecated', source: 'openai', replacement: 'gpt-5.6-terra' },
  { id: 'gpt-3.5-turbo-instruct', status: 'deprecated', source: 'openai', replacement: 'gpt-5.6-terra' },
  { id: 'gpt-35-turbo', status: 'deprecated', source: 'openai', replacement: 'gpt-5.6-terra' },
  { id: 'gpt-35-turbo-0125', status: 'deprecated', source: 'openai', replacement: 'gpt-5.6-terra' },
  { id: 'gpt-35-turbo-1106', status: 'deprecated', source: 'openai', replacement: 'gpt-5.6-terra' },
  { id: 'gpt-35-turbo-instruct', status: 'deprecated', source: 'openai', replacement: 'gpt-5.6-terra' },
  { id: 'gpt-4', status: 'deprecated', source: 'openai', replacement: 'gpt-5.6-sol' },
  { id: 'gpt-4-0613', status: 'deprecated', source: 'openai', replacement: 'gpt-5.6-sol' },
  { id: 'gpt-4-turbo', status: 'deprecated', source: 'openai', replacement: 'gpt-5.6-sol' },
  { id: 'gpt-4-turbo-2024-04-09', status: 'deprecated', source: 'openai', replacement: 'gpt-5.6-sol' },
  { id: 'gpt-4.1-nano', status: 'deprecated', source: 'openai', replacement: 'gpt-5.6-luna' },
  { id: 'gpt-4.1-nano-2025-04-14', status: 'deprecated', source: 'openai', replacement: 'gpt-5.6-luna' },
  { id: 'gpt-4o-2024-05-13', status: 'deprecated', source: 'openai', replacement: 'gpt-5.6-sol' },
  { id: 'gpt-4o-mini-search-preview', status: 'deprecated', source: 'openai', replacement: 'gpt-5.6-terra' },
  { id: 'gpt-4o-mini-transcribe', status: 'deprecated', source: 'openai', replacement: 'gpt-live-transcribe' },
  { id: 'gpt-4o-mini-transcribe-2025-03-20', status: 'deprecated', source: 'openai', replacement: 'gpt-4o-mini-transcribe-2025-12-15' },
  { id: 'gpt-4o-mini-transcribe-2025-12-15', status: 'deprecated', source: 'openai', replacement: 'gpt-live-transcribe' },
  { id: 'gpt-4o-search-preview', status: 'deprecated', source: 'openai', replacement: 'gpt-5.6-terra' },
  { id: 'gpt-5-2025-08-07', status: 'deprecated', source: 'openai', replacement: 'gpt-5.6-sol' },
  { id: 'gpt-5-mini-2025-08-07', status: 'deprecated', source: 'openai', replacement: 'gpt-5.6-terra' },
  { id: 'gpt-5-nano-2025-08-07', status: 'deprecated', source: 'openai', replacement: 'gpt-5.6-luna' },
  { id: 'gpt-5-pro-2025-10-06', status: 'deprecated', source: 'openai', replacement: 'gpt-5.6-sol' },
  { id: 'o1', status: 'deprecated', source: 'openai', replacement: 'gpt-5.6-sol' },
  { id: 'o1-2024-12-17', status: 'deprecated', source: 'openai', replacement: 'gpt-5.6-sol' },
  { id: 'o3-mini', status: 'deprecated', source: 'openai', replacement: 'gpt-5.6-sol' },
  { id: 'o3-mini-2025-01-31', status: 'deprecated', source: 'openai', replacement: 'gpt-5.6-sol' },
  { id: 'o4-mini', status: 'deprecated', source: 'openai', replacement: 'gpt-5.6-terra' },
  { id: 'o4-mini-2025-04-16', status: 'deprecated', source: 'openai', replacement: 'gpt-5.6-terra' },
  { id: 'o4-mini-deep-research', status: 'deprecated', source: 'openai', replacement: 'gpt-5.6-sol' },

  { id: 'gpt-3.5-turbo-16k', status: 'retired', source: 'openai', replacement: 'gpt-5.6-terra' },
  { id: 'gpt-3.5-turbo-instruct-0914', status: 'retired', source: 'openai', replacement: 'gpt-5.6-terra' },
  { id: 'gpt-35-turbo-16k', status: 'retired', source: 'openai', replacement: 'gpt-5.6-terra' },
  { id: 'gpt-35-turbo-instruct-0914', status: 'retired', source: 'openai', replacement: 'gpt-5.6-terra' },
  { id: 'gpt-4o-mini-search-preview-2025-03-11', status: 'retired', source: 'openai', replacement: 'gpt-5.6-terra' },
  { id: 'gpt-4o-search-preview-2025-03-11', status: 'retired', source: 'openai', replacement: 'gpt-5.6-terra' },
  { id: 'gpt-5-chat-latest', status: 'retired', source: 'openai', replacement: 'gpt-5.6-sol' },
  { id: 'gpt-5-codex', status: 'retired', source: 'openai', replacement: 'gpt-5.6-sol' },
  { id: 'gpt-5.1-chat-latest', status: 'retired', source: 'openai', replacement: 'gpt-5.6-sol' },
  { id: 'gpt-5.1-codex', status: 'retired', source: 'openai', replacement: 'gpt-5.6-sol' },
  { id: 'gpt-5.1-codex-max', status: 'retired', source: 'openai', replacement: 'gpt-5.6-sol' },
  { id: 'gpt-5.1-codex-mini', status: 'retired', source: 'openai', replacement: 'gpt-5.6-terra' },
  { id: 'gpt-5.2-chat-latest', status: 'retired', source: 'openai', replacement: 'gpt-5.6-sol' },
  { id: 'gpt-5.2-codex', status: 'retired', source: 'openai', replacement: 'gpt-5.6-sol' },
  { id: 'gpt-5.3-chat-latest', status: 'retired', source: 'openai', replacement: 'gpt-5.6-sol' },
  { id: 'o4-mini-deep-research-2025-06-26', status: 'retired', source: 'openai', replacement: 'gpt-5.6-sol' },

  { id: 'mistral-medium-3-5', status: 'active', source: 'mistral' },
  { id: 'mistral-medium-3.5', status: 'active', source: 'mistral' },
  { id: 'mistral-medium-2604', status: 'active', source: 'mistral' },
  { id: 'mistral-medium-latest', status: 'active', source: 'mistral', replacement: 'mistral-medium-3-5' },
  { id: 'mistral-small-4', status: 'active', source: 'mistral' },
  { id: 'mistral-small-2603', status: 'active', source: 'mistral' },
  { id: 'mistral-small-latest', status: 'active', source: 'mistral', replacement: 'mistral-small-2603' },
  { id: 'magistral-small-latest', status: 'active', source: 'mistral', replacement: 'mistral-small-2603' },
  { id: 'mistral-large-3', status: 'active', source: 'mistral' },
  { id: 'mistral-large-3-2509', status: 'active', source: 'mistral' },
  { id: 'mistral-large-3-675b', status: 'active', source: 'mistral' },
  { id: 'mistral-large-3-675b-base', status: 'active', source: 'mistral' },
  { id: 'mistral-large-3-675b-base-2512', status: 'active', source: 'mistral' },
  { id: 'mistral-large-3-675b-instruct-2512', status: 'active', source: 'mistral' },
  { id: 'mistral-large-3-675b-instruct-2512-eagle', status: 'active', source: 'mistral' },
  { id: 'mistral-large-3-675b-instruct-2512-nvfp4', status: 'active', source: 'mistral' },
  { id: 'mistral-large-2512', status: 'active', source: 'mistral' },
  { id: 'mistral-large-latest', status: 'active', source: 'mistral', replacement: 'mistral-large-2512' },
  { id: 'ministral-3', status: 'active', source: 'mistral' },
  { id: 'ministral-3-14b-base-2512', status: 'active', source: 'mistral' },
  { id: 'ministral-3-14b-instruct-2512', status: 'active', source: 'mistral' },
  { id: 'ministral-3-14b-reasoning-2512', status: 'active', source: 'mistral' },
  { id: 'ministral-3-8b-base-2512', status: 'active', source: 'mistral' },
  { id: 'ministral-3-8b-instruct-2512', status: 'active', source: 'mistral' },
  { id: 'ministral-3-8b-reasoning-2512', status: 'active', source: 'mistral' },
  { id: 'ministral-3-3b-base-2512', status: 'active', source: 'mistral' },
  { id: 'ministral-3-3b-instruct-2512', status: 'active', source: 'mistral' },
  { id: 'ministral-3-3b-reasoning-2512', status: 'active', source: 'mistral' },
  { id: 'ministral-14b-2512', status: 'active', source: 'mistral' },
  { id: 'ministral-8b-2512', status: 'active', source: 'mistral' },
  { id: 'ministral-3b-2512', status: 'active', source: 'mistral' },
  { id: 'ministral-14b-latest', status: 'active', source: 'mistral' },
  { id: 'ministral-8b-latest', status: 'active', source: 'mistral' },
  { id: 'ministral-3b-latest', status: 'active', source: 'mistral' },
  { id: 'codestral-25-08', status: 'active', source: 'mistral' },
  { id: 'codestral-2508', status: 'active', source: 'mistral' },
  { id: 'codestral-latest', status: 'active', source: 'mistral', replacement: 'codestral-2508' },
  { id: 'shieldstral-1-0-3b', status: 'active', source: 'mistral' },
  { id: 'voxtral-small', status: 'active', source: 'mistral' },
  { id: 'voxtral-small-2507', status: 'active', source: 'mistral' },
  { id: 'voxtral-small-latest', status: 'active', source: 'mistral' },
  { id: 'voxtral-mini-transcribe-2', status: 'active', source: 'mistral' },
  { id: 'voxtral-mini-2602', status: 'active', source: 'mistral' },
  { id: 'voxtral-mini-latest', status: 'active', source: 'mistral', replacement: 'voxtral-mini-2602' },
  { id: 'voxtral-mini-transcribe-realtime', status: 'active', source: 'mistral' },
  { id: 'voxtral-tts', status: 'active', source: 'mistral' },
  { id: 'voxtral-tts-2603', status: 'active', source: 'mistral' },
  { id: 'leanstral-1-5', status: 'active', source: 'mistral' },
  { id: 'labs-leanstral-1-5', status: 'active', source: 'mistral' },
  { id: 'mistral-moderation-2', status: 'active', source: 'mistral' },
  { id: 'mistral-moderation-2603', status: 'active', source: 'mistral' },

  { id: 'codestral-22b', status: 'retired', source: 'mistral', replacement: 'codestral-2508' },
  { id: 'codestral-2405', status: 'retired', source: 'mistral', replacement: 'codestral-2508' },
  { id: 'codestral-24-05', status: 'retired', source: 'mistral', replacement: 'codestral-2508' },
  { id: 'codestral-2501', status: 'retired', source: 'mistral', replacement: 'codestral-2508' },
  { id: 'codestral-25-01', status: 'retired', source: 'mistral', replacement: 'codestral-2508' },
  { id: 'devstral-2', status: 'retired', source: 'mistral', replacement: 'mistral-medium-3-5' },
  { id: 'devstral-2512', status: 'retired', source: 'mistral', replacement: 'mistral-medium-3-5' },
  { id: 'devstral-latest', status: 'retired', source: 'mistral', replacement: 'mistral-medium-3-5' },
  { id: 'devstral-medium-latest', status: 'retired', source: 'mistral', replacement: 'devstral-2512' },
  { id: 'devstral-medium', status: 'retired', source: 'mistral', replacement: 'mistral-medium-3-5' },
  { id: 'devstral-medium-2507', status: 'retired', source: 'mistral', replacement: 'mistral-medium-3-5' },
  { id: 'devstral-small-1-1', status: 'retired', source: 'mistral', replacement: 'mistral-small-2603' },
  { id: 'devstral-small-2507', status: 'retired', source: 'mistral', replacement: 'mistral-small-2603' },
  { id: 'devstral-small-1-0', status: 'retired', source: 'mistral', replacement: 'mistral-medium-3-5' },
  { id: 'devstral-small-2505', status: 'retired', source: 'mistral', replacement: 'mistral-medium-3-5' },
  { id: 'devstral-small-2', status: 'retired', source: 'mistral', replacement: 'mistral-medium-3-5' },
  { id: 'labs-devstral-small-2512', status: 'retired', source: 'mistral', replacement: 'mistral-medium-3-5' },
  { id: 'magistral-medium-1-2', status: 'retired', source: 'mistral', replacement: 'mistral-medium-3-5' },
  { id: 'magistral-medium-2509', status: 'retired', source: 'mistral', replacement: 'mistral-medium-3-5' },
  { id: 'magistral-medium-latest', status: 'retired', source: 'mistral', replacement: 'mistral-medium-3-5' },
  { id: 'magistral-medium-1-1', status: 'retired', source: 'mistral', replacement: 'mistral-medium-3-5' },
  { id: 'magistral-medium-2507', status: 'retired', source: 'mistral', replacement: 'mistral-medium-3-5' },
  { id: 'magistral-medium-1-0', status: 'retired', source: 'mistral', replacement: 'mistral-medium-3-5' },
  { id: 'magistral-medium-2506', status: 'retired', source: 'mistral', replacement: 'mistral-medium-3-5' },
  { id: 'magistral-small-2506', status: 'retired', source: 'mistral', replacement: 'mistral-small-2603' },
  { id: 'magistral-small-1-2', status: 'retired', source: 'mistral', replacement: 'mistral-small-2603' },
  { id: 'magistral-small-2509', status: 'retired', source: 'mistral', replacement: 'mistral-small-2603' },
  { id: 'magistral-small-1-1', status: 'retired', source: 'mistral', replacement: 'mistral-small-2603' },
  { id: 'magistral-small-2507', status: 'retired', source: 'mistral', replacement: 'mistral-small-2603' },
  { id: 'mistral-medium-3', status: 'retired', source: 'mistral', replacement: 'mistral-medium-3-5' },
  { id: 'mistral-medium-2505', status: 'retired', source: 'mistral', replacement: 'mistral-medium-3-5' },
  { id: 'mistral-medium-3-1', status: 'retired', source: 'mistral', replacement: 'mistral-medium-3-5' },
  { id: 'mistral-medium-2508', status: 'retired', source: 'mistral', replacement: 'mistral-medium-3-5' },
  { id: 'mistral-medium-1-0', status: 'retired', source: 'mistral', replacement: 'mistral-medium-3-5' },
  { id: 'mistral-medium-2312', status: 'retired', source: 'mistral', replacement: 'mistral-medium-3-5' },
  { id: 'mistral-medium', status: 'retired', source: 'mistral', replacement: 'mistral-medium-2312' },
  { id: 'ministral-8b-instruct', status: 'retired', source: 'mistral', replacement: 'ministral-3-8b-instruct-2512' },
  { id: 'ministral-8b-instruct-2410', status: 'retired', source: 'mistral', replacement: 'ministral-3-8b-instruct-2512' },
  { id: 'mistral-7b-instruct-v0-2', status: 'retired', source: 'mistral', replacement: 'ministral-3-8b-instruct-2512' },
  { id: 'mistral-7b-v0-3', status: 'retired', source: 'mistral', replacement: 'ministral-3-8b-instruct-2512' },
  { id: 'open-mistral-7b', status: 'retired', source: 'mistral', replacement: 'ministral-3-8b-instruct-2512' },
  { id: 'mistral-large-2', status: 'retired', source: 'mistral', replacement: 'mistral-large-2512' },
  { id: 'mistral-large-2-2407', status: 'retired', source: 'mistral', replacement: 'mistral-large-2512' },
  { id: 'mistral-large-2-1', status: 'retired', source: 'mistral', replacement: 'mistral-medium-3-5' },
  { id: 'mistral-large-2411', status: 'retired', source: 'mistral', replacement: 'mistral-medium-3-5' },
  { id: 'mistral-large-1-0', status: 'retired', source: 'mistral', replacement: 'mistral-large-2512' },
  { id: 'mistral-large-2402', status: 'retired', source: 'mistral', replacement: 'mistral-large-2512' },
  { id: 'mistral-nemo-instruct', status: 'retired', source: 'mistral', replacement: 'ministral-3-8b-instruct-2512' },
  { id: 'open-mistral-nemo', status: 'retired', source: 'mistral', replacement: 'ministral-3-8b-instruct-2512' },
  { id: 'open-mistral-nemo-2407', status: 'retired', source: 'mistral', replacement: 'ministral-3-8b-instruct-2512' },
  { id: 'mistral-small', status: 'retired', source: 'mistral', replacement: 'mistral-small-2603' },
  { id: 'mistral-small-2409', status: 'retired', source: 'mistral', replacement: 'mistral-small-2603' },
  { id: 'mistral-small-1-0', status: 'retired', source: 'mistral', replacement: 'mistral-small-2603' },
  { id: 'mistral-small-2402', status: 'retired', source: 'mistral', replacement: 'mistral-small-2603' },
  { id: 'mistral-small-3-24b', status: 'retired', source: 'mistral', replacement: 'mistral-small-2603' },
  { id: 'mistral-small-3-24b-base', status: 'retired', source: 'mistral', replacement: 'mistral-small-2603' },
  { id: 'mistral-small-3-24b-instruct', status: 'retired', source: 'mistral', replacement: 'mistral-small-2603' },
  { id: 'mistral-small-24b-base-2501', status: 'retired', source: 'mistral', replacement: 'mistral-small-2603' },
  { id: 'mistral-small-24b-instruct-2501', status: 'retired', source: 'mistral', replacement: 'mistral-small-2603' },
  { id: 'mistral-small-3-1-24b-base', status: 'retired', source: 'mistral', replacement: 'mistral-small-2603' },
  { id: 'mistral-small-3-1-24b-instruct', status: 'retired', source: 'mistral', replacement: 'mistral-small-2603' },
  { id: 'mistral-small-3-2-24b-instruct', status: 'retired', source: 'mistral', replacement: 'mistral-small-2603' },
  { id: 'mistral-small-2506', status: 'retired', source: 'mistral', replacement: 'mistral-small-2603' },
  { id: 'pixtral-12b', status: 'retired', source: 'mistral', replacement: 'ministral-3-14b-instruct-2512' },
  { id: 'pixtral-12b-2409', status: 'retired', source: 'mistral', replacement: 'ministral-3-14b-instruct-2512' },
  { id: 'pixtral-12b-latest', status: 'retired', source: 'mistral', replacement: 'ministral-3-14b-instruct-2512' },
  { id: 'pixtral-large', status: 'retired', source: 'mistral', replacement: 'mistral-medium-3-5' },
  { id: 'pixtral-large-2411', status: 'retired', source: 'mistral', replacement: 'mistral-medium-3-5' },
  { id: 'voxtral-mini-25-07', status: 'retired', source: 'mistral', replacement: 'voxtral-mini-2602' },
  { id: 'voxtral-mini-2507', status: 'retired', source: 'mistral', replacement: 'voxtral-mini-2602' },
  { id: 'voxtral-mini-25-09', status: 'retired', source: 'mistral', replacement: 'voxtral-mini-2602' },
  { id: 'voxtral-mini-2509', status: 'retired', source: 'mistral', replacement: 'voxtral-mini-2602' },
  { id: 'mixtral-8x7b', status: 'retired', source: 'mistral', replacement: 'mistral-small-2603' },
  { id: 'open-mixtral-8x7b', status: 'retired', source: 'mistral', replacement: 'mistral-small-2603' },
  { id: 'mixtral-8x22b', status: 'retired', source: 'mistral', replacement: 'mistral-small-2603' },
  { id: 'open-mixtral-8x22b', status: 'retired', source: 'mistral', replacement: 'mistral-small-2603' },
  { id: 'codestral-mamba-7b', status: 'retired', source: 'mistral', replacement: 'codestral-2508' },
  { id: 'open-codestral-mamba', status: 'retired', source: 'mistral', replacement: 'codestral-2508' },
  { id: 'mistral-saba', status: 'retired', source: 'mistral', replacement: 'mistral-small-2603' },
  { id: 'mistral-saba-2502', status: 'retired', source: 'mistral', replacement: 'mistral-small-2603' },
  { id: 'mistral-small-creative', status: 'retired', source: 'mistral', replacement: 'ministral-3-8b-instruct-2512' },
  { id: 'labs-mistral-small-creative', status: 'retired', source: 'mistral', replacement: 'ministral-3-8b-instruct-2512' },
  { id: 'leanstral-26-03', status: 'retired', source: 'mistral', replacement: 'labs-leanstral-1-5' },
  { id: 'labs-leanstral-2603', status: 'retired', source: 'mistral', replacement: 'labs-leanstral-1-5' },

  { id: 'grok-4.3', status: 'active', source: 'xai' },
  { id: 'grok-4.5', status: 'active', source: 'xai' },
  { id: 'grok-4.6', status: 'active', source: 'xai' },
  { id: 'grok-4.20', status: 'active', source: 'xai' },
  { id: 'grok-4.20-0309-reasoning', status: 'active', source: 'xai' },
  { id: 'grok-4.20-beta-reasoning', status: 'active', source: 'xai' },
  { id: 'grok-4.20-0309-non-reasoning', status: 'active', source: 'xai' },
  { id: 'grok-4.20-beta-non-reasoning', status: 'active', source: 'xai' },
  { id: 'grok-4.20-multi-agent-0309', status: 'active', source: 'xai' },
  { id: 'grok-4.20-multi-agent-beta', status: 'active', source: 'xai' },
  { id: 'grok-3', status: 'retired', source: 'xai', replacement: 'grok-4.3' },
  { id: 'grok-4-1-fast-reasoning', status: 'retired', source: 'xai', replacement: 'grok-4.3' },
  { id: 'grok-4-1-fast-non-reasoning', status: 'retired', source: 'xai', replacement: 'grok-4.3' },
  { id: 'grok-4-fast-reasoning', status: 'retired', source: 'xai', replacement: 'grok-4.3' },
  { id: 'grok-4-fast-non-reasoning', status: 'retired', source: 'xai', replacement: 'grok-4.3' },
  { id: 'grok-code-fast-1', status: 'retired', source: 'xai', replacement: 'grok-build-0.1' },
]

function lifecycleKey(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-')
}

const LIFECYCLE_BY_ID = new Map(LIFECYCLE_RECORDS.map((row) => [lifecycleKey(row.id), row]))

function toLifecycle(record: LifecycleRecord): ProviderLifecycle {
  return {
    status: record.status,
    label: STATUS_LABEL[record.status],
    source: record.source,
    sourceModelId: record.id,
    replacement: record.replacement ?? null,
  }
}

function lookupRecords(key: string): LifecycleRecord[] {
  const exact = LIFECYCLE_BY_ID.get(key)
  if (exact) return [exact]
  return LIFECYCLE_RECORDS.filter((row) => {
    const id = lifecycleKey(row.id)
    return id.startsWith(`${key}-`) && /^\d{8}$/.test(id.slice(key.length + 1))
  })
}

export function applyLifecycleStatusOverride(
  official: ProviderLifecycle | null,
  override: ProviderLifecycleStatus | null | undefined,
): ProviderLifecycle | null {
  if (!override) return official
  if (official) {
    return { ...official, status: override, label: STATUS_LABEL[override] }
  }
  return {
    status: override,
    label: STATUS_LABEL[override],
    source: 'csv',
    sourceModelId: override,
    replacement: null,
  }
}

export function resolveProviderLifecycle(identifiers: Array<string | null | undefined>): ProviderLifecycle | null {
  const matches: LifecycleRecord[] = []
  const seen = new Set<string>()

  for (const raw of identifiers) {
    if (!raw) continue
    const key = lifecycleKey(raw)
    if (!key || seen.has(key)) continue
    seen.add(key)
    const keys = key.endsWith('-0') ? [key, key.slice(0, -2)] : [key]
    for (const candidate of keys) {
      for (const record of lookupRecords(candidate)) {
        if (seen.has(`id:${record.id}`)) continue
        seen.add(`id:${record.id}`)
        matches.push(record)
      }
    }
  }

  if (matches.length === 0) return null
  return toLifecycle(
    matches.reduce((worst, row) => (STATUS_RANK[row.status] > STATUS_RANK[worst.status] ? row : worst)),
  )
}
