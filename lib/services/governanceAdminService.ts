import type { SupabaseClient } from '@supabase/supabase-js'
import {
  calculateAndPersistEngagementScore,
  calculateAndPersistEntityTrustScore,
} from '@/lib/services/governanceScoreService'
import { isEntityOccupyingFreemiumSlot } from '@/lib/validations/governance-scores'
import {
  AdminGovernancePayloadSchema,
  AdminGovernanceUserRowSchema,
  AdminSirenCollisionAlertRowSchema,
  classifyGovernanceMatrix,
  type AdminGovernancePatchBody,
  type AdminGovernancePayload,
  type GovernanceQuadrant,
} from '@/lib/validations/governance-scores'

interface ProfileAdminSource {
  id?: string | null
  first_name?: string | null
  last_name?: string | null
  company_name?: string | null
  industry?: string | null
  sub_category_id?: string | null
  siren?: string | null
  naf_code?: string | null
  profile_type?: string | null
  siren_verified_pappers?: boolean | null
  academic_institution?: string | null
  academic_department?: string | null
  completeness_score?: number | null
  entity_trust_score?: number | null
  engagement_score?: number | null
  siren_collision_flag?: boolean | null
  monthly_reset_count?: number | null
  last_reset_at?: string | null
  created_at?: string | null
}

interface CompanyAdminSource {
  id?: string | null
  name?: string | null
  siren?: string | null
  lifecycle_status?: string | null
  purge_requested_at?: string | null
  purge_available_at?: string | null
  soft_deleted_at?: string | null
}

interface UseCaseAdminSource {
  id?: string | null
  name?: string | null
  company_id?: string | null
  status?: string | null
  lifecycle_status?: string | null
  audit_integrity_score?: number | null
  purge_requested_at?: string | null
  purge_available_at?: string | null
  soft_deleted_at?: string | null
  updated_at?: string | null
}

interface AlertAdminSource {
  id?: string | null
  alert_type?: string | null
  siren?: string | null
  primary_profile_id?: string | null
  secondary_profile_id?: string | null
  status?: string | null
  metadata?: unknown
  created_at?: string | null
  updated_at?: string | null
}

interface MembershipSource {
  user_id?: string | null
  company_id?: string | null
  role?: string | null
  created_at?: string | null
}

interface SubscriptionSource {
  user_id?: string | null
  plan_id?: string | null
  status?: string | null
  created_at?: string | null
}

interface PlanSource {
  id?: string | null
  plan_name?: string | null
  display_name?: string | null
}

const PROFILE_COLUMNS =
  'id, first_name, last_name, company_name, industry, sub_category_id, siren, naf_code, profile_type, siren_verified_pappers, academic_institution, academic_department, completeness_score, entity_trust_score, engagement_score, siren_collision_flag, monthly_reset_count, last_reset_at, created_at'

function dbError(error: { message?: string; details?: string } | null, context: string): Error {
  console.error(context, error)
  return new Error(error?.message || error?.details || 'Erreur DB')
}

function asNullableString(value: unknown): string | null {
  if (typeof value === 'string') return value
  return null
}

function asNullableNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function requiredNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

function displayName(profile?: ProfileAdminSource | null): string | null {
  if (!profile) return null
  const full = [profile.first_name, profile.last_name]
    .filter((part): part is string => typeof part === 'string' && part.trim().length > 0)
    .join(' ')
    .trim()
  if (full) return full
  return asNullableString(profile.company_name)
}

function firstOf<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null
  return value ?? null
}

async function listAuthEmails(supabaseAdmin: SupabaseClient): Promise<Map<string, string | null>> {
  const emails = new Map<string, string | null>()
  let page = 1
  const perPage = 1000

  while (page < 50) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage })
    if (error) {
      console.error('[governanceAdmin] listUsers', error)
      throw new Error(error.message || 'Erreur DB')
    }
    const users = data?.users ?? []
    for (const user of users) {
      emails.set(user.id, typeof user.email === 'string' ? user.email : null)
    }
    if (users.length < perPage) break
    page += 1
  }

  return emails
}

