import { z } from 'zod'

export const FUNNEL_CONFIG = {
  0: { label: 'Nouveau lead', description: 'Capture initiale' },
  1: { label: 'Inscrit', description: 'Création du compte' },
  2: { label: 'Registre', description: 'Création de la company' },
  3: { label: "Cas d'usage", description: "Cas d'usage initié" },
  4: { label: 'Évaluation', description: 'Génération du rapport' },
  5: { label: 'Converti', description: 'Paiement validé' },
} as const

export type FunnelStage = keyof typeof FUNNEL_CONFIG

const funnelStageLiterals = [0, 1, 2, 3, 4, 5] as const

export const funnelStageSchema = z.union([
  z.literal(funnelStageLiterals[0]),
  z.literal(funnelStageLiterals[1]),
  z.literal(funnelStageLiterals[2]),
  z.literal(funnelStageLiterals[3]),
  z.literal(funnelStageLiterals[4]),
  z.literal(funnelStageLiterals[5]),
])

/** Normalise une valeur BDD en étape funnel valide (0–5, sans régression côté affichage). */
export function parseFunnelStage(value: number | null | undefined): FunnelStage {
  if (value === null || value === undefined) return 0
  const n = Number(value)
  if (!Number.isFinite(n)) return 0
  const clamped = Math.min(5, Math.max(0, Math.floor(n))) as FunnelStage
  const parsed = funnelStageSchema.safeParse(clamped)
  return parsed.success ? parsed.data : 0
}

export const leadRowSchema = z.object({
  id: z.string().uuid(),
  email: z.string(),
  first_name: z.string().nullable(),
  last_name: z.string().nullable(),
  phone: z.string().nullable(),
  company_name: z.string().nullable(),
  source: z.string().nullable(),
  campaign_name: z.string().nullable(),
  ad_group_name: z.string().nullable(),
  gclid: z.string().nullable(),
  click_id: z.string().nullable(),
  utm_source: z.string().nullable(),
  utm_medium: z.string().nullable(),
  utm_campaign: z.string().nullable(),
  funnel_stage: z.number().int().min(0).max(5).nullable(),
  total_revenue: z.union([z.string(), z.number()]).nullable(),
  converted_to_user_id: z.string().uuid().nullable(),
  created_at: z.string(),
  converted_at: z.string().nullable(),
})

export type LeadRow = z.infer<typeof leadRowSchema>

export const leadRowsSchema = z.array(leadRowSchema)

/** Parse `total_revenue` (colonne LTV en base). */
export function parseLeadRevenue(
  value: string | number | null | undefined
): number {
  if (value === null || value === undefined) return 0
  const n = typeof value === 'number' ? value : Number.parseFloat(String(value))
  return Number.isFinite(n) ? n : 0
}

/** Compteurs funnel sur l’ensemble des leads (avant filtre URL `stage`). */
export function computeFunnelGlobalKpis(leads: LeadRow[]) {
  let newLeadsCount = 0
  let inProgressCount = 0
  let convertedCount = 0
  let totalLtv = 0

  for (const lead of leads) {
    const stage = lead.funnel_stage
    if (stage === 0) {
      newLeadsCount++
    } else if (stage !== null && stage >= 1 && stage <= 4) {
      inProgressCount++
    } else if (stage === 5) {
      convertedCount++
      totalLtv += parseLeadRevenue(lead.total_revenue)
    }
  }

  return { newLeadsCount, inProgressCount, convertedCount, totalLtv }
}
