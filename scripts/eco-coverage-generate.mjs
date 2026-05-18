import { writeFile, mkdir } from 'node:fs/promises'
import { join } from 'node:path'

const OUT_DIR = join(process.cwd(), 'artifacts', 'ecologits')

const ECO_ENDPOINTS = {
  openai: 'https://api.ecologits.ai/v1beta/models/openai',
  anthropic: 'https://api.ecologits.ai/v1beta/models/anthropic',
  google_genai: 'https://api.ecologits.ai/v1beta/models/google_genai',
  mistralai: 'https://api.ecologits.ai/v1beta/models/mistralai',
}

const MAYDAY_TO_ECO_PROVIDER = {
  'OpenAI': 'openai',
  'Anthropic': 'anthropic',
  'Google': 'google_genai',
  'Mistral AI': 'mistralai',
}

function normalizeBaseName(modelName) {
  return String(modelName ?? '')
    .trim()
    .toLowerCase()
    .replace(/\./g, '-')
    .replace(/\s+/g, '') // suppression espaces
}

function extractParams(architecture) {
  const params = architecture?.parameters
  // params can be number OR {min,max} OR {total,active:{min,max}} etc.
  let total = null
  let activeMin = null
  let activeMax = null

  if (typeof params === 'number') {
    total = params
  } else if (params && typeof params === 'object') {
    if (typeof params.total === 'number') total = params.total
    if (typeof params.min === 'number') total = params.min
    if (typeof params.max === 'number') total = params.max

    const active = params.active
    if (active && typeof active === 'object') {
      if (typeof active.min === 'number') activeMin = active.min
      if (typeof active.max === 'number') activeMax = active.max
      if (typeof active === 'number') {
        activeMin = active
        activeMax = active
      }
    }
  }

  return { total, activeMin, activeMax }
}

function parseDatedSuffix(ecoModelName) {
  // Expect suffix like -YYYY-MM-DD or -YYYYMMDD; only handle -YYYY-MM-DD here.
  const m = String(ecoModelName).match(/-(\d{4})-(\d{2})-(\d{2})$/)
  if (!m) return null
  const iso = `${m[1]}-${m[2]}-${m[3]}`
  const ts = Date.parse(iso)
  if (Number.isNaN(ts)) return null
  return { iso, ts }
}

function applyProviderSpecificRewrite(ecoProvider, base) {
  if (!ecoProvider || !base) return base

  // Heuristiques ciblées pour aligner les slugs Mayday historiques
  // avec les noms EcoLogits réellement exposés.
  if (ecoProvider === 'mistralai') {
    // Mayday: mistral-7b-* → EcoLogits: open-mistral-7b
    if (/^mistral-7b/.test(base)) return 'open-mistral-7b'

    // Mayday: mistral-small-3-24b → EcoLogits: mistral-small-latest (ou versions datées)
    if (base === 'mistral-small-3-24b') return 'mistral-small'

    // Mayday: mistral-large-3-675b → EcoLogits: mistral-large-latest (ou versions datées)
    if (base === 'mistral-large-3-675b') return 'mistral-large'

    // Mayday: ministral-3 → EcoLogits expose ministral-3b-*
    if (base === 'ministral-3') return 'ministral-3b'

    // Mayday: magistral-small-2506 n'existe pas chez EcoLogits, mais magistral-small-* oui
    if (base === 'magistral-small-2506') return 'magistral-small'

    // Mayday: "Mistral Small 4" (normalisé) → famille mistral-small
    if (base === 'mistralsmall4') return 'mistral-small'
  }

  if (ecoProvider === 'openai') {
    // EcoLogits n'expose pas "o3" ; seule la famille o3-mini est listée.
    if (base === 'o3') return 'o3-mini'
  }

  return base
}

/**
 * resolveEcoLogitsName(provider, model_name)
 * Return:
 * - eco_provider
 * - eco_model_resolved
 * - eco_status: covered | covered_via_alias | covered_via_dated | not_covered | ambiguous
 */
