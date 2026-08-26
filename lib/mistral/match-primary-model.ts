import type { SupabaseClient } from '@supabase/supabase-js'
import { logger } from '@/lib/secure-logger'

function escapeIlikePattern(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_')
}

/**
 * Résout `compl_ai_models.id` à partir du nom de modèle saisi (correspondance insensible à la casse).
 * Exact d’abord, puis ILIKE %saisie%. Absent ou ambigu → null.
 */
export async function matchComplAiModelId(
  supabase: SupabaseClient,
  llmModelVersion: string
): Promise<string | null> {
  const needle = llmModelVersion.trim()
  if (!needle) return null

  const escaped = escapeIlikePattern(needle)

  const exact = await supabase
    .from('compl_ai_models')
    .select('id')
    .ilike('model_name', escaped)
    .limit(1)
    .maybeSingle()

  if (exact.error) {
    logger.error('matchComplAiModelId: correspondance exacte', undefined, {
      details: exact.error.message,
    })
    return null
  }

  if (typeof exact.data?.id === 'string' && exact.data.id) {
    return exact.data.id
  }

  const fuzzy = await supabase
    .from('compl_ai_models')
    .select('id')
    .ilike('model_name', `%${escaped}%`)
    .limit(1)
    .maybeSingle()

  if (fuzzy.error) {
    logger.error('matchComplAiModelId: correspondance partielle', undefined, {
      details: fuzzy.error.message,
    })
    return null
  }

  return typeof fuzzy.data?.id === 'string' && fuzzy.data.id ? fuzzy.data.id : null
}
