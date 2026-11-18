import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { listProcurements, listReceivedProcurements } from '@/lib/services/procurementService'
import type { Procurement, ReceivedProcurement } from '@/lib/validations/procurement'
import RegistriesPage from './RegistriesPage'

export default async function RegistriesRoute() {
  const supabase = await createSupabaseServerClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) redirect('/login')
  let procurements: Procurement[] = []
  let procurementsError: string | null = null
  try {
    procurements = await listProcurements(supabase, user.id)
  } catch (error) {
    console.error('[Procurements] Liste indisponible:', error)
    procurementsError = 'Impossible de charger vos appels d’offres. Veuillez réessayer.'
  }
  let received: ReceivedProcurement[] = []
  let receivedError: string | null = null
  try {
    received = await listReceivedProcurements(supabase)
  } catch (error) {
    console.error('[Procurements] Appels reçus indisponibles:', error)
    receivedError = 'Impossible de charger les appels d’offres reçus. Rechargez la page.'
  }
  return <RegistriesPage initialProcurements={procurements} procurementsError={procurementsError} initialReceived={received} receivedError={receivedError} />
}
