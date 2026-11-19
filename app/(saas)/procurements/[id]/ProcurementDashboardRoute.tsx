import { notFound, redirect } from 'next/navigation'
import { z } from 'zod'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getProcurement, getReceivedProcurement } from '@/lib/services/procurementService'
import ProcurementDashboardPage from './ProcurementDashboardPage'
import ReceivedProcurementPage from './ReceivedProcurementPage'

export default async function ProcurementDashboardRoute({ params }: { params: Promise<{ id: string }> }) {
  const supabase = await createSupabaseServerClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) redirect('/login')
  const { id } = await params
  if (!z.string().uuid().safeParse(id).success) notFound()
  let procurement
  try { procurement = await getProcurement(supabase, user.id, id) } catch (failure) {
    console.error('[Procurements] Dashboard indisponible:', failure)
    return <ProcurementDashboardPage id={id} initialProcurement={null} initialError />
  }
  if (!procurement) {
    // Pas propriétaire : le fournisseur consulte l'appel reçu en lecture seule (MAY-29).
    let received
    try { received = await getReceivedProcurement(supabase, id) } catch (failure) {
      console.error('[Procurements] Appel reçu indisponible:', failure)
    }
    if (!received) notFound()
    return <ReceivedProcurementPage procurement={received} />
  }
  return <ProcurementDashboardPage id={id} initialProcurement={procurement} initialError={false} />
}
