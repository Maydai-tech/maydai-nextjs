import type { ModelOption, ModelProviderOption } from '../types'

/**
 * Resolves the primary_model_id from a model name by matching
 * against the list of available models from the API.
 */
export function resolvePrimaryModelId(
  modelName: string,
  availableModels: ModelOption[]
): string | null {
  if (!modelName || !availableModels.length) return null
  const model = availableModels.find(m => m.model_name === modelName)
  return model?.id || null
}

/**
 * Returns true if the partner name is not found in the official
 * list of known model providers (i.e. it was entered via "Autre").
 */
export function isCustomPartner(
  partnerName: string,
  partners: ModelProviderOption[]
): boolean {
  const trimmed = partnerName.trim()
  if (!trimmed) return false
  return !partners.some(p => p.name === trimmed)
}
