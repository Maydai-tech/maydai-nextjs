import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { verifyAdminAuth } from '@/lib/admin-auth'
import { parseBenchEntityId } from '@/lib/bench-llm/admin-unified'
import { createEcoLogitsServiceClient } from '@/lib/ecologits/sync'
import { formatEcologitsArchitecture, selectStoredEcologitsEstimate } from '@/types/ecologits.zod'

export const dynamic = 'force-dynamic'

const EcoLinkRowSchema = z.object({
  id: z.string().uuid(),
  ecologits_model_id: z.string().uuid(),
  match_method: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
})

const EcoModelRowSchema = z.object({
  id: z.string().uuid(),
  provider: z.string(),
  name: z.string(),
  is_active: z.boolean(),
  architecture: z.unknown().nullable().optional(),
  warnings: z.array(z.unknown()).nullable().optional(),
  estimate: z.unknown().nullable().optional(),
}).passthrough()

type EcoLinkRow = z.infer<typeof EcoLinkRowSchema>

function queryFailure(error: unknown): Error {
  console.error('[Admin BenchLlm Detail]', error)
  if (typeof error === 'object' && error !== null) {
    const message = 'message' in error && typeof error.message === 'string' ? error.message.trim() : ''
    const details = 'details' in error && typeof error.details === 'string' ? error.details.trim() : ''
    return new Error(message || details || 'Lecture du détail modèle impossible')
  }
  return new Error('Lecture du détail modèle impossible')
}

async function loadEcoLinks(
  supabase: ReturnType<typeof createEcoLogitsServiceClient>,
  maydaiModelId: string,
): Promise<EcoLinkRow[]> {
  const { data, error } = await supabase
    .from('ecologits_model_links')
    .select('id, ecologits_model_id, match_method, created_at, updated_at')
    .eq('maydai_model_id', maydaiModelId)
  if (error) throw queryFailure(error)
  if (!Array.isArray(data)) {
    console.error('[Admin BenchLlm Detail]', data)
    throw new Error('Liens EcoLogits illisibles.')
  }
  return data.map((row) => {
    const parsed = EcoLinkRowSchema.safeParse(row)
    if (!parsed.success) {
      console.error('[Admin BenchLlm Detail]', parsed.error)
      throw new Error('Lien EcoLogits illisible.')
    }
    return parsed.data
  })
}

