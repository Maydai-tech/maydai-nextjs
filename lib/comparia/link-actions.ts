import type { SupabaseClient } from '@supabase/supabase-js'

import { compariaConsumptionToWhPer1k } from '@/lib/comparia/import'
import type { CompariaLinkStatus, CompariaMatchMethod } from '@/lib/comparia/matching'

export type CompariaLinkAction = 'match' | 'ignore' | 'unignore'

type StoredCompariaRow = {
  id: string
  source_id: string
  rank: number
  maydai_model_id: string | null
  consumption_mwh_per_1k_tokens: number | null
  link_status: CompariaLinkStatus | null
}

export class CompariaLinkUpdateError extends Error {
  status: number

  constructor(message: string, status = 400) {
    super(message)
    this.status = status
  }
}

async function clearHubLink(supabase: SupabaseClient, sourceId: string, maydaiModelId: string | null) {
  const { error: pivotError } = await supabase
    .from('llm_model_source_ids')
    .delete()
    .eq('source', 'comparia')
    .eq('source_id', sourceId)
  if (pivotError) throw pivotError
  if (!maydaiModelId) return
  const { error: rankError } = await supabase
    .from('compl_ai_models')
    .update({ comparia_rank: null })
    .eq('id', maydaiModelId)
  if (rankError) throw rankError
}

async function applyHubLink(
  supabase: SupabaseClient,
  row: StoredCompariaRow,
  maydaiModelId: string,
  matchMethod: CompariaMatchMethod,
) {
  const updatedAt = new Date().toISOString()
  const { error: pivotError } = await supabase.from('llm_model_source_ids').upsert(
    {
      model_id: maydaiModelId,
      source: 'comparia',
      source_id: row.source_id,
      match_method: matchMethod,
      updated_at: updatedAt,
    },
    { onConflict: 'source,source_id' },
  )
  if (pivotError) throw pivotError
  const { error: hubError } = await supabase
    .from('compl_ai_models')
    .update(hubPatch(row))
    .eq('id', maydaiModelId)
  if (hubError) throw hubError
}

function hubPatch(row: StoredCompariaRow): { comparia_rank: number; consumption_wh_per_1k_tokens?: number } {
  const patch: { comparia_rank: number; consumption_wh_per_1k_tokens?: number } = {
    comparia_rank: row.rank,
  }
  const wh = compariaConsumptionToWhPer1k(row.consumption_mwh_per_1k_tokens)
  if (wh != null) patch.consumption_wh_per_1k_tokens = wh
  return patch
}

export async function updateCompariaLink(
  supabase: SupabaseClient,
  params: { sourceId: string; action: CompariaLinkAction; maydaiModelId?: string | null },
): Promise<{ sourceId: string; status: CompariaLinkStatus; maydaiModelId: string | null }> {
  const sourceId = params.sourceId.trim()
  if (!sourceId) throw new CompariaLinkUpdateError('Identifiant Compar:IA manquant.')

  const { data, error } = await supabase
    .from('comparia_models')
    .select('id, source_id, rank, maydai_model_id, consumption_mwh_per_1k_tokens, link_status')
    .eq('source_id', sourceId)
    .maybeSingle()
  if (error) throw error
  if (!data) throw new CompariaLinkUpdateError(`Modèle Compar:IA « ${sourceId} » introuvable.`, 404)
  const row = data as StoredCompariaRow
  const updatedAt = new Date().toISOString()

  if (params.action === 'ignore') {
    await clearHubLink(supabase, row.source_id, row.maydai_model_id)
    const { error: updateError } = await supabase
      .from('comparia_models')
      .update({
        maydai_model_id: null,
        match_method: null,
        link_status: 'ignored',
        updated_at: updatedAt,
      })
      .eq('id', row.id)
    if (updateError) throw updateError
    return { sourceId: row.source_id, status: 'ignored', maydaiModelId: null }
  }

  if (params.action === 'unignore') {
    const { error: updateError } = await supabase
      .from('comparia_models')
      .update({
        maydai_model_id: null,
        match_method: null,
        link_status: 'unmatched',
        updated_at: updatedAt,
      })
      .eq('id', row.id)
    if (updateError) throw updateError
    return { sourceId: row.source_id, status: 'unmatched', maydaiModelId: null }
  }

  const maydaiModelId = params.maydaiModelId?.trim() ?? ''
  if (!maydaiModelId) throw new CompariaLinkUpdateError('Choisissez un modèle MaydAI à associer.')

  const { data: model, error: modelError } = await supabase
    .from('compl_ai_models')
    .select('id')
    .eq('id', maydaiModelId)
    .maybeSingle()
  if (modelError) throw modelError
  if (!model) throw new CompariaLinkUpdateError('Ce modèle MaydAI n’existe pas.', 404)

  const { data: occupied, error: occupiedError } = await supabase
    .from('comparia_models')
    .select('source_id')
    .eq('maydai_model_id', maydaiModelId)
    .neq('source_id', row.source_id)
    .maybeSingle()
  if (occupiedError) throw occupiedError
  if (occupied?.source_id) {
    throw new CompariaLinkUpdateError(
      `Ce modèle MaydAI est déjà associé à l’identifiant Compar:IA « ${occupied.source_id} ».`,
      409,
    )
  }

  if (row.maydai_model_id && row.maydai_model_id !== maydaiModelId) {
    await clearHubLink(supabase, row.source_id, row.maydai_model_id)
  }

  const { error: updateError } = await supabase
    .from('comparia_models')
    .update({
      maydai_model_id: maydaiModelId,
      match_method: 'manual',
      link_status: 'matched',
      updated_at: updatedAt,
    })
    .eq('id', row.id)
  if (updateError) throw updateError

  await applyHubLink(supabase, row, maydaiModelId, 'manual')
  return { sourceId: row.source_id, status: 'matched', maydaiModelId }
}
