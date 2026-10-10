import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getAuthenticatedSupabaseClient } from '@/lib/api-auth'
import { getProcurement } from '@/lib/services/procurementService'

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  let auth
  try { auth = await getAuthenticatedSupabaseClient(request) } catch {
    return NextResponse.json({ error: 'Veuillez vous connecter pour accéder à cet appel d’offres.' }, { status: 401 })
  }
  const { id } = await context.params
  if (!z.string().uuid().safeParse(id).success) return NextResponse.json({ error: 'Appel d’offres introuvable.' }, { status: 404 })
  try {
    const procurement = await getProcurement(auth.supabase, auth.user.id, id)
    if (!procurement) return NextResponse.json({ error: 'Appel d’offres introuvable.' }, { status: 404 })
    return NextResponse.json(procurement)
  } catch (error) {
    console.error('[Procurements] Échec du chargement du dashboard:', error)
    return NextResponse.json({ error: 'Impossible de charger l’appel d’offres. Veuillez réessayer.' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  let auth
  try {
    auth = await getAuthenticatedSupabaseClient(request)
  } catch {
    return NextResponse.json({ error: 'Veuillez vous connecter pour supprimer un appel d’offres.' }, { status: 401 })
  }

  const { id } = await context.params
  if (!z.string().uuid().safeParse(id).success) {
    return NextResponse.json({ error: 'Identifiant d’appel d’offres invalide.' }, { status: 400 })
  }

  try {
    const { data, error } = await auth.supabase
      .from('procurements')
      .delete()
      .eq('id', id)
      .eq('user_id', auth.user.id)
      .select('id')
      .maybeSingle()

    if (error) throw error
    if (!data) return NextResponse.json({ error: 'Appel d’offres introuvable.' }, { status: 404 })
    return new NextResponse(null, { status: 204 })
  } catch (error) {
    console.error('[Procurements] Échec de la suppression:', error)
    return NextResponse.json({ error: 'Impossible de supprimer l’appel d’offres. Veuillez réessayer.' }, { status: 500 })
  }
}
