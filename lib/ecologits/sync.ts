import { createClient, type SupabaseClient } from '@supabase/supabase-js'

import { exactEcoLogitsMatchKey, normalizeEcoLogitsIdentifier, normalizeEcoLogitsProvider } from './normalization'
import { flattenEcoLogitsEstimate } from './parsing'
import {
  ECOLOGITS_ELECTRICITY_ZONE,
  ECOLOGITS_OUTPUT_TOKENS,
  type EcoLogitsCatalogModel,
  type EcoLogitsEstimationResponse,
  type EcoLogitsSyncResult,
} from './types'

const DEFAULT_BASE_URL = 'https://api.ecologits.ai'
const REQUEST_TIMEOUT_MS = 30_000
const RETRY_DELAYS_MS = [500, 1_500, 3_000]
const ESTIMATION_CONCURRENCY = 5

type TriggerSource = 'admin' | 'cron'
type EcoModelRow = { id: string; provider: string; name: string }
type MaydaiModelRow = { id: string; model_name: string; model_provider: string | null }
type ExistingLinkRow = { ecologits_model_id: string; maydai_model_id: string; match_method: 'exact' | 'manual' }

export function buildCatalogModelRow(model: EcoLogitsCatalogModel, now: string) {
  return {
    provider: model.provider,
    name: model.name,
    normalized_provider: normalizeEcoLogitsProvider(model.provider),
    normalized_name: normalizeEcoLogitsIdentifier(model.name),
    architecture: model.architecture ?? null,
    sources: model.sources ?? [],
    warnings: model.warnings ?? [],
    raw_payload: model,
    is_active: true,
    last_seen_at: now,
    missing_since: null,
    updated_at: now,
  }
}

export function planExactEcoLogitsLinks(
  ecoModels: EcoModelRow[],
  maydaiModels: MaydaiModelRow[],
  existingLinks: ExistingLinkRow[],
) {
  const linkedEcoIds = new Set(existingLinks.map((link) => link.ecologits_model_id))
  const linkedMaydaiIds = new Set(existingLinks.map((link) => link.maydai_model_id))
  const maydaiByKey = new Map<string, MaydaiModelRow[]>()

  for (const model of maydaiModels) {
    if (!model.model_provider) continue
    const key = exactEcoLogitsMatchKey(model.model_provider, model.model_name)
    const matches = maydaiByKey.get(key) ?? []
    matches.push(model)
    maydaiByKey.set(key, matches)
  }

  const newLinks: Array<{
    ecologits_model_id: string
    maydai_model_id: string
    match_method: 'exact'
  }> = []
  for (const model of ecoModels) {
    if (linkedEcoIds.has(model.id)) continue
    const matches = maydaiByKey.get(exactEcoLogitsMatchKey(model.provider, model.name)) ?? []
    const available = matches.filter((match) => !linkedMaydaiIds.has(match.id))
    if (available.length !== 1) continue
    const maydaiModel = available[0]!
    newLinks.push({
      ecologits_model_id: model.id,
      maydai_model_id: maydaiModel.id,
      match_method: 'exact',
    })
    linkedEcoIds.add(model.id)
    linkedMaydaiIds.add(maydaiModel.id)
  }
  return newLinks
}

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim()
  if (!value) throw new Error(`${name} est requis`)
  return value
}

function baseUrl(): string {
  return (process.env.ECOLOGITS_BASE_URL?.trim() || DEFAULT_BASE_URL).replace(/\/+$/, '')
}

function requestHeaders(): HeadersInit {
  const headers: Record<string, string> = { Accept: 'application/json' }
  const apiKey = process.env.ECOLOGITS_API_KEY?.trim()
  if (apiKey) headers.Authorization = `Bearer ${apiKey}`
  return headers
}

async function fetchEcoLogits<T>(path: string, init: RequestInit = {}): Promise<T> {
  let lastError: unknown

  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt += 1) {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
    try {
      const response = await fetch(`${baseUrl()}${path}`, {
        ...init,
        headers: { ...requestHeaders(), ...init.headers },
        signal: controller.signal,
      })
      if (response.ok) return (await response.json()) as T

      const body = await response.text()
      const error = new Error(`EcoLogits ${path} (${response.status}): ${body}`)
      if (response.status < 500 && response.status !== 408 && response.status !== 429) throw error
      lastError = error
    } catch (error) {
      lastError = error
    } finally {
      clearTimeout(timeout)
    }

    const delay = RETRY_DELAYS_MS[attempt]
    if (delay !== undefined) await new Promise((resolve) => setTimeout(resolve, delay))
  }

  throw lastError instanceof Error ? lastError : new Error(`EcoLogits ${path} indisponible`)
}

