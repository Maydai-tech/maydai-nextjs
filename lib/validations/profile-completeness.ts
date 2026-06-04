import { z } from 'zod'
import { strictStringField, strictBooleanField } from '@/lib/validations/strict-fields'

// Schéma d'entrée dérivé (la résolution de has_collaborators se fera côté appelant PostgREST)
export const ProfileCompletenessInputSchema = z.object({
  first_name: strictStringField.default(''),
  last_name: strictStringField.default(''),
  company_name: strictStringField.default(''),
  industry: strictStringField.default(''),
  sub_category_id: strictStringField.default(''),
  phone: strictStringField.default(''),
  siren: strictStringField.default(''),
  has_collaborators: strictBooleanField.default(false),
})

export type ProfileCompletenessInput = z.infer<typeof ProfileCompletenessInputSchema>

/**
 * Calcule le score de complétude du compte (0-100).
 * Découplé du moteur AI Act.
 */
export function calculateProfileCompletenessScore(data: unknown): number {
  const parsed = ProfileCompletenessInputSchema.safeParse(data)
  if (!parsed.success) return 0

  const p = parsed.data
  let score = 0

  // Pondération (Total 100)
  if (p.first_name) score += 10
  if (p.last_name) score += 10
  if (p.company_name) score += 15
  if (p.sub_category_id) score += 10
  if (p.siren) score += 10
  if (p.has_collaborators) score += 15

  // Éléments obligatoires pour une forte complétude (Secteur et Téléphone)
  if (p.industry) score += 15
  if (p.phone) score += 15

  return Math.min(100, Math.max(0, Math.round(score)))
}

/** Mappe les champs du formulaire paramètres vers l'entrée du moteur de scoring. */
export function toProfileCompletenessInput(
  data: {
    firstName: string
    lastName: string
    companyName: string
    mainIndustryId: string
    subCategoryId: string
    phone: string
    siren: string
  },
  hasCollaborators: boolean
): ProfileCompletenessInput {
  return {
    first_name: data.firstName,
    last_name: data.lastName,
    company_name: data.companyName,
    industry: data.mainIndustryId,
    sub_category_id: data.subCategoryId,
    phone: data.phone,
    siren: data.siren,
    has_collaborators: hasCollaborators,
  }
}
