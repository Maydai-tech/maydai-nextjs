import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'

import type { Database } from '@/types/supabase'

const ECOLOGITS_BASE_URL = 'https://api.ecologits.ai'
const HTTP_TIMEOUT_MS = 30_000
const HTTP_RETRY_DELAYS_MS = [1000, 2000, 4000]

const DEFAULT_INPUT_TOKENS = 200
const DEFAULT_OUTPUT_TOKENS = 800

const ALLOWED_ECO_STATUS = ['covered', 'covered_via_alias', 'covered_via_dated'] as const
type EcoStatus = (typeof ALLOWED_ECO_STATUS)[number]

const KPIS = ['energy', 'gwp', 'adpe', 'pe', 'wcf'] as const
type Kpi = (typeof KPIS)[number]

const SPLITS = ['usage', 'embodied', 'total'] as const
type Split = (typeof SPLITS)[number]

type EcoProvider = 'openai' | 'anthropic' | 'google_genai' | 'mistralai' | string

// -----------------------------
// Zod (brief §3 + contrainte #1)
// -----------------------------

const IngestPayloadSchema = z
  .object({
    region: z.string().min(1),
    runsPerModel: z.number().int().positive(),
    dryRun: z.boolean().optional()
  })
  .strict()

type IngestPayload = z.infer<typeof IngestPayloadSchema>

// -----------------------------
// EcoLogits API typing (contrainte #2)
// -----------------------------

interface EcoCatalogEntry {
  provider: EcoProvider
  name: string
  architecture: unknown
  warnings: { code: string; message: string }[]
  deployment: { tps: number; ttft: number }
}

interface EcoModelsResponse {
  models: EcoCatalogEntry[]
}

interface EcoEstimationRequest {
  provider: EcoProvider
  model_name: string
  input_token_count: number
  output_token_count: number
  request_latency: number
  country: string
}

interface EcoImpactValue {
  value: { min: number; max: number }
}

interface EcoImpactsBlock {
  energy?: EcoImpactValue
  gwp?: EcoImpactValue
  adpe?: EcoImpactValue
  pe?: EcoImpactValue
  wcf?: EcoImpactValue
}

interface EcoEstimationResponse {
  impacts: EcoImpactsBlock & {
    usage?: EcoImpactsBlock
    embodied?: EcoImpactsBlock
    warnings?: { code: string; message: string }[]
  }
}

// -----------------------------
// Stats helpers
// -----------------------------

function midpoint(min: number, max: number): number {
  return (min + max) / 2
}

function mean(xs: number[]): number {
  return xs.reduce((a, b) => a + b, 0) / xs.length
}

function median(xs: number[]): number {
  const sorted = [...xs].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  if (sorted.length % 2 === 1) return sorted[mid]!
  return (sorted[mid - 1]! + sorted[mid]!) / 2
}

function stdPopulation(xs: number[]): number {
  const m = mean(xs)
  const v = mean(xs.map((x) => (x - m) ** 2))
  return Math.sqrt(v)
}

function statsOrNull(xs: Array<number | null | undefined>): {
  mean: number | null
  median: number | null
  std: number | null
  min: number | null
  max: number | null
  count: number
} {
  const values = xs.filter((x): x is number => typeof x === 'number' && Number.isFinite(x))
  if (values.length === 0) return { mean: null, median: null, std: null, min: null, max: null, count: 0 }
  return {
    mean: mean(values),
    median: median(values),
    std: values.length === 1 ? 0 : stdPopulation(values),
    min: Math.min(...values),
    max: Math.max(...values),
    count: values.length
  }
}

// -----------------------------
// HTTP helpers
// -----------------------------

async function fetchWithRetry(url: string, init: RequestInit = {}): Promise<Response> {
  let lastErr: unknown
  for (let attempt = 0; attempt <= HTTP_RETRY_DELAYS_MS.length; attempt++) {
    try {
      const ctrl = new AbortController()
      const timer = setTimeout(() => ctrl.abort(), HTTP_TIMEOUT_MS)
      const res = await fetch(url, { ...init, signal: ctrl.signal })
      clearTimeout(timer)

      if (res.ok) return res
      if (res.status < 500 && res.status !== 408 && res.status !== 429) return res
      lastErr = new Error(`HTTP ${res.status} ${res.statusText}`)
    } catch (err) {
      lastErr = err
    }
    const delay = HTTP_RETRY_DELAYS_MS[attempt]
    if (delay !== undefined) await new Promise((r) => setTimeout(r, delay))
  }
  throw lastErr ?? new Error('fetchWithRetry: exhausted retries')
}

async function fetchEcoCatalog(provider: EcoProvider): Promise<EcoCatalogEntry[]> {
  const res = await fetchWithRetry(`${ECOLOGITS_BASE_URL}/v1beta/models/${provider}`)
  if (!res.ok) throw new Error(`EcoLogits catalog ${provider}: HTTP ${res.status}`)
  const json = (await res.json()) as EcoModelsResponse
  return json.models
}

