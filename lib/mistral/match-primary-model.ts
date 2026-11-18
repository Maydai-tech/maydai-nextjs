import type { SupabaseClient } from '@supabase/supabase-js'
import { logger } from '@/lib/secure-logger'
import { normalizeLlmModelSlug } from '@/lib/bench-llm/model-slug'
import { resolveReferenceModelId, type LineageModel } from '@/lib/bench-llm/model-lineage'

function escapeIlikePattern(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_')
}

type ModelHit = {
  id: string
  merged_into_id?: string | null
  reference_model_id?: string | null
}

/**
 * Résout un texte libre vers une fiche visible, ou vers la référence d'une variante ou d'un alias.
 * Absent ou ambigu → null.
 */
export async function matchComplAiModelId(
  supabase: SupabaseClient,
  llmModelVersion: string
): Promise<string | null> {
  const needle = llmModelVersion.trim()
  if (!needle) return null

  const escaped = escapeIlikePattern(needle)
  const exact = await supabase
    .from('compl_ai_models_visible')
    .select('id, merged_into_id, reference_model_id')
    .ilike('model_name', escaped)
    .limit(1)
    .maybeSingle()

  if (exact.error) {
    logger.error('matchComplAiModelId: correspondance exacte', undefined, {
      details: exact.error.message,
    })
    return null
  }

  if (exact.data?.id && !exact.data.merged_into_id && !exact.data.reference_model_id) {
    return exact.data.id
  }

  const normalized = normalizeLlmModelSlug(needle)
  const alias = normalized
    ? await supabase
      .from('llm_model_aliases')
      .select('model_id')
      .ilike('normalized_name', normalized)
      .limit(1)
      .maybeSingle()
    : { data: null, error: null }

  if (alias.error) {
    logger.error('matchComplAiModelId: alias', undefined, { details: alias.error.message })
    return null
  }

  const direct = await resolveToVisibleModel(supabase, [
    ...(exact.data?.id ? [exact.data.id] : []),
    ...(alias.data?.model_id ? [alias.data.model_id] : []),
  ])
  if (direct) return direct

  const fuzzy = await supabase
    .from('compl_ai_models_visible')
    .select('id, merged_into_id, reference_model_id')
    .ilike('model_name', `%${escaped}%`)
    .limit(1)
    .maybeSingle()

  if (fuzzy.error) {
    logger.error('matchComplAiModelId: correspondance partielle', undefined, {
      details: fuzzy.error.message,
    })
    return null
  }

  if (fuzzy.data?.id && !fuzzy.data.merged_into_id && !fuzzy.data.reference_model_id) {
    return fuzzy.data.id
  }
  return fuzzy.data?.id ? resolveToVisibleModel(supabase, [fuzzy.data.id]) : null
}

async function resolveToVisibleModel(
  supabase: SupabaseClient,
  candidateIds: string[],
): Promise<string | null> {
  const unique = [...new Set(candidateIds)]
  if (unique.length === 0) return null
  const models = await supabase
    .from('compl_ai_models')
    .select('id, merged_into_id, reference_model_id')
    .in('id', unique)
  if (models.error || !Array.isArray(models.data)) return unique.length === 1 ? unique[0]! : null

  const byId = new Map<string, LineageModel>(models.data.map((model: ModelHit) => [model.id, {
    id: model.id,
    mergedIntoId: model.merged_into_id,
    referenceModelId: model.reference_model_id,
  }]))
  const resolved = [...new Set(unique.map((id) => resolveReferenceModelId(id, byId)))]
  if (resolved.length !== 1) return null

  const visible = await supabase
    .from('compl_ai_models_visible')
    .select('id')
    .eq('id', resolved[0])
    .maybeSingle()
  return typeof visible.data?.id === 'string' ? visible.data.id : null
}
