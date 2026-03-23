import type { GuidedChatDraft, PayloadValidationResult, FieldValidationError } from '../types'

/**
 * Validates deployment date in DD/MM/YYYY format.
 * Returns valid for empty strings (field is optional).
 */
export function validateDeploymentDateDDMMYYYY(
  dateString: string
): { isValid: boolean; error?: string } {
  if (!dateString) return { isValid: true }

  const dateRegex = /^(\d{2})\/(\d{2})\/(\d{4})$/
  const match = dateString.match(dateRegex)

  if (!match) {
    return {
      isValid: false,
      error: 'Format de date invalide. Utilisez le format JJ/MM/AAAA (ex: 15/06/2025)',
    }
  }

  const [, dayStr, monthStr, yearStr] = match
  const day = parseInt(dayStr, 10)
  const month = parseInt(monthStr, 10)
  const year = parseInt(yearStr, 10)

  const date = new Date(year, month - 1, day)

  const isRealDate =
    date.getDate() === day &&
    date.getMonth() === month - 1 &&
    date.getFullYear() === year

  if (!isRealDate) {
    return {
      isValid: false,
      error: 'Date invalide. Vérifiez le jour, le mois et l\'année.',
    }
  }

  return { isValid: true }
}

/**
 * Validates the full draft before submission.
 * Checks required fields and formats.
 */
export function validateDraft(
  draft: GuidedChatDraft
): PayloadValidationResult {
  const errors: FieldValidationError[] = []

  if (!draft.name.trim()) {
    errors.push({ field: 'name', message: 'Le nom est requis.' })
  }

  if (draft.name.length > 50) {
    errors.push({ field: 'name', message: 'Le nom ne doit pas dépasser 50 caractères.' })
  }

  if (draft.deployment_date) {
    const dateResult = validateDeploymentDateDDMMYYYY(draft.deployment_date)
    if (!dateResult.isValid) {
      errors.push({ field: 'deployment_date', message: dateResult.error! })
    }
  }

  if (!draft.responsible_service.trim()) {
    errors.push({ field: 'responsible_service', message: 'Le service responsable est requis.' })
  }

  if (!draft.technology_partner.trim()) {
    errors.push({ field: 'technology_partner', message: 'Le partenaire technologique est requis.' })
  }

  if (!draft.llm_model_version.trim()) {
    errors.push({ field: 'llm_model_version', message: 'Le modèle LLM est requis.' })
  }

  if (!draft.ai_category.trim()) {
    errors.push({ field: 'ai_category', message: 'La catégorie IA est requise.' })
  }

  if (!draft.system_type.trim()) {
    errors.push({ field: 'system_type', message: 'Le type de système est requis.' })
  }

  if (!draft.deployment_countries || draft.deployment_countries.length === 0) {
    errors.push({ field: 'deployment_countries', message: 'Au moins un pays de déploiement est requis.' })
  }

  if (!draft.description.trim()) {
    errors.push({ field: 'description', message: 'La description est requise.' })
  }

  return {
    isValid: errors.length === 0,
    errors,
  }
}

/**
 * Validates that closed-field values match the loaded referentials.
 * This is the final guard before submission.
 */
export function validateFinalClosedFieldsAgainstReferentials(
  draft: GuidedChatDraft,
  referentials: {
    responsibleServices: string[]
    aiCategories: string[]
    systemTypes: string[]
    providerNames: string[]
  }
): PayloadValidationResult {
  const errors: FieldValidationError[] = []

  if (
    draft.responsible_service &&
    !referentials.responsibleServices.includes(draft.responsible_service)
  ) {
    errors.push({
      field: 'responsible_service',
      message: `"${draft.responsible_service}" n'est pas un service reconnu.`,
    })
  }

  if (
    draft.ai_category &&
    !referentials.aiCategories.includes(draft.ai_category)
  ) {
    errors.push({
      field: 'ai_category',
      message: `"${draft.ai_category}" n'est pas une catégorie IA reconnue.`,
    })
  }

  if (
    draft.system_type &&
    !referentials.systemTypes.includes(draft.system_type)
  ) {
    errors.push({
      field: 'system_type',
      message: `"${draft.system_type}" n'est pas un type de système reconnu.`,
    })
  }

  // technology_partner is only checked against referentials if it's not a custom partner
  const isKnownProvider = referentials.providerNames.some(
    name => name === draft.technology_partner
  )
  // No error for custom partners — they're allowed via "Autre"
  // Only flag if the partner name is empty (caught by validateDraft)
  if (draft.technology_partner && !isKnownProvider && draft.technology_partner_id !== undefined) {
    errors.push({
      field: 'technology_partner',
      message: `"${draft.technology_partner}" ne correspond à aucun partenaire connu.`,
    })
  }

  return {
    isValid: errors.length === 0,
    errors,
  }
}