export async function fetchEcoLogitsProviders(): Promise<string[]> {
  const payload = await fetchEcoLogits<{ providers?: unknown }>('/v1beta/providers')
  if (!Array.isArray(payload.providers)) throw new Error('Réponse fournisseurs EcoLogits invalide')
  return payload.providers.filter((provider): provider is string => typeof provider === 'string')
}

export async function fetchEcoLogitsModels(provider: string): Promise<EcoLogitsCatalogModel[]> {
  const payload = await fetchEcoLogits<{ models?: unknown }>(
    `/v1beta/models/${encodeURIComponent(provider)}`,
  )
  if (!Array.isArray(payload.models)) throw new Error(`Catalogue EcoLogits invalide pour ${provider}`)
  return payload.models.filter(
    (model): model is EcoLogitsCatalogModel =>
      typeof model === 'object' &&
      model !== null &&
      typeof (model as EcoLogitsCatalogModel).provider === 'string' &&
      typeof (model as EcoLogitsCatalogModel).name === 'string',
  )
}

export async function fetchEcoLogitsEstimate(
  model: EcoLogitsCatalogModel,
): Promise<EcoLogitsEstimationResponse> {
  return fetchEcoLogits<EcoLogitsEstimationResponse>('/v1beta/estimations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      provider: model.provider,
      model_name: model.name,
      output_token_count: ECOLOGITS_OUTPUT_TOKENS,
      electricity_mix_zone: ECOLOGITS_ELECTRICITY_ZONE,
    }),
  })
}

async function mapWithConcurrency<T>(
  items: T[],
  concurrency: number,
  worker: (item: T) => Promise<void>,
): Promise<void> {
  let cursor = 0
  async function runWorker() {
    while (cursor < items.length) {
      const index = cursor
      cursor += 1
      await worker(items[index]!)
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, runWorker))
}

async function createExactLinks(
  supabase: SupabaseClient,
  ecoModels: EcoModelRow[],
): Promise<number> {
  const [{ data: maydaiRows, error: maydaiError }, { data: linkRows, error: linksError }] =
    await Promise.all([
      supabase.from('compl_ai_models').select('id, model_name, model_provider'),
      supabase
        .from('ecologits_model_links')
        .select('ecologits_model_id, maydai_model_id, match_method'),
    ])

  if (maydaiError) throw maydaiError
  if (linksError) throw linksError

  const now = new Date().toISOString()
  const newLinks = planExactEcoLogitsLinks(
    ecoModels,
    (maydaiRows ?? []) as MaydaiModelRow[],
    (linkRows ?? []) as ExistingLinkRow[],
  ).map((link) => ({ ...link, updated_at: now }))

  if (newLinks.length === 0) return 0
  const { error } = await supabase.from('ecologits_model_links').insert(newLinks)
  if (error) throw error
  return newLinks.length
}

export function shouldDeactivateMissingModels(errors: string[]): boolean {
  return errors.length === 0
}

