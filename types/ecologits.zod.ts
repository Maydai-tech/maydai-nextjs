import { z } from 'zod'

/**
 * Helpers
 */
const PgNumeric = z.union([z.number(), z.string()])
const IsoDateTime = z.string()

/**
 * `compl_ai_models` (subset utile + champs EcoLogist)
 * Note: le schéma est strict pour éviter les champs inattendus.
 */
export const ComplAiModelRowSchema = z
  .object({
    id: z.string().uuid(),
    model_name: z.string(),
    model_provider: z.string().nullable().optional(),
    model_type: z.string().nullable().optional(),
    version: z.string().nullable().optional(),

    short_name: z.string().nullable().optional(),
    long_name: z.string().nullable().optional(),
    launch_date: z.string().nullable().optional(),
    model_provider_id: z.number().int().nullable().optional(),

    notes_short: z.string().nullable().optional(),
    notes_long: z.string().nullable().optional(),
    variants: z.array(z.string()).nullable().optional(),

    llm_leader_rank: z.number().int().nullable().optional(),
    compl_ai_rank: z.number().int().nullable().optional(),
    comparia_rank: z.number().int().nullable().optional(),

    input_cost_per_million: PgNumeric.nullable().optional(),
    output_cost_per_million: PgNumeric.nullable().optional(),
    model_size: z.string().nullable().optional(),
    gpqa_score: PgNumeric.nullable().optional(),
    aime_2025_score: PgNumeric.nullable().optional(),
    license: z.string().nullable().optional(),
    context_length: z.number().int().nullable().optional(),
    consumption_wh_per_1k_tokens: PgNumeric.nullable().optional(),
    release_date: z.string().nullable().optional(),
    knowledge_cutoff: z.string().nullable().optional(),
    country: z.string().nullable().optional(),

    eco_provider: z.string().nullable().optional(),
    eco_model: z.string().nullable().optional(),
    eco_status: z.string().nullable().optional(),
    eco_resolved_at: IsoDateTime.nullable().optional(),

    created_at: IsoDateTime,
    updated_at: IsoDateTime,
  })
  .strict()

export type ComplAiModelRow = z.infer<typeof ComplAiModelRowSchema>

/**
 * `eco_methodology_versions`
 */
export const EcoMethodologyVersionRowSchema = z
  .object({
    id: z.string().uuid(),
    ecologits_version: z.string(),
    methodology_date: z.string().nullable().optional(),
    source_url: z.string().nullable().optional(),
    electricity_factor_source: z.string().nullable().optional(),
    pue_default: z.unknown().nullable().optional(),
    units: z.unknown(),
    notes: z.string().nullable().optional(),
    captured_at: IsoDateTime,
  })
  .strict()

export type EcoMethodologyVersionRow = z.infer<typeof EcoMethodologyVersionRowSchema>

/**
 * `eco_evaluations`
 */
