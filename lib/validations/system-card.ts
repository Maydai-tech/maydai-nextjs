import { z } from 'zod'

export const ComplianceStatusSchema = z.enum(['COMPLIANT', 'PARTIAL', 'NON_COMPLIANT'])
export type ComplianceStatus = z.infer<typeof ComplianceStatusSchema>

export const AiActComplianceItemSchema = z.object({
  exigence: z.string(),
  article: z.string(),
  application: z.string(),
  status: ComplianceStatusSchema,
  notes: z.string().optional(),
})
export type AiActComplianceItem = z.infer<typeof AiActComplianceItemSchema>

export const PillarRecommendationsSchema = z.object({
  fournisseur: z.string().optional(),
  integrateur: z.string().optional(),
  deployeur: z.string().optional(),
})
export type PillarRecommendations = z.infer<typeof PillarRecommendationsSchema>

export const SystemCardPillarCodeSchema = z.enum([
  'doc_technique',
  'data_governance',
  'prompts_guardrails',
  'risk_management',
  'surveillance_plan',
])
export type SystemCardPillarCode = z.infer<typeof SystemCardPillarCodeSchema>

export const SystemCardPillarSchema = z.object({
  id: z.string().uuid(),
  system_card_id: z.string().uuid(),
  pillar_code: SystemCardPillarCodeSchema,
  pillar_title: z.string(),
  sections_covered: z.string(),
  summary: z.string(),
  key_points: z.array(z.string()),
  ai_act_compliance: z.array(AiActComplianceItemSchema),
  recommendations: PillarRecommendationsSchema,
})
export type SystemCardPillar = z.infer<typeof SystemCardPillarSchema>

export const SystemCardSchema = z.object({
  id: z.string().uuid(),
  model_identifier: z.string(),
  model_name: z.string(),
  provider: z.string(),
  audit_date: z.string(),
  pillars: z.array(SystemCardPillarSchema).optional(),
})
export type SystemCard = z.infer<typeof SystemCardSchema>

/** Pilier System Card → enum Postgres `doc_type` (dossier_documents). */
export const PILLAR_CODE_TO_DOC_TYPE = {
  doc_technique: 'technical_documentation',
  data_governance: 'data_quality',
  prompts_guardrails: 'system_prompt',
  risk_management: 'risk_management',
  surveillance_plan: 'continuous_monitoring',
} as const satisfies Record<SystemCardPillarCode, string>

export type SystemCardDocType = (typeof PILLAR_CODE_TO_DOC_TYPE)[SystemCardPillarCode]

export function resolveDocTypeFromPillarCode(
  pillarCode: string
): SystemCardDocType | null {
  const parsed = SystemCardPillarCodeSchema.safeParse(pillarCode)
  if (!parsed.success) return null
  return PILLAR_CODE_TO_DOC_TYPE[parsed.data]
}

export const DOC_TYPE_TO_PILLAR_CODE = {
  technical_documentation: 'doc_technique',
  data_quality: 'data_governance',
  system_prompt: 'prompts_guardrails',
  risk_management: 'risk_management',
  continuous_monitoring: 'surveillance_plan',
} as const satisfies Record<SystemCardDocType, SystemCardPillarCode>

export function resolvePillarCodeFromDocType(
  docType: string
): SystemCardPillarCode | null {
  if (docType in DOC_TYPE_TO_PILLAR_CODE) {
    return DOC_TYPE_TO_PILLAR_CODE[docType as SystemCardDocType]
  }
  return null
}
