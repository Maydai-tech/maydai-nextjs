import { OPEN_LICENSE_CLASSES, type LicenseClass } from '@/lib/bench-llm/license-class'

export const RETIRED_PUBLISHED_WEIGHTS_LABEL = 'Retiré par l’éditeur — poids publiés'

const MODEL_ROLES = new Set(['base', 'version', 'non_documente'])

export type ModelVisibilityInput = {
  providerInQuestionnaire: boolean
  role: string | null
  lifecycleStatus: string | null
  mergedIntoId: string | null
  visibilityOverride: boolean | null
  licenseClass: string | null
}

export function isOpenLicenseClass(value: string | null | undefined): boolean {
  return OPEN_LICENSE_CLASSES.includes(value as LicenseClass)
}

/**
 * Même règle que la vue compl_ai_models_visible.
 * Un forçage vrai affiche, un forçage faux masque.
 * Un modèle retiré reste visible si ses poids sont publiés.
 */
export function isModelProposedToUser(input: ModelVisibilityInput): boolean {
  if (input.visibilityOverride === true) return true
  if (input.visibilityOverride === false) return false
  const roleOk = input.role == null || MODEL_ROLES.has(input.role)
  const retiredWithPublishedWeights = input.lifecycleStatus === 'retired'
    && isOpenLicenseClass(input.licenseClass)
  return input.providerInQuestionnaire
    && roleOk
    && input.mergedIntoId == null
    && (input.lifecycleStatus !== 'retired' || retiredWithPublishedWeights)
}

export function retiredPublishedWeightsLabel(lifecycleStatus: string | null | undefined): string | null {
  return lifecycleStatus === 'retired' ? RETIRED_PUBLISHED_WEIGHTS_LABEL : null
}
