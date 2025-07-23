import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    // Vérifier les droits admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || (profile.role !== 'admin' && profile.role !== 'super_admin')) {
      return NextResponse.json({ error: 'Droits insuffisants' }, { status: 403 })
    }

    const evaluationId = params.id

    if (!evaluationId) {
      return NextResponse.json({ error: 'ID d\'évaluation requis' }, { status: 400 })
    }

    // Vérifier que l'évaluation existe
    const { data: existingEvaluation } = await supabase
      .from('compl_ai_evaluations')
      .select('id')
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

    return NextResponse.json({ 
      success: true, 
      message: 'Score supprimé avec succès'
    })

  } catch (error) {
    console.error('Erreur suppression score COMPL-AI:', error)
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Erreur interne du serveur'
    }, { status: 500 })
  }
}