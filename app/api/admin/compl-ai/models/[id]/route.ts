import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedSupabaseClient } from '@/lib/api-auth'

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

    const resolvedParams = await params
    const modelId = resolvedParams.id
    const { model_name, model_provider, model_type, version } = await request.json()

    if (!model_name || !model_provider) {
      return NextResponse.json({ error: 'Nom du modèle et fournisseur sont requis' }, { status: 400 })
    }

    // Vérifier si le modèle existe
    const { data: existingModel } = await supabase
      .from('compl_ai_models')
      .select('id')
      .eq('id', modelId)
      .single()

    if (!existingModel) {
      return NextResponse.json({ error: 'Modèle non trouvé' }, { status: 404 })
    }

    // Vérifier si un autre modèle avec les mêmes informations existe déjà
    const { data: duplicateModel } = await supabase
      .from('compl_ai_models')
      .select('id')
      .eq('model_name', model_name)
      .eq('model_provider', model_provider)
      .eq('version', version || '')
      .neq('id', modelId)
      .single()

    if (duplicateModel) {
      return NextResponse.json({ error: 'Un autre modèle avec ce nom, fournisseur et version existe déjà' }, { status: 409 })
    }

    // Mettre à jour le modèle
    const { data: updatedModel, error: updateError } = await supabase
      .from('compl_ai_models')
      .update({
        model_name,
        model_provider,
        model_type: model_type || 'large-language-model',
        version: version || '',
        updated_at: new Date().toISOString()
      })
      .eq('id', modelId)
      .select()
      .single()

    if (updateError) {
      return NextResponse.json({ error: 'Erreur lors de la mise à jour du modèle: ' + updateError.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Modèle mis à jour avec succès',
      model: updatedModel
    })

  } catch (error) {
    console.error('Erreur modification modèle COMPL-AI:', error)

    // Erreurs d'authentification
    if (error instanceof Error && (error.message === 'No authorization header' || error.message === 'Invalid token')) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Erreur interne du serveur'
    }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

    const resolvedParams = await params
    const modelId = resolvedParams.id

    // Vérifier si le modèle existe
    const { data: existingModel } = await supabase
      .from('compl_ai_models')
      .select('id, model_name')
      .eq('id', modelId)
      .single()

    if (!existingModel) {
      return NextResponse.json({ error: 'Modèle non trouvé' }, { status: 404 })
    }

    // Supprimer d'abord toutes les évaluations liées à ce modèle
    const { error: deleteEvaluationsError } = await supabase
      .from('compl_ai_evaluations')
      .delete()
      .eq('model_id', modelId)

    if (deleteEvaluationsError) {
      return NextResponse.json({ error: 'Erreur lors de la suppression des évaluations: ' + deleteEvaluationsError.message }, { status: 500 })
    }

    // Supprimer le modèle
    const { error: deleteModelError } = await supabase
      .from('compl_ai_models')
      .delete()
      .eq('id', modelId)

    if (deleteModelError) {
      return NextResponse.json({ error: 'Erreur lors de la suppression du modèle: ' + deleteModelError.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: `Modèle "${existingModel.model_name}" et toutes ses évaluations supprimés avec succès`
    })

  } catch (error) {
    console.error('Erreur suppression modèle COMPL-AI:', error)

    // Erreurs d'authentification
    if (error instanceof Error && (error.message === 'No authorization header' || error.message === 'Invalid token')) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Erreur interne du serveur'
    }, { status: 500 })
  }
}
