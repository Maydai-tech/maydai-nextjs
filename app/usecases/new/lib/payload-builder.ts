import type { GuidedChatDraft, CreateUseCasePayload, ModelOption, ModelProviderOption } from '../types'
import { isoCodeToFrenchName } from './countries'
import { resolvePrimaryModelId, isCustomPartner } from './model-resolver'

/**
 * Normalizes deployment countries to an array of French country names.
 * Handles both ISO codes (from chat) and comma-separated name strings (from legacy form).
 */
export function normalizeDeploymentCountriesToArray(
  countriesInput: string[] | string
): string[] {
  let codes: string[] = []

  if (typeof countriesInput === 'string') {
    codes = countriesInput
      .split(',')
      .map(c => c.trim())
      .filter(Boolean)
  } else if (Array.isArray(countriesInput)) {
    codes = countriesInput.filter(Boolean)
  }

  return [...new Set(codes.map(code => {
    // If it's a 2-letter ISO code, convert to French name
    if (code.length === 2 && /^[A-Za-z]{2}$/.test(code)) {
      return isoCodeToFrenchName(code)
    }
    // Otherwise, it's already a name
    return code
  }))]
}

/**
 * Builds the final payload for POST /api/usecases.
 * Shared between the form wizard and the guided chat.
 */
export function buildCreateUseCasePayload(
  draft: GuidedChatDraft,
  companyId: string,
  availableModels: ModelOption[],
  partners?: ModelProviderOption[]
): CreateUseCasePayload {
  const isCustom = partners
    ? isCustomPartner(draft.technology_partner, partners)
    : draft.technology_partner_id === undefined

  const primary_model_id = isCustom
    ? null
    : resolvePrimaryModelId(draft.llm_model_version, availableModels)

  return {
    name: draft.name,
    deployment_phase: draft.deployment_phase?.trim() ? draft.deployment_phase.trim() : null,
    deployment_date: draft.deployment_date,
    responsible_service: draft.responsible_service,
    technology_partner: draft.technology_partner,
    technology_partner_id: draft.technology_partner_id,
    llm_model_version: draft.llm_model_version,
    primary_model_id,
    ai_category: draft.ai_category,
    system_type: draft.system_type,
    deployment_countries: normalizeDeploymentCountriesToArray(draft.deployment_countries),
    description: draft.description,
    status: 'draft',
    company_id: companyId,
  }
}
