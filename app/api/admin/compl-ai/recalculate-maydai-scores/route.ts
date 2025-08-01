import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { verifyAdminAuth } from '@/lib/admin-auth'
import { 
  recalculateAllMaydaiScores, 
  recalculateModelMaydaiScores, 
  getMaydaiStatistics,
  type ModelScoreResult 
} from '@/lib/maydai-calculator'

interface RecalculateResult {
  success: boolean
  message: string
  results?: ModelScoreResult[]
  total_models?: number
  total_evaluations_updated?: number
  execution_time_ms?: number
}

export async function POST(request: NextRequest) {
  console.log('POST /api/admin/compl-ai/recalculate-maydai-scores - Start')
  
  try {
    // Vérifier l'authentification admin
    console.log('Verifying admin auth...')
    const authResult = await verifyAdminAuth(request)
    if (authResult.error) {
      console.error('Auth failed:', authResult.error)
      return authResult.error
    }
    console.log('Auth successful for user:', authResult.user?.email)

    const startTime = Date.now()
    
    // Récupérer les paramètres optionnels
    const body = await request.json().catch(() => ({}))
    const { model_id } = body

    console.log('Starting MaydAI scores recalculation with TypeScript logic...', { model_id })

    let results: ModelScoreResult[] = []
    let totalEvaluationsUpdated = 0

    if (model_id) {
      // Recalculer pour un modèle spécifique
      try {
        const modelResult = await recalculateModelMaydaiScores(model_id)
        results = [modelResult]
        totalEvaluationsUpdated = modelResult.evaluations_updated
        
      } catch (error) {
        console.error('Erreur lors du recalcul des scores MaydAI pour le modèle:', error)
        return NextResponse.json({
          success: false,
          message: `Erreur lors du recalcul: ${error instanceof Error ? error.message : 'Erreur inconnue'}`
        } as RecalculateResult, { status: 500 })
      }

    } else {
      // Recalculer pour tous les modèles
      try {
        console.log('Calling recalculateAllMaydaiScores()...')
        results = await recalculateAllMaydaiScores()
        console.log(`recalculateAllMaydaiScores returned ${results.length} results`)
        totalEvaluationsUpdated = results.reduce((sum, r) => sum + r.evaluations_updated, 0)
        
      } catch (error) {
        console.error('Erreur lors du recalcul de tous les scores MaydAI:', error)
        console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace')
        return NextResponse.json({
          success: false,
          message: `Erreur lors du recalcul: ${error instanceof Error ? error.message : 'Erreur inconnue'}`
        } as RecalculateResult, { status: 500 })
      }
    }

    const executionTime = Date.now() - startTime

    // Enregistrer le log de recalcul
    try {
      await supabase.from('compl_ai_sync_logs').insert({
        sync_date: new Date().toISOString().split('T')[0],
        status: 'success',
        models_synced: results.length,
        evaluations_synced: totalEvaluationsUpdated,
        error_message: null,
        execution_time_ms: executionTime,
        // Ajouter une note pour indiquer que c'est un recalcul manuel TypeScript
        raw_data: {
          operation: 'manual_maydai_recalculation_typescript',
          model_id: model_id || null,
          recalculated_models: results.length,
          total_evaluations_updated: totalEvaluationsUpdated,
          calculation_method: 'typescript_logic'
        }
      })
    } catch (logError) {
      console.warn('Impossible d\'enregistrer le log de recalcul:', logError)
    }

    const result: RecalculateResult = {
      success: true,
      message: model_id 
        ? `Scores MaydAI recalculés pour le modèle en ${executionTime}ms`
        : `Scores MaydAI recalculés pour ${results.length} modèles en ${executionTime}ms`,
      results,
      total_models: results.length,
      total_evaluations_updated: totalEvaluationsUpdated,
      execution_time_ms: executionTime
    }

    console.log('MaydAI scores recalculation completed:', {
      total_models: results.length,
      total_evaluations_updated: totalEvaluationsUpdated,
      execution_time_ms: executionTime
    })

    return NextResponse.json(result)

  } catch (error) {
    console.error('Erreur lors du recalcul des scores MaydAI:', error)
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : 'Erreur interne du serveur'
    } as RecalculateResult, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    // Vérifier l'authentification admin
    const authResult = await verifyAdminAuth(request)
    if (authResult.error) {
      return authResult.error
    }

    // Récupérer les statistiques des scores MaydAI avec logique TypeScript
    try {
      const stats = await getMaydaiStatistics()
      
      return NextResponse.json({
        success: true,
        message: 'Statistiques des scores MaydAI récupérées',
        stats
      })
      
    } catch (error) {
      console.error('Erreur lors de la récupération des stats:', error)
      return NextResponse.json({
        success: false,
        message: `Erreur lors de la récupération des statistiques: ${error instanceof Error ? error.message : 'Erreur inconnue'}`
      }, { status: 500 })
    }

  } catch (error) {
    console.error('Erreur lors de la récupération des statistiques:', error)
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : 'Erreur interne du serveur'
    }, { status: 500 })
  }
}