export async function buildAdminGovernancePayload(
  supabaseAdmin: SupabaseClient
): Promise<AdminGovernancePayload> {
  const [
    profilesResult,
    emails,
    subscriptionsResult,
    plansResult,
    membershipsResult,
    companiesResult,
    usecasesResult,
    alertsResult,
  ] = await Promise.all([
    supabaseAdmin.from('profiles').select(PROFILE_COLUMNS),
    listAuthEmails(supabaseAdmin),
    supabaseAdmin.from('subscriptions').select('user_id, plan_id, status, created_at'),
    supabaseAdmin.from('plans').select('id, plan_name, display_name'),
    supabaseAdmin
      .from('user_companies')
      .select('user_id, company_id, role, created_at')
      .in('role', ['owner', 'company_owner']),
    supabaseAdmin
      .from('companies')
      .select('id, name, siren, lifecycle_status, purge_requested_at, purge_available_at, soft_deleted_at'),
    supabaseAdmin
      .from('usecases')
      .select(
        'id, name, company_id, status, lifecycle_status, audit_integrity_score, purge_requested_at, purge_available_at, soft_deleted_at, updated_at'
      ),
    supabaseAdmin
      .from('admin_alerts')
      .select('id, alert_type, siren, primary_profile_id, secondary_profile_id, status, metadata, created_at, updated_at')
      .order('created_at', { ascending: false }),
  ])

  if (profilesResult.error) throw dbError(profilesResult.error, '[governanceAdmin] profiles')
  if (subscriptionsResult.error) throw dbError(subscriptionsResult.error, '[governanceAdmin] subscriptions')
  if (plansResult.error) throw dbError(plansResult.error, '[governanceAdmin] plans')
  if (membershipsResult.error) throw dbError(membershipsResult.error, '[governanceAdmin] user_companies')
  if (companiesResult.error) throw dbError(companiesResult.error, '[governanceAdmin] companies')
  if (usecasesResult.error) throw dbError(usecasesResult.error, '[governanceAdmin] usecases')
  if (alertsResult.error) throw dbError(alertsResult.error, '[governanceAdmin] admin_alerts')

  const profiles = (profilesResult.data ?? []) as ProfileAdminSource[]
  const profileById = new Map<string, ProfileAdminSource>()
  for (const profile of profiles) {
    if (profile.id) profileById.set(profile.id, profile)
  }

  const plans = new Map<string, PlanSource>()
  for (const plan of (plansResult.data ?? []) as PlanSource[]) {
    if (plan.id) plans.set(plan.id, plan)
  }

  const activePlanByUser = new Map<string, PlanSource | null>()
  const subscriptions = [...((subscriptionsResult.data ?? []) as SubscriptionSource[])].sort((a, b) =>
    String(b.created_at ?? '').localeCompare(String(a.created_at ?? ''))
  )
  for (const subscription of subscriptions) {
    if (!subscription.user_id || activePlanByUser.has(subscription.user_id)) continue
    const status = subscription.status
    if (status !== 'active' && status !== 'trialing') continue
    activePlanByUser.set(subscription.user_id, subscription.plan_id ? plans.get(subscription.plan_id) ?? null : null)
  }

  const companiesById = new Map<string, CompanyAdminSource>()
  for (const company of (companiesResult.data ?? []) as CompanyAdminSource[]) {
    if (company.id) companiesById.set(company.id, company)
  }

  const usecases = (usecasesResult.data ?? []) as UseCaseAdminSource[]
  const usecasesByCompany = new Map<string, UseCaseAdminSource[]>()
  for (const usecase of usecases) {
    if (!usecase.company_id) continue
    const list = usecasesByCompany.get(usecase.company_id) ?? []
    list.push(usecase)
    usecasesByCompany.set(usecase.company_id, list)
  }

  const companiesByOwner = new Map<string, string[]>()
  for (const link of (membershipsResult.data ?? []) as MembershipSource[]) {
    if (!link.user_id || !link.company_id) continue
    const list = companiesByOwner.get(link.user_id) ?? []
    if (!list.includes(link.company_id)) list.push(link.company_id)
    companiesByOwner.set(link.user_id, list)
  }

  const ownerByCompany = new Map<string, string>()
  const orderedLinks = [...((membershipsResult.data ?? []) as MembershipSource[])].sort((a, b) =>
    String(a.created_at ?? '').localeCompare(String(b.created_at ?? ''))
  )
  for (const link of orderedLinks) {
    if (!link.user_id || !link.company_id || ownerByCompany.has(link.company_id)) continue
    ownerByCompany.set(link.company_id, link.user_id)
  }

  const alerts = (alertsResult.data ?? []) as AlertAdminSource[]
  const alertsByUser = new Map<string, AlertAdminSource[]>()
  for (const alert of alerts) {
    for (const profileId of [alert.primary_profile_id, alert.secondary_profile_id]) {
      if (!profileId) continue
      const list = alertsByUser.get(profileId) ?? []
      list.push(alert)
      alertsByUser.set(profileId, list)
    }
  }

  const quadrants: Record<GovernanceQuadrant, number> = {
    hot_pql: 0,
    rushed_curious: 0,
    ghost_consultant: 0,
    bot_or_abuse: 0,
  }

  const users = profiles.flatMap((profile) => {
    if (!profile.id) return []
    const ownedCompanyIds = companiesByOwner.get(profile.id) ?? []
    const ownedCompanies = ownedCompanyIds
      .map((id) => companiesById.get(id))
      .filter((company): company is CompanyAdminSource => Boolean(company))
    const ownedUseCases = ownedCompanyIds.flatMap((id) => usecasesByCompany.get(id) ?? [])

    const scored = ownedUseCases
      .filter((usecase) => typeof usecase.audit_integrity_score === 'number')
      .sort((a, b) => String(b.updated_at ?? '').localeCompare(String(a.updated_at ?? '')))
    const avg =
      scored.length > 0
        ? scored.reduce((sum, usecase) => sum + (usecase.audit_integrity_score as number), 0) / scored.length
        : null
    const latest = scored[0]?.audit_integrity_score ?? null
    const quadrant = classifyGovernanceMatrix({
      entity_trust_score: profile.entity_trust_score,
      audit_integrity_score: latest ?? avg ?? 50,
    })
    quadrants[quadrant] += 1

    const collisionAlert = (alertsByUser.get(profile.id) ?? [])[0] ?? null
    const otherId =
      collisionAlert?.primary_profile_id === profile.id
        ? collisionAlert.secondary_profile_id
        : collisionAlert?.primary_profile_id
    const otherProfile = otherId ? profileById.get(otherId) ?? null : null
    const activePlan = activePlanByUser.has(profile.id) ? activePlanByUser.get(profile.id) : undefined
    const planLabel = [activePlan?.display_name, activePlan?.plan_name].find(
      (value): value is string => typeof value === 'string' && value.trim().length > 0
    )

    const row = {
      id: profile.id,
      email: emails.get(profile.id) ?? null,
      first_name: asNullableString(profile.first_name),
      last_name: asNullableString(profile.last_name),
      company_name: asNullableString(profile.company_name),
      profile_type: typeof profile.profile_type === 'string' ? profile.profile_type : '',
      siren: asNullableString(profile.siren),
      naf_code: asNullableString(profile.naf_code),
      siren_verified_pappers: profile.siren_verified_pappers === true,
      academic_institution: asNullableString(profile.academic_institution),
      academic_department: asNullableString(profile.academic_department),
      completeness_score: asNullableNumber(profile.completeness_score),
      entity_trust_score: requiredNumber(profile.entity_trust_score, 50),
      engagement_score: requiredNumber(profile.engagement_score, 0),
      avg_audit_integrity_score: avg,
      latest_audit_integrity_score: asNullableNumber(latest),
      quadrant,
      siren_collision_flag: profile.siren_collision_flag === true,
      collision_with_profile_id: otherId ?? null,
      collision_with_email: otherId ? emails.get(otherId) ?? null : null,
      collision_with_name: displayName(otherProfile),
      collision_alert_id: collisionAlert?.id ?? null,
      collision_alert_status: asNullableString(collisionAlert?.status),
      plan_name: activePlan === undefined ? 'Freemium' : planLabel ?? '',
      is_freemium: activePlan === undefined,
      active_registries_count: ownedCompanies.filter((company) => isEntityOccupyingFreemiumSlot(company)).length,
      active_usecases_count: ownedUseCases.filter((usecase) => isEntityOccupyingFreemiumSlot(usecase)).length,
      purging_entities_count:
        ownedCompanies.filter((company) => company.lifecycle_status != null && company.lifecycle_status !== 'active')
          .length +
        ownedUseCases.filter((usecase) => usecase.lifecycle_status != null && usecase.lifecycle_status !== 'active')
          .length,
      monthly_reset_count: requiredNumber(profile.monthly_reset_count, 0),
      last_reset_at: asNullableString(profile.last_reset_at),
      created_at: asNullableString(profile.created_at),
    }

    const parsed = AdminGovernanceUserRowSchema.safeParse(row)
    if (!parsed.success) {
      console.error('[governanceAdmin] ligne utilisateur invalide', parsed.error)
      throw new Error('Ligne utilisateur admin invalide')
    }
    return [parsed.data]
  })

  const alertRows = alerts.flatMap((alert) => {
    if (!alert.id) return []
    const primary = alert.primary_profile_id ? profileById.get(alert.primary_profile_id) : null
    const secondary = alert.secondary_profile_id ? profileById.get(alert.secondary_profile_id) : null
    const parsed = AdminSirenCollisionAlertRowSchema.safeParse({
      id: alert.id,
      alert_type: typeof alert.alert_type === 'string' ? alert.alert_type : '',
      siren: typeof alert.siren === 'string' ? alert.siren : '',
      status: typeof alert.status === 'string' ? alert.status : '',
      created_at: typeof alert.created_at === 'string' ? alert.created_at : '',
      updated_at: typeof alert.updated_at === 'string' ? alert.updated_at : '',
      primary_profile: primary?.id
        ? {
            id: primary.id,
            email: emails.get(primary.id) ?? null,
            first_name: asNullableString(primary.first_name),
            last_name: asNullableString(primary.last_name),
            company_name: asNullableString(primary.company_name),
            created_at: asNullableString(primary.created_at),
          }
        : null,
      secondary_profile: secondary?.id
        ? {
            id: secondary.id,
            email: emails.get(secondary.id) ?? null,
            first_name: asNullableString(secondary.first_name),
            last_name: asNullableString(secondary.last_name),
            company_name: asNullableString(secondary.company_name),
            siren_collision_flag: secondary.siren_collision_flag === true,
            created_at: asNullableString(secondary.created_at),
          }
        : null,
    })
    if (!parsed.success) {
      console.error('[governanceAdmin] alerte invalide', parsed.error)
      throw new Error('Alerte admin invalide')
    }
    return [parsed.data]
  })

  const purgingEntities = [
    ...[...companiesById.values()].flatMap((company) => {
      if (!company.id || company.lifecycle_status == null || company.lifecycle_status === 'active') return []
      return [
        {
          entity_type: 'company' as const,
          id: company.id,
          name: asNullableString(company.name),
          lifecycle_status: asNullableString(company.lifecycle_status),
          company_id: company.id,
          purge_requested_at: asNullableString(company.purge_requested_at),
          purge_available_at: asNullableString(company.purge_available_at),
          soft_deleted_at: asNullableString(company.soft_deleted_at),
          owner_user_id: ownerByCompany.get(company.id) ?? null,
          workflow_status: null,
        },
      ]
    }),
    ...usecases.flatMap((usecase) => {
      if (!usecase.id || usecase.lifecycle_status == null || usecase.lifecycle_status === 'active') return []
      return [
        {
          entity_type: 'usecase' as const,
          id: usecase.id,
          name: asNullableString(usecase.name),
          lifecycle_status: asNullableString(usecase.lifecycle_status),
          company_id: asNullableString(usecase.company_id),
          purge_requested_at: asNullableString(usecase.purge_requested_at),
          purge_available_at: asNullableString(usecase.purge_available_at),
          soft_deleted_at: asNullableString(usecase.soft_deleted_at),
          owner_user_id: usecase.company_id ? ownerByCompany.get(usecase.company_id) ?? null : null,
          workflow_status: asNullableString(usecase.status),
        },
      ]
    }),
  ]

  const payload = AdminGovernancePayloadSchema.safeParse({
    generated_at: new Date().toISOString(),
    quadrants,
    users,
    alerts: alertRows,
    purging_entities: purgingEntities,
  })
  if (!payload.success) {
    console.error('[governanceAdmin] payload invalide', payload.error)
    throw new Error('Payload admin gouvernance invalide')
  }
  return payload.data
}

