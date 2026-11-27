import { z } from 'zod'

import { EcoLogitsLinkStatusSchema } from '@/lib/bench-llm/veille-columns'

/**
 * Helpers
 */
const PgNumeric = z.union([z.number(), z.string()])
const IsoDateTime = z.string()

/**
 * `compl_ai_models` (subset utile Bench / EcoLogits)
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

/** État de rapprochement d'une ligne `ecologits_models`. */
export const EcologitsModelLinkStateSchema = z
  .object({
    id: z.string().uuid(),
    name: z.string(),
    link_status: EcoLogitsLinkStatusSchema,
  })
  .strict()

export type EcologitsModelLinkState = z.infer<typeof EcologitsModelLinkStateSchema>

const IMPACT_COUNT_MAX = 5

export const EcologitsEstimateSummarySchema = z
  .object({
    status: z.enum(['complete', 'empty_metrics', 'no_estimate']),
    filled_impacts_count: z.number().int().min(0).max(IMPACT_COUNT_MAX),
    output_token_count: z.number().int().nullable(),
    electricity_mix_zone: z.string().nullable(),
    energy_wh_min: z.number().nullable(),
    energy_wh_max: z.number().nullable(),
    energy_raw_min: z.number().nullable(),
    energy_raw_max: z.number().nullable(),
    energy_raw_unit: z.string().nullable(),
    gwp_gco2_min: z.number().nullable(),
    gwp_gco2_max: z.number().nullable(),
    gwp_raw_min: z.number().nullable(),
    gwp_raw_max: z.number().nullable(),
    gwp_raw_unit: z.string().nullable(),
  })
  .strict()

export type EcologitsEstimateSummary = z.infer<typeof EcologitsEstimateSummarySchema>

