import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedSupabaseClient } from '@/lib/api-auth'
import { listProcurements, PROCUREMENT_COLUMNS } from '@/lib/services/procurementService'
import { ProcurementInputSchema } from '@/lib/validations/procurement'

export async function GET(request: NextRequest) {
  let auth
  try {
    auth = await getAuthenticatedSupabaseClient(request)
  } catch {
    return NextResponse.json({ error: 'Veuillez vous connecter pour accéder aux appels d’offres.' }, { status: 401 })
  }

  try {
    return NextResponse.json(await listProcurements(auth.supabase, auth.user.id))
  } catch (error) {
    console.error('[Procurements] Échec du chargement:', error)
    return NextResponse.json({ error: 'Impossible de charger vos appels d’offres. Veuillez réessayer.' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  let auth
  try {
    auth = await getAuthenticatedSupabaseClient(request)
  } catch {
    return NextResponse.json({ error: 'Veuillez vous connecter pour créer un appel d’offres.' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Le formulaire envoyé est invalide.' }, { status: 400 })
  }

  const parsed = ProcurementInputSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message, fields: parsed.error.flatten().fieldErrors, issues: parsed.error.issues.map(({ path, message }) => ({ path: path.join('.'), message })) }, { status: 400 })
  }

  try {
    const { data, error } = await auth.supabase
      .from('procurements')
      .insert({ ...parsed.data, user_id: auth.user.id })
      .select(PROCUREMENT_COLUMNS)
      .single()

    if (error || !data) throw error ?? new Error('Aucun appel d’offres créé')
    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error('[Procurements] Échec de la création:', error)
    return NextResponse.json({ error: 'Impossible de créer l’appel d’offres. Votre saisie est conservée, veuillez réessayer.' }, { status: 500 })
  }
}
