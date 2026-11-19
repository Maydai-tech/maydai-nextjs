import type { SupabaseClient } from '@supabase/supabase-js'
import { getServiceRoleClient } from '@/lib/maydai-calculator'
import {
  AuditIntegrityBreakdownSchema,
  EntityTrustBreakdownSchema,
  InputTelemetrySchema,
  ScoreBounded100Schema,
  type AuditIntegrityBreakdown,
  type EntityTrustBreakdown,
  type InputTelemetry,
} from '@/lib/validations/governance-scores'

const GENERIC_EMAIL_DOMAINS = [
  'gmail.com',
  'googlemail.com',
  'yahoo.com',
  'yahoo.fr',
  'hotmail.com',
  'hotmail.fr',
  'outlook.com',
  'outlook.fr',
  'live.com',
  'live.fr',
  'msn.com',
  'icloud.com',
  'me.com',
  'orange.fr',
  'wanadoo.fr',
  'free.fr',
  'sfr.fr',
  'laposte.net',
  'proton.me',
  'protonmail.com',
  'gmx.com',
  'gmx.fr',
  'aol.com',
  'yopmail.com',
  'mailinator.com',
]

export interface EntityTrustCalcInput {
  email?: string | null
  profile_type?: string | null
  siren?: string | null
  siren_verified_pappers?: boolean | null
  company_name?: string | null
}

export interface AuditIntegrityCalcInput {
  path_mode?: string | null
  completion_seconds?: number | null
  input_telemetry?: InputTelemetry | null
  siren_verified_pappers?: boolean | null
  profile_type?: string | null
}

export interface EngagementCalcInput {
  completeness_score?: number | null
  siren_verified_pappers?: boolean | null
  profile_type?: string | null
  academic_institution?: string | null
  total_usecases_count?: number | null
  completed_usecases_count?: number | null
  collaborators_count?: number | null
  uploaded_documents_count?: number | null
  history_events_count?: number | null
}

interface ProfileSirenRow {
  id: string
  created_at?: string | null
}

function dbError(error: { message?: string; details?: string } | null, context: string): Error {
  console.error(context, error)
  return new Error(error?.message || error?.details || 'Erreur DB')
}

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, value))
}

function splitEmail(email: string): { local: string; domain: string } | null {
  const normalized = email.trim().toLowerCase()
  const at = normalized.lastIndexOf('@')
  if (at <= 0 || at === normalized.length - 1) return null
  const local = normalized.slice(0, at)
  const domain = normalized.slice(at + 1)
  if (!local || !domain.includes('.')) return null
  return { local, domain }
}

function domainRadical(domain: string): string | null {
  const labels = domain.split('.').filter((label) => label.length > 0)
  if (labels.length < 2) return null
  const radical = labels
    .slice(0, -1)
    .join('')
    .replace(/[-_\s]/g, '')
    .toLowerCase()
  return radical.length >= 3 ? radical : null
}

function normalizeCompanyName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '')
}

export function calculateEntityTrustScorePure(
  input?: EntityTrustCalcInput | null
): EntityTrustBreakdown {
  const baseScore = 50
  let emailDomainPoints = 0
  let emailAliasPenalty = 0
  let pappersSirenPoints = 0
  let domainCompanyMatchPoints = 0

  const emailParts = input?.email ? splitEmail(input.email) : null
  if (emailParts) {
    emailDomainPoints = GENERIC_EMAIL_DOMAINS.includes(emailParts.domain) ? -10 : 25
    const dotCount = emailParts.local.split('.').length - 1
    emailAliasPenalty = emailParts.local.includes('+') || dotCount >= 3 ? -20 : 0
  }

  const siren = input?.siren?.trim() ?? ''
  if (input?.profile_type !== 'academic' && input?.siren_verified_pappers === true && siren) {
    pappersSirenPoints = 30
  }

  if (emailDomainPoints === 25 && emailParts && input?.company_name?.trim()) {
    const radical = domainRadical(emailParts.domain)
    const company = normalizeCompanyName(input.company_name)
    if (radical && company && (company.includes(radical) || radical.includes(company))) {
      domainCompanyMatchPoints = 15
    }
  }

  const rawClamped = clampScore(
    baseScore + emailDomainPoints + emailAliasPenalty + pappersSirenPoints + domainCompanyMatchPoints
  )
  const academic = input?.profile_type === 'academic'
  const finalScore = academic ? Math.min(rawClamped, 75) : rawClamped

  return EntityTrustBreakdownSchema.parse({
    base_score: baseScore,
    email_domain_points: emailDomainPoints,
    email_alias_penalty: emailAliasPenalty,
    pappers_siren_points: pappersSirenPoints,
    domain_company_match_points: domainCompanyMatchPoints,
    academic_cap_applied: academic ? rawClamped > 75 || true : false,
    final_score: finalScore,
  })
}

