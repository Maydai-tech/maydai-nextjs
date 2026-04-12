/** Agrégations purement locales pour le dashboard admin (runs parcours court / long). */

export function medianSeconds(values: number[]): number | null {
  const v = values.filter((n) => Number.isFinite(n) && n >= 0).sort((a, b) => a - b)
  if (v.length === 0) return null
  const mid = Math.floor(v.length / 2)
  if (v.length % 2 === 1) return v[mid]
  return (v[mid - 1] + v[mid]) / 2
}

export function meanSeconds(values: number[]): number | null {
  const v = values.filter((n) => Number.isFinite(n) && n >= 0)
  if (v.length === 0) return null
  return v.reduce((a, b) => a + b, 0) / v.length
}

export function completionSecondsFromTimestamps(
  startedAtIso: string,
  completedAtIso: string
): number {
  const a = new Date(startedAtIso).getTime()
  const b = new Date(completedAtIso).getTime()
  if (!Number.isFinite(a) || !Number.isFinite(b) || b < a) return 0
  return Math.floor((b - a) / 1000)
}
