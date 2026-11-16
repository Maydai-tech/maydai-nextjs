import type { SupabaseClient } from '@supabase/supabase-js'

import { partitionUniqueMoves } from '@/lib/bench-llm/model-lineage'

async function moveColumn(
  supabase: SupabaseClient,
  table: string,
  column: string,
  absorbedId: string,
  absorberId: string,
): Promise<void> {
  const { error } = await supabase.from(table).update({ [column]: absorberId }).eq(column, absorbedId)
  if (error) throw new Error(error.message)
}

async function moveUniqueRows(
  supabase: SupabaseClient,
  table: string,
  absorbedId: string,
  absorberId: string,
  keyOf: (row: Record<string, unknown>) => string,
): Promise<void> {
  const [{ data: absorbed, error: absorbedError }, { data: absorber, error: absorberError }] = await Promise.all([
    supabase.from(table).select('*').eq('model_id', absorbedId),
    supabase.from(table).select('*').eq('model_id', absorberId),
  ])
  if (absorbedError) throw new Error(absorbedError.message)
  if (absorberError) throw new Error(absorberError.message)
  const { updateIds, deleteIds } = partitionUniqueMoves(
    (absorbed ?? []) as Array<{ id: string } & Record<string, unknown>>,
    (absorber ?? []) as Array<{ id: string } & Record<string, unknown>>,
    keyOf,
  )
  if (deleteIds.length > 0) {
    const { error } = await supabase.from(table).delete().in('id', deleteIds)
    if (error) throw new Error(error.message)
  }
  if (updateIds.length > 0) {
    const { error } = await supabase.from(table).update({ model_id: absorberId }).in('id', updateIds)
    if (error) throw new Error(error.message)
  }
}

export async function reassignMergedModel(
  supabase: SupabaseClient,
  absorbedId: string,
  absorberId: string,
): Promise<void> {
  if (!absorbedId || !absorberId || absorbedId === absorberId) return
  await moveColumn(supabase, 'usecases', 'primary_model_id', absorbedId, absorberId)
  await moveUniqueRows(supabase, 'compl_ai_evaluations', absorbedId, absorberId, (row) =>
    `${row.principle_id}|${row.benchmark_id}|${row.evaluation_date}`)
  await moveUniqueRows(supabase, 'eco_evaluations', absorbedId, absorberId, (row) =>
    `${row.region_code}|${row.methodology_version_id}|${row.run_index}|${row.mode}`)
  await moveUniqueRows(supabase, 'eco_evaluations_aggregated', absorbedId, absorberId, (row) =>
    `${row.region_code}|${row.methodology_version_id}|${row.mode}`)
  await moveColumn(supabase, 'llm_model_aliases', 'model_id', absorbedId, absorberId)
  await moveColumn(supabase, 'llm_model_source_ids', 'model_id', absorbedId, absorberId)
  await moveColumn(supabase, 'ecologits_model_links', 'maydai_model_id', absorbedId, absorberId)
  await moveColumn(supabase, 'comparia_models', 'maydai_model_id', absorbedId, absorberId)
}