async function postEstimation(payload: EcoEstimationRequest): Promise<EcoEstimationResponse> {
  const res = await fetchWithRetry(`${ECOLOGITS_BASE_URL}/v1beta/estimations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
  if (!res.ok) throw new Error(`EcoLogits estimation: HTTP ${res.status}`)
  return (await res.json()) as EcoEstimationResponse
}

function computeRequestLatencySeconds(outputTokens: number, deployment: { tps: number; ttft: number }): number {
  if (!Number.isFinite(deployment.tps) || deployment.tps <= 0) throw new Error(`Invalid deployment.tps=${deployment.tps}`)
  if (!Number.isFinite(deployment.ttft) || deployment.ttft < 0) throw new Error(`Invalid deployment.ttft=${deployment.ttft}`)
  // brief §5.1: request_latency = ttft + (output_tokens / tps)
  return deployment.ttft + outputTokens / deployment.tps
}

function extractMidpointValues(resp: EcoEstimationResponse): Record<`${Kpi}_${Split}`, number | null> {
  const impacts = resp.impacts
  const total: EcoImpactsBlock = { energy: impacts.energy, gwp: impacts.gwp, adpe: impacts.adpe, pe: impacts.pe, wcf: impacts.wcf }

  const bySplit: Record<Split, EcoImpactsBlock | undefined> = {
    usage: impacts.usage,
    embodied: impacts.embodied,
    total
  }

  const out = {} as Record<`${Kpi}_${Split}`, number | null>
  for (const kpi of KPIS) {
    for (const split of SPLITS) {
      const impact = bySplit[split]?.[kpi]
      const key = `${kpi}_${split}` as const
      out[key] = impact ? midpoint(impact.value.min, impact.value.max) : null
    }
  }
  return out
}

// -----------------------------
// DB helpers
// -----------------------------

// NOTE: nos types `Database` sont "manuels" et ne définissent pas `Relationships`,
// ce qui casse l'inférence type-safe de supabase-js (tables inférées en `never` en build Vercel).
// Ici on garde `Database` uniquement pour typer nos objets (Insert/Row),
// et on laisse le client Supabase non-générique.
type Supabase = ReturnType<typeof createClient>
type MethodologyVersionIdRow = Pick<Database['public']['Tables']['eco_methodology_versions']['Row'], 'id'>

async function getCurrentMethodologyVersionId(supabase: Supabase): Promise<string> {
  const { data, error } = (await supabase
    .from('eco_methodology_versions')
    .select('id')
    .order('captured_at', { ascending: false })
    .limit(1)
    .maybeSingle()) as { data: MethodologyVersionIdRow | null; error: Error | null }

  if (error) throw error
  if (data?.id) return data.id

  const today = new Date().toISOString().slice(0, 10)
  const { data: created, error: upsertErr } = (await supabase
    .from('eco_methodology_versions')
    .upsert({ ecologits_version: `ecologits-api-snapshot-${today}`, methodology_date: today }, { onConflict: 'ecologits_version,methodology_date' })
    .select('id')
    .single()) as { data: MethodologyVersionIdRow; error: Error | null }

  if (upsertErr) throw upsertErr
  return created.id
}

type CoveredModel = Pick<
  Database['public']['Tables']['compl_ai_models']['Row'],
  'id' | 'model_name' | 'eco_provider' | 'eco_model' | 'eco_status'
>

async function getCoveredModels(supabase: Supabase): Promise<CoveredModel[]> {
  const { data, error } = await supabase
    .from('compl_ai_models')
    .select('id, model_name, eco_provider, eco_model, eco_status')
    .in('eco_status', [...ALLOWED_ECO_STATUS] as unknown as EcoStatus[])

  if (error) throw error
  const rows = (data ?? []) as CoveredModel[]
  return rows.filter((m) => !!m.eco_provider && !!m.eco_model)
}

type EcoAggInsert = Database['public']['Tables']['eco_evaluations_aggregated']['Insert']

export async function OPTIONS() {
  return new Response('ok', {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
    }
  })
}

export async function POST(request: NextRequest) {
  const startedAt = Date.now()
  let payload: IngestPayload

  try {
    const raw = await request.json().catch(() => ({}))
    payload = IngestPayloadSchema.parse(raw)
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: 'Invalid payload', details: e instanceof Error ? e.message : String(e) },
      { status: 400 }
    )
  }

  const regionCode = payload.region
  const runsPerModel = payload.runsPerModel
  const dryRun = payload.dryRun === true

  const supabaseUrl = process.env.SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ ok: false, error: 'Missing env vars SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY' }, { status: 500 })
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey)

  try {
    const methodologyVersionId = await getCurrentMethodologyVersionId(supabase)
    const models = await getCoveredModels(supabase)

    const providerCatalogCache = new Map<string, Map<string, EcoCatalogEntry>>()
    async function getCatalogByProvider(provider: EcoProvider): Promise<Map<string, EcoCatalogEntry>> {
      const key = String(provider)
      const cached = providerCatalogCache.get(key)
      if (cached) return cached
      const models = await fetchEcoCatalog(provider)
      const byName = new Map<string, EcoCatalogEntry>()
      for (const m of models) byName.set(m.name, m)
      providerCatalogCache.set(key, byName)
      return byName
    }

    const upserted: Array<{ modelId: string; ecoProvider: string; ecoModel: string }> = []
    const skipped: Array<{ modelId: string; reason: string }> = []
    const errors: Array<{ modelId: string; error: string }> = []

    for (const model of models) {
      const ecoProvider = model.eco_provider!
      const ecoModelName = model.eco_model!

      let catalogEntry: EcoCatalogEntry | undefined
      try {
        const byName = await getCatalogByProvider(ecoProvider)
        catalogEntry = byName.get(ecoModelName)
      } catch (e) {
        errors.push({ modelId: model.id, error: `catalog: ${e instanceof Error ? e.message : String(e)}` })
        continue
      }

      if (!catalogEntry) {
        skipped.push({ modelId: model.id, reason: `Model not found in provider catalog: ${ecoProvider}/${ecoModelName}` })
        continue
      }

      const requestLatency = computeRequestLatencySeconds(DEFAULT_OUTPUT_TOKENS, catalogEntry.deployment)

      const perKeyValues: Record<`${Kpi}_${Split}`, Array<number | null>> = {} as any
      for (const kpi of KPIS) for (const split of SPLITS) perKeyValues[`${kpi}_${split}` as const] = []

      let runsWithWarnings = 0
      for (let run = 1; run <= runsPerModel; run++) {
        const reqPayload: EcoEstimationRequest = {
          provider: ecoProvider,
          model_name: ecoModelName,
          input_token_count: DEFAULT_INPUT_TOKENS,
          output_token_count: DEFAULT_OUTPUT_TOKENS,
          request_latency: requestLatency,
          country: regionCode
        }

        let resp: EcoEstimationResponse
        try {
          resp = await postEstimation(reqPayload)
        } catch (e) {
          errors.push({ modelId: model.id, error: `estimation run#${run}: ${e instanceof Error ? e.message : String(e)}` })
          continue
        }

        const warns = resp.impacts.warnings ?? []
        if (warns.length > 0) runsWithWarnings++

        const mids = extractMidpointValues(resp)
        for (const kpi of KPIS) {
          for (const split of SPLITS) {
            const key = `${kpi}_${split}` as const
            perKeyValues[key].push(mids[key])
          }
        }
      }

      const aggregated: EcoAggInsert = {
        model_id: model.id,
        region_code: regionCode,
        methodology_version_id: methodologyVersionId,
        mode: 'simulated'
      }

      for (const kpi of KPIS) {
        for (const split of SPLITS) {
          const key = `${kpi}_${split}` as const
          const s = statsOrNull(perKeyValues[key])
          ;(aggregated as any)[`${kpi}_${split}_mean`] = s.mean
          ;(aggregated as any)[`${kpi}_${split}_median`] = s.median
          ;(aggregated as any)[`${kpi}_${split}_std`] = s.std
          ;(aggregated as any)[`${kpi}_${split}_min`] = s.min
          ;(aggregated as any)[`${kpi}_${split}_max`] = s.max
        }
      }

      if (dryRun) {
        console.log(
          JSON.stringify(
            {
              dryRun: true,
              model: {
                id: model.id,
                model_name: model.model_name,
                eco_provider: ecoProvider,
                eco_model: ecoModelName,
                eco_status: model.eco_status
              },
              methodology_version_id: methodologyVersionId,
              region_code: regionCode,
              runsPerModel,
              request_latency: requestLatency,
              runsWithWarnings,
              aggregated
            },
            null,
            2
          )
        )
        upserted.push({ modelId: model.id, ecoProvider: String(ecoProvider), ecoModel: String(ecoModelName) })
        continue
      }

      const { error: upsertErr } = await supabase
        .from('eco_evaluations_aggregated')
        .upsert(aggregated, { onConflict: 'model_id,region_code,methodology_version_id,mode' })

      if (upsertErr) {
        errors.push({ modelId: model.id, error: `upsert: ${upsertErr.message}` })
        continue
      }

      upserted.push({ modelId: model.id, ecoProvider: String(ecoProvider), ecoModel: String(ecoModelName) })
    }

    const elapsedMs = Date.now() - startedAt
    return NextResponse.json({
      ok: true,
      dryRun,
      region: regionCode,
      runsPerModel,
      methodologyVersionId,
      modelsTotal: models.length,
      upsertedCount: upserted.length,
      skippedCount: skipped.length,
      errorCount: errors.length,
      skipped,
      errors,
      elapsedMs
    })
  } catch (e) {
    const elapsedMs = Date.now() - startedAt
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : String(e), elapsedMs }, { status: 500 })
  }
}

