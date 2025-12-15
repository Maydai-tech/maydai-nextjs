import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedSupabaseClient } from '@/lib/api-auth'

export async function GET(request: NextRequest) {
  try {
    const { supabase, user } = await getAuthenticatedSupabaseClient(request)

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('first_name, last_name, phone, company_name')
      .eq('id', user.id)
      .single()

    if (error) {
      console.error('Error fetching profile:', error)
      return NextResponse.json(
        { error: 'Erreur lors de la récupération du profil' },
        { status: 500 }
      )
    }

    return NextResponse.json(profile)
  } catch (error) {
    console.error('Error in profiles/me GET:', error)
    if (error instanceof Error && error.message === 'No authorization header') {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }
    if (error instanceof Error && error.message === 'Invalid token') {
      return NextResponse.json({ error: 'Session expirée' }, { status: 401 })
    }
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
