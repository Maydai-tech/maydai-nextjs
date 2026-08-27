import { NextRequest, NextResponse } from 'next/server'

import { verifyAdminAuth } from '@/lib/admin-auth'
import {
  attachSourceIdsToCanonicalModels,
  buildUnifiedBenchModels,
  countDistinctEvaluatedModels,
  filterUnifiedBenchModels,
  overlayLatestModelsCount,
  withNormalizedModelsFetched,
  type BenchSourceKey,
} from '@/lib/bench-llm/admin-unified'
import { createEcoLogitsServiceClient } from '@/lib/ecologits/sync'

export const dynamic = 'force-dynamic'

const CATALOG_ROW_LIMIT = 20_000

function positiveInteger(value: string | null, fallback: number, max: number) {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? Math.min(parsed, max) : fallback
}

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAdminAuth(request)
    if (auth.error) return auth.error

    const supabase = createEcoLogitsServiceClient()
    const [
      { data: canonicalModels, error: modelsError },
      { data: evaluations, error: evaluationsError },
      { data: ecoModels, error: ecoError },
      { data: compariaModels, error: compariaError },
      { data: sourceIds, error: sourceIdsError },
      { data: llmRuns },
      { data: ecoRuns },
      { data: compariaRuns },
      { data: complRuns },
      { data: complAiScoredModels, error: complAiCountError },
    ] = await Promise.all([
      supabase
        .from('compl_ai_models')
        .select('id, slug, model_name, model_provider, model_type, updated_at'),
      supabase
        .from('compl_ai_evaluations')
        .select('model_id, score, maydai_score, rang_compar_ia')
        .limit(CATALOG_ROW_LIMIT),
      supabase
        .from('ecologits_models')
        .select('id, provider, name, is_active, last_seen_at, link:ecologits_model_links(maydai_model_id), estimate:ecologits_estimates(id)'),
      supabase
        .from('comparia_models')
        .select('id, source_id, organisation, rank, is_active, last_imported_at, maydai_model_id'),
      supabase
        .from('llm_model_source_ids')
        .select('model_id, source, source_id'),
      supabase.from('llm_stats_sync_runs').select('*').order('started_at', { ascending: false }).limit(5),
      supabase.from('ecologits_sync_runs').select('*').order('started_at', { ascending: false }).limit(5),
      supabase.from('comparia_import_runs').select('*').order('started_at', { ascending: false }).limit(5),
      supabase.from('compl_ai_sync_logs').select('*').order('created_at', { ascending: false }).limit(5),
      supabase
        .from('compl_ai_evaluations')
        .select('model_id')
        .not('score', 'is', null)
        .limit(CATALOG_ROW_LIMIT),
    ])
    if (modelsError) throw modelsError
    if (evaluationsError) throw evaluationsError
    if (ecoError) throw ecoError
    if (compariaError) throw compariaError
    if (sourceIdsError) throw sourceIdsError
    if (complAiCountError) throw complAiCountError

    const unified = buildUnifiedBenchModels(
      attachSourceIdsToCanonicalModels(canonicalModels ?? [], sourceIds ?? []),
      evaluations ?? [],
      ecoModels ?? [],
      compariaModels ?? [],
      { includeUnmatchedCatalogs: false },
    )
    const sourceParam = request.nextUrl.searchParams.get('source')
    const source = (
      ['maydai', 'compl_ai', 'comparia', 'llm_stats', 'ecologits'].includes(sourceParam ?? '')
        ? sourceParam
        : undefined
    ) as BenchSourceKey | undefined
    const availabilityParam = request.nextUrl.searchParams.get('availability')
    const availability =
      availabilityParam === 'present' || availabilityParam === 'missing'
        ? availabilityParam
        : 'all'
    const activeParam = request.nextUrl.searchParams.get('active')
    const active =
      activeParam === 'active' || activeParam === 'inactive' ? activeParam : 'all'
    const filtered = filterUnifiedBenchModels(unified, {
      search: request.nextUrl.searchParams.get('search') ?? '',
      provider: request.nextUrl.searchParams.get('provider') ?? '',
      active,
      source,
      availability,
    })
    const page = positiveInteger(request.nextUrl.searchParams.get('page'), 1, 10_000)
    const pageSize = positiveInteger(request.nextUrl.searchParams.get('pageSize'), 25, 100)
    const from = (page - 1) * pageSize
    const complAiModelCount = countDistinctEvaluatedModels(complAiScoredModels ?? [])

    return NextResponse.json({
      models: filtered.slice(from, from + pageSize),
      total: filtered.length,
      page,
      pageSize,
      providers: [...new Set(unified.map((model) => model.provider))].sort(),
      histories: {
        llmStats: withNormalizedModelsFetched(llmRuns),
        ecologits: withNormalizedModelsFetched(ecoRuns),
        comparia: withNormalizedModelsFetched(compariaRuns),
        complAi: overlayLatestModelsCount(
          withNormalizedModelsFetched(complRuns),
          complAiModelCount,
        ),
      },
      role: auth.user?.role,
    })
  } catch (error) {
    console.error('[Bench LLMs Admin] Catalogue impossible:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur interne du serveur' },
      { status: 500 },
    )
  }
}
