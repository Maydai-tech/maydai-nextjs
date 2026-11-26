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

async function checkDatabase(supabase: SupabaseClient): Promise<void> {
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
  console.log('c) Liens EcoLogits des 6 cas (état actuel, migration non appliquée) :')
  for (const slug of TARGET_SLUGS) {
    const model = [...byId.values()].find((item) => item.slug === slug)
    const names = (links ?? [])
      .filter((link) => link.maydai_model_id === model?.id)
      .map((link) => ecoNames.get(link.ecologits_model_id) ?? link.ecologits_model_id)
      .sort()
    console.log(`   ${slug}: ${names.length ? names.join(' | ') : '(aucun lien)'}`)
  }
}

async function main(): Promise<void> {
  const url = supabaseUrl()
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ?? ''
  const production = isProductionUrl(url)
  console.log(`Kill-switch écriture: ${production ? 'ACTIF (URL distante)' : 'ACTIF (lecture seule locale)'}`)
  checkPayloads()
  checkExplicitError()
  if (!url || !key) {
    console.log('c) Supabase non configuré : lecture des rôles et des liens ignorée.')
    return
  }
  const host = (() => {
    try { return new URL(url).host } catch { return '(url illisible)' }
  })()
  console.log(`c) Lecture seule sur ${host}`)
  await checkDatabase(readOnlyClient(url, key, production))
  console.log('debug:llm-sync-check OK')
}

main().catch((error: unknown) => {
  const explicit = toExplicitError('debug:llm-sync-check', error)
  console.error(explicit.message)
  process.exitCode = 1
})
