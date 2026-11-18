import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getAuthenticatedSupabaseClient } from '@/lib/api-auth'

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string; supplierId: string }> }) {
  let auth
  try { auth = await getAuthenticatedSupabaseClient(request) } catch {
    return NextResponse.json({ error: 'Veuillez vous connecter pour retirer un fournisseur.' }, { status: 401 })
  }
  const { id, supplierId } = await context.params
  if (!z.string().uuid().safeParse(id).success || !z.string().uuid().safeParse(supplierId).success) {
    return NextResponse.json({ error: 'Fournisseur introuvable.' }, { status: 404 })
  }

  try {
    // La RLS limite la suppression au propriétaire de l'appel d'offre.
    const { data, error } = await auth.supabase
      .from('procurement_suppliers')
      .delete()
      .eq('id', supplierId)
      .eq('procurement_id', id)
      .select('id')
      .maybeSingle()
    if (error) throw error
    if (!data) return NextResponse.json({ error: 'Fournisseur introuvable.' }, { status: 404 })
    return new NextResponse(null, { status: 204 })
  } catch (error) {
    console.error('[Procurements] Échec du retrait du fournisseur:', error)
    return NextResponse.json({ error: 'Impossible de retirer le fournisseur. Veuillez réessayer.' }, { status: 500 })
  }
}
