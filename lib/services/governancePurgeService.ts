import { createHash, randomBytes } from 'crypto'
import { getServiceRoleClient } from '@/lib/maydai-calculator'
import { deleteCompanyCascade, deleteUseCaseCascade, removeDossierStorageFiles } from '@/lib/account-deletion'
import { sendDeletionConfirmationEmail, sendPurgeCompletedEmail } from '@/lib/email/mailjet'
import {
  canUseMonthlyFreemiumReset,
  type DeletionEntityType,
} from '@/lib/validations/governance-scores'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://www.maydai.io'
const DAY_MS = 24 * 60 * 60 * 1000

interface LifecycleEntityRow {
  id: string
  name?: string | null
  company_id?: string | null
  lifecycle_status?: string | null
  deletion_token_hash?: string | null
  purge_available_at?: string | null
  soft_deleted_at?: string | null
}

function dbError(error: { message?: string; details?: string } | null, context: string): Error {
  console.error(context, error)
  return new Error(error?.message || error?.details || 'Erreur DB')
}

export function hashDeletionToken(rawToken: string): string {
  return createHash('sha256').update(rawToken).digest('hex')
}

function tableFor(entityType: DeletionEntityType): 'companies' | 'usecases' {
  return entityType === 'company' ? 'companies' : 'usecases'
}

async function dossierIdsForEntity(
  entityType: DeletionEntityType,
  entityId: string
): Promise<string[]> {
  const admin = getServiceRoleClient()
  if (entityType === 'usecase') {
    const { data, error } = await admin.from('dossiers').select('id').eq('usecase_id', entityId)
    if (error) throw dbError(error, '[governancePurge] dossiers usecase')
    return (data ?? []).map((row) => row.id as string).filter(Boolean)
  }

  const ids = new Set<string>()
  const { data: byCompany, error: companyError } = await admin
    .from('dossiers')
    .select('id')
    .eq('company_id', entityId)
  if (companyError) throw dbError(companyError, '[governancePurge] dossiers company')
  for (const row of byCompany ?? []) ids.add(row.id as string)

  const { data: usecases, error: usecaseError } = await admin
    .from('usecases')
    .select('id')
    .eq('company_id', entityId)
  if (usecaseError) throw dbError(usecaseError, '[governancePurge] usecases company')
  const usecaseIds = (usecases ?? []).map((row) => row.id as string).filter(Boolean)
  if (usecaseIds.length > 0) {
    const { data: byUsecase, error: byUsecaseError } = await admin
      .from('dossiers')
      .select('id')
      .in('usecase_id', usecaseIds)
    if (byUsecaseError) throw dbError(byUsecaseError, '[governancePurge] dossiers des usecases')
    for (const row of byUsecase ?? []) ids.add(row.id as string)
  }
  return [...ids]
}

export async function initiateFreemiumDeletionRequest(options: {
  actorUserId: string
  ownerUserId: string
  entityType: DeletionEntityType
  entityId: string
  skipEmailSend?: boolean
}): Promise<
  | { ok: false; code: 'MONTHLY_RESET_QUOTA_REACHED'; nextAvailableAt: string | null }
  | { ok: true; status: 'awaiting_email_confirm'; confirmationLink: string; rawToken: string }
> {
  const admin = getServiceRoleClient()
  const { data: ownerProfile, error: profileError } = await admin
    .from('profiles')
    .select('monthly_reset_count, last_reset_at, first_name')
    .eq('id', options.ownerUserId)
    .maybeSingle()

  if (profileError) throw dbError(profileError, '[governancePurge] lecture profil owner')

  const check = canUseMonthlyFreemiumReset(ownerProfile)
  if (!check.allowed) {
    return {
      ok: false,
      code: 'MONTHLY_RESET_QUOTA_REACHED',
      nextAvailableAt: check.nextAvailableAt,
    }
  }

  const rawToken = randomBytes(32).toString('hex')
  const tokenHash = hashDeletionToken(rawToken)
  const requestedAt = new Date().toISOString()
  const table = tableFor(options.entityType)

  const { error: updateError } = await admin
    .from(table)
    .update({
      lifecycle_status: 'awaiting_email_confirm',
      deletion_token_hash: tokenHash,
      purge_requested_at: requestedAt,
    })
    .eq('id', options.entityId)

  if (updateError) throw dbError(updateError, '[governancePurge] demande de suppression')

  if (options.entityType === 'company') {
    const { error: childrenError } = await admin
      .from('usecases')
      .update({ lifecycle_status: 'awaiting_email_confirm' })
      .eq('company_id', options.entityId)
      .neq('lifecycle_status', 'soft_deleted')
    if (childrenError) throw dbError(childrenError, '[governancePurge] usecases du registre')
  }

  const confirmationLink = `${APP_URL}/api/governance/confirm-deletion?type=${options.entityType}&id=${options.entityId}&token=${rawToken}`

  if (!options.skipEmailSend) {
    const { data: actor, error: actorError } = await admin.auth.admin.getUserById(options.actorUserId)
    if (actorError) {
      console.error('[governancePurge] email acteur', actorError)
    } else if (actor.user?.email) {
      const { data: entity } = await admin.from(table).select('name').eq('id', options.entityId).maybeSingle()
      const sent = await sendDeletionConfirmationEmail({
        toEmail: actor.user.email,
        firstName: ownerProfile?.first_name ?? null,
        entityName: entity?.name || 'élément MaydAI',
        entityType: options.entityType,
        confirmationLink,
      })
      if (!sent.success) {
        console.error('[governancePurge] email de confirmation non envoyé', options.entityId)
      }
    }
  }

  return { ok: true, status: 'awaiting_email_confirm', confirmationLink, rawToken }
}