export async function handleAdminGovernanceAction(
  supabaseAdmin: SupabaseClient,
  body: AdminGovernancePatchBody
): Promise<{ ok: true }> {
  if (body.action === 'recalculate_user_scores') {
    try {
      await calculateAndPersistEntityTrustScore(body.userId)
      await calculateAndPersistEngagementScore(body.userId)
      return { ok: true }
    } catch (error) {
      console.error('[governanceAdmin] recalcul scores', error)
      throw error instanceof Error ? error : new Error('Erreur DB')
    }
  }

  const nowIso = new Date().toISOString()
  const { data: updated, error: updateError } = await supabaseAdmin
    .from('admin_alerts')
    .update({ status: body.status, updated_at: nowIso })
    .eq('id', body.alertId)
    .select('id, secondary_profile_id')
    .maybeSingle()

  if (updateError) throw dbError(updateError, '[governanceAdmin] update alerte')

  const alertRow = firstOf(updated)
  if (body.clearSecondaryCollisionFlag && alertRow?.secondary_profile_id) {
    const { error: flagError } = await supabaseAdmin
      .from('profiles')
      .update({ siren_collision_flag: false, updated_at: nowIso })
      .eq('id', alertRow.secondary_profile_id)
    if (flagError) throw dbError(flagError, '[governanceAdmin] lever flag collision')
  }

  return { ok: true }
}
