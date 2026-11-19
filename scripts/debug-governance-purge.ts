/**
 * Cycle de vie du sas de suppression 24 h, sur une company et un cas de test.
 *
 * Commande :
 *   pnpm debug:governance-purge
 */

import * as path from 'path'
import * as dotenv from 'dotenv'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { deleteCompanyCascade, deleteUseCaseCascade } from '../lib/account-deletion'
import {
  confirmDeletionAndStart24hTimer,
  initiateFreemiumDeletionRequest,
  processScheduledPurgesAndHardDeletes,
} from '../lib/services/governancePurgeService'
import {
  canUseMonthlyFreemiumReset,
  formatRemainingPurgeLabel,
  isEntityOccupyingFreemiumSlot,
} from '../lib/validations/governance-scores'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`ÉCHEC : ${message}`)
  }
  console.log(`OK : ${message}`)
}

async function countOutside(
  admin: SupabaseClient,
  table: 'companies' | 'usecases',
  status: string,
  excludeId?: string
): Promise<number> {
  let query = admin.from(table).select('id', { count: 'exact', head: true }).eq('lifecycle_status', status)
  if (excludeId) query = query.neq('id', excludeId)
  const { count, error } = await query
  if (error) throw new Error(error.message || error.details || 'Erreur DB')
  return count ?? 0
}

