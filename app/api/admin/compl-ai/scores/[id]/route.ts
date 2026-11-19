import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedSupabaseClient } from '@/lib/api-auth'
import { recalculateUseCaseScoresForModel } from '@/lib/usecase-score-service'

// La suppression d'un score déclenche le recalcul en cascade (maydai_score + score_final
// de tous les use cases du modèle) de façon synchrone : on autorise une exécution plus
// longue, comme les routes sync/import-csv, pour les modèles à nombreux use cases.
export const maxDuration = 300

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Authentification via le client Supabase authentifié
    const { supabase, user } = await getAuthenticatedSupabaseClient(request)

    // Vérifier les droits admin
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError || !profile || (profile.role !== 'admin' && profile.role !== 'super_admin')) {
      return NextResponse.json({ error: 'Droits insuffisants' }, { status: 403 })
    }

    const { id } = await params
    const evaluationId = id

    if (!evaluationId) {
      return NextResponse.json({ error: 'ID d\'évaluation requis' }, { status: 400 })
    }

    // Vérifier que l'évaluation existe (récupérer model_id AVANT suppression pour le recalcul)
    const { data: existingEvaluation } = await supabase
      .from('compl_ai_evaluations')
      .select('id, model_id')
      .eq('id', evaluationId)
      .single()

    if (!existingEvaluation) {
      return NextResponse.json({ error: 'Évaluation non trouvée' }, { status: 404 })
    }

    // Supprimer l'évaluation
    const { error: deleteError } = await supabase
      .from('compl_ai_evaluations')
      .delete()
      .eq('id', evaluationId)

    if (deleteError) {
      return NextResponse.json({ error: 'Erreur lors de la suppression de l\'évaluation: ' + deleteError.message }, { status: 500 })
    }

    // Recalcul automatique des scores impactés par ce modèle (ne fait pas échouer la suppression)
    let recalcWarning: string | null = null
    if (existingEvaluation.model_id) {
      try {
        await recalculateUseCaseScoresForModel(existingEvaluation.model_id)
      } catch (recalcError) {
        console.error('⚠️ Recalcul automatique des scores échoué pour le modèle', existingEvaluation.model_id, recalcError)
        recalcWarning = recalcError instanceof Error ? recalcError.message : 'Recalcul automatique des scores échoué'
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Score supprimé avec succès',
      ...(recalcWarning ? { recalc_warning: recalcWarning } : {})
    })

  } catch (error) {
    console.error('Erreur suppression score COMPL-AI:', error)

    // Erreurs d'authentification
    if (error instanceof Error && (error.message === 'No authorization header' || error.message === 'Invalid token')) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Erreur interne du serveur'
    }, { status: 500 })
  }
}
