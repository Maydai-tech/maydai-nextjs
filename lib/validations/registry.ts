import { z } from 'zod'

/**
 * Identifiant secteur : UUID ou ID métier (ex. `tech_data` dans Mayday Industries).
 */
const industryIdSchema = z.union([z.string().uuid(), z.string().min(1)])

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
})

export type Registry = z.infer<typeof RegistrySchema> & {
  id: string
  created_at: string
}

export type RegistryInsert = Omit<Registry, 'id' | 'created_at'>

export type RegistryUpdate = Partial<RegistryInsert>
