import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedSupabaseClient } from '@/lib/api-auth'

export async function POST(request: NextRequest) {
  try {
    const { supabase, user } = await getAuthenticatedSupabaseClient(request)

    const body = await request.json()
    const { usecase_id, company_id, request_type, full_name, email, phone, message } = body

    // Validate required fields
    if (!full_name || !email || !request_type) {
      return NextResponse.json(
        { error: 'Les champs nom, email et type de demande sont requis' },
        { status: 400 }
      )
    }

    // Validate request_type
    if (!['maydai_support', 'lawyer_referral'].includes(request_type)) {
      return NextResponse.json(
        { error: 'Type de demande invalide' },
        { status: 400 }
      )
    }

    // Create the contact request
    const { data, error } = await supabase
      .from('contact_requests')
      .insert({
        user_id: user.id,
        usecase_id: usecase_id || null,
        company_id: company_id || null,
        request_type,
        full_name,
        email,
        phone: phone || null,
        message: message || null
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating contact request:', error)
      return NextResponse.json(
        { error: 'Erreur lors de la création de la demande' },
        { status: 500 }
      )
    }

    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error('Error in contact-requests POST:', error)
    if (error instanceof Error && error.message === 'No authorization header') {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }
    if (error instanceof Error && error.message === 'Invalid token') {
      return NextResponse.json({ error: 'Session expirée' }, { status: 401 })
    }
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { supabase, user } = await getAuthenticatedSupabaseClient(request)

    const { searchParams } = new URL(request.url)
    const usecaseId = searchParams.get('usecase_id')

    let query = supabase
      .from('contact_requests')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (usecaseId) {
      query = query.eq('usecase_id', usecaseId)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching contact requests:', error)
      return NextResponse.json(
        { error: 'Erreur lors de la récupération des demandes' },
        { status: 500 }
      )
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error in contact-requests GET:', error)
    if (error instanceof Error && error.message === 'No authorization header') {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }
    if (error instanceof Error && error.message === 'Invalid token') {
      return NextResponse.json({ error: 'Session expirée' }, { status: 401 })
    }
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
