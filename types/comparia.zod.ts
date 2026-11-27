import { z } from 'zod'

export const CompariaActivityFilterSchema = z.enum(['all', 'active', 'archived']).default('all')
export type CompariaActivityFilter = z.infer<typeof CompariaActivityFilterSchema>

export const CompariaQueueStatusSchema = z.enum(['unmatched', 'ignored', 'matched', 'all'])
export type CompariaQueueStatus = z.infer<typeof CompariaQueueStatusSchema>

const RequiredInteger = z.union([z.number(), z.string()]).transform((value, ctx) => {
  const parsed = typeof value === 'number' ? value : Number(value)
  if (!Number.isInteger(parsed)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Entier attendu.' })
    return z.NEVER
  }
  return parsed
})

const NullableNumber = z.union([z.number(), z.string(), z.null()]).optional().transform((value) => {
  if (value == null || value === '') return null
  const parsed = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(parsed) ? parsed : null
})

const NullableText = z.string().nullable().optional().transform((value) => value ?? null)

export const CompariaLinkedModelSchema = z
  .object({
    id: z.string().uuid(),
    slug: z.string().nullable(),
    model_name: z.string(),
    model_provider: z.string().nullable(),
  })
  .strict()

export const CompariaQueueRowSchema = z
  .object({
    id: z.string().uuid(),
    source_id: z.string().min(1),
    organisation: z.string(),
    rank: RequiredInteger,
    parameters_billions: NullableNumber,
    consumption_mwh_per_1k_tokens: NullableNumber,
    bradley_terry_score: NullableNumber,
    license: NullableText,
    size: NullableText,
    release_date: NullableText,
    is_active: z.boolean(),
    missing_since: z.string().nullable().optional().transform((value) => value ?? null),
    link_status: z.enum(['unmatched', 'matched', 'ignored']),
    maydai_model_id: z.string().uuid().nullable(),
    match_method: z.string().nullable(),
    linked_model: z.preprocess(
      (value) => (Array.isArray(value) ? value[0] ?? null : value ?? null),
      CompariaLinkedModelSchema.nullable(),
    ),
  })
  .strict()

export type CompariaQueueRow = z.infer<typeof CompariaQueueRowSchema>

export const CompariaMaydaiOptionSchema = z
  .object({
    id: z.string().uuid(),
    slug: z.string().nullable(),
    model_name: z.string(),
    model_provider: z.string().nullable(),
    short_name: z.string().nullable().optional(),
    long_name: z.string().nullable().optional(),
    variants: z.unknown().optional(),
    merged_into_id: z.string().uuid().nullable().optional(),
  })
  .strict()

export type CompariaMaydaiOption = z.infer<typeof CompariaMaydaiOptionSchema>
