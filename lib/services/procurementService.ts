import type { SupabaseClient } from '@supabase/supabase-js'
import type { Procurement, ProcurementSupplier } from '@/lib/validations/procurement'

export const PROCUREMENT_COLUMNS = 'id, user_id, title, description, created_at, phase, criteria_importance, custom_questions, deadline_at, supplier_emails'
export const SUPPLIER_COLUMNS = 'id, contact_email, company_name, siren, city, created_at'
const DETAIL_COLUMNS = `${PROCUREMENT_COLUMNS}, suppliers:procurement_suppliers(${SUPPLIER_COLUMNS})`
const LIST_COLUMNS = `${PROCUREMENT_COLUMNS}, supplier_count:procurement_suppliers(count)`

export async function getProcurement(supabase: SupabaseClient, userId: string, id: string): Promise<Procurement | null> {
  const { data, error } = await supabase.from('procurements').select(DETAIL_COLUMNS).eq('id', id).eq('user_id', userId).maybeSingle()
  if (error) throw error
  if (data?.suppliers) data.suppliers.sort((a: ProcurementSupplier, b: ProcurementSupplier) => (a.created_at ?? '').localeCompare(b.created_at ?? ''))
  return data
}

export async function listProcurements(supabase: SupabaseClient, userId: string): Promise<Procurement[]> {
  const { data, error } = await supabase
    .from('procurements')
    .select(LIST_COLUMNS)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })

  if (error) throw error
  type Row = Omit<Procurement, 'supplier_count'> & { supplier_count?: { count: number }[] }
  return ((data ?? []) as Row[]).map(({ supplier_count, ...procurement }) => ({
    ...procurement,
    supplier_count: Array.isArray(supplier_count) ? supplier_count[0]?.count ?? 0 : undefined,
  }))
}