async function main(): Promise<void> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) {
    console.error('NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY requis dans .env.local')
    process.exit(1)
  }

  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const foreignPurge =
    (await countOutside(admin, 'companies', 'purging_24h')) +
    (await countOutside(admin, 'usecases', 'purging_24h')) +
    (await countOutside(admin, 'companies', 'soft_deleted')) +
    (await countOutside(admin, 'usecases', 'soft_deleted'))
  if (foreignPurge > 0) {
    console.error(
      `ÉCHEC : ${foreignPurge} entité(s) déjà en purge ou soft_deleted. Le test n'exécute pas une purge globale datée dans le futur.`
    )
    process.exit(1)
  }

  const { data: profiles, error: profileError } = await admin
    .from('profiles')
    .select('id, monthly_reset_count, last_reset_at')
    .limit(50)
  if (profileError || !profiles?.length) {
    console.error('[debug:governance-purge] profils', profileError)
    process.exit(1)
  }
  const owner = profiles.find((row) => canUseMonthlyFreemiumReset(row).allowed)
  if (!owner) {
    console.error('ÉCHEC : aucun profil avec un reset freemium disponible')
    process.exit(1)
  }
  const savedReset = {
    monthly_reset_count: owner.monthly_reset_count ?? 0,
    last_reset_at: owner.last_reset_at ?? null,
  }

  const companyName = `gov-purge-test-${Date.now()}`
  const { data: company, error: companyError } = await admin
    .from('companies')
    .insert({ name: companyName, city: 'Paris', country: 'France' })
    .select('id')
    .single()
  if (companyError || !company) {
    console.error('[debug:governance-purge] company', companyError)
    process.exit(1)
  }

  const { error: linkError } = await admin.from('user_companies').insert({
    user_id: owner.id,
    company_id: company.id,
    role: 'owner',
    added_by: owner.id,
  })
  if (linkError) {
    console.error('[debug:governance-purge] user_companies', linkError)
    process.exit(1)
  }

  const { data: usecase, error: usecaseError } = await admin
    .from('usecases')
    .insert({
      name: `${companyName}-usecase`,
      description: 'Cas temporaire du sas de purge',
      company_id: company.id,
      status: 'draft',
      deployment_phase: 'en_projet',
      questionnaire_version: 3,
      active_question_codes: [],
      checklist_gov_enterprise: [],
      checklist_gov_usecase: [],
      block_e5_governance: [],
      block_e6_transparence: [],
    })
    .select('id')
    .single()
  if (usecaseError || !usecase) {
    console.error('[debug:governance-purge] usecase', usecaseError)
    await admin.from('user_companies').delete().eq('company_id', company.id)
    await admin.from('companies').delete().eq('id', company.id)
    process.exit(1)
  }

  try {
    const fresh = canUseMonthlyFreemiumReset({ monthly_reset_count: 0, last_reset_at: null })
    assert(fresh.allowed === true && fresh.effectiveResetCount === 0, 'reset autorisé si compteur à 0')
    const expired = canUseMonthlyFreemiumReset(
      {
        monthly_reset_count: 1,
        last_reset_at: new Date(Date.now() - 31 * 24 * 60 * 60 * 1000).toISOString(),
      }
    )
    assert(expired.allowed === true && expired.effectiveResetCount === 0, 'reset autorisé après 30 jours')

    const started = await initiateFreemiumDeletionRequest({
      actorUserId: owner.id,
      ownerUserId: owner.id,
      entityType: 'usecase',
      entityId: usecase.id,
      skipEmailSend: true,
    })
    assert(started.ok === true, 'demande de suppression acceptée')
    if (!started.ok) return

    const { data: awaiting, error: awaitingError } = await admin
      .from('usecases')
      .select('lifecycle_status, deletion_token_hash')
      .eq('id', usecase.id)
      .single()
    if (awaitingError) throw new Error(awaitingError.message || 'Erreur DB')
    assert(awaiting.lifecycle_status === 'awaiting_email_confirm', 'statut awaiting_email_confirm')
    assert(typeof awaiting.deletion_token_hash === 'string' && awaiting.deletion_token_hash.length > 0, 'jeton hashé')

    const wrong = await confirmDeletionAndStart24hTimer({
      entityType: 'usecase',
      entityId: usecase.id,
      rawToken: '0123456789abcdef0123456789abcdef',
    })
    assert(wrong.ok === false, 'mauvais jeton refusé')

    const confirmed = await confirmDeletionAndStart24hTimer({
      entityType: 'usecase',
      entityId: usecase.id,
      rawToken: started.rawToken,
    })
    assert(confirmed.ok === true, 'bon jeton accepté')
    if (!confirmed.ok) return

    const { data: purging, error: purgingError } = await admin
      .from('usecases')
      .select('lifecycle_status, purge_available_at')
      .eq('id', usecase.id)
      .single()
    if (purgingError) throw new Error(purgingError.message || 'Erreur DB')
    assert(purging.lifecycle_status === 'purging_24h', 'statut purging_24h')
    const availableAt = new Date(purging.purge_available_at).getTime()
    const deltaHours = (availableAt - Date.now()) / 3600000
    assert(deltaHours > 23 && deltaHours <= 24, `purge_available_at à +24h (delta ${deltaHours.toFixed(2)}h)`)

    const label = formatRemainingPurgeLabel(purging)
    assert(
      label === 'Purge réglementaire en cours (disponible dans 23h59)' ||
        label === 'Purge réglementaire en cours (disponible dans 24h00)',
      `libellé de compte à rebours : ${label}`
    )
    assert(isEntityOccupyingFreemiumSlot(purging) === true, 'le sas 24h occupe encore le slot')

    await processScheduledPurgesAndHardDeletes({
      now: new Date(Date.now() + 25 * 3600 * 1000),
      skipEmailSend: true,
    })
    const { data: softDeleted, error: softError } = await admin
      .from('usecases')
      .select('lifecycle_status')
      .eq('id', usecase.id)
      .single()
    if (softError) throw new Error(softError.message || 'Erreur DB')
    assert(softDeleted.lifecycle_status === 'soft_deleted', 'purge 24h échue → soft_deleted')

    const { data: resetProfile, error: resetError } = await admin
      .from('profiles')
      .select('monthly_reset_count')
      .eq('id', owner.id)
      .single()
    if (resetError) throw new Error(resetError.message || 'Erreur DB')
    assert(resetProfile.monthly_reset_count === 1, `monthly_reset_count = 1 (lu ${resetProfile.monthly_reset_count})`)

    const blocked = await initiateFreemiumDeletionRequest({
      actorUserId: owner.id,
      ownerUserId: owner.id,
      entityType: 'usecase',
      entityId: usecase.id,
      skipEmailSend: true,
    })
    assert(!blocked.ok && blocked.code === 'MONTHLY_RESET_QUOTA_REACHED', 'second reset bloqué')

    const stillForeign =
      (await countOutside(admin, 'companies', 'soft_deleted')) +
      (await countOutside(admin, 'usecases', 'soft_deleted', usecase.id)) +
      (await countOutside(admin, 'companies', 'purging_24h')) +
      (await countOutside(admin, 'usecases', 'purging_24h', usecase.id))
    if (stillForeign > 0) {
      console.error(`ÉCHEC : ${stillForeign} autre(s) entité(s) seraient effacées par le hard delete daté.`)
      process.exit(1)
    }

    await processScheduledPurgesAndHardDeletes({
      now: new Date(Date.now() + 37 * 24 * 3600 * 1000),
      skipEmailSend: true,
    })
    const { data: gone, error: goneError } = await admin
      .from('usecases')
      .select('id')
      .eq('id', usecase.id)
      .maybeSingle()
    if (goneError) throw new Error(goneError.message || 'Erreur DB')
    assert(gone === null, 'hard delete après 35 jours')

    const { count: completedCount, error: completedError } = await admin
      .from('usecases')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'completed')
    if (completedError) throw new Error(completedError.message || 'Erreur DB')
    assert(completedCount === 199, `status=completed reste à 199 (lu ${completedCount})`)

    console.log('Toutes les assertions du sas de purge sont passées.')
  } finally {
    const { error: restoreError } = await admin
      .from('profiles')
      .update({
        monthly_reset_count: savedReset.monthly_reset_count,
        last_reset_at: savedReset.last_reset_at,
      })
      .eq('id', owner.id)
    if (restoreError) console.error('[debug:governance-purge] restauration profil', restoreError)

    try {
      await deleteUseCaseCascade(admin, usecase.id)
    } catch (error) {
      console.error('[debug:governance-purge] cleanup usecase', error)
    }
    const { error: unlinkError } = await admin.from('user_companies').delete().eq('company_id', company.id)
    if (unlinkError) console.error('[debug:governance-purge] cleanup lien', unlinkError)
    try {
      await deleteCompanyCascade(admin, company.id)
    } catch (error) {
      console.error('[debug:governance-purge] cleanup company', error)
    }
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
