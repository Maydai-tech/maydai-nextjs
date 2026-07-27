import { NextRequest, NextResponse } from 'next/server'

import { verifyAdminAuth } from '@/lib/admin-auth'
import {
  buildUnifiedBenchModels,
  filterUnifiedBenchModels,
  type BenchSourceKey,
} from '@/lib/bench-llm/admin-unified'
import { createEcoLogitsServiceClient } from '@/lib/ecologits/sync'

export const dynamic = 'force-dynamic'

function positiveInteger(value: string | null, fallback: number, max: number) {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? Math.min(parsed, max) : fallback
}

export async function GET(request: NextRequest) {
  const auth = await verifyAdminAuth(request)
  if (auth.error) return auth.error

  try {
    const supabase = createEcoLogitsServiceClient()
    const [
      { data: canonicalModels, error: modelsError },
      { data: evaluations, error: evaluationsError },
      { data: ecoModels, error: ecoError },
      { data: compariaModels, error: compariaError },
      { data: llmRuns },
      { data: ecoRuns },
      { data: compariaRuns },
      { data: complRuns },
    ] = await Promise.all([
      supabase
        .from('compl_ai_models')
        .select('id, model_name, model_provider, model_type, llm_stats_id, comparia_rank, updated_at'),
      supabase
        .from('compl_ai_evaluations')
        .select('model_id, score, maydai_score, rang_compar_ia'),
      supabase
        .from('ecologits_models')
        .select('id, provider, name, is_active, last_seen_at, link:ecologits_model_links(maydai_model_id), estimate:ecologits_estimates(id)'),
      supabase
        .from('comparia_models')
        .select('id, source_id, organisation, rank, is_active, last_imported_at, maydai_model_id'),
      supabase.from('llm_stats_sync_runs').select('*').order('started_at', { ascending: false }).limit(5),
      supabase.from('ecologits_sync_runs').select('*').order('started_at', { ascending: false }).limit(5),
      supabase.from('comparia_import_runs').select('*').order('started_at', { ascending: false }).limit(5),
      supabase.from('compl_ai_sync_logs').select('*').order('created_at', { ascending: false }).limit(5),
    ])
    if (modelsError) throw modelsError
    if (evaluationsError) throw evaluationsError
    if (ecoError) throw ecoError
    if (compariaError) throw compariaError

    const unified = buildUnifiedBenchModels(
      canonicalModels ?? [],
      evaluations ?? [],
      ecoModels ?? [],
      compariaModels ?? [],
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

    return NextResponse.json({
      models: filtered.slice(from, from + pageSize),
      total: filtered.length,
      page,
      pageSize,
      providers: [...new Set(unified.map((model) => model.provider))].sort(),
      histories: {
        llmStats: llmRuns ?? [],
        ecologits: ecoRuns ?? [],
        comparia: compariaRuns ?? [],
        complAi: complRuns ?? [],
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
