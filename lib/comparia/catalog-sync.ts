import type { SupabaseClient } from '@supabase/supabase-js'

import type { AliasRecord } from '@/lib/bench-llm/model-lineage'
import {
  compariaConsumptionToWhPer1k,
  compariaRankingDateFromFileName,
  type ParsedCompariaModel,
} from '@/lib/comparia/import'
import {
  planCompariaLinks,
  summarizeCompariaLinks,
  type CompariaExistingLink,
  type CompariaHubModel,
  type CompariaLinkDecision,
  type CompariaMatchMethod,
  type CompariaTechnicalId,
} from '@/lib/comparia/matching'

type CompariaCatalogRow = {
  id: string
  source_id: string
  maydai_model_id: string | null
  match_method: CompariaMatchMethod | null
  link_status: CompariaLinkDecision['status'] | null
  is_active: boolean
}

type SourceIdRow = {
  model_id: string
  source_id: string
}

export type CompariaCatalogPlan = {
  decisions: CompariaLinkDecision[]
  existingRows: CompariaCatalogRow[]
  matchedCount: number
  ignoredCount: number
  unmatchedCount: number
  rankingDate: string
}

export type PersistCompariaCatalogResult = {
  rowsImported: number
  exactLinksCreated: number
  modelsDeactivated: number
  matchedCount: number
  ignoredCount: number
  unmatchedCount: number
  rankingDate: string
}

function hubUpdate(
  rank: number,
  consumptionMwh: number | null,
): { comparia_rank: number; consumption_wh_per_1k_tokens?: number } {
  const update: { comparia_rank: number; consumption_wh_per_1k_tokens?: number } = {
    comparia_rank: rank,
  }
  const wh = compariaConsumptionToWhPer1k(consumptionMwh)
  if (wh != null) update.consumption_wh_per_1k_tokens = wh
  return update
}

async function loadCompariaCatalogContext(supabase: SupabaseClient) {
  const [
    { data: canonicalModels, error: canonicalError },
    { data: existingRows, error: existingError },
    { data: llmStatsLinks, error: sourceError },
    { data: aliasRows, error: aliasError },
  ] = await Promise.all([
    supabase.from('compl_ai_models').select('id, model_name, model_provider, slug, merged_into_id'),
    supabase
      .from('comparia_models')
      .select('id, source_id, maydai_model_id, match_method, link_status, is_active'),
    supabase
      .from('llm_model_source_ids')
      .select('model_id, source_id')
      .eq('source', 'llm_stats'),
    supabase
      .from('llm_model_aliases')
      .select('model_id, source, source_id, normalized_name')
      .eq('source', 'comparia'),
  ])
  if (canonicalError) throw canonicalError
  if (existingError) throw existingError
  if (sourceError) throw sourceError
  if (aliasError) throw aliasError

  return {
    models: (canonicalModels ?? []) as CompariaHubModel[],
    existingRows: (existingRows ?? []) as CompariaCatalogRow[],
    technicalIds: ((llmStatsLinks ?? []) as SourceIdRow[]).map((link): CompariaTechnicalId => ({
      modelId: link.model_id,
      sourceId: link.source_id,
    })),
    aliases: ((aliasRows ?? []) as Array<{
      model_id: string
      source: string
      source_id: string
      normalized_name: string
    }>).map((alias): AliasRecord => ({
      modelId: alias.model_id,
      source: alias.source,
      sourceId: alias.source_id,
      normalizedName: alias.normalized_name,
    })),
  }
}

/** Lecture seule : mêmes décisions que l’import, sans écriture. */
export async function planCompariaCatalog(
  supabase: SupabaseClient,
  params: { rows: ParsedCompariaModel[]; fileName: string; now?: Date },
): Promise<CompariaCatalogPlan> {
  const context = await loadCompariaCatalogContext(supabase)
  const decisions = planCompariaLinks({
    rows: params.rows,
    models: context.models,
    technicalIds: context.technicalIds,
    existing: context.existingRows.map((row): CompariaExistingLink => ({
      source_id: row.source_id,
      maydai_model_id: row.maydai_model_id,
      match_method: row.match_method,
      link_status: row.link_status,
    })),
    aliases: context.aliases,
  })
  return {
    decisions,
    existingRows: context.existingRows,
    ...summarizeCompariaLinks(decisions),
    rankingDate: compariaRankingDateFromFileName(params.fileName, params.now),
  }
}

/**
 * Upsert le catalogue Compar:IA et les liens hub.
 * Ne crée jamais de fiche `compl_ai_models`.
 */
