/**
 * Contrôle en lecture seule du verrou d'identité LLM Stats et des liens EcoLogits.
 * Aucune écriture : un client distant est traité comme la production et toute
 * mutation est refusée avant d'atteindre le réseau.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'node:path'

import { llmStatsDatabaseInsert, llmStatsDatabaseUpdate, type LlmStatsModelRecord } from '@/lib/bench-llm/llm-stats-sync'
import { toExplicitError } from '@/lib/errors/postgrest-error'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local'), quiet: true })

const IDENTITY_KEYS = [
  'model_name',
  'model_provider',
  'model_provider_id',
  'slug',
  'model_type',
  'license',
] as const

const TARGET_SLUGS = [
  'gemini-1-5-flash',
  'gemini-2-5-flash',
  'gemini-3-pro',
  'mistral-large-3',
  'mistral-medium-3-5',
  'llama-3-1-8b-instruct',
  'llama-3-1-70b-instruct',
  'llama-3-1-405b-instruct',
] as const

const QWEN4_MAX_ID = 'e948dec0-e65f-44ca-ba71-2960fc3640b5'
const GEMINI_4_CARBON_ID = '55e15c11-d802-4c4c-afd4-7db907c6837d'
const MISTRAL_MEDIUM_35_ID = '354120aa-a79e-4b6c-a501-c2e20226f327'
const MISTRAL_MEDIUM_3_ECO_ID = '1c5a0c39-0a4a-41c1-9f54-8ac0c8f61cdf'

const BLOCKED_ECO_NAMES = [
  'gemini-3.1-flash-image-preview',
  'gemini-flash-latest',
  'gemini-flash-lite-latest',
] as const

const REPLACEMENT_EXPECTATIONS = [
  { slug: 'claude-sonnet-4-5', replacementId: '6eeb1f37-15f6-45d4-93c5-9ecee05a81ba' },
  { slug: 'gemini-2-5-flash', replacementId: '58702394-db65-4954-8dcd-aa37ce2e60e3' },
  { slug: 'gpt-5', replacementId: '72cf24a4-9228-4a1e-adca-87c1bff575e4' },
  { slug: 'mistral-tiny', replacementId: '80a712c2-dead-4647-ac8c-59604cecef9c' },
  { slug: 'grok-4-1-fast-non-reasoning', replacementId: '56adadb8-a67a-4341-b153-84cf3b8dede3' },
  { slug: 'grok-4-1-fast-reasoning', replacementId: '56adadb8-a67a-4341-b153-84cf3b8dede3' },
  { slug: 'gpt-5-3', replacementId: '47f7cb3d-898f-4809-bbab-8057da7fb1b6' },
] as const

const COMPARIA_SOURCE_IDS = ['hermes-4-70b', 'lfm2-24b-a2b', 'lfm2-8b-a1b', 'qwen-3-8b'] as const
const DETACHED_MAYDAI_SLUGS = ['hermes-3-70b', 'lfm2-5-vl-3b', 'lfm2-5-2-6b', 'qwen3-14b'] as const

const RECONCILIATION_SLUGS = [
  'qwen4-max-preview',
  'aion-1-0-instruct',
  'gemini-4-neon',
  ...REPLACEMENT_EXPECTATIONS.map((item) => item.slug),
  ...DETACHED_MAYDAI_SLUGS,
] as const

type CheckResult = { ok: boolean; line: string }

function strictDbRequested(): boolean {
  return process.argv.includes('--strict-db')
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function rowsOf(data: unknown, label: string): Record<string, unknown>[] {
  if (data == null) return []
  if (!Array.isArray(data)) throw new Error(`${label} illisible`)
  return data.map((row, index) => {
    if (!isRecord(row)) throw new Error(`${label} ligne ${index + 1} illisible`)
    return row
  })
}

function optionalString(record: Record<string, unknown>, key: string): string | null {
  const value = record[key]
  if (value == null) return null
  if (typeof value !== 'string') throw new Error(`${key} illisible`)
  return value
}

function mark(ok: boolean, detail: string): CheckResult {
  return { ok, line: `${ok ? '[OK]' : '[PENDING_MIGRATION]'} ${detail}` }
}

function showValue(value: string | null): string {
  return value ?? 'NULL'
}

function isBlockedEcoName(value: string | null): boolean {
  return value === 'gemini-3.1-flash-image-preview'
    || value === 'gemini-flash-latest'
    || value === 'gemini-flash-lite-latest'
}

function supabaseUrl(): string {
  return (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim()
}

function isProductionUrl(url: string): boolean {
  if (!url) return false
  let host = url
  try {
    host = new URL(url).hostname
  } catch {
    return true
  }
  return host !== 'localhost' && host !== '127.0.0.1'
}

function assertWritesBlocked(production: boolean, operation: string): never {
  const scope = production ? 'URL distante traitée comme la production' : 'script en lecture seule'
  throw new Error(`Kill-switch: ${operation} interdit (${scope})`)
}

function readOnlyClient(url: string, key: string, production: boolean): SupabaseClient {
  const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
  return new Proxy(client, {
    get(target, prop, receiver) {
      if (prop === 'from' || prop === 'rpc') {
        return (...args: unknown[]) => {
          const builder = (target as unknown as Record<string, (...params: unknown[]) => object>)[String(prop)](...args)
          return new Proxy(builder, {
            get(inner, method, innerReceiver) {
              if (method === 'insert' || method === 'update' || method === 'delete' || method === 'upsert') {
                return () => assertWritesBlocked(production, String(method))
              }
              const value = Reflect.get(inner, method, innerReceiver)
              return typeof value === 'function' ? value.bind(inner) : value
            },
          })
        }
      }
      const value = Reflect.get(target, prop, receiver)
      return typeof value === 'function' ? value.bind(target) : value
    },
  }) as SupabaseClient
}

function sampleRecord(): LlmStatsModelRecord {
  return {
    llm_stats_id: 'gpt-4o',
    model_name: 'GPT-4o',
    model_provider: 'OpenAI',
    model_provider_id: 1,
    model_type: 'large-language-model',
    license: 'Proprietary',
    context_length: 128000,
    release_date: '2024-05-13',
    knowledge_cutoff: null,
    input_cost_per_million: 5,
    output_cost_per_million: 15,
    model_size: null,
    gpqa_score: null,
    aime_2025_score: null,
    llm_leader_rank: 1,
    updated_at: new Date().toISOString(),
  }
}

function assert(condition: unknown, message: string): void {
  if (!condition) throw new Error(`Assertion échouée: ${message}`)
}

function checkPayloads(): void {
  const record = { ...sampleRecord(), slug: 'gpt-4o' }
  const update = llmStatsDatabaseUpdate(record)
  const insert = llmStatsDatabaseInsert(record)
  for (const key of IDENTITY_KEYS) {
    assert(!(key in update), `llmStatsDatabaseUpdate expose encore ${key}`)
  }
  for (const key of ['model_name', 'model_provider', 'model_provider_id', 'model_type', 'license', 'slug'] as const) {
    assert(key in insert, `llmStatsDatabaseInsert ne conserve pas ${key}`)
  }
  assert(insert.model_name === 'GPT-4o', 'insert.model_name')
  assert(insert.model_provider === 'OpenAI', 'insert.model_provider')
  assert(insert.slug === 'gpt-4o', 'insert.slug')
  console.log('a) llmStatsDatabaseUpdate masque l’identité ; llmStatsDatabaseInsert la conserve.')
  console.log('   update keys:', Object.keys(update).sort().join(', '))
}

function checkExplicitError(): void {
  const error = toExplicitError('LLM Stats Sync', {
    code: '23505',
    message: 'duplicate key value violates unique constraint "compl_ai_models_provider_name_key"',
    details: 'Key already exists',
  })
  assert(error instanceof Error, 'toExplicitError doit renvoyer une Error')
  assert(error.message.includes('23505'), error.message)
  assert(error.message.includes('duplicate key'), error.message)
  assert(!error.message.includes('[object Object]'), error.message)
  console.log('b) toExplicitError:', error.message)
}

async function selectAllRows(
  supabase: SupabaseClient,
  table: 'ecologits_models' | 'ecologits_model_links',
  columns: string,
): Promise<Record<string, unknown>[]> {
  const rows: Record<string, unknown>[] = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase.from(table).select(columns).range(from, from + 999)
    if (error) throw toExplicitError('debug:llm-sync-check', error)
    const page = rowsOf(data, table)
    rows.push(...page)
    if (page.length < 1000) break
  }
  return rows
}

function ficheBySlug(rows: Record<string, unknown>[]): Map<string, Record<string, unknown>> {
  const bySlug = new Map<string, Record<string, unknown>>()
  for (const row of rows) {
    const slug = optionalString(row, 'slug')
    if (slug && !bySlug.has(slug)) bySlug.set(slug, row)
  }
  return bySlug
}

function checkBloc1(bySlug: Map<string, Record<string, unknown>>): CheckResult[] {
  const checks: CheckResult[] = []
  const preview = bySlug.get('qwen4-max-preview')
  checks.push(preview
    ? mark(
      optionalString(preview, 'lifecycle_status') === 'retired'
        && optionalString(preview, 'role') === 'stade'
        && optionalString(preview, 'replacement_model_id') === QWEN4_MAX_ID,
      `qwen4-max-preview lifecycle_status=${showValue(optionalString(preview, 'lifecycle_status'))}, role=${showValue(optionalString(preview, 'role'))}, replacement_model_id=${showValue(optionalString(preview, 'replacement_model_id'))}`,
    )
    : mark(false, 'qwen4-max-preview absente'))

  const aion = bySlug.get('aion-1-0-instruct')
  checks.push(aion
    ? mark(
      optionalString(aion, 'lifecycle_status') === 'active'
        && optionalString(aion, 'role') === 'base'
        && optionalString(aion, 'license_id') === 'mit',
      `aion-1-0-instruct lifecycle_status=${showValue(optionalString(aion, 'lifecycle_status'))}, role=${showValue(optionalString(aion, 'role'))}, license_id=${showValue(optionalString(aion, 'license_id'))}`,
    )
    : mark(false, 'aion-1-0-instruct absente'))

  const neon = bySlug.get('gemini-4-neon')
  checks.push(neon
    ? mark(
      optionalString(neon, 'lifecycle_status') === 'active'
        && optionalString(neon, 'role') === 'version'
        && optionalString(neon, 'base_model_id') === GEMINI_4_CARBON_ID,
      `gemini-4-neon lifecycle_status=${showValue(optionalString(neon, 'lifecycle_status'))}, role=${showValue(optionalString(neon, 'role'))}, base_model_id=${showValue(optionalString(neon, 'base_model_id'))}`,
    )
    : mark(false, 'gemini-4-neon absente'))

  for (const expected of REPLACEMENT_EXPECTATIONS) {
    const row = bySlug.get(expected.slug)
    const replacementId = row ? optionalString(row, 'replacement_model_id') : null
    checks.push(row
      ? mark(
        replacementId === expected.replacementId,
        `${expected.slug} replacement_model_id=${showValue(replacementId)}`,
      )
      : mark(false, `${expected.slug} absente`))
  }
  return checks
}

async function checkBloc2(supabase: SupabaseClient, geminiFlashId: string | null): Promise<CheckResult[]> {
  const checks: CheckResult[] = []
  const { data: ecoRows, error: ecoError } = await supabase
    .from('ecologits_models')
    .select('id, name, link_status')
    .in('name', [...BLOCKED_ECO_NAMES])
  if (ecoError) throw toExplicitError('debug:llm-sync-check', ecoError)
  const ecoModels = rowsOf(ecoRows, 'ecologits_models')
  const ecoByName = new Map(ecoModels.map((row) => [optionalString(row, 'name'), row]))
  const ecoIds = ecoModels.map((row) => optionalString(row, 'id')).filter((id): id is string => id != null)

  let links: Record<string, unknown>[] = []
  if (ecoIds.length > 0) {
    const { data: linkRows, error: linkError } = await supabase
      .from('ecologits_model_links')
      .select('ecologits_model_id, maydai_model_id')
      .in('ecologits_model_id', ecoIds)
    if (linkError) throw toExplicitError('debug:llm-sync-check', linkError)
    links = rowsOf(linkRows, 'ecologits_model_links')
  }

  for (const name of BLOCKED_ECO_NAMES) {
    const row = ecoByName.get(name)
    if (!row) {
      checks.push(mark(false, `${name} absente de ecologits_models`))
      continue
    }
    const id = optionalString(row, 'id')
    const status = optionalString(row, 'link_status')
    const towardGemini = geminiFlashId != null && links.some((link) =>
      optionalString(link, 'ecologits_model_id') === id
      && optionalString(link, 'maydai_model_id') === geminiFlashId,
    )
    checks.push(mark(
      geminiFlashId != null && status === 'ignored' && !towardGemini,
      geminiFlashId == null
        ? `${name} link_status=${showValue(status)}, cible gemini-1-5-flash absente`
        : `${name} link_status=${showValue(status)}, lien vers gemini-1-5-flash=${towardGemini ? 'présent' : 'absent'}`,
    ))
  }

  const aliasIds = [...ecoIds, MISTRAL_MEDIUM_3_ECO_ID]
  const { data: aliasBySource, error: aliasSourceError } = await supabase
    .from('llm_model_aliases')
    .select('id, source_id, raw_name, model_id')
    .eq('source', 'ecologits')
    .in('source_id', aliasIds)
  if (aliasSourceError) throw toExplicitError('debug:llm-sync-check', aliasSourceError)
  const { data: aliasByName, error: aliasNameError } = await supabase
    .from('llm_model_aliases')
    .select('id, source_id, raw_name, model_id')
    .eq('source', 'ecologits')
    .in('raw_name', [...BLOCKED_ECO_NAMES, 'mistral-medium-3'])
  if (aliasNameError) throw toExplicitError('debug:llm-sync-check', aliasNameError)
  const aliases = new Map<string, Record<string, unknown>>()
  for (const row of [...rowsOf(aliasBySource, 'llm_model_aliases'), ...rowsOf(aliasByName, 'llm_model_aliases')]) {
    const id = optionalString(row, 'id')
    if (id) aliases.set(id, row)
  }
  const residual = [...aliases.values()].filter((row) => {
    const sourceId = optionalString(row, 'source_id')
    const rawName = optionalString(row, 'raw_name')
    return ecoIds.includes(sourceId ?? '') || isBlockedEcoName(rawName)
  })
  checks.push(mark(
    residual.length === 0,
    `alias ecologits résiduels sur les 3 entrées Gemini : ${residual.length}`,
  ))
  const mediumAlias = [...aliases.values()].filter((row) =>
    optionalString(row, 'model_id') === MISTRAL_MEDIUM_35_ID
    && (optionalString(row, 'raw_name') === 'mistral-medium-3' || optionalString(row, 'source_id') === MISTRAL_MEDIUM_3_ECO_ID),
  )
  checks.push(mark(
    mediumAlias.length === 0,
    `alias ecologits mistral-medium-3 vers mistral-medium-3-5 : ${mediumAlias.length}`,
  ))

  const catalog = await selectAllRows(supabase, 'ecologits_models', 'id, name, link_status')
  const allLinks = await selectAllRows(supabase, 'ecologits_model_links', 'ecologits_model_id')
  const linkedIds = new Set(allLinks.map((row) => optionalString(row, 'ecologits_model_id')).filter((id): id is string => id != null))
  const divergent = catalog.filter((row) => {
    const status = optionalString(row, 'link_status')
    const linked = linkedIds.has(optionalString(row, 'id') ?? '')
    if (status === 'ignored') return false
    if (status === 'matched') return !linked
    if (status === 'unmatched') return linked
    return true
  })
  const ignoredWithLink = catalog.filter((row) =>
    optionalString(row, 'link_status') === 'ignored' && linkedIds.has(optionalString(row, 'id') ?? ''),
  )
  const sample = [...divergent, ...ignoredWithLink]
    .slice(0, 5)
    .map((row) => optionalString(row, 'name') ?? optionalString(row, 'id') ?? '(sans nom)')
    .join(', ')
  checks.push(mark(
    divergent.length === 0 && ignoredWithLink.length === 0,
    `cohérence link_status : ${divergent.length} divergence(s), ${ignoredWithLink.length} ignored avec lien${sample ? ` (${sample})` : ''}`,
  ))
  return checks
}

async function checkBloc3(supabase: SupabaseClient, bySlug: Map<string, Record<string, unknown>>): Promise<CheckResult[]> {
  const checks: CheckResult[] = []
  const { data: compariaRows, error: compariaError } = await supabase
    .from('comparia_models')
    .select('source_id, maydai_model_id, link_status')
    .in('source_id', [...COMPARIA_SOURCE_IDS])
  if (compariaError) throw toExplicitError('debug:llm-sync-check', compariaError)
  const comparia = rowsOf(compariaRows, 'comparia_models')
  const { data: pivotRows, error: pivotError } = await supabase
    .from('llm_model_source_ids')
    .select('source_id')
    .eq('source', 'comparia')
    .in('source_id', [...COMPARIA_SOURCE_IDS])
  if (pivotError) throw toExplicitError('debug:llm-sync-check', pivotError)
  const pivots = new Set(rowsOf(pivotRows, 'llm_model_source_ids').map((row) => optionalString(row, 'source_id')))

  for (const sourceId of COMPARIA_SOURCE_IDS) {
    const matches = comparia.filter((row) => optionalString(row, 'source_id') === sourceId)
    const detached = matches.length > 0 && matches.every((row) =>
      optionalString(row, 'maydai_model_id') == null && optionalString(row, 'link_status') === 'ignored',
    )
    const pivotAbsent = !pivots.has(sourceId)
    const status = matches.map((row) => optionalString(row, 'link_status') ?? 'NULL').join(', ') || 'absente'
    checks.push(mark(
      detached && pivotAbsent,
      `${sourceId} link_status=${status}, maydai_model_id ${matches.some((row) => optionalString(row, 'maydai_model_id')) ? 'présent' : 'NULL'}, pivot comparia ${pivotAbsent ? 'absent' : 'présent'}`,
    ))
  }

  const ficheIds = DETACHED_MAYDAI_SLUGS
    .map((slug) => bySlug.get(slug))
    .map((row) => row ? optionalString(row, 'id') : null)
    .filter((id): id is string => id != null)
  const linkedFicheIds = new Set<string>()
  if (ficheIds.length > 0) {
    const { data: remainingLinks, error: remainingError } = await supabase
      .from('comparia_models')
      .select('maydai_model_id')
      .in('maydai_model_id', ficheIds)
    if (remainingError) throw toExplicitError('debug:llm-sync-check', remainingError)
    for (const row of rowsOf(remainingLinks, 'comparia_models')) {
      const id = optionalString(row, 'maydai_model_id')
      if (id) linkedFicheIds.add(id)
    }
  }

  for (const slug of DETACHED_MAYDAI_SLUGS) {
    const row = bySlug.get(slug)
    if (!row) {
      checks.push(mark(false, `${slug} absente`))
      continue
    }
    const id = optionalString(row, 'id')
    if (id && linkedFicheIds.has(id)) {
      checks.push(mark(true, `${slug} a encore un lien Compar:IA : le vidage des colonnes n'est pas exigé`))
      continue
    }
    const rank = row.comparia_rank
    const consumption = row.consumption_wh_per_1k_tokens
    checks.push(mark(
      rank == null && consumption == null,
      `${slug} sans lien Compar:IA, comparia_rank=${rank == null ? 'NULL' : String(rank)}, consumption_wh_per_1k_tokens=${consumption == null ? 'NULL' : String(consumption)}`,
    ))
  }
  return checks
}

async function checkReconciliation(supabase: SupabaseClient): Promise<boolean> {
  const { data, error } = await supabase
    .from('compl_ai_models')
    .select('id, slug, lifecycle_status, role, replacement_model_id, license_id, base_model_id, comparia_rank, consumption_wh_per_1k_tokens')
    .in('slug', [...RECONCILIATION_SLUGS, 'gemini-1-5-flash'])
  if (error) throw toExplicitError('debug:llm-sync-check', error)
  const bySlug = ficheBySlug(rowsOf(data, 'compl_ai_models'))
  const geminiFlashId = optionalString(bySlug.get('gemini-1-5-flash') ?? {}, 'id')
  const bloc1 = checkBloc1(bySlug)
  const bloc2 = await checkBloc2(supabase, geminiFlashId)
  const bloc3 = await checkBloc3(supabase, bySlug)
  const checks = [...bloc1, ...bloc2, ...bloc3]
  const conformant = checks.every((check) => check.ok)

  console.log('d) Rapport réconciliation 20261126110000')
  console.log('   Bloc 1 — cycle de vie')
  for (const check of bloc1) console.log(`   ${check.line}`)
  console.log('   Bloc 2 — EcoLogits')
  for (const check of bloc2) console.log(`   ${check.line}`)
  console.log('   Bloc 3 — Compar:IA')
  for (const check of bloc3) console.log(`   ${check.line}`)
  console.log(`   Verdict : ${conformant ? 'CONFORME POST-MIGRATION 20261126110000' : 'AVANT MIGRATION 20261126110000'}`)
  return conformant
}

async function checkDatabase(supabase: SupabaseClient): Promise<boolean> {
  const { data: providers, error: providerError } = await supabase
    .from('model_providers')
    .select('id')
    .not('tooltip_title', 'is', null)
  if (providerError) throw toExplicitError('debug:llm-sync-check', providerError)
  const providerIds = (providers ?? []).map((provider) => provider.id)

  const roles = new Map<string, number>()
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from('compl_ai_models')
      .select('role')
      .in('model_provider_id', providerIds)
      .range(from, from + 999)
    if (error) throw toExplicitError('debug:llm-sync-check', error)
    for (const row of data ?? []) {
      const key = row.role ?? '(null)'
      roles.set(key, (roles.get(key) ?? 0) + 1)
    }
    if (!data || data.length < 1000) break
  }
  console.log('c) Rôles du périmètre Questionnaire (éditeur avec tooltip) :')
  for (const [role, count] of [...roles.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`   ${role}: ${count}`)
  }

  const { data: models, error: modelError } = await supabase
    .from('compl_ai_models')
    .select('id, slug, model_name')
    .in('slug', [...TARGET_SLUGS])
  if (modelError) throw toExplicitError('debug:llm-sync-check', modelError)
  const byId = new Map((models ?? []).map((model) => [model.id, model]))
  const { data: links, error: linkError } = await supabase
    .from('ecologits_model_links')
    .select('maydai_model_id, ecologits_model_id, match_method')
    .in('maydai_model_id', [...byId.keys()])
  if (linkError) throw toExplicitError('debug:llm-sync-check', linkError)
  const ecoIds = [...new Set((links ?? []).map((link) => link.ecologits_model_id))]
  const ecoNames = new Map<string, string>()
  if (ecoIds.length > 0) {
    const { data: ecoModels, error: ecoError } = await supabase
      .from('ecologits_models')
      .select('id, name')
      .in('id', ecoIds)
    if (ecoError) throw toExplicitError('debug:llm-sync-check', ecoError)
    for (const model of ecoModels ?? []) ecoNames.set(model.id, model.name)
  }
  console.log('c) Liens EcoLogits des fiches cibles :')
  for (const slug of TARGET_SLUGS) {
    const model = [...byId.values()].find((item) => item.slug === slug)
    const names = (links ?? [])
      .filter((link) => link.maydai_model_id === model?.id)
      .map((link) => ecoNames.get(link.ecologits_model_id) ?? link.ecologits_model_id)
      .sort()
    console.log(`   ${slug}: ${names.length ? names.join(' | ') : '(aucun lien)'}`)
  }
  return checkReconciliation(supabase)
}

async function main(): Promise<void> {
  const url = supabaseUrl()
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ?? ''
  const production = isProductionUrl(url)
  console.log(`Kill-switch écriture: ${production ? 'ACTIF (URL distante)' : 'ACTIF (lecture seule locale)'}`)
  checkPayloads()
  checkExplicitError()
  const strictDb = strictDbRequested()
  if (!url || !key) {
    console.log('c) Supabase non configuré : lecture des rôles et des liens ignorée.')
    console.log('d) Rapport réconciliation 20261126110000')
    console.log('   Verdict : AVANT MIGRATION 20261126110000')
    if (strictDb) {
      console.error('debug:llm-sync-check ÉCHEC (--strict-db)')
      process.exitCode = 1
    }
    return
  }
  const host = (() => {
    try { return new URL(url).host } catch { return '(url illisible)' }
  })()
  console.log(`c) Lecture seule sur ${host}`)
  const conformant = await checkDatabase(readOnlyClient(url, key, production))
  if (strictDb && !conformant) {
    console.error('debug:llm-sync-check ÉCHEC (--strict-db)')
    process.exitCode = 1
    return
  }
  console.log(conformant
    ? 'debug:llm-sync-check OK'
    : 'debug:llm-sync-check OK (écarts en attente de migration, sans --strict-db)')
}

main().catch((error: unknown) => {
  const explicit = toExplicitError('debug:llm-sync-check', error)
  console.error(explicit.message)
  process.exitCode = 1
})
