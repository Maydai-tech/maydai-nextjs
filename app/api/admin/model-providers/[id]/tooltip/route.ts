import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

/**
 * GET /api/admin/model-providers/[id]/tooltip
 * Récupère les informations de tooltip pour un fournisseur spécifique
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Vérifier l'authentification
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Token d\'authentification manquant' },
        { status: 401 }
      )
    }

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

    const { id } = await params
    const providerId = parseInt(id)

    if (isNaN(providerId)) {
      return NextResponse.json({ error: 'ID de fournisseur invalide' }, { status: 400 })
    }

    // Récupérer le fournisseur avec ses tooltips
    const { data: provider, error: providerError } = await supabase
      .from('model_providers')
      .select('id, name, tooltip_title, tooltip_short_content, tooltip_full_content, tooltip_icon, tooltip_rank, tooltip_rank_text')
      .eq('id', providerId)
      .single()

    if (providerError) {
      console.error('Error fetching provider tooltip:', providerError)
      return NextResponse.json(
        { error: 'Erreur lors de la récupération du fournisseur' },
        { status: 500 }
      )
    }

    if (!provider) {
      return NextResponse.json({ error: 'Fournisseur non trouvé' }, { status: 404 })
    }

    return NextResponse.json(provider)
  } catch (error) {
    console.error('Error in GET provider tooltip API:', error)
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/admin/model-providers/[id]/tooltip
 * Met à jour les informations de tooltip pour un fournisseur spécifique
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Vérifier l'authentification
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Token d\'authentification manquant' },
        { status: 401 }
      )
    }

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

    const { id } = await params
    const providerId = parseInt(id)

    if (isNaN(providerId)) {
      return NextResponse.json({ error: 'ID de fournisseur invalide' }, { status: 400 })
    }

    // Récupérer les données de la requête
    const body = await request.json()
    const {
      tooltip_title,
      tooltip_short_content,
      tooltip_full_content,
      tooltip_icon,
      tooltip_rank,
      tooltip_rank_text
    } = body

    // Validation : au moins title et short_content doivent être présents
    if (!tooltip_title || !tooltip_short_content) {
      return NextResponse.json(
        { error: 'tooltip_title et tooltip_short_content sont requis' },
        { status: 400 }
      )
    }

    // Vérifier que le fournisseur existe
    const { data: existingProvider } = await supabase
      .from('model_providers')
      .select('id')
      .eq('id', providerId)
      .single()

    if (!existingProvider) {
      return NextResponse.json({ error: 'Fournisseur non trouvé' }, { status: 404 })
    }

    // Mettre à jour les tooltips
    const { data: updatedProvider, error: updateError } = await supabase
      .from('model_providers')
      .update({
        tooltip_title,
        tooltip_short_content,
        tooltip_full_content: tooltip_full_content || null,
        tooltip_icon: tooltip_icon || '💡',
        tooltip_rank: tooltip_rank || null,
        tooltip_rank_text: tooltip_rank_text || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', providerId)
      .select('id, name, tooltip_title, tooltip_short_content, tooltip_full_content, tooltip_icon, tooltip_rank, tooltip_rank_text')
      .single()

    if (updateError) {
      console.error('Error updating provider tooltip:', updateError)
      return NextResponse.json(
        { error: 'Erreur lors de la mise à jour du tooltip' },
        { status: 500 }
      )
    }

    return NextResponse.json(updatedProvider)
  } catch (error) {
    console.error('Error in PUT provider tooltip API:', error)
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    )
  }
}

