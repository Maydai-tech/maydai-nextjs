/**
 * Contrôle en lecture seule des payloads des 5 sources admin.
 * Aucune écriture : un client distant est traité comme la production et toute
 * mutation est refusée avant d'atteindre le réseau.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'node:path'

import { loadBenchSourceDetail, loadUnclassifiedModels } from '@/lib/bench-llm/source-reconcile-service'
import { toExplicitError } from '@/lib/errors/postgrest-error'
import { BenchSourceDetailResponseSchema, BenchSourceSlugSchema, type BenchSourceSlug } from '@/types/bench-sources.zod'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local'), quiet: true })

const SOURCES = BenchSourceSlugSchema.options

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

const HERMES_CLEAN_MIGRATION = '20261127143000_clean_benchmark_multi_links_hermes'

const HERMES_LINK_EXPECTATIONS: Array<{ provider: string; name: string; slug: string }> = [
  { provider: 'mistralai', name: 'ministral-8b-2512', slug: 'ministral-3-8b-instruct-2512' },
  { provider: 'mistralai', name: 'magistral-small-2509', slug: 'magistral-small-1-2' },
  { provider: 'huggingface_hub', name: 'mistralai/Mistral-7B-Instruct-v0.3', slug: 'mistral-7b-v0-3' },
  { provider: 'huggingface_hub', name: 'mistral-community/Mistral-7B-Instruct-v0.3', slug: 'mistral-7b-v0-3' },
]

const MISTRAL_MEDIUM_35_ID = '354120aa-a79e-4b6c-a501-c2e20226f327'
const MISTRAL_MEDIUM_35_NAMES = ['mistral-medium-3-5', 'mistral-medium-3.5', 'mistral-medium-2604'] as const

async function listTextColumn(
  supabase: SupabaseClient,
  table: 'llm_model_aliases' | 'ecologits_model_links',
  column: 'source_id' | 'ecologits_model_id',
  source?: 'ecologits',
): Promise<string[]> {
  const values: string[] = []
  const pageSize = 1000
  for (let from = 0; ; from += pageSize) {
    let query = supabase.from(table).select(column).range(from, from + pageSize - 1)
    if (source) query = query.eq('source', source)
    const { data, error } = await query
    if (error) throw toExplicitError(`hermes ${table}.${column}`, error)
    const page = (data ?? []).flatMap((row) => {
      const value = (row as Record<string, unknown>)[column]
      return typeof value === 'string' ? [value] : []
    })
    values.push(...page)
    if (page.length < pageSize) break
  }
  return values
}

async function unmatchedCount(supabase: SupabaseClient, table: 'ecologits_models' | 'comparia_models'): Promise<number> {
  const { count, error } = await supabase
    .from(table)
    .select('id', { count: 'exact', head: true })
    .eq('link_status', 'unmatched')
  if (error) throw toExplicitError(`hermes ${table}`, error)
  return count ?? 0
}

async function linkedSlug(supabase: SupabaseClient, provider: string, name: string): Promise<string | null> {
  const eco = await supabase
    .from('ecologits_models')
    .select('id')
    .eq('provider', provider)
    .eq('name', name)
    .maybeSingle()
  if (eco.error) throw toExplicitError(`hermes ${name}`, eco.error)
  if (!eco.data?.id) return null
  const link = await supabase
    .from('ecologits_model_links')
    .select('maydai_model_id')
    .eq('ecologits_model_id', eco.data.id)
    .maybeSingle()
  if (link.error) throw toExplicitError(`hermes lien ${name}`, link.error)
  if (!link.data?.maydai_model_id) return null
  const model = await supabase
    .from('compl_ai_models')
    .select('slug')
    .eq('id', link.data.maydai_model_id)
    .maybeSingle()
  if (model.error) throw toExplicitError(`hermes fiche ${name}`, model.error)
  return model.data?.slug ?? null
}

/** Contrôle post-migration. Avertit tant que 20261127143000 n'est pas appliquée. */
async function reportHermesBenchmarkIntegrity(supabase: SupabaseClient): Promise<void> {
  const failures: string[] = []
  const llama = await supabase.from('compl_ai_models').select('id').eq('slug', 'llama-2').maybeSingle()
  if (llama.error) throw toExplicitError('hermes llama-2', llama.error)
  if (!llama.data?.id) {
    failures.push('fiche llama-2 introuvable')
  } else {
    const links = await supabase
      .from('ecologits_model_links')
      .select('id', { count: 'exact', head: true })
      .eq('maydai_model_id', llama.data.id)
    if (links.error) throw toExplicitError('hermes liens llama-2', links.error)
    if ((links.count ?? 0) !== 0) failures.push(`llama-2 a ${links.count ?? 0} lien(s) EcoLogits (attendu 0)`)
  }

  for (const expected of HERMES_LINK_EXPECTATIONS) {
    const slug = await linkedSlug(supabase, expected.provider, expected.name)
    if (slug !== expected.slug) {
      failures.push(`${expected.name} -> ${slug ?? '(aucun lien)'} (attendu ${expected.slug})`)
    }
  }

  const ecoUnmatched = await unmatchedCount(supabase, 'ecologits_models')
  const compariaUnmatched = await unmatchedCount(supabase, 'comparia_models')
  if (ecoUnmatched !== 0) failures.push(`ecologits unmatched=${ecoUnmatched} (attendu 0)`)
  if (compariaUnmatched !== 0) failures.push(`comparia unmatched=${compariaUnmatched} (attendu 0)`)

  const aliasIds = await listTextColumn(supabase, 'llm_model_aliases', 'source_id', 'ecologits')
  const linkedIds = new Set(await listTextColumn(supabase, 'ecologits_model_links', 'ecologits_model_id'))
  const orphanAliases = aliasIds.filter((sourceId) => !linkedIds.has(sourceId)).length
  if (orphanAliases > 0) failures.push(`orphan_ecologits_aliases=${orphanAliases} (attendu 0)`)

  const mediumLinks = await supabase
    .from('ecologits_model_links')
    .select('ecologits_model_id')
    .eq('maydai_model_id', MISTRAL_MEDIUM_35_ID)
  if (mediumLinks.error) throw toExplicitError('hermes liens Mistral Medium 3.5', mediumLinks.error)
  const mediumIds = (mediumLinks.data ?? []).map((row) => row.ecologits_model_id).filter((id): id is string => typeof id === 'string')
  const mediumModels = mediumIds.length === 0
    ? { data: [], error: null }
    : await supabase.from('ecologits_models').select('name, provider').in('id', mediumIds)
  if (mediumModels.error) throw toExplicitError('hermes fiches Mistral Medium 3.5', mediumModels.error)
  const mediumNames = (mediumModels.data ?? [])
    .filter((row) => row.provider === 'mistralai' && typeof row.name === 'string')
    .map((row) => row.name)
  const missingMedium = MISTRAL_MEDIUM_35_NAMES.filter((name) => !mediumNames.includes(name))
  if (missingMedium.length > 0 || mediumNames.length !== MISTRAL_MEDIUM_35_NAMES.length) {
    failures.push(
      `Mistral Medium 3.5 liens=${mediumNames.join(', ') || '(aucun)'} (attendu ${MISTRAL_MEDIUM_35_NAMES.join(', ')})`,
    )
  }

  if (failures.length > 0) {
    console.warn(`WARN migration ${HERMES_CLEAN_MIGRATION} pas encore appliquée (ou incomplète) :`)
    for (const failure of failures) console.warn(`- ${failure}`)
    return
  }
  console.log('hermes multi-links OK')
  console.log(`orphan_ecologits_aliases=${orphanAliases}`)
}

