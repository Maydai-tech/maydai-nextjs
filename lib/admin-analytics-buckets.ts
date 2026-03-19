/**
 * Agrégations temporelles pour l'admin Analytics (fuseau Europe/Paris).
 * Semaines ISO (lundi → dimanche) et trimestres calendaires Q1–Q4.
 */

import { addDays, getISOWeek, getISOWeekYear } from 'date-fns'
import { formatInTimeZone, fromZonedTime } from 'date-fns-tz'

export const ANALYTICS_TIMEZONE = 'Europe/Paris'

export type AnalyticsGranularity = 'day' | 'week' | 'month' | 'quarter'

/** Date civile à Paris (sans fuseau) à partir d'un instant UTC */
export function parisYmd(utcDate: Date): { y: number; m: number; d: number } {
  const ymd = formatInTimeZone(utcDate, ANALYTICS_TIMEZONE, 'yyyy-MM-dd')
  const [y, m, d] = ymd.split('-').map(Number)
  return { y, m, d }
}

function atNoonUtc(y: number, m: number, d: number): Date {
  return new Date(Date.UTC(y, m - 1, d, 12, 0, 0))
}

/** Clé de regroupement stable pour un instant UTC */
export function bucketKeyForInstant(
  utcDate: Date,
  granularity: AnalyticsGranularity
): string {
  const { y, m, d } = parisYmd(utcDate)
  const noon = atNoonUtc(y, m, d)

  switch (granularity) {
    case 'day':
      return formatInTimeZone(utcDate, ANALYTICS_TIMEZONE, 'yyyy-MM-dd')
    case 'week': {
      const isoY = getISOWeekYear(noon)
      const isoW = getISOWeek(noon)
      return `${isoY}-W${String(isoW).padStart(2, '0')}`
    }
    case 'month':
      return `${y}-${String(m).padStart(2, '0')}`
    case 'quarter': {
      const q = Math.floor((m - 1) / 3) + 1
      return `${y}-Q${q}`
    }
    default:
      return formatInTimeZone(utcDate, ANALYTICS_TIMEZONE, 'yyyy-MM-dd')
  }
}

/** Libellé court pour l’axe X */
export function formatBucketLabel(key: string, granularity: AnalyticsGranularity): string {
  if (granularity === 'day') {
    const [yy, mm, dd] = key.split('-')
    return `${dd}/${mm}`
  }
  if (granularity === 'week') {
    const m = key.match(/^(\d{4})-W(\d{2})$/)
    if (m) return `S${m[2]} ${m[1]}`
    return key
  }
  if (granularity === 'month') {
    const m = key.match(/^(\d{4})-(\d{2})$/)
    if (m) {
      const months = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.']
      return `${months[Number(m[2]) - 1]} ${m[1]}`
    }
    return key
  }
  if (granularity === 'quarter') {
    const m = key.match(/^(\d{4})-Q([1-4])$/)
    if (m) return `T${m[2]} ${m[1]}`
    return key
  }
  return key
}

/**
 * Borne UTC [start, end] pour une plage de dates calendaires à Paris (inclusif).
 */
export function parisDateRangeToUtcBounds(fromYmd: string, toYmd: string): {
  startUtc: Date
  endUtc: Date
} {
  const startUtc = fromZonedTime(`${fromYmd}T00:00:00`, ANALYTICS_TIMEZONE)
  const endUtc = fromZonedTime(`${toYmd}T23:59:59.999`, ANALYTICS_TIMEZONE)
  return { startUtc, endUtc }
}

/**
 * Liste ordonnée des clés de buckets entre deux dates Paris (inclusif),
 * en parcourant jour par jour pour ne rien oublier (buckets vides possibles).
 */
export function enumerateBucketKeys(
  fromYmd: string,
  toYmd: string,
  granularity: AnalyticsGranularity
): string[] {
  const { startUtc, endUtc } = parisDateRangeToUtcBounds(fromYmd, toYmd)
  const keys: string[] = []
  const seen = new Set<string>()

  let cur = startUtc
  while (cur <= endUtc) {
    const k = bucketKeyForInstant(cur, granularity)
    if (!seen.has(k)) {
      seen.add(k)
      keys.push(k)
    }
    cur = addDays(cur, 1)
  }
  return keys
}

/** Trie les clés chronologiquement (jour, mois, trimestre, semaine ISO) */
export function sortBucketKeys(
  keys: string[],
  granularity: AnalyticsGranularity
): string[] {
  const copy = [...keys]
  copy.sort((a, b) => compareBucketKeys(a, b, granularity))
  return copy
}

function compareBucketKeys(
  a: string,
  b: string,
  granularity: AnalyticsGranularity
): number {
  if (a === b) return 0
  if (granularity === 'day' || granularity === 'month') {
    return a.localeCompare(b)
  }
  if (granularity === 'quarter') {
    const pa = parseQuarter(a)
    const pb = parseQuarter(b)
    if (!pa || !pb) return a.localeCompare(b)
    if (pa.y !== pb.y) return pa.y - pb.y
    return pa.q - pb.q
  }
  if (granularity === 'week') {
    const wa = parseIsoWeek(a)
    const wb = parseIsoWeek(b)
    if (!wa || !wb) return a.localeCompare(b)
    if (wa.y !== wb.y) return wa.y - wb.y
    return wa.w - wb.w
  }
  return a.localeCompare(b)
}

function parseQuarter(key: string): { y: number; q: number } | null {
  const m = key.match(/^(\d{4})-Q([1-4])$/)
  if (!m) return null
  return { y: Number(m[1]), q: Number(m[2]) }
}

function parseIsoWeek(key: string): { y: number; w: number } | null {
  const m = key.match(/^(\d{4})-W(\d{2})$/)
  if (!m) return null
  return { y: Number(m[1]), w: Number(m[2]) }
}
