import { notFound, redirect } from 'next/navigation'
import { z } from 'zod'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getProcurement } from '@/lib/services/procurementService'
import ProcurementDashboardPage from './ProcurementDashboardPage'

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
  if (!procurement) notFound()
  return <ProcurementDashboardPage id={id} initialProcurement={procurement} initialError={false} />
}
