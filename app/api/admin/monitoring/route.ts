import { NextRequest, NextResponse } from 'next/server'
import { errorMonitor } from '@/lib/error-monitor'
import { exec } from 'node:child_process'
import { promisify } from 'node:util'

export const dynamic = 'force-dynamic'

const execAsync = promisify(exec)

const DEFAULT_PROD_DISK_JSON_URL = 'http://57.130.47.254/monitoring/disk.json'
const DEFAULT_PROD_EMAIL_STATUS_JSON_URL = 'http://57.130.47.254/monitoring/email-status.json'
const MONITORING_FETCH_TIMEOUT_MS = 15_000

function getProdDiskJsonUrl(): string {
  return (
    process.env.MONITORING_PROD_DISK_JSON_URL?.trim() || DEFAULT_PROD_DISK_JSON_URL
  )
}

function getProdEmailStatusJsonUrl(): string {
  return (
    process.env.MONITORING_PROD_EMAIL_STATUS_JSON_URL?.trim() ||
    DEFAULT_PROD_EMAIL_STATUS_JSON_URL
  )
}

type NormalizedProductionDiskUsage = {
  total: number | string
  used: number | string
  free: number | string
  usePercent: string
  updatedAt: string
  /** Présent si le total a été recalculé pour rester cohérent avec utilisé + libre */
  coherenceNote?: string
}

const GIB = 1024 ** 3

/** Valeur comparable en Gio pour used/free/total (nombre petit = déjà en Gio ; grand = octets). */
function toComparableGiB(value: number | string): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    if (value >= 1_000_000_000) return value / GIB
    return value
  }
  const s = String(value).trim().replace(',', '.')
  const n = parseFloat(s.replace(/[^\d.]/g, ''))
  if (!Number.isFinite(n)) return Number.NaN
  const u = s.toUpperCase()
  if (u.includes('TI')) return n * 1024
  if (u.includes('T') && !u.includes('G')) return n * 1024
  if (u.includes('MI')) return n / 1024
  if (u.includes('M') && !u.includes('G') && !u.includes('T')) return n / 1024
  return n
}

function formatTotalMatchingRef(
  sumGi: number,
  used: number | string,
  free: number | string
): number | string {
  const ref = typeof used === 'string' ? used : typeof free === 'string' ? free : used
  const rounded = Math.round(sumGi * 10) / 10
  const display = Number.isInteger(rounded) ? String(Math.round(sumGi)) : String(rounded)
  if (typeof ref === 'string' && /GI/i.test(ref)) {
    return `${display}Gi`
  }
  if (typeof ref === 'string' && /\d\s*G(?:\s|$|[^I])/i.test(ref)) {
    return `${display} G`
  }
  return Math.round(sumGi * 100) / 100
}

/**
 * Corrige un total manifestement faux (ex. taille du disque brut vs partition).
 * On tolère ~12 % d'écart pour réservation système / arrondis df.
 */
function reconcileProductionDiskMetrics(
  d: NormalizedProductionDiskUsage
): NormalizedProductionDiskUsage {
  const t = toComparableGiB(d.total)
  const u = toComparableGiB(d.used)
  const f = toComparableGiB(d.free)
  if (![t, u, f].every((x) => Number.isFinite(x) && x >= 0)) {
    return d
  }
  const sum = u + f
  if (sum <= 0) {
    return d
  }

  const baseline = Math.max(t, sum)
  const relDiff = Math.abs(t - sum) / baseline
  if (relDiff <= 0.12) {
    return d
  }

  const p = Math.min(100, Math.max(0, Math.round((u / sum) * 100)))

  return {
    ...d,
    total: formatTotalMatchingRef(sum, d.used, d.free),
    usePercent: `${p}%`,
    coherenceNote:
      'Le total et le pourcentage affichés sont dérivés de utilisé + libre : la valeur « total » (et éventuellement le %) du fichier distant ne correspondaient pas aux autres mesures.',
  }
}