function compareLinkedEco(
  left: { name: string; is_active: boolean; estimate_summary: { status: string } },
  right: { name: string; is_active: boolean; estimate_summary: { status: string } },
): number {
  const leftComplete = left.estimate_summary.status === 'complete' ? 1 : 0
  const rightComplete = right.estimate_summary.status === 'complete' ? 1 : 0
  if (leftComplete !== rightComplete) return rightComplete - leftComplete
  if (left.is_active !== right.is_active) return left.is_active ? -1 : 1
  return left.name.localeCompare(right.name, 'fr')
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await verifyAdminAuth(request)
    if (auth.error) return auth.error
    const { id: entityId } = await context.params
    const parsed = parseBenchEntityId(entityId)
    if (!parsed) return NextResponse.json({ error: 'Identifiant modèle invalide' }, { status: 400 })

    const supabase = createEcoLogitsServiceClient()
    let canonicalModelId: string | null = parsed.kind === 'maydai' ? parsed.id : null
    let ecoModelId: string | null = parsed.kind === 'ecologits' ? parsed.id : null
    let compariaModelId: string | null = parsed.kind === 'comparia' ? parsed.id : null
    let ecoLinks: EcoLinkRow[] = []

    if (canonicalModelId) {
      const [links, compariaLookup] = await Promise.all([
        loadEcoLinks(supabase, canonicalModelId),
        supabase.from('comparia_models').select('id').eq('maydai_model_id', canonicalModelId).maybeSingle(),
      ])
      ecoLinks = links
      if (compariaLookup.error) throw queryFailure(compariaLookup.error)
      compariaModelId = compariaLookup.data?.id ?? null
    } else if (ecoModelId) {
      const { data: link, error } = await supabase
        .from('ecologits_model_links')
        .select('maydai_model_id')
        .eq('ecologits_model_id', ecoModelId)
        .maybeSingle()
      if (error) throw queryFailure(error)
      canonicalModelId = typeof link?.maydai_model_id === 'string' ? link.maydai_model_id : null
      if (canonicalModelId) ecoLinks = await loadEcoLinks(supabase, canonicalModelId)
    } else if (compariaModelId) {
      const { data: compariaLink, error } = await supabase
        .from('comparia_models')
        .select('maydai_model_id')
        .eq('id', compariaModelId)
        .maybeSingle()
      if (error) throw queryFailure(error)
      canonicalModelId = typeof compariaLink?.maydai_model_id === 'string' ? compariaLink.maydai_model_id : null
    }

    if (canonicalModelId && ecoLinks.length === 0 && parsed.kind !== 'maydai') {
      ecoLinks = await loadEcoLinks(supabase, canonicalModelId)
    }
    if (canonicalModelId && !compariaModelId) {
      const { data: compariaLink, error } = await supabase
        .from('comparia_models')
        .select('id')
        .eq('maydai_model_id', canonicalModelId)
        .maybeSingle()
      if (error) throw queryFailure(error)
      compariaModelId = compariaLink?.id ?? null
    }

    const linkByEcoId = new Map(ecoLinks.map((link) => [link.ecologits_model_id, link]))
    const ecoIds = ecoLinks.length > 0
      ? ecoLinks.map((link) => link.ecologits_model_id)
      : ecoModelId
        ? [ecoModelId]
        : []

    const [modelResult, evaluationsResult, ecoRowsResult, compariaResult, principlesResult, maydaiModelsResult, llmRunsResult, sourceIdsResult] =
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
        ecoIds.length > 0
          ? supabase.from('ecologits_models').select('*, estimate:ecologits_estimates(*)').in('id', ecoIds)
          : Promise.resolve({ data: [], error: null }),
        compariaModelId
          ? supabase.from('comparia_models').select('*').eq('id', compariaModelId).maybeSingle()
          : Promise.resolve({ data: null, error: null }),
        supabase
          .from('compl_ai_principles')
          .select('id, code, name, category, benchmarks:compl_ai_benchmarks(id, code, name, principle_id)')
          .order('code'),
        supabase.from('compl_ai_models').select('id, model_name, model_provider').order('model_name'),
        supabase.from('llm_stats_sync_runs').select('*').order('started_at', { ascending: false }).limit(10),
        canonicalModelId
          ? supabase
              .from('llm_model_source_ids')
              .select('source, source_id, match_method')
              .eq('model_id', canonicalModelId)
          : Promise.resolve({ data: [], error: null }),
      ])

    for (const result of [modelResult, evaluationsResult, ecoRowsResult, compariaResult, principlesResult, maydaiModelsResult, llmRunsResult, sourceIdsResult]) {
      if (result.error) throw queryFailure(result.error)
    }
    if (!modelResult.data && ecoIds.length === 0 && !compariaResult.data) {
      return NextResponse.json({ error: 'Modèle introuvable' }, { status: 404 })
    }

    if (ecoIds.length > 0 && !Array.isArray(ecoRowsResult.data)) {
      console.error('[Admin BenchLlm Detail]', ecoRowsResult.data)
      throw new Error('Catalogue EcoLogits illisible.')
    }
    const ecoRows = ecoRowsResult.data ?? []
    if (ecoIds.length > 0 && ecoRows.length !== new Set(ecoIds).size) {
      console.error('[Admin BenchLlm Detail]', { expected: ecoIds.length, received: ecoRows.length })
    }
    const ecologitsModels = ecoRows.map((row) => {
      const parsedRow = EcoModelRowSchema.safeParse(row)
      if (!parsedRow.success) {
        console.error('[Admin BenchLlm Detail]', parsedRow.error)
        throw new Error('Entrée EcoLogits illisible.')
      }
      const stored = selectStoredEcologitsEstimate(parsedRow.data.estimate)
      const link = linkByEcoId.get(parsedRow.data.id)
      const matchMethod = link?.match_method ?? null
      return {
        ...parsedRow.data,
        is_active: parsedRow.data.is_active,
        warnings: Array.isArray(parsedRow.data.warnings) ? parsedRow.data.warnings : [],
        match_method: matchMethod,
        architecture_label: formatEcologitsArchitecture(parsedRow.data.architecture),
        estimate_summary: stored.summary,
        estimate: stored.estimate,
        link: canonicalModelId
          ? [{ maydai_model_id: canonicalModelId, match_method: matchMethod }]
          : [],
      }
    }).sort(compareLinkedEco)

    const primaryEco = ecologitsModels[0] ?? null
    if (primaryEco) ecoModelId = primaryEco.id

    const sourceIds = sourceIdsResult.data ?? []
    const llmStatsId = sourceIds.find((link) => link.source === 'llm_stats')?.source_id ?? null
    const model = modelResult.data
      ? { ...modelResult.data, llm_stats_id: llmStatsId }
      : null

    if (!model && !primaryEco && !compariaResult.data) {
      return NextResponse.json({ error: 'Modèle introuvable' }, { status: 404 })
    }

    return NextResponse.json({
      entityId: canonicalModelId
        ? `maydai_${canonicalModelId}`
        : ecoModelId
          ? `ecologits_${ecoModelId}`
          : `comparia_${compariaModelId}`,
      model,
      evaluations: evaluationsResult.data ?? [],
      ecologits: primaryEco,
      ecologitsModels,
      comparia: compariaResult.data,
      sourceIds,
      principles: principlesResult.data ?? [],
      maydaiModels: maydaiModelsResult.data ?? [],
      llmStatsRuns: llmRunsResult.data ?? [],
      role: auth.user?.role,
    })
  } catch (error) {
    console.error('[Admin BenchLlm Detail]', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur interne du serveur' },
      { status: 500 },
    )
  }
}
