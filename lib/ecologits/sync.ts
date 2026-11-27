import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { z } from 'zod'

import { type EcoLogitsLinkStatus } from '@/lib/bench-llm/veille-columns'
import { EcologitsModelLinkStateSchema } from '@/types/ecologits.zod'
import { exactEcoLogitsMatchKey, normalizeEcoLogitsIdentifier, normalizeEcoLogitsProvider } from './normalization'
import { flattenEcoLogitsEstimate } from './parsing'
import { resolveAliasTargetId, type AliasRecord, type LineageModel } from '@/lib/bench-llm/model-lineage'
import { toExplicitError } from '@/lib/errors/postgrest-error'
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

/** Candidat au rapprochement. `link_status` absent n'est pas traité comme ignoré. */
export type EcoLogitsLinkCandidate = {
  id: string
  provider: string
  name: string
  link_status?: EcoLogitsLinkStatus
}

const StoredEcoCatalogRowSchema = EcologitsModelLinkStateSchema.extend({
  provider: z.string(),
}).strict()
type MaydaiModelRow = { id: string; model_name: string; model_provider: string | null; merged_into_id?: string | null }
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
  ecoModels: readonly EcoLogitsLinkCandidate[],
  maydaiModels: MaydaiModelRow[],
  existingLinks: ExistingLinkRow[],
  aliases: readonly AliasRecord[] = [],
) {
  const linkedEcoIds = new Set(existingLinks.map((link) => link.ecologits_model_id))
  const linkedMaydaiIds = new Set(existingLinks.map((link) => link.maydai_model_id))
  const maydaiByKey = new Map<string, MaydaiModelRow[]>()
  const lineage = new Map<string, LineageModel>(maydaiModels.map((model) => [model.id, {
    id: model.id,
    mergedIntoId: model.merged_into_id ?? null,
  }]))

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
    if (model.link_status === 'ignored') continue
    if (linkedEcoIds.has(model.id)) continue
    const aliasTarget = resolveAliasTargetId(aliases, [...lineage.values()], {
      source: 'ecologits',
      sourceId: model.id,
      normalizedName: normalizeEcoLogitsIdentifier(model.name),
    })
    if (aliasTarget && !linkedMaydaiIds.has(aliasTarget)) {
      newLinks.push({
        ecologits_model_id: model.id,
        maydai_model_id: aliasTarget,
        match_method: 'exact',
      })
      linkedEcoIds.add(model.id)
      linkedMaydaiIds.add(aliasTarget)
      continue
    }
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

function parseStoredEcoCatalog(data: unknown): EcoLogitsLinkCandidate[] {
  const parsed = z.array(StoredEcoCatalogRowSchema).safeParse(data)
  if (!parsed.success) {
    throw new Error(`Catalogue EcoLogits illisible: ${parsed.error.message}`)
  }
  return parsed.data.map((row) => {
    const state = EcologitsModelLinkStateSchema.parse({
      id: row.id,
      name: row.name,
      link_status: row.link_status,
    })
    return {
      id: state.id,
      provider: row.provider,
      name: state.name,
      link_status: state.link_status,
    }
  })
}

async function createExactLinks(
  supabase: SupabaseClient,
  ecoModels: readonly EcoLogitsLinkCandidate[],
): Promise<number> {
  const [{ data: maydaiRows, error: maydaiError }, { data: linkRows, error: linksError }, { data: aliasRows, error: aliasError }] =
    await Promise.all([
      supabase.from('compl_ai_models').select('id, model_name, model_provider, merged_into_id'),
      supabase
        .from('ecologits_model_links')
        .select('ecologits_model_id, maydai_model_id, match_method'),
      supabase
        .from('llm_model_aliases')
        .select('model_id, source, source_id, normalized_name')
        .eq('source', 'ecologits'),
    ])

  if (maydaiError) throw toExplicitError('EcoLogits Sync - createExactLinks', maydaiError)
  if (linksError) throw toExplicitError('EcoLogits Sync - createExactLinks', linksError)
  if (aliasError) throw toExplicitError('EcoLogits Sync - createExactLinks', aliasError)

  const aliases = ((aliasRows ?? []) as Array<{
    model_id: string
    source: string
    source_id: string
    normalized_name: string
  }>).map((alias): AliasRecord => ({
    modelId: alias.model_id,
    source: alias.source,
    sourceId: alias.source_id,
    normalizedName: alias.normalized_name,
  }))
  const maydaiModels = (maydaiRows ?? []) as MaydaiModelRow[]
  const now = new Date().toISOString()
  const newLinks = planExactEcoLogitsLinks(
    ecoModels,
    maydaiModels,
    (linkRows ?? []) as ExistingLinkRow[],
    aliases,
  ).map((link) => ({ ...link, updated_at: now }))

  if (newLinks.length === 0) return 0
  const { error } = await supabase.from('ecologits_model_links').insert(newLinks)
  if (error) throw toExplicitError('EcoLogits Sync - createExactLinks', error)

  const linkedIds = newLinks.map((link) => link.ecologits_model_id)
  const { error: statusError } = await supabase
    .from('ecologits_models')
    .update({ link_status: 'matched', updated_at: now })
    .in('id', linkedIds)
    .neq('link_status', 'ignored')
  if (statusError) throw toExplicitError('EcoLogits Sync - createExactLinks', statusError)
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
        .select('id, provider, name, link_status')
      if (error) throw error
      const ecoRows = parseStoredEcoCatalog(data ?? [])
      modelsUpserted = ecoRows.length
      try {
        exactLinksCreated = await createExactLinks(supabase, ecoRows)
      } catch (error) {
        const explicitErr = toExplicitError('EcoLogits Sync - Rapprochement', error)
        errors.push(`Rapprochement: ${explicitErr.message}`)
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
