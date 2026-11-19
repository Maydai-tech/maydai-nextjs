import type { EcoLogitsEstimationResponse, EcoLogitsImpact } from './types'

type ParsedImpact = {
  min: number | null
  max: number | null
  unit: string | null
}

function finiteNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

export function parseEcoLogitsImpact(impact?: EcoLogitsImpact): ParsedImpact {
  const min = finiteNumber(impact?.value?.min)
  const max = finiteNumber(impact?.value?.max)
  return {
    min,
    max,
    unit: typeof impact?.unit === 'string' ? impact.unit : null,
  }
}

export function flattenEcoLogitsEstimate(response: EcoLogitsEstimationResponse) {
  const impacts = response.impacts ?? {}
  const flattened: Record<string, number | string | null> = {}

  for (const metric of ['energy', 'gwp', 'adpe', 'pe', 'wcf'] as const) {
    const parsed = parseEcoLogitsImpact(impacts[metric])
    flattened[`${metric}_min`] = parsed.min
    flattened[`${metric}_max`] = parsed.max
    flattened[`${metric}_unit`] = parsed.unit
  }

  return flattened
}
