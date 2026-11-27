import { z } from 'zod'

import { EcoLogitsLinkStatusSchema } from '@/lib/bench-llm/veille-columns'
import { EcologitsQueueRowSchema, ExistingEcologitsLinkSchema } from '@/types/ecologits.zod'

export const BenchSourceSlugSchema = z.enum([
  'llm-stats',
  'ecologits',
  'comparia',
  'compl-ai',
  'system-card',
])

export type BenchSourceSlug = z.infer<typeof BenchSourceSlugSchema>

export const SheetColumnHintSchema = z
  .object({
    column_letter: z.string().min(1),
    header: z.string().min(1),
    expected_hint: z.string().min(1),
  })
  .strict()

export const SheetGuidanceSchema = z
  .object({
    sheet_url: z.string().nullable(),
    row_number: z.number().int().positive().nullable(),
    in_sheet: z.boolean(),
    sheet_status: z.string().nullable(),
    columns_to_qualify: z.array(SheetColumnHintSchema),
    columns_to_merge: z.array(SheetColumnHintSchema),
  })
  .strict()

export type SheetGuidance = z.infer<typeof SheetGuidanceSchema>

export const MaydaiTargetOptionSchema = z
  .object({
    id: z.string().uuid(),
    slug: z.string().nullable(),
    model_name: z.string(),
    model_provider: z.string().nullable(),
    role: z.string().nullable(),
    lifecycle_status: z.string().nullable(),
    existing_ecologits_links: z.array(ExistingEcologitsLinkSchema),
  })
  .strict()

export type MaydaiTargetOption = z.infer<typeof MaydaiTargetOptionSchema>

export const BenchSourceHeaderSchema = z
  .object({
    catalogInServiceTotal: z.number().int().nonnegative(),
    activeInCatalog: z.number().int().nonnegative(),
    deprecatedInCatalog: z.number().int().nonnegative(),
    inServiceInCatalog: z.number().int().nonnegative(),
    totalInCatalog: z.number().int().nonnegative(),
    inServiceCompletionPercent: z.number(),
    lastRun: z
      .object({
        status: z.string().nullable(),
        modelsSynced: z.number().int().nullable(),
        startedAt: z.string().nullable(),
      })
      .strict()
      .nullable(),
    actionableCount: z.number().int().nonnegative(),
    actionableLabel: z.string(),
  })
  .strict()

const RejectedRowsSchema = z
  .object({
    count: z.number().int().nonnegative(),
    messages: z.array(z.string()),
  })
  .strict()

const UnqualifiedModelSchema = z
  .object({
    id: z.string().uuid(),
    slug: z.string().nullable(),
    model_name: z.string(),
    model_provider: z.string().nullable(),
    role: z.string().nullable(),
    lifecycle_status: z.string().nullable(),
    created_at: z.string().nullable(),
    guidance: SheetGuidanceSchema,
  })
  .strict()

const LlmStatsIssueSchema = z
  .object({
    message: z.string(),
    provider: z.string().nullable(),
    model_name: z.string().nullable(),
    conflict: z.string().nullable(),
  })
  .strict()

const CreatedModelSchema = z
  .object({
    id: z.string().nullable(),
    model_name: z.string(),
    model_provider: z.string().nullable(),
  })
  .strict()

const SystemCardBucketSchema = z
  .object({
    system_card_status: z.enum(['missing', 'error_no_system_card', 'generated']),
    models: z.array(UnqualifiedModelSchema),
  })
  .strict()

const shared = {
  header: BenchSourceHeaderSchema,
  maydaiOptions: z.array(MaydaiTargetOptionSchema),
  rejected: RejectedRowsSchema,
}

export const BenchSourceDetailResponseSchema = z.discriminatedUnion('source', [
  z.object({
    source: z.literal('ecologits'),
    ...shared,
    counts: z.object({
      unmatched: z.number().int().nonnegative(),
      ignored: z.number().int().nonnegative(),
      matched: z.number().int().nonnegative(),
    }).strict(),
    rows: z.array(EcologitsQueueRowSchema),
    lastRunErrors: z.array(z.string()),
  }).strict(),
  z.object({
    source: z.literal('comparia'),
    ...shared,
    counts: z.object({
      unmatched: z.number().int().nonnegative(),
      ignored: z.number().int().nonnegative(),
      matched: z.number().int().nonnegative(),
    }).strict(),
    lastRun: z.object({
      status: z.string().nullable(),
      rows_imported: z.number().int().nullable(),
      unmatched_count: z.number().int().nullable(),
      ignored_count: z.number().int().nullable(),
      matched_count: z.number().int().nullable(),
      errors: z.array(z.string()),
    }).strict().nullable(),
  }).strict(),
  z.object({
    source: z.literal('llm-stats'),
    ...shared,
    unqualified_models: z.array(UnqualifiedModelSchema),
    last_run_issues: z.object({
      status: z.string().nullable(),
      started_at: z.string().nullable(),
      created_models: z.array(CreatedModelSchema),
      errors: z.array(LlmStatsIssueSchema),
    }).strict().nullable(),
  }).strict(),
  z.object({
    source: z.literal('compl-ai'),
    ...shared,
    unqualified_models: z.array(UnqualifiedModelSchema),
    last_run_issues: z.array(z.object({
      sync_date: z.string().nullable(),
      status: z.string().nullable(),
      models_synced: z.number().int().nullable(),
      evaluations_synced: z.number().int().nullable(),
      error_message: z.string().nullable(),
    }).strict()),
  }).strict(),
  z.object({
    source: z.literal('system-card'),
    ...shared,
    buckets: z.array(SystemCardBucketSchema),
  }).strict(),
])

export type BenchSourceDetailResponse = z.infer<typeof BenchSourceDetailResponseSchema>

export { EcoLogitsLinkStatusSchema }
