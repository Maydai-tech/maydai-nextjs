import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedSupabaseClient } from '@/lib/api-auth'

interface RouteContext {
  params: Promise<{ id: string }>
}

/**
 * GET /api/usecases/[id]/history
 * Récupère l'historique des modifications d'un use case
 */
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { supabase, user } = await getAuthenticatedSupabaseClient(request)
    const { id: usecaseId } = await context.params

    // Vérifier que l'utilisateur a accès à ce use case via sa company
    const { data: usecase, error: usecaseError } = await supabase
      .from('usecases')
      .select('id, company_id')
      .eq('id', usecaseId)
      .single()

    if (usecaseError || !usecase) {
      return NextResponse.json(
        { error: 'Use case non trouvé' },
        { status: 404 }
      )
    }

    // Vérifier que l'utilisateur appartient à cette company
    const { data: userCompany, error: companyError } = await supabase
      .from('user_companies')
      .select('id')
      .eq('user_id', user.id)
      .eq('company_id', usecase.company_id)
      .single()

    if (companyError || !userCompany) {
      return NextResponse.json(
        { error: 'Accès non autorisé' },
        { status: 403 }
      )
    }

    // Récupérer l'historique avec les infos utilisateur
    const { data: history, error: historyError } = await supabase
      .from('usecase_history')
      .select(`
        *,
        user:profiles(first_name, last_name)
      `)
      .eq('usecase_id', usecaseId)
      .order('created_at', { ascending: false })
      .limit(100)

    if (historyError) {
      console.error('Error fetching history:', historyError)
      return NextResponse.json(
        { error: 'Erreur lors de la récupération de l\'historique' },
        { status: 500 }
      )
    }

    return NextResponse.json({ history: history || [] })
  } catch (error) {
    console.error('History API error:', error)
    if (error instanceof Error && error.message === 'No authorization header') {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }
    if (error instanceof Error && error.message === 'Invalid token') {
      return NextResponse.json({ error: 'Token invalide' }, { status: 401 })
    }
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/usecases/[id]/history
 * Ajoute une entrée dans l'historique d'un use case
 */
export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { supabase, user } = await getAuthenticatedSupabaseClient(request)
    const { id: usecaseId } = await context.params

    const body = await request.json()
    const { event_type, field_name, old_value, new_value, metadata } = body

    // Valider le type d'événement
    const validEventTypes = ['created', 'reevaluated', 'document_uploaded', 'field_updated']
    if (!event_type || !validEventTypes.includes(event_type)) {
      return NextResponse.json(
        { error: 'Type d\'événement invalide' },
        { status: 400 }
      )
    }

    // Vérifier que l'utilisateur a accès à ce use case via sa company
    const { data: usecase, error: usecaseError } = await supabase
      .from('usecases')
      .select('id, company_id')
      .eq('id', usecaseId)
      .single()

    if (usecaseError || !usecase) {
      return NextResponse.json(
        { error: 'Use case non trouvé' },
        { status: 404 }
      )
    }

    // Vérifier que l'utilisateur appartient à cette company
    const { data: userCompany, error: companyError } = await supabase
      .from('user_companies')
      .select('id')
      .eq('user_id', user.id)
      .eq('company_id', usecase.company_id)
      .single()

    if (companyError || !userCompany) {
      return NextResponse.json(
        { error: 'Accès non autorisé' },
        { status: 403 }
      )
    }

    // Insérer l'entrée d'historique
    const { data: historyEntry, error: insertError } = await supabase
      .from('usecase_history')
      .insert({
        usecase_id: usecaseId,
        user_id: user.id,
        event_type,
        field_name: field_name || null,
        old_value: old_value || null,
        new_value: new_value || null,
        metadata: metadata || null
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error inserting history:', insertError)
      return NextResponse.json(
        { error: 'Erreur lors de l\'enregistrement de l\'historique' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, entry: historyEntry })
  } catch (error) {
    console.error('History POST API error:', error)
    if (error instanceof Error && error.message === 'No authorization header') {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }
    if (error instanceof Error && error.message === 'Invalid token') {
      return NextResponse.json({ error: 'Token invalide' }, { status: 401 })
    }
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}
