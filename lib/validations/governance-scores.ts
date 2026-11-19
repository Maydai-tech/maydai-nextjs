import { z } from 'zod'

export const ProfileTypeSchema = z.enum(['company', 'advisor', 'academic'])
export type ProfileType = z.infer<typeof ProfileTypeSchema>

export const LifecycleStatusSchema = z.enum([
  'active',
  'awaiting_email_confirm',
  'purging_24h',
  'soft_deleted',
])
export type LifecycleStatus = z.infer<typeof LifecycleStatusSchema>

export const AuditIntegrityBadgeLevelSchema = z.enum([
  'exploratory',
  'standard',
  'high_integrity',
])
export type AuditIntegrityBadgeLevel = z.infer<typeof AuditIntegrityBadgeLevelSchema>

export const AuditIntegrityColorVariantSchema = z.enum(['red_orange', 'blue', 'green_gold'])
export type AuditIntegrityColorVariant = z.infer<typeof AuditIntegrityColorVariantSchema>

export const AdminAlertTypeSchema = z.enum(['SIREN_COLLISION'])
export type AdminAlertType = z.infer<typeof AdminAlertTypeSchema>

export const AdminAlertStatusSchema = z.enum(['open', 'acknowledged', 'resolved'])
export type AdminAlertStatus = z.infer<typeof AdminAlertStatusSchema>

export const GovernanceQuadrantSchema = z.enum([
  'hot_pql',
  'rushed_curious',
  'ghost_consultant',
  'bot_or_abuse',
])
export type GovernanceQuadrant = z.infer<typeof GovernanceQuadrantSchema>

export function getProfileTypeLabel(key?: string | null): string {
  if (key === 'company') return 'Entreprise / Association'
  if (key === 'advisor') return 'Avocat / Cabinet de conseil'
  if (key === 'academic') return 'Étudiant / Professeur / Chercheur'
  return key || 'Inconnu'
}

export function getGovernanceQuadrantLabel(key?: string | null): string {
  if (key === 'hot_pql') return '1. PQL Chauds'
  if (key === 'rushed_curious') return '2. Curieux pressés'
  if (key === 'ghost_consultant') return '3. Consultants fantômes'
  if (key === 'bot_or_abuse') return '4. Bots / Abus'
  return key || 'Inconnu'
}

export function getLifecycleStatusLabel(key?: string | null): string {
  if (key === 'active') return 'Actif'
  if (key === 'awaiting_email_confirm') return 'Attente confirmation email'
  if (key === 'purging_24h') return 'Sas purge 24h en cours'
  if (key === 'soft_deleted') return 'Purgé (Soft Delete 35j)'
  return key || 'Inconnu'
}

export function getAdminAlertStatusLabel(key?: string | null): string {
  if (key === 'open') return 'Ouverte (À vérifier)'
  if (key === 'acknowledged') return 'Prise en compte'
  if (key === 'resolved') return 'Résolue / Consolidée'
  return key || 'Inconnu'
}

export const AdminGovernancePatchBodySchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('update_alert_status'),
    alertId: z.string().uuid(),
    status: AdminAlertStatusSchema,
    clearSecondaryCollisionFlag: z.boolean().optional().default(false),
  }),
  z.object({
    action: z.literal('recalculate_user_scores'),
    userId: z.string().uuid(),
  }),
])
export type AdminGovernancePatchBody = z.infer<typeof AdminGovernancePatchBodySchema>

export const AdminGovernanceUserRowSchema = z.object({
  id: z.string().uuid(),
  email: z.string().nullable(),
  first_name: z.string().nullable(),
  last_name: z.string().nullable(),
  company_name: z.string().nullable(),
  profile_type: z.string(),
  siren: z.string().nullable(),
  naf_code: z.string().nullable(),
  siren_verified_pappers: z.boolean(),
  academic_institution: z.string().nullable(),
  academic_department: z.string().nullable(),
  completeness_score: z.number().nullable(),
  entity_trust_score: z.number(),
  engagement_score: z.number(),
  avg_audit_integrity_score: z.number().nullable(),
  latest_audit_integrity_score: z.number().nullable(),
  quadrant: GovernanceQuadrantSchema,
  siren_collision_flag: z.boolean(),
  collision_with_profile_id: z.string().uuid().nullable(),
  collision_with_email: z.string().nullable(),
  collision_with_name: z.string().nullable(),
  collision_alert_id: z.string().uuid().nullable(),
  collision_alert_status: z.string().nullable(),
  plan_name: z.string(),
  is_freemium: z.boolean(),
  active_registries_count: z.number(),
  active_usecases_count: z.number(),
  purging_entities_count: z.number(),
  monthly_reset_count: z.number(),
  last_reset_at: z.string().nullable(),
  created_at: z.string().nullable(),
})
export type AdminGovernanceUserRow = z.infer<typeof AdminGovernanceUserRowSchema>

const AdminGovernanceProfileSideSchema = z.object({
  id: z.string().uuid(),
  email: z.string().nullable(),
  first_name: z.string().nullable(),
  last_name: z.string().nullable(),
  company_name: z.string().nullable(),
  created_at: z.string().nullable(),
})

