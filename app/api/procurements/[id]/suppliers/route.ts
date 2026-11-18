import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getAuthenticatedSupabaseClient } from '@/lib/api-auth'
import { SUPPLIER_COLUMNS } from '@/lib/services/procurementService'
import { ProcurementSupplierInputSchema } from '@/lib/validations/procurement'

// Ajoute un fournisseur, ou complète celui qui a déjà cet email (même appel d'offre).
export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  let auth
  try { auth = await getAuthenticatedSupabaseClient(request) } catch {
    return NextResponse.json({ error: 'Veuillez vous connecter pour ajouter un fournisseur.' }, { status: 401 })
  }
  const { id } = await context.params
  if (!z.string().uuid().safeParse(id).success) return NextResponse.json({ error: 'Appel d’offres introuvable.' }, { status: 404 })

  let body: unknown
  try { body = await request.json() } catch {
    return NextResponse.json({ error: 'Le formulaire envoyé est invalide.' }, { status: 400 })
  }
  const parsed = ProcurementSupplierInputSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message, issues: parsed.error.issues.map(({ path, message }) => ({ path: path.join('.'), message })) }, { status: 400 })
  }

  try {
    const { data: owned, error: ownedError } = await auth.supabase.from('procurements').select('id').eq('id', id).eq('user_id', auth.user.id).maybeSingle()
    if (ownedError) throw ownedError
    if (!owned) return NextResponse.json({ error: 'Appel d’offres introuvable.' }, { status: 404 })

    const { contact_email, company_name = null, siren = null, city = null } = parsed.data
    const { data, error } = await auth.supabase
      .from('procurement_suppliers')
      .upsert({ procurement_id: id, contact_email, company_name, siren, city }, { onConflict: 'procurement_id,contact_email' })
      .select(SUPPLIER_COLUMNS)
      .single()
    if (error || !data) throw error ?? new Error('Aucun fournisseur enregistré')
    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error('[Procurements] Échec de l’ajout du fournisseur:', error)
    return NextResponse.json({ error: 'Impossible d’ajouter le fournisseur. Veuillez réessayer.' }, { status: 500 })
  }
}