export async function persistCompariaCatalog(
  supabase: SupabaseClient,
  params: {
    rows: ParsedCompariaModel[]
    fileName: string
    now?: Date
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
        ranking_date: compariaRankingDateFromFileName(params.fileName, params.now),
      })
      .select('id')
      .single()
    if (runError) throw runError
    runId = run.id

    const plan = await planCompariaCatalog(supabase, params)
    const decisionBySource = new Map(plan.decisions.map((decision) => [decision.sourceId, decision]))
    const existingBySource = new Map(plan.existingRows.map((row) => [row.source_id, row]))
    const importedAt = new Date().toISOString()
    const importedSourceIds = new Set(params.rows.map((row) => row.source_id))

    const payload = params.rows.map((row) => {
      const decision = decisionBySource.get(row.source_id)
      const status = decision?.status ?? 'unmatched'
      const linked = status === 'matched' && decision?.maydaiModelId && decision.matchMethod
      return {
        source_id: row.source_id,
        ranking_class: row.ranking_class,
        rank: row.rank,
        bradley_terry_score: row.bradley_terry_score,
        bt_p2_5: row.bt_p2_5,
        bt_p97_5: row.bt_p97_5,
        confidence_interval: row.confidence_interval,
        rank_p2_5: row.rank_p2_5,
        rank_p97_5: row.rank_p97_5,
        total_votes: row.total_votes,
        consumption_mwh_per_1k_tokens: row.consumption_mwh_per_1k_tokens,
        size: row.size,
        parameters_billions: row.parameters_billions,
        architecture: row.architecture,
        release_date: row.release_date,
        organisation: row.organisation,
        license: row.license,
        raw_payload: row.raw_payload,
        maydai_model_id: linked ? decision.maydaiModelId : null,
        match_method: linked ? decision.matchMethod : null,
        link_status: status,
        is_active: true,
        last_imported_at: importedAt,
        missing_since: null,
        updated_at: importedAt,
      }
    })

    const keeperByModel = new Map<string, string>()
    for (const row of payload) {
      if (!row.maydai_model_id) continue
      if (keeperByModel.has(row.maydai_model_id)) {
        throw new Error(`Plusieurs identifiants Compar:IA visent le même modèle MaydAI.`)
      }
      keeperByModel.set(row.maydai_model_id, row.source_id)
    }
    const releasedRows = plan.existingRows.filter((row) => {
      if (!row.maydai_model_id) return false
      const keeper = keeperByModel.get(row.maydai_model_id)
      return keeper != null && keeper !== row.source_id
    })
    if (releasedRows.length > 0) {
      const { error: releaseError } = await supabase
        .from('comparia_models')
        .update({
          maydai_model_id: null,
          match_method: null,
          link_status: 'unmatched',
          updated_at: importedAt,
        })
        .in('id', releasedRows.map((row) => row.id))
      if (releaseError) throw releaseError
      const { error: releasePivotError } = await supabase
        .from('llm_model_source_ids')
        .delete()
        .eq('source', 'comparia')
        .in('source_id', releasedRows.map((row) => row.source_id))
      if (releasePivotError) throw releasePivotError
    }

    const { error: upsertError } = await supabase
      .from('comparia_models')
      .upsert(payload, { onConflict: 'source_id' })
    if (upsertError) throw upsertError

    const missingRows = plan.existingRows.filter((row) => row.is_active && !importedSourceIds.has(row.source_id))
    if (missingRows.length > 0) {
      const { error: deactivateError } = await supabase
        .from('comparia_models')
        .update({ is_active: false, missing_since: importedAt, updated_at: importedAt })
        .in('id', missingRows.map((row) => row.id))
      if (deactivateError) throw deactivateError
      const staleRanks = missingRows.flatMap((row) => (row.maydai_model_id ? [row.maydai_model_id] : []))
      if (staleRanks.length > 0) {
        const { error: clearRankError } = await supabase
          .from('compl_ai_models')
          .update({ comparia_rank: null })
          .in('id', staleRanks)
        if (clearRankError) throw clearRankError
      }
    }

    const linkedRows = payload.filter((row) => row.maydai_model_id)
    const unlinkedSourceIds = payload.filter((row) => !row.maydai_model_id).map((row) => row.source_id)

    if (linkedRows.length > 0) {
      const { error: sourceUpsertError } = await supabase.from('llm_model_source_ids').upsert(
        linkedRows.map((row) => ({
          model_id: row.maydai_model_id as string,
          source: 'comparia',
          source_id: row.source_id,
          match_method: row.match_method,
          updated_at: importedAt,
        })),
        { onConflict: 'source,source_id' },
      )
      if (sourceUpsertError) throw sourceUpsertError

      const rankUpdates = await Promise.all(
        linkedRows.map((row) =>
          supabase
            .from('compl_ai_models')
            .update(hubUpdate(row.rank, row.consumption_mwh_per_1k_tokens))
            .eq('id', row.maydai_model_id as string),
        ),
      )
      const rankError = rankUpdates.find((result) => result.error)?.error
      if (rankError) throw rankError
    }

    if (unlinkedSourceIds.length > 0) {
      const { error: unlinkError } = await supabase
        .from('llm_model_source_ids')
        .delete()
        .eq('source', 'comparia')
        .in('source_id', unlinkedSourceIds)
      if (unlinkError) throw unlinkError
    }

    const exactLinksCreated = payload.filter((row) => {
      const existing = existingBySource.get(row.source_id)
      const decision = decisionBySource.get(row.source_id)
      return (
        decision?.origin === 'automatic' &&
        decision.status === 'matched' &&
        existing?.maydai_model_id !== row.maydai_model_id
      )
    }).length

    const result: PersistCompariaCatalogResult = {
      rowsImported: params.rows.length,
      exactLinksCreated,
      modelsDeactivated: missingRows.length,
      matchedCount: plan.matchedCount,
      ignoredCount: plan.ignoredCount,
      unmatchedCount: plan.unmatchedCount,
      rankingDate: plan.rankingDate,
    }

    await supabase
      .from('comparia_import_runs')
      .update({
        status: 'success',
        rows_imported: result.rowsImported,
        exact_links_created: result.exactLinksCreated,
        models_deactivated: result.modelsDeactivated,
        matched_count: result.matchedCount,
        ignored_count: result.ignoredCount,
        unmatched_count: result.unmatchedCount,
        ranking_date: result.rankingDate,
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