async function setSirenCollisionFlag(
  admin: SupabaseClient,
  userId: string,
  value: boolean
): Promise<void> {
  const { error } = await admin
    .from('profiles')
    .update({ siren_collision_flag: value })
    .eq('id', userId)
  if (error) throw dbError(error, '[governance] siren_collision_flag')
}

async function ensureSirenCollisionAlert(
  admin: SupabaseClient,
  siren: string,
  primaryProfileId: string,
  secondaryProfileId: string
): Promise<void> {
  const { data, error } = await admin
    .from('admin_alerts')
    .select('id')
    .eq('alert_type', 'SIREN_COLLISION')
    .eq('siren', siren)
    .eq('primary_profile_id', primaryProfileId)
    .eq('secondary_profile_id', secondaryProfileId)
    .limit(1)

  if (error) throw dbError(error, '[governance] lecture admin_alerts')
  if (data && data.length > 0) return

  const { error: insertError } = await admin.from('admin_alerts').insert({
    alert_type: 'SIREN_COLLISION',
    siren,
    primary_profile_id: primaryProfileId,
    secondary_profile_id: secondaryProfileId,
    status: 'open',
    metadata: { detected_at: new Date().toISOString() },
  })
  if (insertError) throw dbError(insertError, '[governance] insert admin_alerts')
}

export async function detectAndRecordSirenCollision(
  userId: string,
  siren?: string | null
): Promise<{ collision: boolean; primaryProfileId: string | null }> {
  const admin = getServiceRoleClient()
  const normalized = siren?.trim() ?? ''

  if (!normalized) {
    await setSirenCollisionFlag(admin, userId, false)
    return { collision: false, primaryProfileId: null }
  }

  const { data, error } = await admin
    .from('profiles')
    .select('id, created_at')
    .eq('siren', normalized)
    .order('created_at', { ascending: true })
    .order('id', { ascending: true })

  if (error) throw dbError(error, '[governance] recherche collision SIREN')

  const lines = (data ?? []) as ProfileSirenRow[]
  const primaryId = lines[0]?.id ?? null
  const others = lines.filter((line) => line.id !== userId)

  if (others.length === 0 || primaryId === userId) {
    if (primaryId === userId) {
      await setSirenCollisionFlag(admin, userId, false)
      for (const secondary of lines) {
        if (secondary.id === userId) continue
        await ensureSirenCollisionAlert(admin, normalized, userId, secondary.id)
      }
    }
    return { collision: false, primaryProfileId: userId }
  }

  await setSirenCollisionFlag(admin, userId, true)
  if (primaryId) {
    await ensureSirenCollisionAlert(admin, normalized, primaryId, userId)
  }
  return { collision: true, primaryProfileId: primaryId }
}

export async function calculateAndPersistEntityTrustScore(
  userId: string
): Promise<EntityTrustBreakdown> {
  const admin = getServiceRoleClient()
  const { data: profile, error } = await admin
    .from('profiles')
    .select('profile_type, siren, siren_verified_pappers, company_name')
    .eq('id', userId)
    .maybeSingle()

  if (error) throw dbError(error, '[governance] lecture profil entity trust')
  if (!profile) {
    console.error('[governance] lecture profil entity trust', `Profil introuvable: ${userId}`)
    throw new Error('Profil introuvable')
  }

  const { data: authData, error: authError } = await admin.auth.admin.getUserById(userId)
  if (authError) {
    console.error('[governance] lecture email auth', authError)
    throw new Error(authError.message || 'Erreur DB')
  }

  const breakdown = calculateEntityTrustScorePure({
    email: authData.user?.email ?? null,
    profile_type: profile.profile_type,
    siren: profile.siren,
    siren_verified_pappers: profile.siren_verified_pappers,
    company_name: profile.company_name,
  })

  const { error: updateError } = await admin
    .from('profiles')
    .update({ entity_trust_score: breakdown.final_score })
    .eq('id', userId)

  if (updateError) throw dbError(updateError, '[governance] persist entity_trust_score')
  return breakdown
}

function parseTelemetry(value: unknown): InputTelemetry | null {
  if (value == null) return null
  const parsed = InputTelemetrySchema.safeParse(value)
  if (!parsed.success) {
    console.error('[governance] input_telemetry invalide', parsed.error)
    return null
  }
  return parsed.data
}

