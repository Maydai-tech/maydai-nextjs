import { NextResponse } from 'next/server'

const DEFAULT_ECOLOGITS_BASE = 'https://api.ecologits.ai'
const HTTP_TIMEOUT_MS = 30_000

const TEST_COUNTRY = 'WOR'
const TEST_CASES = [
  { provider: 'openai', model_name: 'gpt-3.5-turbo' },
  { provider: 'mistralai', model_name: 'Mistral-7B-v0.1' }
] as const

function describeSecret(value: string | undefined) {
  if (!value) return { present: false as const }
  const trimmed = value.trim()
  return {
    present: true as const,
    length: trimmed.length,
    suffix: trimmed.length > 4 ? `…${trimmed.slice(-4)}` : '(trop court pour masquer)'
  }
}

function describeOptionalUrl(value: string | undefined) {
  if (!value) return { present: false as const }
  let host: string | undefined
  try {
    host = new URL(value).host
  } catch {
    host = undefined
  }
  return { present: true as const, length: value.length, host }
}

function decodeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

function ecologitsAuthHeaders(): Record<string, string> {
  const key = process.env.ECOLOGITS_API_KEY?.trim()
  if (!key) return {}
  return { Authorization: `Bearer ${key}` }
}

function resolvedEcologitsBaseUrl(): string {
  const raw = (process.env.ECOLOGITS_BASE_URL || process.env.ECOLOGITS_URL || DEFAULT_ECOLOGITS_BASE).trim()
  return raw.replace(/\/$/, '')
}

interface CatalogEntry {
  name: string
  deployment: { tps: number; ttft: number }
}

interface CatalogBody {
  models?: CatalogEntry[]
}

async function fetchWithTimeout(url: string, init: RequestInit = {}): Promise<Response> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), HTTP_TIMEOUT_MS)
  try {
    return await fetch(url, { ...init, signal: ctrl.signal })
  } finally {
    clearTimeout(timer)
  }
}

async function readResponsePayload(res: Response): Promise<unknown> {
  const text = await res.text()
  if (!text) return null
  try {
    return JSON.parse(text) as unknown
  } catch {
    return text
  }
}

function computeRequestLatencySeconds(outputTokens: number, deployment: { tps: number; ttft: number }): number {
  if (!Number.isFinite(deployment.tps) || deployment.tps <= 0) {
    throw new Error(`Invalid deployment.tps=${deployment.tps}`)
  }
  if (!Number.isFinite(deployment.ttft) || deployment.ttft < 0) {
    throw new Error(`Invalid deployment.ttft=${deployment.ttft}`)
  }
  return deployment.ttft + outputTokens / deployment.tps
}

export async function GET() {
  const env = {
    ECOLOGITS_API_KEY: describeSecret(process.env.ECOLOGITS_API_KEY),
    ECOLOGITS_BASE_URL: describeOptionalUrl(process.env.ECOLOGITS_BASE_URL),
    ECOLOGITS_URL: describeOptionalUrl(process.env.ECOLOGITS_URL)
  }

  const baseUrl = resolvedEcologitsBaseUrl()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...ecologitsAuthHeaders()
  }

  try {
    let lastAttempt: {
      provider: string
      model_name: string
      catalog: { url: string; status: number; ok: boolean; raw: unknown }
      estimation?: { url: string; status: number; ok: boolean; raw: unknown }
      error?: string
    } | null = null

    for (const { provider, model_name } of TEST_CASES) {
      const catalogUrl = `${baseUrl}/v1beta/models/${provider}`
      let catalogRes: Response
      try {
        catalogRes = await fetchWithTimeout(catalogUrl, { headers: { ...headers } })
      } catch (err) {
        lastAttempt = {
          provider,
          model_name,
          catalog: { url: catalogUrl, status: 0, ok: false, raw: decodeError(err) }
        }
        continue
      }

      const catalogRaw = await readResponsePayload(catalogRes)
      const catalogBlock = { url: catalogUrl, status: catalogRes.status, ok: catalogRes.ok, raw: catalogRaw }

      if (!catalogRes.ok) {
        lastAttempt = { provider, model_name, catalog: catalogBlock, error: `Catalog HTTP ${catalogRes.status}` }
        continue
      }

      const models = (catalogRaw as CatalogBody)?.models ?? []
      const entry = models.find((m) => m.name === model_name)
      if (!entry) {
        lastAttempt = {
          provider,
          model_name,
          catalog: catalogBlock,
          error: `Model not in catalog: ${provider}/${model_name}`
        }
        continue
      }

      const requestLatency = computeRequestLatencySeconds(800, entry.deployment)
      const estimationUrl = `${baseUrl}/v1beta/estimations`
      const body = JSON.stringify({
        provider,
        model_name,
        input_token_count: 200,
        output_token_count: 800,
        request_latency: requestLatency,
        country: TEST_COUNTRY
      })

      let estRes: Response
      try {
        estRes = await fetchWithTimeout(estimationUrl, { method: 'POST', headers, body })
      } catch (err) {
        return NextResponse.json({
          ok: false,
          env,
          ecologits: {
            resolvedBaseUrl: baseUrl,
            test: { provider, model_name, country: TEST_COUNTRY, request_latency: requestLatency },
            catalog: catalogBlock,
            estimation: { url: estimationUrl, status: 0, ok: false, raw: decodeError(err) }
          }
        })
      }

      const estRaw = await readResponsePayload(estRes)

      return NextResponse.json({
        ok: estRes.ok,
        env,
        ecologits: {
          resolvedBaseUrl: baseUrl,
          test: { provider, model_name, country: TEST_COUNTRY, request_latency: requestLatency },
          catalog: catalogBlock,
          estimation: { url: estimationUrl, status: estRes.status, ok: estRes.ok, raw: estRaw }
        }
      })
    }

    return NextResponse.json({
      ok: false,
      env,
      ecologits: {
        resolvedBaseUrl: baseUrl,
        message: 'Aucun des modèles de test na pu être estimé (catalogue ou modèle manquant).',
        lastAttempt
      }
    })
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        env,
        ecologits: {
          resolvedBaseUrl: baseUrl,
          error: decodeError(error)
        }
      },
      { status: 500 }
    )
  }
}
