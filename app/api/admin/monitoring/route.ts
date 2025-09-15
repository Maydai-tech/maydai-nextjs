import { NextRequest, NextResponse } from 'next/server'
import { errorMonitor } from '@/lib/error-monitor'

// GET: Obtenir les statistiques de monitoring
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const action = searchParams.get('action') || 'stats'
    const limit = parseInt(searchParams.get('limit') || '50')

    switch (action) {
      case 'stats':
        return NextResponse.json({
          errors: errorMonitor.getErrorStats(),
          performance: errorMonitor.getPerformanceStats(),
          issues: errorMonitor.checkForIssues()
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