export function resolveEcoLogitsName(maydayProvider, maydayModelName, ecoModelIndexByProvider) {
  const ecoProvider = MAYDAY_TO_ECO_PROVIDER[maydayProvider] ?? null
  if (!ecoProvider) {
    return { eco_provider: null, eco_model_resolved: null, eco_status: 'not_covered', reason: 'provider_not_supported' }
  }

  const rawBase = normalizeBaseName(maydayModelName)
  const base = applyProviderSpecificRewrite(ecoProvider, rawBase)
  if (!base) {
    return { eco_provider: ecoProvider, eco_model_resolved: null, eco_status: 'not_covered', reason: 'empty_model_name' }
  }

  // ecoModelIndexByProvider: Map(eco_provider -> Map(normalized_name -> { name, model } | { ambiguous: true, names: [] }))
  const ecoSet = ecoModelIndexByProvider.get(ecoProvider) ?? new Map()

  const exact = ecoSet.get(base)
  if (exact?.ambiguous) {
    return { eco_provider: ecoProvider, eco_model_resolved: null, eco_status: 'ambiguous', reason: 'normalized_collision', candidates: exact.names }
  }
  if (exact) {
    return { eco_provider: ecoProvider, eco_model_resolved: exact.name, eco_status: 'covered', reason: 'exact' }
  }

  const alias0 = `${base}-0`
  const a0 = ecoSet.get(alias0)
  if (a0?.ambiguous) {
    return { eco_provider: ecoProvider, eco_model_resolved: null, eco_status: 'ambiguous', reason: 'alias_-0_collision', candidates: a0.names }
  }
  if (a0) {
    return { eco_provider: ecoProvider, eco_model_resolved: a0.name, eco_status: 'covered_via_alias', reason: 'alias_-0' }
  }

  const aliasLatest = `${base}-latest`
  const al = ecoSet.get(aliasLatest)
  if (al?.ambiguous) {
    return { eco_provider: ecoProvider, eco_model_resolved: null, eco_status: 'ambiguous', reason: 'alias_-latest_collision', candidates: al.names }
  }
  if (al) {
    return { eco_provider: ecoProvider, eco_model_resolved: al.name, eco_status: 'covered_via_alias', reason: 'alias_-latest' }
  }

  // Rule date: pick latest dated version matching prefix `${base}-`
  const prefix = `${base}-`
  const candidates = []
  for (const entry of ecoSet.values()) {
    if (!entry || entry.ambiguous) continue
    const name = entry.name
    if (!name.startsWith(prefix)) continue
    // Guardrail: only accept dated mapping if the character after `${base}-` is a digit.
    // This avoids mapping base `o3` -> `o3-mini-YYYY-MM-DD`.
    const afterPrefix = name.slice(prefix.length, prefix.length + 1)
    if (afterPrefix && !/[0-9]/.test(afterPrefix)) continue
    candidates.push({ name, model: entry.model, dated: parseDatedSuffix(name) })
  }

  const dated = candidates.filter(c => c.dated)
  if (dated.length > 0) {
    dated.sort((a, b) => b.dated.ts - a.dated.ts)
    const best = dated[0]
    // detect ambiguity if multiple share same max timestamp
    const sameTop = dated.filter(d => d.dated.ts === best.dated.ts)
    if (sameTop.length > 1) {
      return { eco_provider: ecoProvider, eco_model_resolved: null, eco_status: 'ambiguous', reason: 'multiple_latest_dated', candidates: sameTop.map(s => s.name) }
    }
    return { eco_provider: ecoProvider, eco_model_resolved: best.name, eco_status: 'covered_via_dated', reason: 'latest_dated' }
  }

  // If multiple non-dated candidates, mark ambiguous (prefix matches but no dated suffix)
  if (candidates.length > 1) {
    return { eco_provider: ecoProvider, eco_model_resolved: null, eco_status: 'ambiguous', reason: 'prefix_multiple', candidates: candidates.map(c => c.name) }
  }

  return { eco_provider: ecoProvider, eco_model_resolved: null, eco_status: 'not_covered', reason: candidates.length === 1 ? 'prefix_single_but_not_dated' : 'no_match' }
}

