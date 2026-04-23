import { createSupabaseServerClient } from '@/lib/supabase/server'
import MarketingDashboard from './MarketingDashboard'
import type { LeadRow } from './types'

/** Données sensibles au temps réel : évite un cache RSC obsolète (nouveaux leads invisibles après capture). */
export const dynamic = 'force-dynamic'

const LEAD_COLUMNS = [
  'id',
  'email',
  'first_name',
  'last_name',
  'phone',
  'company_name',
  'source',
  'campaign_name',
  'ad_group_name',
  'gclid',
  'click_id',
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'funnel_stage',
  'total_revenue',
  'converted_to_user_id',
  'created_at',
  'converted_at',
].join(', ')

export default async function AdminMarketingPage() {
  let initialLeads: LeadRow[] = []
  let serverError: string | null = null

  try {
    const supabase = await createSupabaseServerClient()
    const { data, error } = await supabase
      .from('leads')
      .select(LEAD_COLUMNS)
      .order('created_at', { ascending: false })

    console.log('[admin/marketing/leads] env', {
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? '(absent)',
    })
    if (error) {
      console.log('[admin/marketing/leads] error', JSON.stringify(error))
    }
    console.log('[admin/marketing/leads] data', {
      length: data?.length,
      first: data?.[0],
    })

    if (error) {
      serverError = error.message
    } else {
      initialLeads = (data as unknown as LeadRow[]) ?? []
    }
  } catch (e) {
    serverError =
      e instanceof Error ? e.message : 'Erreur lors du chargement des leads'
  }

  return (
    <MarketingDashboard
      initialLeads={initialLeads}
      serverError={serverError}
    />
  )
}