function normalizeMonitoringDiskPayload(json: unknown): NormalizedProductionDiskUsage {
  if (!json || typeof json !== 'object') {
    throw new Error('Format JSON monitoring invalide')
  }
  const j = json as Record<string, unknown>

  let usePercent: string | null = null
  const up = j.usePercent
  if (typeof up === 'string' && up.trim()) {
    const t = up.trim()
    usePercent = t.includes('%') ? t : `${t}%`
  } else if (typeof up === 'number' && Number.isFinite(up)) {
    usePercent = `${Math.round(up)}%`
  }

  let updatedAt: string | null = null
  const ua = j.updatedAt
  if (typeof ua === 'string' && ua.trim()) {
    updatedAt = ua.trim()
  } else if (typeof ua === 'number' && Number.isFinite(ua)) {
    updatedAt = new Date(ua).toISOString()
  }

  const metric = (primary: string, fallback?: string): number | string | null => {
    const v =
      j[primary] !== undefined && j[primary] !== null
        ? j[primary]
        : fallback !== undefined
          ? j[fallback]
          : undefined
    if (typeof v === 'number' && Number.isFinite(v)) return v
    if (typeof v === 'string' && v.trim() !== '') return v.trim()
    return null
  }

  const total = metric('total')
  const used = metric('used')
  const free = metric('free', 'available')

  if (!usePercent || !updatedAt || total === null || used === null || free === null) {
    throw new Error(
      'Format JSON monitoring invalide (total, used, free ou available, usePercent, updatedAt)'
    )
  }

  return { total, used, free, usePercent, updatedAt }
}

