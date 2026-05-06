import { z } from 'zod'
import { PLAN_IDS, type PlanId } from '@/lib/stripe/config/plans'

/**
 * Valide qu'une chaîne (ex. query `?plan=`) est exactement l'un des IDs
 * de forfait définis dans `PLAN_IDS` / `PlanId`.
 */
export const planIdSchema: z.ZodType<PlanId> = z.enum(
  PLAN_IDS as unknown as [PlanId, ...PlanId[]]
)
