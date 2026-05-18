import { z } from 'zod'

/**
 * Rétrocompatibilité Frontend : clés UPPER_SNAKE → snake_case attendu par PostgreSQL.
 * Les clés minuscules natives ont priorité si les deux sont présentes.
 */
function normalizeLegacyE5E6Keys(val: unknown): unknown {
  if (val === null || typeof val !== 'object' || Array.isArray(val)) {
    return val
  }

  const source = val as Record<string, unknown>
  const out: Record<string, unknown> = { ...source }

  if (
    'BLOCK_E5_GOVERNANCE' in source &&
    !('block_e5_governance' in source)
  ) {
    out.block_e5_governance = source.BLOCK_E5_GOVERNANCE
  }

  if (
    'BLOCK_E6_TRANSPARENCE' in source &&
    !('block_e6_transparence' in source)
  ) {
    out.block_e6_transparence = source.BLOCK_E6_TRANSPARENCE
  }

  return out
}

const deploymentPhaseCreateSchema = z
  .string()
  .trim()
  .optional()
  .transform((v) => (!v ? 'en_projet' : v))
  .default('en_projet')

const deploymentCountriesSchema = z.union([
  z.string(),
  z.array(z.string()),
])

const blockGovernanceSchema = z
  .array(z.string())
  .optional()
  .transform((arr) => arr ?? [])

export const CreateUsecaseSchema = z.preprocess(
  normalizeLegacyE5E6Keys,
  z.object({
    name: z.string().trim().min(1),
    description: z.string().trim().min(1),
    ai_category: z.string().trim().min(1),
    responsible_service: z.string().trim().min(1),
    company_id: z.string().uuid(),
    primary_model_id: z.string().uuid().nullable().optional(),
    deployment_date: z.string().optional(),
    status: z.string().optional().default('draft'),
    risk_level: z.string().optional(),
    deployment_countries: deploymentCountriesSchema.optional(),
    deployment_phase: deploymentPhaseCreateSchema,
    block_e5_governance: blockGovernanceSchema,
    block_e6_transparence: blockGovernanceSchema,
  })
)

export const UpdateUsecaseSchema = z
  .object({
    primary_model_id: z.string().uuid().optional().nullable(),
    deployment_countries: z.any().optional(),
    deployment_date: z.string().optional().nullable(),
    description: z.string().trim().min(1).optional(),
    deployment_phase: z
      .string()
      .trim()
      .min(1, { message: 'La phase ne peut pas être vidée' })
      .optional(),
    /** Passe-droit réseau — résolution métier via `resolvePathModeFromBody` dans la route. */
    path_mode: z.string().optional(),
    journey_type: z.string().optional(),
  })
  .strict()

export type CreateUsecaseInput = z.infer<typeof CreateUsecaseSchema>
export type UpdateUsecaseInput = z.infer<typeof UpdateUsecaseSchema>