export interface EcologitsEstimateInput {
  output_token_count?: number | string | null
  electricity_mix_zone?: string | null
  energy_min?: number | string | null
  energy_max?: number | string | null
  energy_unit?: string | null
  gwp_min?: number | string | null
  gwp_max?: number | string | null
  gwp_unit?: string | null
  adpe_min?: number | string | null
  adpe_max?: number | string | null
  pe_min?: number | string | null
  pe_max?: number | string | null
  wcf_min?: number | string | null
  wcf_max?: number | string | null
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function finiteMetric(value: number | string | null | undefined): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

function integerOrNull(value: number | string | null | undefined): number | null {
  const parsed = finiteMetric(value)
  return parsed != null && Number.isInteger(parsed) ? parsed : null
}

function textOrNull(value: string | null | undefined): string | null {
  return typeof value === 'string' ? value : null
}

function pairFilled(min: number | string | null | undefined, max: number | string | null | undefined): boolean {
  return finiteMetric(min) != null && finiteMetric(max) != null
}

function convertEnergyWh(value: number | null, unit: string | null): number | null {
  if (value == null) return null
  if (unit === 'kWh') return value * 1000
  if (unit === 'Wh') return value
  return null
}

function convertGwpGco2(value: number | null, unit: string | null): number | null {
  if (value == null) return null
  if (unit === 'kgCO2eq') return value * 1000
  return null
}

export function buildEcologitsEstimateSummary(estimate?: EcologitsEstimateInput | null): EcologitsEstimateSummary {
  if (estimate == null) {
    return EcologitsEstimateSummarySchema.parse({
      status: 'no_estimate',
      filled_impacts_count: 0,
      output_token_count: null,
      electricity_mix_zone: null,
      energy_wh_min: null,
      energy_wh_max: null,
      energy_raw_min: null,
      energy_raw_max: null,
      energy_raw_unit: null,
      gwp_gco2_min: null,
      gwp_gco2_max: null,
      gwp_raw_min: null,
      gwp_raw_max: null,
      gwp_raw_unit: null,
    })
  }
  const filled = [
    pairFilled(estimate.energy_min, estimate.energy_max),
    pairFilled(estimate.gwp_min, estimate.gwp_max),
    pairFilled(estimate.adpe_min, estimate.adpe_max),
    pairFilled(estimate.pe_min, estimate.pe_max),
    pairFilled(estimate.wcf_min, estimate.wcf_max),
  ].filter(Boolean).length
  const energyUnit = textOrNull(estimate.energy_unit)
  const gwpUnit = textOrNull(estimate.gwp_unit)
  const energyMin = finiteMetric(estimate.energy_min)
  const energyMax = finiteMetric(estimate.energy_max)
  const gwpMin = finiteMetric(estimate.gwp_min)
  const gwpMax = finiteMetric(estimate.gwp_max)
  return EcologitsEstimateSummarySchema.parse({
    status: filled === IMPACT_COUNT_MAX ? 'complete' : 'empty_metrics',
    filled_impacts_count: filled,
    output_token_count: integerOrNull(estimate.output_token_count),
    electricity_mix_zone: textOrNull(estimate.electricity_mix_zone),
    energy_wh_min: convertEnergyWh(energyMin, energyUnit),
    energy_wh_max: convertEnergyWh(energyMax, energyUnit),
    energy_raw_min: energyMin,
    energy_raw_max: energyMax,
    energy_raw_unit: energyUnit,
    gwp_gco2_min: convertGwpGco2(gwpMin, gwpUnit),
    gwp_gco2_max: convertGwpGco2(gwpMax, gwpUnit),
    gwp_raw_min: gwpMin,
    gwp_raw_max: gwpMax,
    gwp_raw_unit: gwpUnit,
  })
}

function finiteParameter(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

function formatParameterAtom(value: unknown): string | null {
  if (typeof value === 'string' && value.trim() !== '' && finiteParameter(value) == null) return value.trim()
  if (typeof value === 'number' || typeof value === 'string') {
    const direct = finiteParameter(value)
    return direct == null ? null : `${direct}B`
  }
  if (!isRecord(value)) return null
  if (!('min' in value) && !('max' in value)) return null
  const min = finiteParameter(value.min)
  const max = finiteParameter(value.max)
  return min != null && max != null ? `${min}–${max}B` : null
}

function formatParameters(value: unknown): string | null {
  if (value == null) return null
  if (!isRecord(value)) return formatParameterAtom(value)
  if ('total' in value || 'active' in value) {
    const total = formatParameterAtom(value.total)
    const active = formatParameterAtom(value.active)
    const parts: string[] = []
    if (total) parts.push(`${total} total`)
    if (active) parts.push(`(${active} actifs)`)
    return parts.length > 0 ? parts.join(' ') : null
  }
  if ('min' in value || 'max' in value) return formatParameterAtom(value)
  return null
}

export function formatEcologitsArchitecture(arch?: unknown): string {
  if (arch == null) return 'Non renseignée'
  if (typeof arch === 'string') return arch.trim() ? arch.trim() : 'Non renseignée'
  if (Array.isArray(arch)) return arch.length === 0 ? 'Non renseignée' : JSON.stringify(arch)
  if (!isRecord(arch) || Object.keys(arch).length === 0) return 'Non renseignée'
  const type = typeof arch.type === 'string' ? arch.type.trim() : ''
  const parameters = formatParameters('parameters' in arch ? arch.parameters : undefined)
  if (type && parameters) return `${type} · ${parameters}`
  if (parameters && (Object.keys(arch).length === 1 && 'parameters' in arch)) return parameters
  if (type && !('parameters' in arch)) return type
  return JSON.stringify(arch)
}

export function ecologitsEstimateIsComplete(estimate: unknown): boolean {
  return selectStoredEcologitsEstimate(estimate).summary.status === 'complete'
}

export function selectStoredEcologitsEstimate(value: unknown): {
  summary: EcologitsEstimateSummary
  estimate: Record<string, unknown> | null
} {
  const rows = Array.isArray(value) ? value.filter(isRecord) : isRecord(value) ? [value] : []
  if (rows.length === 0) {
    return { summary: buildEcologitsEstimateSummary(null), estimate: null }
  }
  let best = rows[0]!
  let bestSummary = buildEcologitsEstimateSummary(readEstimateInput(best))
  for (const row of rows.slice(1)) {
    const summary = buildEcologitsEstimateSummary(readEstimateInput(row))
    if (preferEcologitsEstimateSummary(bestSummary, summary) === summary) {
      best = row
      bestSummary = summary
    }
  }
  return { summary: bestSummary, estimate: best }
}

function readEstimateInput(row: Record<string, unknown>): EcologitsEstimateInput {
  return {
    output_token_count: metricField(row.output_token_count),
    electricity_mix_zone: typeof row.electricity_mix_zone === 'string' ? row.electricity_mix_zone : null,
    energy_min: metricField(row.energy_min),
    energy_max: metricField(row.energy_max),
    energy_unit: typeof row.energy_unit === 'string' ? row.energy_unit : null,
    gwp_min: metricField(row.gwp_min),
    gwp_max: metricField(row.gwp_max),
    gwp_unit: typeof row.gwp_unit === 'string' ? row.gwp_unit : null,
    adpe_min: metricField(row.adpe_min),
    adpe_max: metricField(row.adpe_max),
    pe_min: metricField(row.pe_min),
    pe_max: metricField(row.pe_max),
    wcf_min: metricField(row.wcf_min),
    wcf_max: metricField(row.wcf_max),
  }
}

function metricField(value: unknown): number | string | null {
  if (typeof value === 'number' || typeof value === 'string') return value
  return null
}

export function preferEcologitsEstimateSummary(current: EcologitsEstimateSummary, candidate: EcologitsEstimateSummary): EcologitsEstimateSummary {
  if (candidate.filled_impacts_count !== current.filled_impacts_count) {
    return candidate.filled_impacts_count > current.filled_impacts_count ? candidate : current
  }
  const candidateCanonical = candidate.output_token_count === 1000 && candidate.electricity_mix_zone === 'FRA'
  const currentCanonical = current.output_token_count === 1000 && current.electricity_mix_zone === 'FRA'
  if (candidateCanonical !== currentCanonical) return candidateCanonical ? candidate : current
  return current
}

export const ExistingEcologitsLinkSchema = z
  .object({
    ecologits_model_id: z.string().uuid(),
    provider: z.string(),
    name: z.string(),
    match_method: z.string(),
    is_active: z.boolean(),
    architecture_label: z.string(),
    estimate_summary: EcologitsEstimateSummarySchema,
  })
  .strict()

export type ExistingEcologitsLink = z.infer<typeof ExistingEcologitsLinkSchema>

const EcologitsLinkedModelSchema = z
  .object({
    id: z.string().uuid(),
    slug: z.string().nullable(),
    model_name: z.string(),
    model_provider: z.string().nullable(),
    lifecycle_status: z.string().nullable(),
    role: z.string().nullable(),
    match_method: z.enum(['exact', 'manual']),
  })
  .strict()

export const EcologitsQueueRowSchema = z
  .object({
    id: z.string().uuid(),
    provider: z.string(),
    name: z.string(),
    normalized_provider: z.string(),
    normalized_name: z.string(),
    link_status: EcoLogitsLinkStatusSchema,
    is_active: z.boolean(),
    warnings: z.array(z.unknown()),
    architecture: z.unknown().nullable(),
    architecture_label: z.string(),
    estimate_summary: EcologitsEstimateSummarySchema,
    linked_model: EcologitsLinkedModelSchema.nullable(),
  })
  .strict()

export type EcologitsQueueRow = z.infer<typeof EcologitsQueueRowSchema>

const EcologitsModelId = z.string().uuid()

export const EcologitsReconcileActionBodySchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('match'),
    ecologits_model_id: EcologitsModelId,
    maydai_model_id: EcologitsModelId,
    conflict_mode: z.enum(['require_explicit', 'add', 'replace_all']).optional().default('require_explicit'),
  }).strict(),
  z.object({
    action: z.literal('ignore'),
    ecologits_model_id: EcologitsModelId,
  }).strict(),
  z.object({
    action: z.literal('unignore'),
    ecologits_model_id: EcologitsModelId,
  }).strict(),
  z.object({
    action: z.literal('unlink'),
    ecologits_model_id: EcologitsModelId,
  }).strict(),
  z.object({
    action: z.literal('ignore_many'),
    ecologits_model_ids: z.array(EcologitsModelId).min(1),
  }).strict(),
  z.object({
    action: z.literal('unignore_many'),
    ecologits_model_ids: z.array(EcologitsModelId).min(1),
  }).strict(),
])

export type EcologitsReconcileActionBody = z.infer<typeof EcologitsReconcileActionBodySchema>

/** Corps de `PUT /api/admin/ecologits/models/[id]/link`. `{}` et un JSON invalide sont rejetés. */
export const EcologitsPutLinkBodySchema = z
  .object({
    maydai_model_id: z.string().uuid().nullable(),
  })
  .strict()

export type EcologitsPutLinkBody = z.infer<typeof EcologitsPutLinkBodySchema>