export const EcoEvaluationRowSchema = z
  .object({
    id: z.string().uuid(),
    model_id: z.string().uuid(),
    region_code: z.string(),
    run_index: z.number().int(),
    methodology_version_id: z.string().uuid(),
    input_tokens: z.number().int(),
    output_tokens: z.number().int(),
    request_payload: z.unknown(),
    response_payload: z.unknown(),
    latency_s: PgNumeric.nullable().optional(),
    warnings: z.array(z.string()),
    mode: z.enum(['simulated', 'real']),

    energy_usage_min: PgNumeric.nullable().optional(),
    energy_usage_value: PgNumeric.nullable().optional(),
    energy_usage_max: PgNumeric.nullable().optional(),
    energy_embodied_min: PgNumeric.nullable().optional(),
    energy_embodied_value: PgNumeric.nullable().optional(),
    energy_embodied_max: PgNumeric.nullable().optional(),
    energy_total_min: PgNumeric.nullable().optional(),
    energy_total_value: PgNumeric.nullable().optional(),
    energy_total_max: PgNumeric.nullable().optional(),

    gwp_usage_min: PgNumeric.nullable().optional(),
    gwp_usage_value: PgNumeric.nullable().optional(),
    gwp_usage_max: PgNumeric.nullable().optional(),
    gwp_embodied_min: PgNumeric.nullable().optional(),
    gwp_embodied_value: PgNumeric.nullable().optional(),
    gwp_embodied_max: PgNumeric.nullable().optional(),
    gwp_total_min: PgNumeric.nullable().optional(),
    gwp_total_value: PgNumeric.nullable().optional(),
    gwp_total_max: PgNumeric.nullable().optional(),

    adpe_usage_min: PgNumeric.nullable().optional(),
    adpe_usage_value: PgNumeric.nullable().optional(),
    adpe_usage_max: PgNumeric.nullable().optional(),
    adpe_embodied_min: PgNumeric.nullable().optional(),
    adpe_embodied_value: PgNumeric.nullable().optional(),
    adpe_embodied_max: PgNumeric.nullable().optional(),
    adpe_total_min: PgNumeric.nullable().optional(),
    adpe_total_value: PgNumeric.nullable().optional(),
    adpe_total_max: PgNumeric.nullable().optional(),

    pe_usage_min: PgNumeric.nullable().optional(),
    pe_usage_value: PgNumeric.nullable().optional(),
    pe_usage_max: PgNumeric.nullable().optional(),
    pe_embodied_min: PgNumeric.nullable().optional(),
    pe_embodied_value: PgNumeric.nullable().optional(),
    pe_embodied_max: PgNumeric.nullable().optional(),
    pe_total_min: PgNumeric.nullable().optional(),
    pe_total_value: PgNumeric.nullable().optional(),
    pe_total_max: PgNumeric.nullable().optional(),

    wcf_usage_min: PgNumeric.nullable().optional(),
    wcf_usage_value: PgNumeric.nullable().optional(),
    wcf_usage_max: PgNumeric.nullable().optional(),
    wcf_embodied_min: PgNumeric.nullable().optional(),
    wcf_embodied_value: PgNumeric.nullable().optional(),
    wcf_embodied_max: PgNumeric.nullable().optional(),
    wcf_total_min: PgNumeric.nullable().optional(),
    wcf_total_value: PgNumeric.nullable().optional(),
    wcf_total_max: PgNumeric.nullable().optional(),

    created_at: IsoDateTime,
    ingested_at: IsoDateTime,
  })
  .strict()

export type EcoEvaluationRow = z.infer<typeof EcoEvaluationRowSchema>

/**
 * `eco_evaluations_aggregated`
 */
