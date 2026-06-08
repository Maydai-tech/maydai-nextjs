import { z } from 'zod'
import { validateSIREN } from '@/lib/validation/siren'

/**
 * Identifiant secteur : UUID ou ID métier (ex. `tech_data` dans Mayday Industries).
 */
const industryIdSchema = z.union([z.string().uuid(), z.string().min(1)])

/** SIREN registre : format 9 chiffres + Luhn (`public.companies.siren`). */
export const sirenSchema = z
  .string()
  .nullable()
  .optional()
  .superRefine((val, ctx) => {
    if (val == null || val === '') return

    if (!/^[0-9]{9}$/.test(val)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Le SIREN doit contenir exactement 9 chiffres',
      })
      return
    }

    if (!validateSIREN(val)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Le SIREN est invalide (échec de l'algorithme de Luhn)",
      })
    }
  })

/**
 * Schéma source de vérité pour une entrée registre (`public.companies`).
 */
export const RegistrySchema = z.object({
  name: z.string().min(2),
  industry: industryIdSchema,
  sub_category_id: z.string().nullable().optional(),
  city: z.string(),
  country: z.string(),
  type: z.string().optional(),
  role: z.string().optional(),
  maydai_as_registry: z.boolean().optional().default(false),
  siren: sirenSchema,
})

export type Registry = z.infer<typeof RegistrySchema> & {
  id: string
  created_at: string
}

export type RegistryInsert = Omit<Registry, 'id' | 'created_at'>

export type RegistryUpdate = Partial<RegistryInsert>