export const AdminSirenCollisionAlertRowSchema = z.object({
  id: z.string().uuid(),
  alert_type: z.string(),
  siren: z.string(),
  status: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
  primary_profile: AdminGovernanceProfileSideSchema.nullable(),
  secondary_profile: AdminGovernanceProfileSideSchema.extend({
    siren_collision_flag: z.boolean(),
  }).nullable(),
})
export type AdminSirenCollisionAlertRow = z.infer<typeof AdminSirenCollisionAlertRowSchema>

export const AdminGovernancePurgingEntitySchema = z.object({
  entity_type: z.enum(['company', 'usecase']),
  id: z.string().uuid(),
  name: z.string().nullable(),
  lifecycle_status: z.string().nullable(),
  company_id: z.string().uuid().nullable(),
  purge_requested_at: z.string().nullable(),
  purge_available_at: z.string().nullable(),
  soft_deleted_at: z.string().nullable(),
  owner_user_id: z.string().uuid().nullable(),
  workflow_status: z.string().nullable(),
})
export type AdminGovernancePurgingEntity = z.infer<typeof AdminGovernancePurgingEntitySchema>

export const AdminGovernancePayloadSchema = z.object({
  generated_at: z.string(),
  quadrants: z.object({
    hot_pql: z.number().int().nonnegative(),
    rushed_curious: z.number().int().nonnegative(),
    ghost_consultant: z.number().int().nonnegative(),
    bot_or_abuse: z.number().int().nonnegative(),
  }),
  users: z.array(AdminGovernanceUserRowSchema),
  alerts: z.array(AdminSirenCollisionAlertRowSchema),
  purging_entities: z.array(AdminGovernancePurgingEntitySchema),
})
export type AdminGovernancePayload = z.infer<typeof AdminGovernancePayloadSchema>

export const InputTelemetrySchema = z.object({
  keystrokes_count: z.number().int().nonnegative().default(0),
  paste_events_count: z.number().int().nonnegative().default(0),
  pasted_chars_count: z.number().int().nonnegative().default(0),
  total_chars_count: z.number().int().nonnegative().default(0),
  captured_at: z.string().datetime().optional().nullable(),
})
export type InputTelemetry = z.infer<typeof InputTelemetrySchema>

export const ScoreBounded100Schema = z.number().int().min(0).max(100)

export const EntityTrustBreakdownSchema = z.object({
  base_score: z.number().int().default(50),
  email_domain_points: z.number().int().default(0),
  email_alias_penalty: z.number().int().default(0),
  pappers_siren_points: z.number().int().default(0),
  domain_company_match_points: z.number().int().default(0),
  academic_cap_applied: z.boolean().default(false),
  final_score: ScoreBounded100Schema,
})
export type EntityTrustBreakdown = z.infer<typeof EntityTrustBreakdownSchema>

export const AuditIntegrityBreakdownSchema = z.object({
  base_score: z.number().int().default(50),
  time_penalty_or_bonus: z.number().int().default(0),
  velocity_penalty_or_bonus: z.number().int().default(0),
  entity_verified_bonus: z.number().int().default(0),
  final_score: ScoreBounded100Schema,
})
export type AuditIntegrityBreakdown = z.infer<typeof AuditIntegrityBreakdownSchema>

export interface AuditIntegrityBadgeInput {
  audit_integrity_score?: number | null
  profile_type?: string | null
  siren_collision_flag?: boolean | null
}

export interface AuditIntegrityBadgeDescriptor {
  score: number
  level: AuditIntegrityBadgeLevel
  colorVariant: AuditIntegrityColorVariant
  label: string
  secondaryNotice: string | null
}

export const DeletionEntityTypeSchema = z.enum(['company', 'usecase'])
export type DeletionEntityType = z.infer<typeof DeletionEntityTypeSchema>

export const ConfirmDeletionPayloadSchema = z.object({
  type: DeletionEntityTypeSchema,
  id: z.string().uuid(),
  token: z.string().min(16).max(256),
})
export type ConfirmDeletionPayload = z.infer<typeof ConfirmDeletionPayloadSchema>

export interface EntitySlotOccupancyInput {
  lifecycle_status?: string | null
  purge_available_at?: string | Date | null
}

export interface MonthlyResetCheckInput {
  monthly_reset_count?: number | null
  last_reset_at?: string | Date | null
}

export interface MonthlyResetCheckResult {
  allowed: boolean
  effectiveResetCount: number
  nextAvailableAt: string | null
}

const MONTHLY_RESET_WINDOW_MS = 30 * 24 * 60 * 60 * 1000

function toTimestampMs(value: string | Date): number {
  if (value instanceof Date) return value.getTime()
  return Date.parse(value)
}

/**
 * Un reset freemium est autorisé s'il n'y en a pas eu au cours des 30 derniers jours.
 */
