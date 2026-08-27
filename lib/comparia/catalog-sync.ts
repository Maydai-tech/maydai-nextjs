import type { SupabaseClient } from '@supabase/supabase-js'

import { findCompariaHubLinks, type ParsedCompariaModel } from '@/lib/comparia/import'

type CanonicalRow = {
  id: string
  model_name: string
  model_provider: string | null
  slug: string | null
}

type CompariaCatalogRow = {
  id: string
  source_id: string
  maydai_model_id: string | null
  match_method: 'exact' | 'manual' | null
  is_active: boolean
}

type SourceIdRow = {
  model_id: string
  source_id: string
}

export type PersistCompariaCatalogResult = {
  rowsImported: number
  exactLinksCreated: number
  modelsDeactivated: number
}

function catalogMatchMethod(
  method: 'exact' | 'slug' | 'manual',
): 'exact' | 'manual' {
  return method === 'manual' ? 'manual' : 'exact'
}

function roundedInt(value: number | null): number | null {
  return value == null ? null : Math.round(value)
}

/**
 * Upsert le catalogue Compar:IA, les liens hub `llm_model_source_ids`,
 * et une ligne d'historique `comparia_import_runs`.
 */
export async function persistCompariaCatalog(
  supabase: SupabaseClient,
  params: {
    rows: ParsedCompariaModel[]
    fileName: string
  },
): Promise<PersistCompariaCatalogResult> {
  const startedAt = Date.now()
  let runId: string | null = null

  try {
    const { data: run, error: runError } = await supabase
      .from('comparia_import_runs')
      .insert({
        status: 'running',
        file_name: params.fileName,
        rows_received: params.rows.length,
      })
      .select('id')
      .single()
    if (runError) throw runError
    runId = run.id

    const [
      { data: canonicalModels, error: canonicalError },
      { data: existingRows, error: existingError },
      { data: llmStatsLinks, error: sourceError },
    ] = await Promise.all([
      supabase.from('compl_ai_models').select('id, model_name, model_provider, slug'),
      supabase
        .from('comparia_models')
        .select('id, source_id, maydai_model_id, match_method, is_active'),
      supabase
        .from('llm_model_source_ids')
        .select('model_id, source_id')
        .eq('source', 'llm_stats'),
    ])
    if (canonicalError) throw canonicalError
    if (existingError) throw existingError
    if (sourceError) throw sourceError

    const llmStatsIdsByModel = new Map<string, string[]>()
    for (const link of (llmStatsLinks ?? []) as SourceIdRow[]) {
      llmStatsIdsByModel.set(link.model_id, [
        ...(llmStatsIdsByModel.get(link.model_id) ?? []),
        link.source_id,
      ])
    }

    const hubLinks = findCompariaHubLinks(
      params.rows,
      ((canonicalModels ?? []) as CanonicalRow[]).map((model) => ({
        ...model,
        llm_stats_ids: llmStatsIdsByModel.get(model.id) ?? [],
      })),
    )

    const manuallyLinkedMaydaiIds = new Set(
      ((existingRows ?? []) as CompariaCatalogRow[])
        .filter((row) => row.match_method === 'manual' && row.maydai_model_id)
        .map((row) => row.maydai_model_id as string),
    )
    for (const [sourceId, link] of hubLinks) {
      if (manuallyLinkedMaydaiIds.has(link.modelId)) hubLinks.delete(sourceId)
    }
    const sourceIdsByMaydai = new Map<string, string[]>()
    for (const [sourceId, link] of hubLinks) {
      sourceIdsByMaydai.set(link.modelId, [
        ...(sourceIdsByMaydai.get(link.modelId) ?? []),
        sourceId,
      ])
    }
    for (const sourceIds of sourceIdsByMaydai.values()) {
      if (sourceIds.length > 1) {
        sourceIds.forEach((sourceId) => hubLinks.delete(sourceId))
      }
    }

    const existingBySource = new Map(
      ((existingRows ?? []) as CompariaCatalogRow[]).map((row) => [row.source_id, row]),
    )
    const importedAt = new Date().toISOString()
    const payload = params.rows.map((row) => {
      const existing = existingBySource.get(row.source_id)
      const keepsManualLink = existing?.match_method === 'manual' && existing.maydai_model_id
      const hubLink = hubLinks.get(row.source_id) ?? null
      const matchMethod = keepsManualLink
        ? 'manual'
        : hubLink
          ? catalogMatchMethod(hubLink.matchMethod)
          : null
      return {
        source_id: row.source_id,
        rank: row.rank,
        bradley_terry_score: row.bradley_terry_score,
        bt_p2_5: row.bt_p2_5,
        bt_p97_5: row.bt_p97_5,
        confidence_interval: row.confidence_interval,
        rank_p2_5: roundedInt(row.rank_p2_5),
        rank_p97_5: roundedInt(row.rank_p97_5),
        total_votes: row.total_votes,
        consumption_mwh_per_1k_tokens: row.consumption_mwh_per_1k_tokens,
        size: row.size,
        parameters_billions: row.parameters_billions,
        architecture: row.architecture,
        release_date: row.release_date,
        organisation: row.organisation,
        license: row.license,
        raw_payload: row.raw_payload,
        maydai_model_id: keepsManualLink ? existing.maydai_model_id : hubLink?.modelId ?? null,
        match_method: matchMethod,
        is_active: true,
        last_imported_at: importedAt,
        missing_since: null,
        updated_at: importedAt,
      }
    })

    const { error: upsertError } = await supabase
      .from('comparia_models')
      .upsert(payload, { onConflict: 'source_id' })
    if (upsertError) throw upsertError

    const importedSourceIds = new Set(params.rows.map((row) => row.source_id))
    const missingIds = ((existingRows ?? []) as CompariaCatalogRow[])
      .filter((row) => row.is_active && !importedSourceIds.has(row.source_id))
      .map((row) => row.id)
    if (missingIds.length > 0) {
      const { error: deactivateError } = await supabase
        .from('comparia_models')
        .update({ is_active: false, missing_since: importedAt, updated_at: importedAt })
        .in('id', missingIds)
      if (deactivateError) throw deactivateError
    }

    const linkedRows = payload.filter((row) => row.maydai_model_id)
    const unlinkedSourceIds = payload
      .filter((row) => !row.maydai_model_id)
      .map((row) => row.source_id)

    if (linkedRows.length > 0) {
      const { error: sourceUpsertError } = await supabase.from('llm_model_source_ids').upsert(
        linkedRows.map((row) => ({
          model_id: row.maydai_model_id as string,
          source: 'comparia',
          source_id: row.source_id,
          match_method: row.match_method === 'manual' ? 'manual' : (hubLinks.get(row.source_id)?.matchMethod ?? 'exact'),
          updated_at: importedAt,
        })),
        { onConflict: 'source,source_id' },
      )
      if (sourceUpsertError) throw sourceUpsertError
    }

    if (unlinkedSourceIds.length > 0) {
      const { error: unlinkError } = await supabase
        .from('llm_model_source_ids')
        .delete()
        .eq('source', 'comparia')
        .in('source_id', unlinkedSourceIds)
      if (unlinkError) throw unlinkError
    }

    const rankUpdates = await Promise.all(
      linkedRows.map((row) =>
        supabase
          .from('compl_ai_models')
          .update({ comparia_rank: row.rank })
          .eq('id', row.maydai_model_id as string),
      ),
    )
    const rankError = rankUpdates.find((result) => result.error)?.error
    if (rankError) throw rankError

    const exactLinksCreated = payload.filter((row) => {
      const existing = existingBySource.get(row.source_id)
      return (
        row.match_method === 'exact' &&
        (existing?.match_method !== 'exact' || existing.maydai_model_id !== row.maydai_model_id)
      )
    }).length

    const result = {
      rowsImported: params.rows.length,
      exactLinksCreated,
      modelsDeactivated: missingIds.length,
    }

    await supabase
      .from('comparia_import_runs')
      .update({
        status: 'success',
        rows_imported: result.rowsImported,
        exact_links_created: result.exactLinksCreated,
        models_deactivated: result.modelsDeactivated,
        finished_at: new Date().toISOString(),
        duration_ms: Date.now() - startedAt,
      })
      .eq('id', runId)

    return result
  } catch (error) {
    if (runId) {
      const message = error instanceof Error ? error.message : 'Erreur inconnue'
      await supabase
        .from('comparia_import_runs')
        .update({
          status: 'error',
          errors: [message],
          finished_at: new Date().toISOString(),
          duration_ms: Date.now() - startedAt,
        })
        .eq('id', runId)
    }
    throw error
  }
}
