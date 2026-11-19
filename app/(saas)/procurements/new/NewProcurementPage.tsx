import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import NewProcurementForm from './NewProcurementForm'

export default async function NewProcurementPage() {
  const supabase = await createSupabaseServerClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) redirect('/login')

  return <NewProcurementForm />
}
