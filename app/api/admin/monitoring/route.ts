import { NextRequest, NextResponse } from 'next/server'
import { errorMonitor } from '@/lib/error-monitor'
import { exec } from 'node:child_process'
import { promisify } from 'node:util'

export const dynamic = 'force-dynamic'

const execAsync = promisify(exec)
const PROD_DISK_JSON_URL = 'http://57.130.47.254/monitoring/disk.json'
const PROD_EMAIL_STATUS_JSON_URL = 'http://57.130.47.254/monitoring/email-status.json'

type ProductionDiskUsage = {
  total: number
  used: number
  free: number
  usePercent: string
  updatedAt: string
}

async function getLocalDiskUsage() {
  const { stdout } = await execAsync('df -h /')
  const lines = stdout.trim().split('\n')
  const values = lines[1]?.trim().split(/\s+/)

  if (!values || values.length < 6) {
    throw new Error('Format df inattendu')
  }

  return {
    filesystem: values[0],
    total: values[1],
    used: values[2],
    available: values[3],
    usePercent: values[4],
    mountedOn: values[5],
    host: 'local-runtime',
    server: 'local',
    source: 'local',
  }
}

async function getProductionDiskUsage() {
  const response = await fetch(PROD_DISK_JSON_URL, { cache: 'no-store' })
  if (!response.ok) {
    throw new Error(`Source monitoring indisponible (${response.status})`)
  }

  const json = await response.json()
  if (
    !json ||
    typeof json.usePercent !== 'string' ||
    typeof json.updatedAt !== 'string' ||
    typeof json.total !== 'number' ||
    typeof json.used !== 'number' ||
    typeof json.free !== 'number'
  ) {
    throw new Error('Format JSON monitoring invalide')
  }

  return {
    ...(json as ProductionDiskUsage),
    source: 'production',
  }
}

async function getDiskUsage() {
  try {
    return await getProductionDiskUsage()
  } catch (error) {
    // Important: en production (ex: Vercel), `df -h /` reflète le runtime Next.js, pas le serveur 57.130.47.254.
    // On évite donc d'afficher un "fallback" trompeur.
    const isDev = process.env.NODE_ENV !== 'production'
    if (isDev) {
      console.error('Erreur lecture disque production, fallback local (dev uniquement):', error)
      return getLocalDiskUsage()
    }

    console.error('Erreur lecture disque production (pas de fallback en prod):', error)
    return null
  }
}

async function getProductionEmailStatus() {
  const response = await fetch(PROD_EMAIL_STATUS_JSON_URL, { cache: 'no-store' })
  if (!response.ok) {
    throw new Error(`Source statut email indisponible (${response.status})`)
  }
  const json = await response.json()
  return {
    active: Boolean(json?.active),
    recipient: typeof json?.recipient === 'string' ? json.recipient : '',
    lastSentAt: typeof json?.lastSentAt === 'string' ? json.lastSentAt : '',
    lastSubject: typeof json?.lastSubject === 'string' ? json.lastSubject : '',
    lastMessageId: typeof json?.lastMessageId === 'string' ? json.lastMessageId : '',
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
      case 'stats':
        const diskUsage = await getDiskUsage()
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
          email: emailStatus,
        })

      case 'disk':
        let emailForDisk = null
        try {
          emailForDisk = await getProductionEmailStatus()
        } catch {
          emailForDisk = null
        }
        return NextResponse.json({
          disk: await getDiskUsage(),
          email: emailForDisk,
        })

      case 'errors':
        return NextResponse.json({
          errors: errorMonitor.getRecentErrors(limit)
        })

      case 'metrics':
        return NextResponse.json({
          metrics: errorMonitor.getRecentMetrics(limit)
        })

      case 'export':
        return NextResponse.json(errorMonitor.exportData())

      case 'cleanup':
        const days = parseInt(searchParams.get('days') || '7')
        errorMonitor.cleanup(days)
        return NextResponse.json({
          message: `Nettoyage effectué (logs plus anciens que ${days} jours supprimés)`
        })

      default:
        return NextResponse.json({ error: 'Action non reconnue' }, { status: 400 })
    }

  } catch (error) {
    console.error('Erreur monitoring API:', error)
    return NextResponse.json({ 
      error: 'Erreur lors de la récupération des données de monitoring' 
    }, { status: 500 })
  }
}

// POST: Actions de monitoring
export async function POST(req: NextRequest) {
  try {
    const { action, ...params } = await req.json()

    switch (action) {
      case 'cleanup':
        const days = params.days || 7
        errorMonitor.cleanup(days)
        return NextResponse.json({
          message: `Nettoyage effectué (logs plus anciens que ${days} jours supprimés)`
        })

      case 'check_issues':
        const issues = errorMonitor.checkForIssues()
        return NextResponse.json(issues)

      default:
        return NextResponse.json({ error: 'Action non reconnue' }, { status: 400 })
    }

  } catch (error) {
    console.error('Erreur monitoring API POST:', error)
    return NextResponse.json({ 
      error: 'Erreur lors de l\'exécution de l\'action de monitoring' 
    }, { status: 500 })
  }
}