export function calculateAuditIntegrityScorePure(
  input?: AuditIntegrityCalcInput | null
): AuditIntegrityBreakdown {
  const baseScore = 55
  let timePenaltyOrBonus = 0
  let velocityPenaltyOrBonus = 0
  let entityVerifiedBonus = 0

  const seconds = input?.completion_seconds
  if (seconds != null && seconds >= 0) {
    const short = input?.path_mode === 'short'
    if (short) {
      if (seconds < 45) timePenaltyOrBonus = -30
      else if (seconds >= 90) timePenaltyOrBonus = 15
    } else if (seconds < 120) {
      timePenaltyOrBonus = -30
    } else if (seconds >= 240) {
      timePenaltyOrBonus = 15
    }
  }

  const telemetry = parseTelemetry(input?.input_telemetry)
  if (telemetry) {
    const { keystrokes_count: keystrokes, total_chars_count: total, pasted_chars_count: pasted } =
      telemetry
    if (keystrokes === 0 && total > 20) {
      velocityPenaltyOrBonus = -35
    } else if (total > 20 && pasted / total > 0.85) {
      velocityPenaltyOrBonus = -15
    } else if (keystrokes >= 15) {
      velocityPenaltyOrBonus = 10
    }
  }

  if (input?.profile_type !== 'academic' && input?.siren_verified_pappers === true) {
    entityVerifiedBonus = 20
  }

  const rawClamped = clampScore(
    baseScore + timePenaltyOrBonus + velocityPenaltyOrBonus + entityVerifiedBonus
  )
  const finalScore = input?.profile_type === 'academic' ? Math.min(rawClamped, 75) : rawClamped

  return AuditIntegrityBreakdownSchema.parse({
    base_score: baseScore,
    time_penalty_or_bonus: timePenaltyOrBonus,
    velocity_penalty_or_bonus: velocityPenaltyOrBonus,
    entity_verified_bonus: entityVerifiedBonus,
    final_score: finalScore,
  })
}