export async function confirmDeletionAndStart24hTimer(options: {
  entityType: DeletionEntityType
  entityId: string
  rawToken: string
  now?: Date
}): Promise<
  | { ok: false; error: string }
  | { ok: true; status: 'purging_24h'; purgeAvailableAt: string }
> {
  const admin = getServiceRoleClient()
  const tokenHash = hashDeletionToken(options.rawToken)
  const table = tableFor(options.entityType)

  const { data: entity, error } = await admin
    .from(table)
    .select('id, deletion_token_hash, lifecycle_status')
    .eq('id', options.entityId)
    .maybeSingle()

  if (error) throw dbError(error, '[governancePurge] lecture jeton')

  if (
    !entity ||
    entity.deletion_token_hash !== tokenHash ||
    entity.lifecycle_status !== 'awaiting_email_confirm'
  ) {
    return { ok: false, error: 'Jeton de confirmation invalide ou déjà utilisé' }
  }

  const purgeAvailableAt = new Date((options.now ?? new Date()).getTime() + DAY_MS).toISOString()

  try {
    const dossierIds = await dossierIdsForEntity(options.entityType, options.entityId)
    if (dossierIds.length > 0) {
      await removeDossierStorageFiles(admin, dossierIds)
    }
  } catch (storageError) {
    console.error('[governancePurge] nettoyage Storage', storageError)
  }

  const { error: updateError } = await admin
    .from(table)
    .update({
      lifecycle_status: 'purging_24h',
      purge_available_at: purgeAvailableAt,
      deletion_token_hash: null,
    })
    .eq('id', options.entityId)

  if (updateError) throw dbError(updateError, '[governancePurge] démarrage 24h')

  if (options.entityType === 'company') {
    const { error: childrenError } = await admin
      .from('usecases')
      .update({
        lifecycle_status: 'purging_24h',
        purge_available_at: purgeAvailableAt,
      })
      .eq('company_id', options.entityId)
      .neq('lifecycle_status', 'soft_deleted')
    if (childrenError) throw dbError(childrenError, '[governancePurge] propagation 24h')
  }

  return { ok: true, status: 'purging_24h', purgeAvailableAt }
}

async function ownerOfCompany(companyId: string): Promise<string | null> {
  const admin = getServiceRoleClient()
  const { data, error } = await admin
    .from('user_companies')
    .select('user_id')
    .eq('company_id', companyId)
    .eq('role', 'owner')
    .limit(1)
    .maybeSingle()
  if (error) throw dbError(error, '[governancePurge] owner registre')
  return data?.user_id ?? null
}

async function bumpOwnerReset(ownerUserId: string, now: Date, nowIso: string): Promise<void> {
  const admin = getServiceRoleClient()
  const { data, error } = await admin
    .from('profiles')
    .select('monthly_reset_count, last_reset_at, first_name')
    .eq('id', ownerUserId)
    .maybeSingle()
  if (error) throw dbError(error, '[governancePurge] lecture quota reset')

  const check = canUseMonthlyFreemiumReset(data, now)
  const nextCount = check.effectiveResetCount <= 0 ? 1 : check.effectiveResetCount + 1
  const { error: updateError } = await admin
    .from('profiles')
    .update({ monthly_reset_count: nextCount, last_reset_at: nowIso })
    .eq('id', ownerUserId)
  if (updateError) throw dbError(updateError, '[governancePurge] quota reset')
}

async function notifyPurgeCompleted(
  ownerUserId: string,
  entityName: string,
  entityType: DeletionEntityType,
  skipEmailSend?: boolean
): Promise<void> {
  if (skipEmailSend) return
  const admin = getServiceRoleClient()
  const { data: profile } = await admin
    .from('profiles')
    .select('first_name')
    .eq('id', ownerUserId)
    .maybeSingle()
  const { data: authUser, error } = await admin.auth.admin.getUserById(ownerUserId)
  if (error || !authUser.user?.email) {
    console.error('[governancePurge] email purge introuvable', error)
    return
  }
  const sent = await sendPurgeCompletedEmail({
    toEmail: authUser.user.email,
    firstName: profile?.first_name ?? null,
    entityName,
    entityType,
  })
  if (!sent.success) {
    console.error('[governancePurge] email de purge non envoyé', entityName)
  }
}