export async function syncEcoLogitsCatalog(
  supabase: SupabaseClient,
  triggerSource: TriggerSource,
): Promise<EcoLogitsSyncResult> {
  const startedAt = Date.now()
  const startedAtIso = new Date(startedAt).toISOString()
  const { data: run, error: runError } = await supabase
    .from('ecologits_sync_runs')
    .insert({ trigger_source: triggerSource, status: 'running', started_at: startedAtIso })
    .select('id')
    .single()
  if (runError || !run) throw runError ?? new Error('Impossible de créer le journal EcoLogits')

  let providersFetched = 0
  let modelsFetched = 0
  let modelsUpserted = 0
  let modelsDeactivated = 0
  let estimatesSucceeded = 0
  let estimatesFailed = 0
  let exactLinksCreated = 0
  const errors: string[] = []

  try {
    let providers: string[] = []
    try {
      providers = await fetchEcoLogitsProviders()
      providersFetched = providers.length
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error))
    }

    const catalog: EcoLogitsCatalogModel[] = []
    await mapWithConcurrency(providers, 3, async (provider) => {
      try {
        catalog.push(...(await fetchEcoLogitsModels(provider)))
      } catch (error) {
        errors.push(error instanceof Error ? error.message : String(error))
      }
    })
    modelsFetched = catalog.length

    const now = new Date().toISOString()
    if (catalog.length > 0) {
      const rows = catalog.map((model) => buildCatalogModelRow(model, now))
      const { data, error } = await supabase
        .from('ecologits_models')
        .upsert(rows, { onConflict: 'provider,name' })
        .select('id, provider, name')
      if (error) throw error
      modelsUpserted = data?.length ?? 0

      const ecoRows = (data ?? []) as EcoModelRow[]
      try {
        exactLinksCreated = await createExactLinks(supabase, ecoRows)
      } catch (error) {
        errors.push(`Rapprochement: ${error instanceof Error ? error.message : String(error)}`)
      }

      const ecoByKey = new Map(
        ecoRows.map((model) => [exactEcoLogitsMatchKey(model.provider, model.name), model]),
      )
      await mapWithConcurrency(catalog, ESTIMATION_CONCURRENCY, async (model) => {
        const storedModel = ecoByKey.get(exactEcoLogitsMatchKey(model.provider, model.name))
        if (!storedModel) {
          estimatesFailed += 1
          errors.push(`Estimation ${model.provider}/${model.name}: modèle importé introuvable`)
          return
        }
        try {
          const response = await fetchEcoLogitsEstimate(model)
          const { error } = await supabase.from('ecologits_estimates').upsert(
            {
              ecologits_model_id: storedModel.id,
              output_token_count: ECOLOGITS_OUTPUT_TOKENS,
              electricity_mix_zone: ECOLOGITS_ELECTRICITY_ZONE,
              ...flattenEcoLogitsEstimate(response),
              warnings: response.impacts?.warnings ?? [],
              raw_response: response,
              estimated_at: now,
              updated_at: now,
            },
            { onConflict: 'ecologits_model_id,output_token_count,electricity_mix_zone' },
          )
          if (error) throw error
          estimatesSucceeded += 1
        } catch (error) {
          estimatesFailed += 1
          errors.push(
            `Estimation ${model.provider}/${model.name}: ${
              error instanceof Error ? error.message : String(error)
            }`,
          )
        }
      })
    }

    if (shouldDeactivateMissingModels(errors)) {
      const { data, error } = await supabase
        .from('ecologits_models')
        .update({ is_active: false, missing_since: now, updated_at: now })
        .eq('is_active', true)
        .lt('last_seen_at', startedAtIso)
        .select('id')
      if (error) throw error
      modelsDeactivated = data?.length ?? 0
    }
  } catch (error) {
    errors.push(error instanceof Error ? error.message : String(error))
  }

  const durationMs = Date.now() - startedAt
  const status = errors.length === 0 ? 'success' : modelsUpserted > 0 ? 'partial' : 'error'
  const result: EcoLogitsSyncResult = {
    success: status === 'success',
    status,
    runId: run.id,
    providersFetched,
    modelsFetched,
    modelsUpserted,
    modelsDeactivated,
    estimatesSucceeded,
    estimatesFailed,
    exactLinksCreated,
    errors,
    durationMs,
  }

  const { error: finalizeError } = await supabase
    .from('ecologits_sync_runs')
    .update({
      status,
      finished_at: new Date().toISOString(),
      providers_fetched: providersFetched,
      models_fetched: modelsFetched,
      models_upserted: modelsUpserted,
      models_deactivated: modelsDeactivated,
      estimates_succeeded: estimatesSucceeded,
      estimates_failed: estimatesFailed,
      exact_links_created: exactLinksCreated,
      errors,
      duration_ms: durationMs,
    })
    .eq('id', run.id)
  if (finalizeError) throw finalizeError

  return result
}

export function createEcoLogitsServiceClient(): SupabaseClient {
  return createClient(
    requiredEnv('NEXT_PUBLIC_SUPABASE_URL'),
    requiredEnv('SUPABASE_SERVICE_ROLE_KEY'),
    { auth: { persistSession: false, autoRefreshToken: false } },
  )
}
