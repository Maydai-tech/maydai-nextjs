import { NextRequest, NextResponse } from 'next/server'

import { verifyAdminAuth } from '@/lib/admin-auth'
import { filterEcoLogitsModels, paginateEcoLogitsModels } from '@/lib/ecologits/admin-query'
import { createEcoLogitsServiceClient } from '@/lib/ecologits/sync'

export const dynamic = 'force-dynamic'

type LinkFilter = 'all' | 'linked' | 'unlinked'
type ActiveFilter = 'all' | 'active' | 'inactive'

function positiveInteger(value: string | null, fallback: number, max: number): number {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? Math.min(parsed, max) : fallback
}

export async function GET(request: NextRequest) {
  const auth = await verifyAdminAuth(request)
  if (auth.error) return auth.error

  try {
    const supabase = createEcoLogitsServiceClient()
    const search = request.nextUrl.searchParams.get('search')?.trim().toLowerCase() ?? ''
    const provider = request.nextUrl.searchParams.get('provider')?.trim() ?? ''
    const linked = (request.nextUrl.searchParams.get('linked') ?? 'all') as LinkFilter
    const active = (request.nextUrl.searchParams.get('active') ?? 'active') as ActiveFilter
    const warning = request.nextUrl.searchParams.get('warning') === 'true'
    const page = positiveInteger(request.nextUrl.searchParams.get('page'), 1, 10_000)
    const pageSize = positiveInteger(request.nextUrl.searchParams.get('pageSize'), 25, 100)

    const [{ data: models, error }, { data: runs }, { data: maydaiModels }] = await Promise.all([
      supabase
        .from('ecologits_models')
        .select(`
          id, provider, name, architecture, sources, warnings, is_active,
          first_seen_at, last_seen_at, missing_since, updated_at,
          estimate:ecologits_estimates(
            energy_min, energy_max, energy_unit,
            gwp_min, gwp_max, gwp_unit,
            adpe_min, adpe_max, adpe_unit,
            pe_min, pe_max, pe_unit,
            wcf_min, wcf_max, wcf_unit,
            warnings, output_token_count, electricity_mix_zone, estimated_at
          ),
          link:ecologits_model_links(
            match_method,
            maydai_model_id,
            maydai:compl_ai_models(id, model_name, model_provider)
          )
        `)
        .order('provider')
        .order('name'),
      supabase
        .from('ecologits_sync_runs')
        .select('*')
        .order('started_at', { ascending: false })
        .limit(10),
      supabase
        .from('compl_ai_models')
        .select('id, model_name, model_provider')
        .order('model_provider')
        .order('model_name'),
    ])
    if (error) throw error

    const allModels = models ?? []
    const providers = [...new Set(allModels.map((model) => model.provider))].sort()
    const filtered = filterEcoLogitsModels(allModels, {
      search,
      provider,
      linked,
      active,
      warning,
    })

    const total = filtered.length
    return NextResponse.json({
      models: paginateEcoLogitsModels(filtered, page, pageSize),
      total,
      page,
      pageSize,
      providers,
      runs: runs ?? [],
      maydaiModels: maydaiModels ?? [],
    })
  } catch (error) {
    console.error('[EcoLogits Admin] Lecture impossible:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur interne du serveur' },
      { status: 500 },
    )
  }
}
