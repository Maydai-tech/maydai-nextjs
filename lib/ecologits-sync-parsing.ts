/**
 * Tolérance aux formes hétérogènes renvoyées par l’API EcoLogits (catalogue + estimations).
 */

function coerceFiniteNumber(x: unknown): number | null {
  if (typeof x === 'number' && Number.isFinite(x)) return x
  if (typeof x === 'string') {
    const t = x.trim()
    if (t === '') return null
    const n = Number(t)
    return Number.isFinite(n) ? n : null
  }
  return null
}

/**
 * `architecture.parameters` peut être :
 * - un nombre (milliards de paramètres, ex. 22.2, 123) ;
 * - `{ min, max }` ;
 * - `{ total, active }` (MoE).
 * Retourne une valeur représentative en « unités catalogue » (souvent milliards), ou null si illisible.
 */
export function normalizeArchitectureParametersBillions(parameters: unknown): number | null {
  if (parameters == null) return null

  const scalar = coerceFiniteNumber(parameters)
  if (scalar !== null) return scalar

  if (typeof parameters !== 'object' || parameters === null || Array.isArray(parameters)) return null

  const o = parameters as Record<string, unknown>

  if ('min' in o || 'max' in o) {
    const min = coerceFiniteNumber(o.min)
    const max = coerceFiniteNumber(o.max)
    if (min !== null && max !== null) return (min + max) / 2
    if (min !== null) return min
    if (max !== null) return max
    return null
  }

  if ('total' in o || 'active' in o) {
    const total = coerceFiniteNumber(o.total)
    const active = coerceFiniteNumber(o.active)
    if (active !== null) return active
    if (total !== null) return total
    return null
  }

  return null
}

export function extractArchitectureParametersBillionsFromCatalog(architecture: unknown): number | null {
  if (architecture == null || typeof architecture !== 'object' || Array.isArray(architecture)) return null
  const params = (architecture as Record<string, unknown>).parameters
  return normalizeArchitectureParametersBillions(params)
}

/**
 * Bloc d’impact EcoLogits : `value` peut être `{ min, max }`, un nombre, ou un objet partiel.
 * Ne renvoie jamais NaN : null si non exploitable.
 */
export function ecoImpactMidpointFromApi(impact: { value?: unknown } | null | undefined): number | null {
  if (!impact) return null
  return ecoImpactValueMidpoint(impact.value)
}

function ecoImpactValueMidpoint(value: unknown): number | null {
  if (value == null) return null

  const scalar = coerceFiniteNumber(value)
  if (scalar !== null) return scalar

  if (typeof value !== 'object' || Array.isArray(value)) return null

  const o = value as Record<string, unknown>
  const min = coerceFiniteNumber(o.min)
  const max = coerceFiniteNumber(o.max)
  if (min !== null && max !== null) return (min + max) / 2
  if (min !== null) return min
  if (max !== null) return max

  return null
}