interface ComplAiSyncLog {
  status?: string | null
}

function readComplAiSyncLog(value: unknown): ComplAiSyncLog | null {
  if (!value || typeof value !== 'object') return null
  const status = (value as Record<string, unknown>).status
  if (status != null && typeof status !== 'string') return null
  return { status: typeof status === 'string' ? status : null }
}

function isComplAiRunFailure(log: ComplAiSyncLog): boolean {
  return (log.status || '').toLowerCase() !== 'success'
}

function summarize(source: BenchSourceSlug, payload: ReturnType<typeof BenchSourceDetailResponseSchema.parse>): string {
  if (payload.source === 'ecologits' || payload.source === 'comparia') {
    return `${source} unmatched=${payload.counts.unmatched} ignored=${payload.counts.ignored} matched=${payload.counts.matched}`
  }
  if (payload.source === 'llm-stats' || payload.source === 'compl-ai') {
    const unclassified = payload.unqualified_models.filter((model) => model.role === 'a_classer').length
    const withoutRole = payload.unqualified_models.filter((model) => model.role == null).length
    const errors = payload.source === 'llm-stats'
      ? payload.last_run_issues?.errors.length ?? 0
      : payload.last_run_issues.filter((log) => {
        const parsed = readComplAiSyncLog(log)
        return parsed != null && isComplAiRunFailure(parsed)
      }).length
    return `${source} a_classer=${unclassified} sans_rôle=${withoutRole} erreurs_dernier_run=${errors}`
  }
  const buckets = Object.fromEntries(payload.buckets.map((bucket) => [bucket.system_card_status, bucket.models.length]))
  return `${source} missing=${buckets.missing ?? 0} error_no_system_card=${buckets.error_no_system_card ?? 0} generated=${buckets.generated ?? 0}`
}

async function main(): Promise<void> {
  const url = supabaseUrl()
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ?? ''
  const production = isProductionUrl(url)
  console.log(`Kill-switch écriture: ${production ? 'ACTIF (URL distante)' : 'ACTIF (lecture seule locale)'}`)
  if (!url || !key) throw new Error('Supabase non configuré dans .env.local')
  const supabase = readOnlyClient(url, key, production)

  const unclassified = await loadUnclassifiedModels(supabase)
  const slugs = unclassified.map((model) => model.slug || model.model_name).join(', ')
  console.log(`a_classer (${unclassified.length}) : ${slugs || '(aucune)'}`)

  for (const source of SOURCES) {
    const payload = BenchSourceDetailResponseSchema.parse(
      await loadBenchSourceDetail(supabase, source, { includeSheetMap: false }),
    )
    console.log(summarize(source, payload))
  }
  await reportHermesBenchmarkIntegrity(supabase)
  console.log('debug:bench-sources-check OK')
}

main().catch((error: unknown) => {
  const explicit = toExplicitError('debug:bench-sources-check', error)
  console.error(explicit.message)
  process.exitCode = 1
})
