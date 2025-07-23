import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

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

    // Vérifier les droits admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || (profile.role !== 'admin' && profile.role !== 'super_admin')) {
      return NextResponse.json({ error: 'Droits insuffisants' }, { status: 403 })
    }

    // Récupérer les données du modèle
    const { model_name, model_provider, model_type, version } = await request.json()

    if (!model_name || !model_provider) {
      return NextResponse.json({ error: 'Nom du modèle et fournisseur sont requis' }, { status: 400 })
    }

    // Vérifier si le modèle existe déjà
    const { data: existingModel } = await supabase
      .from('compl_ai_models')
      .select('id')
      .eq('model_name', model_name)
      .eq('model_provider', model_provider)
      .eq('version', version || '')
      .single()

    if (existingModel) {
      return NextResponse.json({ error: 'Un modèle avec ce nom, fournisseur et version existe déjà' }, { status: 409 })
    }

    // Créer le nouveau modèle
    const { data: newModel, error: insertError } = await supabase
      .from('compl_ai_models')
      .insert({
        model_name,
        model_provider,
        model_type: model_type || 'large-language-model',
        version: version || ''
      })
      .select()
      .single()

    if (insertError) {
      return NextResponse.json({ error: 'Erreur lors de la création du modèle: ' + insertError.message }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Modèle créé avec succès', 
      model: newModel 
    })

  } catch (error) {
    console.error('Erreur création modèle COMPL-AI:', error)
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Erreur interne du serveur'
    }, { status: 500 })
  }
}