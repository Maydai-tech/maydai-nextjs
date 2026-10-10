import type { SupabaseClient } from '@supabase/supabase-js'
import type { Procurement } from '@/lib/validations/procurement'

export const PROCUREMENT_COLUMNS = 'id, user_id, title, description, created_at, phase, criteria_importance, custom_questions, deadline_at, supplier_emails'

export async function getProcurement(supabase: SupabaseClient, userId: string, id: string): Promise<Procurement | null> {
  const { data, error } = await supabase.from('procurements').select(PROCUREMENT_COLUMNS).eq('id', id).eq('user_id', userId).maybeSingle()
  if (error) throw error
  return data
}

export async function listProcurements(supabase: SupabaseClient, userId: string): Promise<Procurement[]> {
  const { data, error } = await supabase
    .from('procurements')
    .select(PROCUREMENT_COLUMNS)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })

  if (error) throw error
  return data ?? []
}
