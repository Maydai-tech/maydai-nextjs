import type { SupabaseClient } from '@supabase/supabase-js'

import { normalizeLlmModelSlug } from '@/lib/bench-llm/model-slug'

export async function createUnclassifiedModel(
  supabase: SupabaseClient,
  params: {
    modelName: string
    provider: string | null
    source: 'llm_stats' | 'comparia' | 'ecologits'
    sourceId: string
    rawName?: string
  },
): Promise<string> {
  const { data, error } = await supabase
    .from('compl_ai_models')
    .insert({
      model_name: params.modelName,
      model_provider: params.provider,
      role: 'a_classer',
    })
    .select('id')
    .single()
  if (error || !data?.id) throw error ?? new Error(`Création impossible pour ${params.modelName}`)

  const rawName = params.rawName ?? params.modelName
  const normalizedName = normalizeLlmModelSlug(rawName) ?? rawName.toLowerCase()
  const { error: aliasError } = await supabase.from('llm_model_aliases').upsert({
    model_id: data.id,
    source: params.source,
    source_id: params.sourceId,
    raw_name: rawName,
    normalized_name: normalizedName,
    match_method: 'exact',
  }, { onConflict: 'source,source_id' })
  if (aliasError) throw aliasError

  const { error: sourceError } = await supabase.from('llm_model_source_ids').upsert({
    model_id: data.id,
    source: params.source,
    source_id: params.sourceId,
    match_method: 'exact',
  }, { onConflict: 'source,source_id' })
  if (sourceError) throw sourceError

  return data.id
}