export async function calculateAndPersistAuditIntegrityScore(
  usecaseId: string
): Promise<AuditIntegrityBreakdown | null> {
  const admin = getServiceRoleClient()
  const { data: usecase, error: usecaseError } = await admin
    .from('usecases')
    .select('id, company_id, path_mode, input_telemetry')
    .eq('id', usecaseId)
    .maybeSingle()

  if (usecaseError) throw dbError(usecaseError, '[governance] lecture usecase intégrité')
  if (!usecase) return null

  const { data: run, error: runError } = await admin
    .from('evaluation_path_runs')
    .select('completion_seconds, path_mode')
    .eq('usecase_id', usecaseId)
    .not('completed_at', 'is', null)
    .order('completed_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (runError) throw dbError(runError, '[governance] lecture evaluation_path_runs')

  let sirenVerified: boolean | null = null
  let profileType: string | null = null

  if (usecase.company_id) {
    const { data: ownerLink, error: ownerError } = await admin
      .from('user_companies')
      .select('user_id')
      .eq('company_id', usecase.company_id)
      .eq('role', 'owner')
      .limit(1)
      .maybeSingle()

    if (ownerError) throw dbError(ownerError, '[governance] lecture owner registre')

    if (ownerLink?.user_id) {
      const { data: ownerProfile, error: profileError } = await admin
        .from('profiles')
        .select('siren_verified_pappers, profile_type')
        .eq('id', ownerLink.user_id)
        .maybeSingle()

      if (profileError) throw dbError(profileError, '[governance] lecture profil owner')
      sirenVerified = ownerProfile?.siren_verified_pappers ?? null
      profileType = ownerProfile?.profile_type ?? null
    }
  }

  const breakdown = calculateAuditIntegrityScorePure({
    path_mode: run?.path_mode ?? usecase.path_mode ?? null,
    completion_seconds: run?.completion_seconds ?? null,
    input_telemetry: parseTelemetry(usecase.input_telemetry),
    siren_verified_pappers: sirenVerified,
    profile_type: profileType,
  })

  const { error: updateError } = await admin
    .from('usecases')
    .update({ audit_integrity_score: breakdown.final_score })
    .eq('id', usecaseId)

  if (updateError) throw dbError(updateError, '[governance] persist audit_integrity_score')
  return breakdown
}

function pointsAtLeast(value: number | null | undefined, threshold: number, points: number): number {
  return (value ?? 0) >= threshold ? points : 0
}

export function calculateEngagementScorePure(input?: EngagementCalcInput | null): number {
  const completeness = input?.completeness_score ?? 0
  let score = 0
  if (completeness >= 80) score += 15
  else if (completeness >= 50) score += 8

  const academicVerified =
    input?.profile_type === 'academic' && Boolean(input?.academic_institution?.trim())
  if (input?.siren_verified_pappers === true || academicVerified) score += 15

  score += pointsAtLeast(input?.total_usecases_count, 1, 15)
  score += pointsAtLeast(input?.completed_usecases_count, 1, 15)
  score += pointsAtLeast(input?.collaborators_count, 1, 15)
  score += pointsAtLeast(input?.uploaded_documents_count, 1, 15)
  score += pointsAtLeast(input?.history_events_count, 1, 10)

  return ScoreBounded100Schema.parse(clampScore(score))
}

async function countRows(
  query: PromiseLike<{ count: number | null; error: { message?: string; details?: string } | null }>,
  context: string
): Promise<number> {
  const { count, error } = await query
  if (error) throw dbError(error, context)
  return count ?? 0
}

export async function calculateAndPersistEngagementScore(userId: string): Promise<number> {
  const admin = getServiceRoleClient()
  const { data: profile, error: profileError } = await admin
    .from('profiles')
    .select('completeness_score, siren_verified_pappers, profile_type, academic_institution')
    .eq('id', userId)
    .maybeSingle()

  if (profileError) throw dbError(profileError, '[governance] lecture profil engagement')

  const { data: memberships, error: membershipError } = await admin
    .from('user_companies')
    .select('company_id')
    .eq('user_id', userId)

  if (membershipError) throw dbError(membershipError, '[governance] lecture registres engagement')

  const companyIds = [
    ...new Set(
      (memberships ?? [])
        .map((row) => row.company_id)
        .filter((id): id is string => typeof id === 'string' && id.length > 0)
    ),
  ]

  const totalUseCases = companyIds.length
    ? await countRows(
        admin.from('usecases').select('id', { count: 'exact', head: true }).in('company_id', companyIds),
        '[governance] comptage usecases'
      )
    : 0

  const completedUseCases = companyIds.length
    ? await countRows(
        admin
          .from('usecases')
          .select('id', { count: 'exact', head: true })
          .in('company_id', companyIds)
          .eq('status', 'completed'),
        '[governance] comptage usecases complétés'
      )
    : 0

  const { data: invited, error: invitedError } = await admin
    .from('user_profiles')
    .select('invited_user_id')
    .eq('inviter_user_id', userId)
  if (invitedError) throw dbError(invitedError, '[governance] lecture user_profiles')

  const { data: added, error: addedError } = await admin
    .from('user_companies')
    .select('user_id, role')
    .eq('added_by', userId)
    .neq('role', 'owner')
  if (addedError) throw dbError(addedError, '[governance] lecture collaborateurs')

  const collaboratorIds = new Set<string>()
  for (const row of invited ?? []) {
    if (row.invited_user_id && row.invited_user_id !== userId) collaboratorIds.add(row.invited_user_id)
  }
  for (const row of added ?? []) {
    if (row.user_id && row.user_id !== userId) collaboratorIds.add(row.user_id)
  }

  let uploadedDocuments = 0
  if (companyIds.length > 0) {
    const { data: dossiers, error: dossierError } = await admin
      .from('dossiers')
      .select('id')
      .in('company_id', companyIds)
    if (dossierError) throw dbError(dossierError, '[governance] lecture dossiers')
    const dossierIds = (dossiers ?? [])
      .map((row) => row.id)
      .filter((id): id is string => typeof id === 'string')
    if (dossierIds.length > 0) {
      uploadedDocuments = await countRows(
        admin
          .from('dossier_documents')
          .select('id', { count: 'exact', head: true })
          .in('dossier_id', dossierIds)
          .or('status.in.(complete,validated),file_url.not.is.null'),
        '[governance] comptage documents'
      )
    }
  }

  const historyEvents = await countRows(
    admin.from('usecase_history').select('id', { count: 'exact', head: true }).eq('user_id', userId),
    '[governance] comptage historique'
  )

  const score = calculateEngagementScorePure({
    completeness_score: profile?.completeness_score ?? 0,
    siren_verified_pappers: profile?.siren_verified_pappers ?? false,
    profile_type: profile?.profile_type ?? null,
    academic_institution: profile?.academic_institution ?? null,
    total_usecases_count: totalUseCases,
    completed_usecases_count: completedUseCases,
    collaborators_count: collaboratorIds.size,
    uploaded_documents_count: uploadedDocuments,
    history_events_count: historyEvents,
  })

  const { error: updateError } = await admin
    .from('profiles')
    .update({ engagement_score: score })
    .eq('id', userId)
  if (updateError) throw dbError(updateError, '[governance] persist engagement_score')
  return score
}
