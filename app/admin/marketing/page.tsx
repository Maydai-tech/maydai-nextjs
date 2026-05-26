import { createSupabaseServerClient } from '@/lib/supabase/server'
import MarketingDashboard from './MarketingDashboard'
import {
  computeFunnelGlobalKpis,
  leadRowsSchema,
  type LeadRow,
} from './types'

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

type PageProps = {
  searchParams: Promise<{ stage?: string | string[] }>
}

function parseStageSearchParam(
  stage: string | string[] | undefined
): number | null {
  const raw = Array.isArray(stage) ? stage[0] : stage
  if (raw === undefined || raw === '') return null
  const n = Number.parseInt(raw, 10)
  if (!Number.isInteger(n) || n < 0 || n > 5) return null
  return n
}

export default async function AdminMarketingPage({ searchParams }: PageProps) {
  const { stage: stageParam } = await searchParams
  const stageFilter = parseStageSearchParam(stageParam)
  let initialLeads: LeadRow[] = []
  let serverError: string | null = null
  let newLeadsCount = 0
  let inProgressCount = 0
  let convertedCount = 0
  let totalLtv = 0

  try {
    const supabase = await createSupabaseServerClient()
    const { data: authData, error: authError } = await supabase.auth.getUser()
    console.log('[admin/marketing/auth] session state:', {
      userId: authData?.user?.id ?? 'NO_USER',
      error: authError?.message,
    })
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
      const parsed = leadRowsSchema.safeParse(data ?? [])
      if (!parsed.success) {
        serverError = 'Format des leads invalide'
        console.error('[admin/marketing/leads] validation', parsed.error.flatten())
      } else {
        const allLeads = parsed.data
        const globalKpis = computeFunnelGlobalKpis(allLeads)
        newLeadsCount = globalKpis.newLeadsCount
        inProgressCount = globalKpis.inProgressCount
        convertedCount = globalKpis.convertedCount
        totalLtv = globalKpis.totalLtv

        let leads = allLeads
        if (stageFilter !== null) {
          leads = leads.filter(
            (lead) => lead.funnel_stage === stageFilter
          )
        }
        initialLeads = leads
      }
    }
  } catch (e) {
    serverError =
      e instanceof Error ? e.message : 'Erreur lors du chargement des leads'
  }

  return (
    <MarketingDashboard
      initialLeads={initialLeads}
      serverError={serverError}
      newLeadsCount={newLeadsCount}
      inProgressCount={inProgressCount}
      convertedCount={convertedCount}
      totalLtv={totalLtv}
    />
  )
}
