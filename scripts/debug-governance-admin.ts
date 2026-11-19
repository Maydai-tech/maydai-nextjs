/**
 * Lot 5 : miroir admin, collision SIREN et restauration intégrale.
 *
 * Commande :
 *   pnpm debug:governance-admin
 */

import * as path from 'path'
import * as dotenv from 'dotenv'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { detectAndRecordSirenCollision } from '../lib/services/governanceScoreService'
import {
  AdminGovernanceUserRowSchema,
  getProfileTypeLabel,
} from '../lib/validations/governance-scores'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const TEST_SIREN = '123456782'
const PROFILE_COLUMNS =
  'id, first_name, last_name, company_name, industry, sub_category_id, siren, naf_code, profile_type, siren_verified_pappers, academic_institution, academic_department, completeness_score, entity_trust_score, engagement_score, siren_collision_flag, monthly_reset_count, last_reset_at, updated_at, created_at'

interface ProfileSnapshot {
  id: string
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
  updated_at?: string | null
  created_at?: string | null
}

interface AlertSnapshot {
  id: string
  status?: string | null
  updated_at?: string | null
  primary_profile_id?: string | null
  secondary_profile_id?: string | null
}

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message)
  console.log(`OK : ${message}`)
}

function dbError(error: { message?: string; details?: string } | null, context: string): Error {
  console.error(context, error)
  return new Error(error?.message || error?.details || 'Erreur DB')
}

function restorePayload(snapshot: ProfileSnapshot): Record<string, unknown> {
  const { id: _id, created_at: _createdAt, ...rest } = snapshot
  return rest
}

async function readProfile(admin: SupabaseClient, id: string): Promise<ProfileSnapshot> {
  const { data, error } = await admin.from('profiles').select(PROFILE_COLUMNS).eq('id', id).single()
  if (error) throw dbError(error, '[debug:governance-admin] lecture profil')
  return data as ProfileSnapshot
}

