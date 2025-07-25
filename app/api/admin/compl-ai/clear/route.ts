import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

interface ClearResult {
  success: boolean
  message: string
  stats: {
    evaluationsDeleted: number
    modelsDeleted: number
    syncLogsDeleted: number
    errors: string[]
  }
}

export async function POST(request: NextRequest) {
  try {
    // Vérifier l'authentification via l'en-tête Authorization
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Token d\'authentification manquant' }, { status: 401 })
    }

    // Obtenir l'utilisateur connecté avec le token
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Token invalide' }, { status: 401 })
    }

    // Vérifier les droits admin (admin et super_admin peuvent effacer toutes les données)
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || (profile.role !== 'admin' && profile.role !== 'super_admin')) {
      return NextResponse.json({ 
        error: 'Droits insuffisants. Seuls les administrateurs peuvent effacer toutes les données.' 
      }, { status: 403 })
    }

    const startTime = Date.now()
    const stats = {
      evaluationsDeleted: 0,
      modelsDeleted: 0,
      syncLogsDeleted: 0,
      errors: [] as string[]
    }

    console.log(`Début de la suppression des données COMPL-AI par l'utilisateur ${user.email}`)

    // Supprimer dans l'ordre inverse des dépendances (évaluations -> modèles -> logs)

    // 1. Supprimer toutes les évaluations COMPL-AI
    try {
      const { data: evaluationsToDelete } = await supabase
        .from('compl_ai_evaluations')
        .select('id')

      if (evaluationsToDelete && evaluationsToDelete.length > 0) {
        const { error: deleteEvaluationsError } = await supabase
          .from('compl_ai_evaluations')
          .delete()
          .neq('id', '00000000-0000-0000-0000-000000000000') // Supprimer tous les enregistrements

        if (deleteEvaluationsError) {
          stats.errors.push(`Erreur suppression évaluations: ${deleteEvaluationsError.message}`)
        } else {
          stats.evaluationsDeleted = evaluationsToDelete.length
          console.log(`${stats.evaluationsDeleted} évaluations supprimées`)
        }
      }
    } catch (error) {
      stats.errors.push(`Erreur lors de la suppression des évaluations: ${error instanceof Error ? error.message : 'Erreur inconnue'}`)
    }

    // 2. Supprimer tous les modèles COMPL-AI
    try {
      const { data: modelsToDelete } = await supabase
        .from('compl_ai_models')
        .select('id')

      if (modelsToDelete && modelsToDelete.length > 0) {
        const { error: deleteModelsError } = await supabase
          .from('compl_ai_models')
          .delete()
          .neq('id', '00000000-0000-0000-0000-000000000000') // Supprimer tous les enregistrements

        if (deleteModelsError) {
          stats.errors.push(`Erreur suppression modèles: ${deleteModelsError.message}`)
        } else {
          stats.modelsDeleted = modelsToDelete.length
          console.log(`${stats.modelsDeleted} modèles supprimés`)
        }
      }
    } catch (error) {
      stats.errors.push(`Erreur lors de la suppression des modèles: ${error instanceof Error ? error.message : 'Erreur inconnue'}`)
    }

    // 3. Supprimer les logs de synchronisation
    try {
      const { data: logsToDelete } = await supabase
        .from('compl_ai_sync_logs')
        .select('id')

      if (logsToDelete && logsToDelete.length > 0) {
        const { error: deleteLogsError } = await supabase
          .from('compl_ai_sync_logs')
          .delete()
          .neq('id', '00000000-0000-0000-0000-000000000000') // Supprimer tous les enregistrements

        if (deleteLogsError) {
          stats.errors.push(`Erreur suppression logs: ${deleteLogsError.message}`)
        } else {
          stats.syncLogsDeleted = logsToDelete.length
          console.log(`${stats.syncLogsDeleted} logs de synchronisation supprimés`)
        }
      }
    } catch (error) {
      stats.errors.push(`Erreur lors de la suppression des logs: ${error instanceof Error ? error.message : 'Erreur inconnue'}`)
    }

    // 4. Les principes COMPL-AI ne sont PAS supprimés car ils sont des données de référence

    const executionTime = Date.now() - startTime
    const totalDeleted = stats.evaluationsDeleted + stats.modelsDeleted + stats.syncLogsDeleted

    // Enregistrer un log de l'opération de suppression
    await supabase.from('compl_ai_sync_logs').insert({
      sync_date: new Date().toISOString().split('T')[0],
      status: stats.errors.length === 0 ? 'success' : 'partial',
      models_synced: -stats.modelsDeleted, // Valeur négative pour indiquer suppression
      evaluations_synced: -stats.evaluationsDeleted, // Valeur négative pour indiquer suppression
      error_message: stats.errors.length > 0 ? `CLEAR OPERATION: ${stats.errors.join('; ')}` : 'CLEAR OPERATION: All COMPL-AI data cleared successfully',
      execution_time_ms: executionTime
    })

    console.log(`Suppression terminée en ${executionTime}ms. ${totalDeleted} enregistrements supprimés.`)

    const result: ClearResult = {
      success: stats.errors.length === 0,
      message: stats.errors.length === 0 
        ? `Toutes les données COMPL-AI ont été supprimées avec succès en ${executionTime}ms. ${totalDeleted} enregistrements supprimés.`
        : `Suppression terminée avec ${stats.errors.length} erreurs. ${totalDeleted} enregistrements supprimés.`,
      stats
    }

    return NextResponse.json(result)

  } catch (error) {
    console.error('Erreur lors de la suppression des données COMPL-AI:', error)
    
    // Log détaillé pour le debugging
    const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue'
    const errorStack = error instanceof Error ? error.stack : 'Pas de stack trace'
    
    console.error('Détails de l\'erreur:', {
      message: errorMessage,
      stack: errorStack,
      type: typeof error
    })

    return NextResponse.json({
      success: false,
      message: `Erreur interne: ${errorMessage}`,
      stats: {
        evaluationsDeleted: 0,
        modelsDeleted: 0,
        syncLogsDeleted: 0,
        errors: [errorMessage, 'Voir les logs serveur pour plus de détails']
      }
    } as ClearResult, { status: 500 })
  }
}