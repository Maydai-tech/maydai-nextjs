/** Ligne `public.leads` (lecture admin). */
export type LeadRow = {
  id: string
  email: string
  first_name: string | null
  last_name: string | null
  phone: string | null
  company_name: string | null
  source: string | null
  campaign_name: string | null
  ad_group_name: string | null
  gclid: string | null
  click_id: string | null
  utm_source: string | null
  utm_medium: string | null
  utm_campaign: string | null
  funnel_stage: number | null
  total_revenue: string | number | null
  converted_to_user_id: string | null
  created_at: string
  converted_at: string | null
}
