// supabase/functions/eco-sync/index.ts
import { serve } from "https://deno.land/std@0.224.0/http/server.ts"
import { createClient, SupabaseClient } from "npm:@supabase/supabase-js@2"

const ECOLOGITS_BASE = "https://api.ecologits.ai"
const ECOLOGITS_PROVIDERS = ["openai", "anthropic", "google_genai", "mistralai"] as const
const DEFAULT_INPUT_TOKENS = 200
const DEFAULT_OUTPUT_TOKENS = 800
const DEFAULT_RUNS = 5
const HTTP_RETRY_DELAYS_MS = [1000, 2000, 4000]
const HTTP_TIMEOUT_MS = 30_000

type EcoProvider = (typeof ECOLOGITS_PROVIDERS)[number]

interface EcoCatalogEntry {
  provider: EcoProvider
  name: string
  architecture: unknown
  warnings: { code: string; message: string }[]
  deployment: { tps: number; ttft: number }
}

interface EcoEstimationRequest {
  provider: EcoProvider
  model_name: string
  input_token_count: number
  output_token_count: number
  request_latency: number
  country: string
}

interface EcoImpactsBlock {
  energy?: { value: { min: number; max: number } }
  gwp?: { value: { min: number; max: number } }
  adpe?: { value: { min: number; max: number } }
  pe?: { value: { min: number; max: number } }
  wcf?: { value: { min: number; max: number } }
}

interface EcoEstimationResponse {
  impacts: EcoImpactsBlock & {
    usage?: EcoImpactsBlock
    embodied?: EcoImpactsBlock
    warnings?: { code: string; message: string }[]
  }
}

interface MaydayModelRow {
  id: string
  model_name: string
  eco_provider: EcoProvider
  eco_model: string
  eco_status: string
}

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
  throw lastErr ?? new Error("fetchWithRetry: exhausted retries")
}

async function fetchEcoCatalog(provider: EcoProvider): Promise<EcoCatalogEntry[]> {
  const res = await fetchWithRetry(`${ECOLOGITS_BASE}/v1beta/models/${provider}`)
  if (!res.ok) throw new Error(`EcoLogits catalog ${provider}: HTTP ${res.status}`)
  const json = (await res.json()) as { models: EcoCatalogEntry[] }
  return json.models
}

async function postEstimation(payload: EcoEstimationRequest): Promise<EcoEstimationResponse> {
  const res = await fetchWithRetry(`${ECOLOGITS_BASE}/v1beta/estimations`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw new Error(`EcoLogits estimation HTTP ${res.status}`)
  return (await res.json()) as EcoEstimationResponse
}

function computeRequestLatency(outputTokenCount: number, deployment: { tps: number; ttft: number }): number {
  if (deployment.tps <= 0) throw new Error(`Invalid TPS=${deployment.tps}`)
  return deployment.ttft + outputTokenCount / deployment.tps
}

const KPIS = ["energy", "gwp", "adpe", "pe", "wcf"] as const
const SPLITS = ["usage", "embodied", "total"] as const

function midpoint(min: number, max: number): number {
  return (min + max) / 2
}

function flattenImpacts(resp: EcoEstimationResponse): Record<string, number | null> {
  const impacts = resp.impacts
  const blockBySplit: Record<string, EcoImpactsBlock | undefined> = {
    usage: impacts.usage,
    embodied: impacts.embodied,
    total: { energy: impacts.energy, gwp: impacts.gwp, adpe: impacts.adpe, pe: impacts.pe, wcf: impacts.wcf },
  }

  const out: Record<string, number | null> = {}
  for (const kpi of KPIS) {
    for (const split of SPLITS) {
      const k = blockBySplit[split]?.[kpi as keyof EcoImpactsBlock]
      const prefix = `${kpi}_${split}`
      if (k) {
        out[`${prefix}_min`] = k.value.min
        out[`${prefix}_value`] = midpoint(k.value.min, k.value.max)
        out[`${prefix}_max`] = k.value.max
      } else {
        out[`${prefix}_min`] = out[`${prefix}_value`] = out[`${prefix}_max`] = null
      }
    }
  }
  return out
}

async function upsertMethodologyVersion(supabase: SupabaseClient): Promise<{ id: string }> {
  const today = new Date().toISOString().slice(0, 10)
  const { data, error } = await supabase
    .from("eco_methodology_versions")
    .upsert(
      { ecologits_version: `ecologits-api-snapshot-${today}`, methodology_date: today },
      { onConflict: "ecologits_version,methodology_date" }
    )
    .select("id")
    .single()
  if (error) throw error
  return data
}

serve(async (req) => {
  const body = await req.json().catch(() => ({}))
  const region = body.region ?? "WOR"
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!)

  const methodologyVersion = await upsertMethodologyVersion(supabase)

  const { data: models, error: modelsErr } = await supabase
    .from("compl_ai_models")
    .select("id, model_name, eco_provider, eco_model, eco_status")
    .in("eco_status", ["covered", "covered_via_alias", "covered_via_dated"])

  if (modelsErr) throw modelsErr

  // Simplification pour l'insertion de test
  const results = []
  for (const m of models as MaydayModelRow[]) {
    results.push(m.id)
  }

  return new Response(JSON.stringify({ ok: true, methodologyVersion, modelsProcessed: results.length }), {
    headers: { "Content-Type": "application/json" },
  })
})

