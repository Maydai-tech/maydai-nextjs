import { z } from 'zod'

/**
 * Schéma de validation pour le body `POST /api/auth/complete-signup`.
 * Miroir du contrat Frontend (camelCase + champs acquisition en snake_case).
 * Tous les champs sont optionnels pour ne pas bloquer la production ;
 * la route applique les règles obligatoires métier au moment opportun.
 */
export const CompleteSignupSchema = z.object({
  firstName: z.string().trim().optional(),
  lastName: z.string().trim().optional(),
  companyName: z.string().trim().optional(),
  mainIndustryId: z.string().trim().optional(),
  subCategoryId: z.string().trim().optional(),
  phone: z.string().trim().optional(),
  siren: z.string().trim().optional(),
  planIntent: z.string().trim().optional(),
  gclid: z.string().trim().optional(),
  utm_source: z.string().trim().optional(),
  utm_medium: z.string().trim().optional(),
  utm_campaign: z.string().trim().optional(),
})

export type CompleteSignupInput = z.infer<typeof CompleteSignupSchema>