async function main(): Promise<void> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY requis dans .env.local')
  }

  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { data: pair, error: pairError } = await admin
    .from('profiles')
    .select(PROFILE_COLUMNS)
    .order('created_at', { ascending: true })
    .limit(2)

  if (pairError) throw dbError(pairError, '[debug:governance-admin] sélection profils')
  const rows = (pair ?? []) as ProfileSnapshot[]
  if (rows.length < 2 || !rows[0]?.id || !rows[1]?.id) {
    throw new Error('Deux profils sont requis pour le test de collision')
  }

  const profileA = rows[0]
  const profileB = rows[1]
  const snapshotA = { ...profileA }
  const snapshotB = { ...profileB }

  const { data: holders, error: holdersError } = await admin
    .from('profiles')
    .select('id, siren')
    .eq('siren', TEST_SIREN)

  if (holdersError) throw dbError(holdersError, '[debug:governance-admin] titulaires SIREN')
  const otherHolders = (holders ?? []).filter(
    (row) => row.id !== profileA.id && row.id !== profileB.id
  ) as Array<{ id: string; siren?: string | null }>

  const { data: alertsBefore, error: alertsBeforeError } = await admin
    .from('admin_alerts')
    .select('id, status, updated_at, primary_profile_id, secondary_profile_id')
    .or(
      [
        `primary_profile_id.eq.${profileA.id}`,
        `secondary_profile_id.eq.${profileA.id}`,
        `primary_profile_id.eq.${profileB.id}`,
        `secondary_profile_id.eq.${profileB.id}`,
        `siren.eq.${TEST_SIREN}`,
      ].join(',')
    )

  if (alertsBeforeError) throw dbError(alertsBeforeError, '[debug:governance-admin] alertes initiales')
  const beforeAlerts = (alertsBefore ?? []) as AlertSnapshot[]
  const beforeAlertIds = new Set(beforeAlerts.map((alert) => alert.id))

  const { buildAdminGovernancePayload, handleAdminGovernanceAction } = await import(
    '../lib/services/governanceAdminService'
  )

  try {
    for (const holder of otherHolders) {
      const { error } = await admin.from('profiles').update({ siren: null }).eq('id', holder.id)
      if (error) throw dbError(error, '[debug:governance-admin] isolation SIREN')
    }

    const { error: setAError } = await admin.from('profiles').update({ siren: TEST_SIREN }).eq('id', profileA.id)
    if (setAError) throw dbError(setAError, '[debug:governance-admin] siren A')
    await detectAndRecordSirenCollision(profileA.id, TEST_SIREN)

    const { error: setBError } = await admin.from('profiles').update({ siren: TEST_SIREN }).eq('id', profileB.id)
    if (setBError) throw dbError(setBError, '[debug:governance-admin] siren B')
    await detectAndRecordSirenCollision(profileB.id, TEST_SIREN)

    const afterA = await readProfile(admin, profileA.id)
    const afterB = await readProfile(admin, profileB.id)
    assert(afterA.siren_collision_flag === false, 'profil A (premier) sans flag de collision')
    assert(afterB.siren_collision_flag === true, 'profil B (second) avec flag de collision')

    const { data: openAlert, error: openAlertError } = await admin
      .from('admin_alerts')
      .select('id, status, primary_profile_id, secondary_profile_id')
      .eq('siren', TEST_SIREN)
      .eq('alert_type', 'SIREN_COLLISION')
      .eq('primary_profile_id', profileA.id)
      .eq('secondary_profile_id', profileB.id)
      .eq('status', 'open')
      .maybeSingle()

    if (openAlertError) throw dbError(openAlertError, '[debug:governance-admin] alerte ouverte')
    assert(Boolean(openAlert?.id), 'alerte SIREN_COLLISION ouverte créée')

    const [{ data: authA }, { data: authB }] = await Promise.all([
      admin.auth.admin.getUserById(profileA.id),
      admin.auth.admin.getUserById(profileB.id),
    ])

    const payload = await buildAdminGovernancePayload(admin)
    for (const row of payload.users) {
      const parsed = AdminGovernanceUserRowSchema.safeParse(row)
      assert(parsed.success, `ligne ${row.id} valide pour AdminGovernanceUserRowSchema`)
    }

    const rowB = payload.users.find((row) => row.id === profileB.id)
    assert(Boolean(rowB), 'profil B présent dans le tableau admin')
    if (!rowB) return
    assert(rowB.first_name === (afterB.first_name ?? null), 'prénom B miroir DB')
    assert(rowB.last_name === (afterB.last_name ?? null), 'nom B miroir DB')
    assert(rowB.email === (authB.user?.email ?? null), 'email B miroir auth')
    assert(rowB.company_name === (afterB.company_name ?? null), 'entreprise B miroir DB')
    assert(rowB.entity_trust_score === afterB.entity_trust_score, 'entity_trust_score B miroir DB')
    assert(rowB.engagement_score === afterB.engagement_score, 'engagement_score B miroir DB')
    assert(rowB.siren_collision_flag === true, 'flag collision B exposé')
    assert(rowB.collision_with_profile_id === profileA.id, 'collision B pointe vers le profil A')
    assert(rowB.collision_with_email === (authA.user?.email ?? null), 'email du profil A en face de B')

    assert(getProfileTypeLabel('unknown_xyz') === 'unknown_xyz', 'clé inconnue conservée')
    assert(getProfileTypeLabel('') === 'Inconnu', 'clé vide → Inconnu')

    await handleAdminGovernanceAction(admin, {
      action: 'update_alert_status',
      alertId: openAlert.id,
      status: 'resolved',
      clearSecondaryCollisionFlag: true,
    })

    const { data: resolved, error: resolvedError } = await admin
      .from('admin_alerts')
      .select('status')
      .eq('id', openAlert.id)
      .single()
    if (resolvedError) throw dbError(resolvedError, '[debug:governance-admin] relecture alerte')
    assert(resolved?.status === 'resolved', 'alerte passée à resolved')

    const clearedB = await readProfile(admin, profileB.id)
    assert(clearedB.siren_collision_flag === false, 'flag PDF du profil B retiré')

    const { count: completedCount, error: completedError } = await admin
      .from('usecases')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'completed')
    if (completedError) throw dbError(completedError, '[debug:governance-admin] completed')
    assert(completedCount === 199, `status=completed reste à 199 (lu ${completedCount})`)

    const { count: intactCount, error: intactError } = await admin
      .from('usecases')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'completed')
      .is('audit_integrity_score', null)
    if (intactError) throw dbError(intactError, '[debug:governance-admin] audit null')
    assert(intactCount === 199, `199 cas completed ont audit_integrity_score null (lu ${intactCount})`)
  } finally {
    const { data: alertsAfter, error: alertsAfterError } = await admin
      .from('admin_alerts')
      .select('id, status, updated_at, primary_profile_id, secondary_profile_id')
      .or(
        [
          `primary_profile_id.eq.${profileA.id}`,
          `secondary_profile_id.eq.${profileA.id}`,
          `primary_profile_id.eq.${profileB.id}`,
          `secondary_profile_id.eq.${profileB.id}`,
          `siren.eq.${TEST_SIREN}`,
        ].join(',')
      )

    if (alertsAfterError) {
      console.error('[debug:governance-admin] relecture alertes', alertsAfterError)
    } else {
      for (const alert of (alertsAfter ?? []) as AlertSnapshot[]) {
        if (!beforeAlertIds.has(alert.id)) {
          const { error } = await admin.from('admin_alerts').delete().eq('id', alert.id)
          if (error) console.error('[debug:governance-admin] suppression alerte test', error)
          continue
        }
        const original = beforeAlerts.find((item) => item.id === alert.id)
        if (original && original.status !== alert.status) {
          const { error } = await admin
            .from('admin_alerts')
            .update({ status: original.status, updated_at: original.updated_at })
            .eq('id', alert.id)
          if (error) console.error('[debug:governance-admin] restauration alerte', error)
        }
      }
    }

    for (const holder of otherHolders) {
      const { error } = await admin.from('profiles').update({ siren: holder.siren ?? null }).eq('id', holder.id)
      if (error) console.error('[debug:governance-admin] restauration titulaire SIREN', error)
    }

    const { error: restoreAError } = await admin
      .from('profiles')
      .update(restorePayload(snapshotA))
      .eq('id', profileA.id)
    if (restoreAError) console.error('[debug:governance-admin] restauration A', restoreAError)

    const { error: restoreBError } = await admin
      .from('profiles')
      .update(restorePayload(snapshotB))
      .eq('id', profileB.id)
    if (restoreBError) console.error('[debug:governance-admin] restauration B', restoreBError)
    else console.log('OK : profils A et B restaurés')
  }
}

main()
  .then(() => {
    console.log('OK : debug:governance-admin terminé')
  })
  .catch((error: unknown) => {
    console.error('[debug:governance-admin]', error instanceof Error ? error.message : error)
    process.exit(1)
  })