async function monitoringFetch(url: string): Promise<Response> {
  try {
    return await fetch(url, {
      cache: 'no-store',
      signal: AbortSignal.timeout(MONITORING_FETCH_TIMEOUT_MS),
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    if (/abort|timeout|timed out/i.test(msg)) {
      throw new Error('Source monitoring injoignable (délai dépassé)')
    }
    throw new Error(`Source monitoring injoignable (${msg})`)
  }
}

async function getLocalDiskUsage() {
  const { stdout } = await execAsync('df -h /')
  const lines = stdout.trim().split('\n')
  const values = lines[1]?.trim().split(/\s+/)

  if (!values || values.length < 6) {
    throw new Error('Format df inattendu')
  }

  const pctRaw = values[4]
  const usePercent =
    typeof pctRaw === 'string' && pctRaw.includes('%')
      ? pctRaw
      : `${String(pctRaw).replace(/%/g, '')}%`

  const base: NormalizedProductionDiskUsage = {
    total: values[1],
    used: values[2],
    free: values[3],
    usePercent,
    updatedAt: new Date().toISOString(),
  }

  const reconciled = reconcileProductionDiskMetrics(base)
  const note = reconciled.coherenceNote
    ? `${reconciled.coherenceNote} En développement, ces valeurs viennent de « df -h / » sur cette machine (souvent incohérent sur APFS macOS : total conteneur ≠ utilisé + libre).`
    : undefined

  return {
    filesystem: values[0],
    total: reconciled.total,
    used: reconciled.used,
    free: reconciled.free,
    available: reconciled.free,
    usePercent: reconciled.usePercent,
    mountedOn: values[5],
    host: 'local-runtime',
    server: 'local',
    source: 'local',
    updatedAt: reconciled.updatedAt,
    ...(note ? { coherenceNote: note } : {}),
  }
}

async function getProductionDiskUsage() {
  const url = getProdDiskJsonUrl()
  const response = await monitoringFetch(url)
  if (!response.ok) {
    throw new Error(`Source monitoring indisponible (${response.status})`)
  }

  let json: unknown
  try {
    json = await response.json()
  } catch {
    throw new Error('Réponse monitoring : JSON illisible')
  }

  const normalized = normalizeMonitoringDiskPayload(json)
  const reconciled = reconcileProductionDiskMetrics(normalized)

  return {
    ...reconciled,
    source: 'production',
  }
}

type DiskUsageResult = {
  disk: Record<string, unknown> | null
  diskError: string | null
}

async function getDiskUsageResult(): Promise<DiskUsageResult> {
  try {
    const disk = await getProductionDiskUsage()
    return { disk, diskError: null }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    const isDev = process.env.NODE_ENV !== 'production'
    if (isDev) {
      console.error('Erreur lecture disque production, fallback local (dev uniquement):', error)
      try {
        const disk = await getLocalDiskUsage()
        return { disk, diskError: null }
      } catch {
        return { disk: null, diskError: message }
      }
    }

    console.error('Erreur lecture disque production (pas de fallback en prod):', error)
    return { disk: null, diskError: message }
  }
}

async function getProductionEmailStatus() {
  const url = getProdEmailStatusJsonUrl()
  const response = await monitoringFetch(url)
  if (!response.ok) {
    throw new Error(`Source statut email indisponible (${response.status})`)
  }
  let json: unknown
  try {
    json = await response.json()
  } catch {
    throw new Error('Réponse statut email : JSON illisible')
  }
  const o = json && typeof json === 'object' ? (json as Record<string, unknown>) : {}
  return {
    active: Boolean(o.active),
    recipient: typeof o.recipient === 'string' ? o.recipient : '',
    lastSentAt: typeof o.lastSentAt === 'string' ? o.lastSentAt : '',
    lastSubject: typeof o.lastSubject === 'string' ? o.lastSubject : '',
    lastMessageId: typeof o.lastMessageId === 'string' ? o.lastMessageId : '',
    source: 'production',
  }
}

// GET: Obtenir les statistiques de monitoring
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const action = searchParams.get('action') || 'stats'
    const limit = parseInt(searchParams.get('limit') || '50')

    switch (action) {
      case 'stats': {
        const { disk: diskUsage, diskError } = await getDiskUsageResult()
        let emailStatus = null
        try {
          emailStatus = await getProductionEmailStatus()
        } catch {
          emailStatus = null
        }
        return NextResponse.json({
          errors: errorMonitor.getErrorStats(),
          performance: errorMonitor.getPerformanceStats(),
          issues: errorMonitor.checkForIssues(),
          disk: diskUsage,
          diskError,
          email: emailStatus,
        })
      }

      case 'disk': {
        let emailForDisk = null
        try {
          emailForDisk = await getProductionEmailStatus()
        } catch {
          emailForDisk = null
        }
        const { disk, diskError } = await getDiskUsageResult()
        return NextResponse.json({
          disk,
          diskError,
          email: emailForDisk,
        })
      }

      case 'errors':
        return NextResponse.json({
          errors: errorMonitor.getRecentErrors(limit),
        })

      case 'metrics':
        return NextResponse.json({
          metrics: errorMonitor.getRecentMetrics(limit),
        })

      case 'export':
        return NextResponse.json(errorMonitor.exportData())

      case 'cleanup': {
        const days = parseInt(searchParams.get('days') || '7')
        errorMonitor.cleanup(days)
        return NextResponse.json({
          message: `Nettoyage effectué (logs plus anciens que ${days} jours supprimés)`,
        })
      }

      default:
        return NextResponse.json({ error: 'Action non reconnue' }, { status: 400 })
    }
  } catch (error) {
    console.error('Erreur monitoring API:', error)
    return NextResponse.json(
      {
        error: 'Erreur lors de la récupération des données de monitoring',
      },
      { status: 500 }
    )
  }
}

// POST: Actions de monitoring
export async function POST(req: NextRequest) {
  try {
    const { action, ...params } = await req.json()

    switch (action) {
      case 'cleanup': {
        const days = params.days || 7
        errorMonitor.cleanup(days)
        return NextResponse.json({
          message: `Nettoyage effectué (logs plus anciens que ${days} jours supprimés)`,
        })
      }

      case 'check_issues': {
        const issues = errorMonitor.checkForIssues()
        return NextResponse.json(issues)
      }

      default:
        return NextResponse.json({ error: 'Action non reconnue' }, { status: 400 })
    }
  } catch (error) {
    console.error('Erreur monitoring API POST:', error)
    return NextResponse.json(
      {
        error: "Erreur lors de l'exécution de l'action de monitoring",
      },
      { status: 500 }
    )
  }
}
