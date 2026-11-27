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

function summarize(source: BenchSourceSlug, payload: ReturnType<typeof BenchSourceDetailResponseSchema.parse>): string {
  if (payload.source === 'ecologits' || payload.source === 'comparia') {
    return `${source} unmatched=${payload.counts.unmatched} ignored=${payload.counts.ignored} matched=${payload.counts.matched}`
  }
  if (payload.source === 'llm-stats' || payload.source === 'compl-ai') {
    const unclassified = payload.unqualified_models.filter((model) => model.role === 'a_classer').length
    const withoutRole = payload.unqualified_models.filter((model) => model.role == null).length
    const errors = payload.source === 'llm-stats'
      ? payload.last_run_issues?.errors.length ?? 0
      : payload.last_run_issues.filter((log) => log.error_message).length
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
  console.log('debug:bench-sources-check OK')
}

main().catch((error: unknown) => {
  const explicit = toExplicitError('debug:bench-sources-check', error)
  console.error(explicit.message)
  process.exitCode = 1
})