function csvEscape(v) {
  if (v === null || v === undefined) return ''
  const s = String(v)
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

async function fetchJson(url) {
  const res = await fetch(url, { headers: { 'accept': 'application/json' } })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Fetch failed ${res.status} for ${url}: ${text.slice(0, 500)}`)
  }
  return await res.json()
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true })

  // 1) Fetch EcoLogits raw models lists
  const ecoRaw = {}
  for (const [provider, url] of Object.entries(ECO_ENDPOINTS)) {
    const data = await fetchJson(url)
    ecoRaw[provider] = data
    await writeFile(join(OUT_DIR, `ecologits-models-${provider}.json`), JSON.stringify(data, null, 2), 'utf8')
  }

  // Build index eco_provider -> Map(normalized_name -> { name, model } OR ambiguous bucket)
  const ecoIndex = new Map()
  for (const [ecoProvider, payload] of Object.entries(ecoRaw)) {
    const map = new Map()
    for (const m of payload?.models ?? []) {
      const name = String(m?.name ?? '').trim()
      if (!name) continue
      const norm = normalizeBaseName(name)
      if (!norm) continue

      const prev = map.get(norm)
      if (!prev) {
        map.set(norm, { name, model: m })
      } else if (prev.ambiguous) {
        prev.names.push(name)
      } else {
        map.set(norm, { ambiguous: true, names: [prev.name, name] })
      }
    }
    ecoIndex.set(ecoProvider, map)
  }

  // 2) Read Mayday models list from local JSON (generated separately via read-only SQL).
  // This avoids relying on env vars in the sandbox.
  const maydayModels = JSON.parse(
    await (await import('node:fs/promises')).readFile(join(OUT_DIR, 'mayday-models.json'), 'utf8')
  )

  // 3) Resolve coverage + write CSV
  const header = [
    'mayday_model_id',
    'mayday_provider',
    'mayday_model_name',
    'eco_provider',
    'eco_model_resolved',
    'eco_status',
    'eco_total_params',
    'eco_active_params_min',
    'eco_active_params_max',
    'eco_warnings',
  ]

  const rows = [header.join(',')]

  for (const m of maydayModels) {
    const maydayProvider = m.model_provider
    const maydayModelName = m.model_name
    const r = resolveEcoLogitsName(maydayProvider, maydayModelName, ecoIndex)

    const ecoProvider = r.eco_provider
    const ecoName = r.eco_model_resolved
    const ecoObj =
      ecoProvider && ecoName
        ? ecoIndex.get(ecoProvider)?.get(normalizeBaseName(ecoName))?.model ?? null
        : null

    const warnings = Array.isArray(ecoObj?.warnings)
      ? ecoObj.warnings.map(w => `${w.code}${w.message ? `:${w.message}` : ''}`).join('|')
      : ''

    const params = extractParams(ecoObj?.architecture)

    const out = [
      m.id,
      maydayProvider,
      maydayModelName,
      ecoProvider ?? '',
      ecoName ?? '',
      r.eco_status,
      params.total ?? '',
      params.activeMin ?? '',
      params.activeMax ?? '',
      warnings,
    ].map(csvEscape)

    rows.push(out.join(','))
  }

  const csvPath = join(process.cwd(), 'eco_coverage.csv')
  await writeFile(csvPath, rows.join('\n') + '\n', 'utf8')

  // Also write a machine-readable summary for the report
  const summary = {
    generated_at: new Date().toISOString(),
    totals: {
      mayday_models: maydayModels.length,
    },
  }
  await writeFile(join(OUT_DIR, 'eco-coverage-summary.json'), JSON.stringify(summary, null, 2), 'utf8')

  console.log(`Wrote ${csvPath}`)
  console.log(`Wrote raw EcoLogits payloads to ${OUT_DIR}`)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})