export const EcoEvaluationAggregatedRowSchema = z
  .object({
    id: z.string().uuid(),
    model_id: z.string().uuid(),
    region_code: z.string(),
    methodology_version_id: z.string().uuid(),
    mode: z.enum(['simulated', 'real']),
    runs_count: z.number().int(),
    runs_with_warnings: z.number().int(),

    energy_usage_mean: PgNumeric.nullable().optional(),
    energy_usage_median: PgNumeric.nullable().optional(),
    energy_usage_std: PgNumeric.nullable().optional(),
    energy_usage_min_observed: PgNumeric.nullable().optional(),
    energy_usage_max_observed: PgNumeric.nullable().optional(),

    energy_embodied_mean: PgNumeric.nullable().optional(),
    energy_embodied_median: PgNumeric.nullable().optional(),
    energy_embodied_std: PgNumeric.nullable().optional(),
    energy_embodied_min_observed: PgNumeric.nullable().optional(),
    energy_embodied_max_observed: PgNumeric.nullable().optional(),

    energy_total_mean: PgNumeric.nullable().optional(),
    energy_total_median: PgNumeric.nullable().optional(),
    energy_total_std: PgNumeric.nullable().optional(),
    energy_total_min_observed: PgNumeric.nullable().optional(),
    energy_total_max_observed: PgNumeric.nullable().optional(),

    gwp_usage_mean: PgNumeric.nullable().optional(),
    gwp_usage_median: PgNumeric.nullable().optional(),
    gwp_usage_std: PgNumeric.nullable().optional(),
    gwp_usage_min_observed: PgNumeric.nullable().optional(),
    gwp_usage_max_observed: PgNumeric.nullable().optional(),

    gwp_embodied_mean: PgNumeric.nullable().optional(),
    gwp_embodied_median: PgNumeric.nullable().optional(),
    gwp_embodied_std: PgNumeric.nullable().optional(),
    gwp_embodied_min_observed: PgNumeric.nullable().optional(),
    gwp_embodied_max_observed: PgNumeric.nullable().optional(),

    gwp_total_mean: PgNumeric.nullable().optional(),
    gwp_total_median: PgNumeric.nullable().optional(),
    gwp_total_std: PgNumeric.nullable().optional(),
    gwp_total_min_observed: PgNumeric.nullable().optional(),
    gwp_total_max_observed: PgNumeric.nullable().optional(),

    adpe_usage_mean: PgNumeric.nullable().optional(),
    adpe_usage_median: PgNumeric.nullable().optional(),
    adpe_usage_std: PgNumeric.nullable().optional(),
    adpe_usage_min_observed: PgNumeric.nullable().optional(),
    adpe_usage_max_observed: PgNumeric.nullable().optional(),

    adpe_embodied_mean: PgNumeric.nullable().optional(),
    adpe_embodied_median: PgNumeric.nullable().optional(),
    adpe_embodied_std: PgNumeric.nullable().optional(),
    adpe_embodied_min_observed: PgNumeric.nullable().optional(),
    adpe_embodied_max_observed: PgNumeric.nullable().optional(),

    adpe_total_mean: PgNumeric.nullable().optional(),
    adpe_total_median: PgNumeric.nullable().optional(),
    adpe_total_std: PgNumeric.nullable().optional(),
    adpe_total_min_observed: PgNumeric.nullable().optional(),
    adpe_total_max_observed: PgNumeric.nullable().optional(),

    pe_usage_mean: PgNumeric.nullable().optional(),
    pe_usage_median: PgNumeric.nullable().optional(),
    pe_usage_std: PgNumeric.nullable().optional(),
    pe_usage_min_observed: PgNumeric.nullable().optional(),
    pe_usage_max_observed: PgNumeric.nullable().optional(),

    pe_embodied_mean: PgNumeric.nullable().optional(),
    pe_embodied_median: PgNumeric.nullable().optional(),
    pe_embodied_std: PgNumeric.nullable().optional(),
    pe_embodied_min_observed: PgNumeric.nullable().optional(),
    pe_embodied_max_observed: PgNumeric.nullable().optional(),

    pe_total_mean: PgNumeric.nullable().optional(),
    pe_total_median: PgNumeric.nullable().optional(),
    pe_total_std: PgNumeric.nullable().optional(),
    pe_total_min_observed: PgNumeric.nullable().optional(),
    pe_total_max_observed: PgNumeric.nullable().optional(),

    wcf_usage_mean: PgNumeric.nullable().optional(),
    wcf_usage_median: PgNumeric.nullable().optional(),
    wcf_usage_std: PgNumeric.nullable().optional(),
    wcf_usage_min_observed: PgNumeric.nullable().optional(),
    wcf_usage_max_observed: PgNumeric.nullable().optional(),

    wcf_embodied_mean: PgNumeric.nullable().optional(),
    wcf_embodied_median: PgNumeric.nullable().optional(),
    wcf_embodied_std: PgNumeric.nullable().optional(),
    wcf_embodied_min_observed: PgNumeric.nullable().optional(),
    wcf_embodied_max_observed: PgNumeric.nullable().optional(),

    wcf_total_mean: PgNumeric.nullable().optional(),
    wcf_total_median: PgNumeric.nullable().optional(),
    wcf_total_std: PgNumeric.nullable().optional(),
    wcf_total_min_observed: PgNumeric.nullable().optional(),
    wcf_total_max_observed: PgNumeric.nullable().optional(),

    created_at: IsoDateTime,
    refreshed_at: IsoDateTime,
  })
  .strict()

export type EcoEvaluationAggregatedRow = z.infer<typeof EcoEvaluationAggregatedRowSchema>

