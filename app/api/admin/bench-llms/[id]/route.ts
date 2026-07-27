import { NextRequest, NextResponse } from 'next/server'

import { verifyAdminAuth } from '@/lib/admin-auth'
import { parseBenchEntityId } from '@/lib/bench-llm/admin-unified'
import { createEcoLogitsServiceClient } from '@/lib/ecologits/sync'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await verifyAdminAuth(request)
  if (auth.error) return auth.error
  const { id: entityId } = await context.params
  const parsed = parseBenchEntityId(entityId)
  if (!parsed) return NextResponse.json({ error: 'Identifiant modèle invalide' }, { status: 400 })

  try {
    const supabase = createEcoLogitsServiceClient()
    let canonicalModelId: string | null = parsed.kind === 'maydai' ? parsed.id : null
    let ecoModelId: string | null = parsed.kind === 'ecologits' ? parsed.id : null
    let compariaModelId: string | null = parsed.kind === 'comparia' ? parsed.id : null

    if (canonicalModelId) {
      const [{ data: ecoLink }, { data: compariaLink }] = await Promise.all([
        supabase
          .from('ecologits_model_links')
          .select('ecologits_model_id')
          .eq('maydai_model_id', canonicalModelId)
          .maybeSingle(),
        supabase
          .from('comparia_models')
          .select('id')
          .eq('maydai_model_id', canonicalModelId)
          .maybeSingle(),
      ])
      ecoModelId = ecoLink?.ecologits_model_id ?? null
      compariaModelId = compariaLink?.id ?? null
    } else if (ecoModelId) {
      const { data: link } = await supabase
        .from('ecologits_model_links')
        .select('maydai_model_id')
        .eq('ecologits_model_id', ecoModelId)
        .maybeSingle()
      canonicalModelId = link?.maydai_model_id ?? null
    } else if (compariaModelId) {
      const { data: compariaLink } = await supabase
        .from('comparia_models')
        .select('maydai_model_id')
        .eq('id', compariaModelId)
        .maybeSingle()
      canonicalModelId = compariaLink?.maydai_model_id ?? null
    }

    if (canonicalModelId && !ecoModelId) {
      const { data: ecoLink } = await supabase
        .from('ecologits_model_links')
        .select('ecologits_model_id')
        .eq('maydai_model_id', canonicalModelId)
        .maybeSingle()
      ecoModelId = ecoLink?.ecologits_model_id ?? null
    }
    if (canonicalModelId && !compariaModelId) {
      const { data: compariaLink } = await supabase
        .from('comparia_models')
        .select('id')
        .eq('maydai_model_id', canonicalModelId)
        .maybeSingle()
      compariaModelId = compariaLink?.id ?? null
    }

    const [modelResult, evaluationsResult, ecoResult, compariaResult, principlesResult, maydaiModelsResult, llmRunsResult] =
      await Promise.all([
        canonicalModelId
          ? supabase.from('compl_ai_models').select('*').eq('id', canonicalModelId).maybeSingle()
          : Promise.resolve({ data: null, error: null }),
        canonicalModelId
          ? supabase
              .from('compl_ai_evaluations')
              .select('*, principle:compl_ai_principles(id, code, name, category), benchmark:compl_ai_benchmarks(id, code, name, principle_id)')
              .eq('model_id', canonicalModelId)
              .order('evaluation_date', { ascending: false })
          : Promise.resolve({ data: [], error: null }),
        ecoModelId
          ? supabase
              .from('ecologits_models')
              .select('*, estimate:ecologits_estimates(*), link:ecologits_model_links(*)')
              .eq('id', ecoModelId)
              .maybeSingle()
          : Promise.resolve({ data: null, error: null }),
        compariaModelId
          ? supabase.from('comparia_models').select('*').eq('id', compariaModelId).maybeSingle()
          : Promise.resolve({ data: null, error: null }),
        supabase
          .from('compl_ai_principles')
          .select('id, code, name, category, benchmarks:compl_ai_benchmarks(id, code, name, principle_id)')
          .order('code'),
        supabase.from('compl_ai_models').select('id, model_name, model_provider').order('model_name'),
        supabase.from('llm_stats_sync_runs').select('*').order('started_at', { ascending: false }).limit(10),
      ])

    for (const result of [modelResult, evaluationsResult, ecoResult, compariaResult, principlesResult]) {
      if (result.error) throw result.error
    }
    if (!modelResult.data && !ecoResult.data && !compariaResult.data) {
      return NextResponse.json({ error: 'Modèle introuvable' }, { status: 404 })
    }

    return NextResponse.json({
      entityId: canonicalModelId
        ? `maydai_${canonicalModelId}`
        : ecoModelId
          ? `ecologits_${ecoModelId}`
          : `comparia_${compariaModelId}`,
      model: modelResult.data,
      evaluations: evaluationsResult.data ?? [],
      ecologits: ecoResult.data,
      comparia: compariaResult.data,
      principles: principlesResult.data ?? [],
      maydaiModels: maydaiModelsResult.data ?? [],
      llmStatsRuns: llmRunsResult.data ?? [],
      role: auth.user?.role,
    })
  } catch (error) {
    console.error('[Bench LLMs Admin] Détail impossible:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur interne du serveur' },
      { status: 500 },
    )
  }
}