export function canUseMonthlyFreemiumReset(
  input?: MonthlyResetCheckInput | null,
  now?: Date
): MonthlyResetCheckResult {
  const currentNow = now ?? new Date()
  const rawCount = input?.monthly_reset_count ?? 0
  const open: MonthlyResetCheckResult = {
    allowed: true,
    effectiveResetCount: 0,
    nextAvailableAt: null,
  }

  if (!input || rawCount <= 0 || !input.last_reset_at) return open

  const lastMs = toTimestampMs(input.last_reset_at)
  if (Number.isNaN(lastMs) || currentNow.getTime() - lastMs >= MONTHLY_RESET_WINDOW_MS) {
    return open
  }

  const nextDate = new Date(lastMs + MONTHLY_RESET_WINDOW_MS).toISOString()
  return {
    allowed: rawCount < 1,
    effectiveResetCount: rawCount,
    nextAvailableAt: rawCount >= 1 ? nextDate : null,
  }
}

/**
 * Libellé d'attente de confirmation ou de compte à rebours avant la purge 24 h.
 */
export function formatRemainingPurgeLabel(
  entity?: EntitySlotOccupancyInput | null,
  now?: Date
): string | null {
  if (!entity) return null
  if (entity.lifecycle_status === 'awaiting_email_confirm') {
    return 'Suppression en attente de confirmation par email'
  }
  if (entity.lifecycle_status === 'purging_24h' && entity.purge_available_at) {
    const diffMs = new Date(entity.purge_available_at).getTime() - (now ?? new Date()).getTime()
    if (diffMs <= 0) return null
    const hours = Math.floor(diffMs / 3600000)
    const minutes = Math.floor((diffMs % 3600000) / 60000)
    return `Purge réglementaire en cours (disponible dans ${hours}h${String(minutes).padStart(2, '0')})`
  }
  return null
}

export interface GovernanceMatrixInput {
  entity_trust_score?: number | null
  audit_integrity_score?: number | null
}

const ACADEMIC_NOTICE = 'Usage Académique / Pédagogique'
const SIREN_COLLISION_NOTICE = 'Second registre non consolidé'

/**
 * Badge d'intégrité d'audit. Retourne null tant que le score n'est pas un nombre
 * exploitable, pour ne rien afficher sur les rapports historiques.
 */
export function getAuditIntegrityBadge(
  input?: AuditIntegrityBadgeInput | null
): AuditIntegrityBadgeDescriptor | null {
  if (
    !input ||
    input.audit_integrity_score === null ||
    input.audit_integrity_score === undefined ||
    Number.isNaN(input.audit_integrity_score)
  ) {
    return null
  }

  const score = Math.max(0, Math.min(100, Math.round(input.audit_integrity_score)))

  let level: AuditIntegrityBadgeLevel
  let colorVariant: AuditIntegrityColorVariant
  let label: string

  if (score < 40) {
    level = 'exploratory'
    colorVariant = 'red_orange'
    label = 'Niveau : Brouillon Exploratoire (Évaluation rapide ou entité non vérifiée)'
  } else if (score <= 79) {
    level = 'standard'
    colorVariant = 'blue'
    label = 'Niveau : Déclaration Standard'
  } else {
    level = 'high_integrity'
    colorVariant = 'green_gold'
    label = 'Niveau : Haute Intégrité - Prêt pour Contrôle AI Act'
  }

  let secondaryNotice: string | null = null
  if (input.profile_type === 'academic') {
    secondaryNotice = ACADEMIC_NOTICE
  } else if (input.siren_collision_flag === true) {
    secondaryNotice = SIREN_COLLISION_NOTICE
  }

  return { score, level, colorVariant, label, secondaryNotice }
}

function purgeAvailableAtMs(value: string | Date): number {
  if (value instanceof Date) return value.getTime()
  return Date.parse(value)
}

/**
 * Un cas ou une société occupe un slot freemium tant qu'il n'est pas soft-deleted
 * et que son sas de purge 24 h n'est pas échu.
 */
export function isEntityOccupyingFreemiumSlot(
  entity?: EntitySlotOccupancyInput | null,
  now?: Date
): boolean {
  if (!entity) return false
  if (entity.lifecycle_status === 'soft_deleted') return false

  if (entity.lifecycle_status === 'purging_24h' && entity.purge_available_at != null) {
    const availableAt = purgeAvailableAtMs(entity.purge_available_at)
    const nowMs = (now ?? new Date()).getTime()
    if (Number.isFinite(availableAt) && availableAt <= nowMs) return false
  }

  return true
}

/**
 * Matrice gouvernance : confiance d'entité (seuil 65, défaut 50) × intégrité d'audit (seuil 60, défaut 0).
 */
export function classifyGovernanceMatrix(
  input?: GovernanceMatrixInput | null
): GovernanceQuadrant {
  const trust = input?.entity_trust_score ?? 50
  const integrity = input?.audit_integrity_score ?? 0
  const trustHigh = trust >= 65
  const integrityHigh = integrity >= 60

  if (trustHigh && integrityHigh) return 'hot_pql'
  if (trustHigh && !integrityHigh) return 'rushed_curious'
  if (!trustHigh && integrityHigh) return 'ghost_consultant'
  return 'bot_or_abuse'
}
