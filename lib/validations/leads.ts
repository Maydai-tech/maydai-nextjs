import { z } from 'zod'

/**
 * Validation des payloads d’insertion `public.leads`
 * (hors id, timestamps, funnel_stage, revenue, conversion — gérés côté route/service).
 */
export const LeadInsertSchema = z.object({
  email: z.string().email().nullable().optional(),
  first_name: z.string().nullable().optional(),
  last_name: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  company_name: z.string().nullable().optional(),
  source: z.string().nullable().optional(),
  campaign_name: z.string().nullable().optional(),
  ad_group_name: z.string().nullable().optional(),
  gclid: z.string().nullable().optional(),
  click_id: z.string().nullable().optional(),
  utm_source: z.string().nullable().optional(),
  utm_medium: z.string().nullable().optional(),
  utm_campaign: z.string().nullable().optional(),
})

export type LeadInsert = z.infer<typeof LeadInsertSchema>
