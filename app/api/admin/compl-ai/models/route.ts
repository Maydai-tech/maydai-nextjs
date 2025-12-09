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
    const { 
      model_name, 
      model_provider, 
      model_type, 
      version,
      short_name,
      long_name,
      launch_date,
      model_provider_id,
      notes_short,
      notes_long,
      variants
    } = await request.json()

    if (!model_name || !model_provider) {
      return NextResponse.json({ error: 'Nom du modèle et fournisseur sont requis' }, { status: 400 })
    }

    // Validation des notes
    if (notes_short && notes_short.length > 150) {
      return NextResponse.json({ error: 'La description courte ne peut pas dépasser 150 caractères' }, { status: 400 })
    }

    if (notes_long && notes_long.length > 1000) {
      return NextResponse.json({ error: 'La description longue ne peut pas dépasser 1000 caractères' }, { status: 400 })
    }

    // Conversion des variantes (string → array)
    let variantsArray: string[] = []
    if (variants && typeof variants === 'string' && variants.trim().length > 0) {
      variantsArray = variants
        .split(',')
        .map((v: string) => v.trim())
        .filter((v: string) => v.length > 0)
    } else if (Array.isArray(variants)) {
      variantsArray = variants
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
        version: version || '',
        short_name: short_name || null,
        long_name: long_name || null,
        launch_date: launch_date || null,
        model_provider_id: model_provider_id || null,
        notes_short: notes_short || null,
        notes_long: notes_long || null,
        variants: variantsArray.length > 0 ? variantsArray : []
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