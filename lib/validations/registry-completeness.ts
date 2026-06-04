import { z } from 'zod'
import { strictStringField, strictBooleanField } from '@/lib/validations/strict-fields'

// Schéma d'entrée dérivé (Siren injecté depuis le profil, has_collaborators résolu via jointure)
export const RegistryCompletenessInputSchema = z.object({
  name: strictStringField.default(''),
  industry: strictStringField.default(''),
  sub_category_id: strictStringField.default(''),
  city: strictStringField.default(''),
  country: strictStringField.default(''),
  type: strictStringField.default(''),
  siren: strictStringField.default(''),
  has_collaborators: strictBooleanField.default(false),
  is_centralized_registry: strictBooleanField.default(false),
})

export type RegistryCompletenessInput = z.infer<typeof RegistryCompletenessInputSchema>

/**
 * Calcule le score de complétude du registre (0-100).
 * Découplé du moteur AI Act.
 */
export function calculateRegistryCompletenessScore(data: unknown): number {
  const parsed = RegistryCompletenessInputSchema.safeParse(data)
  if (!parsed.success) return 0

  const p = parsed.data
  let score = 0

  // Nouvelle grille de pondération (Total exact : 100)
  if (p.name) score += 10
  if (p.industry) score += 15
  if (p.sub_category_id) score += 10
  if (p.city) score += 10
  if (p.country) score += 10
  if (p.type) score += 10
  if (p.siren) score += 15
  if (p.has_collaborators) score += 10
  if (p.is_centralized_registry) score += 10

  return Math.min(100, Math.max(0, Math.round(score)))
}

/**
 * Vérifie la cohérence sectorielle entre le profil et le registre.
 */
export function validateSectorConsistency(
  profileIndustry: string,
  companyIndustry: string
): { isConsistent: boolean; flag: string | null } {
  const pSector = profileIndustry.trim()
  const cSector = companyIndustry.trim()

  if (pSector && cSector && pSector !== cSector) {
    return {
      isConsistent: false,
      flag: `Le secteur du profil ("${pSector}") ne correspond pas au secteur du registre ("${cSector}").`,
    }
  }

  return { isConsistent: true, flag: null }
}