export async function processScheduledPurgesAndHardDeletes(options?: {
  now?: Date
  skipEmailSend?: boolean
}): Promise<{
  softDeletedCompaniesCount: number
  softDeletedUsecasesCount: number
  hardDeletedCompaniesCount: number
  hardDeletedUsecasesCount: number
}> {
  const admin = getServiceRoleClient()
  const currentNow = options?.now ?? new Date()
  const nowIso = currentNow.toISOString()

  const { data: expiredCompanies, error: companiesError } = await admin
    .from('companies')
    .select('id, name')
    .eq('lifecycle_status', 'purging_24h')
    .lte('purge_available_at', nowIso)
  if (companiesError) throw dbError(companiesError, '[governancePurge] companies échues')

  const { data: expiredUsecases, error: usecasesError } = await admin
    .from('usecases')
    .select('id, name, company_id')
    .eq('lifecycle_status', 'purging_24h')
    .lte('purge_available_at', nowIso)
  if (usecasesError) throw dbError(usecasesError, '[governancePurge] usecases échus')

  const processedCompanyIds = new Set<string>()
  let softDeletedCompaniesCount = 0
  let softDeletedUsecasesCount = 0

  for (const company of (expiredCompanies ?? []) as LifecycleEntityRow[]) {
    processedCompanyIds.add(company.id)
    const { error: companyUpdateError } = await admin
      .from('companies')
      .update({ lifecycle_status: 'soft_deleted', soft_deleted_at: nowIso })
      .eq('id', company.id)
    if (companyUpdateError) throw dbError(companyUpdateError, '[governancePurge] soft delete company')

    const { error: childrenError } = await admin
      .from('usecases')
      .update({ lifecycle_status: 'soft_deleted', soft_deleted_at: nowIso })
      .eq('company_id', company.id)
      .neq('lifecycle_status', 'soft_deleted')
    if (childrenError) throw dbError(childrenError, '[governancePurge] soft delete usecases du registre')

    const ownerId = await ownerOfCompany(company.id)
    if (ownerId) {
      await bumpOwnerReset(ownerId, currentNow, nowIso)
      await notifyPurgeCompleted(ownerId, company.name || 'registre', 'company', options?.skipEmailSend)
    } else {
      console.error('[governancePurge] owner introuvable pour le registre', company.id)
    }
    softDeletedCompaniesCount += 1
  }

  for (const usecase of (expiredUsecases ?? []) as LifecycleEntityRow[]) {
    if (usecase.company_id && processedCompanyIds.has(usecase.company_id)) continue
    const { error: updateError } = await admin
      .from('usecases')
      .update({ lifecycle_status: 'soft_deleted', soft_deleted_at: nowIso })
      .eq('id', usecase.id)
    if (updateError) throw dbError(updateError, '[governancePurge] soft delete usecase')

    if (usecase.company_id) {
      const ownerId = await ownerOfCompany(usecase.company_id)
      if (ownerId) {
        await bumpOwnerReset(ownerId, currentNow, nowIso)
        await notifyPurgeCompleted(
          ownerId,
          usecase.name || "cas d'usage",
          'usecase',
          options?.skipEmailSend
        )
      } else {
        console.error('[governancePurge] owner introuvable pour le cas', usecase.id)
      }
    }
    softDeletedUsecasesCount += 1
  }

  const hardDeleteThresholdIso = new Date(currentNow.getTime() - 35 * DAY_MS).toISOString()

  const { data: oldUsecases, error: oldUsecaseError } = await admin
    .from('usecases')
    .select('id')
    .eq('lifecycle_status', 'soft_deleted')
    .lte('soft_deleted_at', hardDeleteThresholdIso)
  if (oldUsecaseError) throw dbError(oldUsecaseError, '[governancePurge] usecases à effacer')

  let hardDeletedUsecasesCount = 0
  for (const row of oldUsecases ?? []) {
    await deleteUseCaseCascade(admin, row.id as string)
    hardDeletedUsecasesCount += 1
  }

  const { data: oldCompanies, error: oldCompanyError } = await admin
    .from('companies')
    .select('id')
    .eq('lifecycle_status', 'soft_deleted')
    .lte('soft_deleted_at', hardDeleteThresholdIso)
  if (oldCompanyError) throw dbError(oldCompanyError, '[governancePurge] companies à effacer')

  let hardDeletedCompaniesCount = 0
  for (const row of oldCompanies ?? []) {
    await deleteCompanyCascade(admin, row.id as string)
    hardDeletedCompaniesCount += 1
  }

  return {
    softDeletedCompaniesCount,
    softDeletedUsecasesCount,
    hardDeletedCompaniesCount,
    hardDeletedUsecasesCount,
  }
}
