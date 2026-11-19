/**
 * Contrats gouvernance (fonctions pures) + lecture seule du schéma live.
 *
 * Commande :
 *   pnpm debug:governance-schema
 */

import * as path from 'path'
import * as dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import {
  classifyGovernanceMatrix,
  getAuditIntegrityBadge,
  isEntityOccupyingFreemiumSlot,
} from '../lib/validations/governance-scores'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

function assert(condition: boolean, message: string): void {
  if (!condition) {
    console.error(`ÉCHEC : ${message}`)
    process.exit(1)
  }
  console.log(`OK : ${message}`)
}

function assertBadge(): void {
  assert(
    getAuditIntegrityBadge({ audit_integrity_score: null }) === null,
    'badge null quand audit_integrity_score est null'
  )
  assert(getAuditIntegrityBadge(undefined) === null, 'badge null quand l’entrée est absente')

  const exploratory = getAuditIntegrityBadge({ audit_integrity_score: 25 })
  assert(exploratory?.level === 'exploratory', 'score 25 → exploratory')
  assert(exploratory?.colorVariant === 'red_orange', 'score 25 → red_orange')
  assert(exploratory?.secondaryNotice === null, 'score 25 → secondaryNotice null')

  const standard = getAuditIntegrityBadge({
    audit_integrity_score: 65,
    siren_collision_flag: true,
  })
  assert(standard?.level === 'standard', 'score 65 → standard')
  assert(standard?.colorVariant === 'blue', 'score 65 → blue')
  assert(
    standard?.secondaryNotice === 'Second registre non consolidé',
    'score 65 + collision → Second registre non consolidé'
  )

  const high = getAuditIntegrityBadge({
    audit_integrity_score: 88,
    profile_type: 'academic',
  })
  assert(high?.level === 'high_integrity', 'score 88 → high_integrity')
  assert(high?.colorVariant === 'green_gold', 'score 88 → green_gold')
  assert(
    high?.secondaryNotice === 'Usage Académique / Pédagogique',
    'score 88 académique → Usage Académique / Pédagogique'
  )
}

function assertSlot(): void {
  const now = new Date()
  const inOneHour = new Date(now.getTime() + 60 * 60 * 1000).toISOString()
  const oneSecondAgo = new Date(now.getTime() - 1000).toISOString()

  assert(
    isEntityOccupyingFreemiumSlot(
      { lifecycle_status: 'purging_24h', purge_available_at: inOneHour },
      now
    ) === true,
    'purge +1h occupe encore le slot'
  )
  assert(
    isEntityOccupyingFreemiumSlot(
      { lifecycle_status: 'purging_24h', purge_available_at: oneSecondAgo },
      now
    ) === false,
    'purge -1s libère le slot'
  )
  assert(
    isEntityOccupyingFreemiumSlot({ lifecycle_status: 'soft_deleted' }, now) === false,
    'soft_deleted ne occupe pas le slot'
  )
}

function assertMatrix(): void {
  assert(
    classifyGovernanceMatrix({ entity_trust_score: 80, audit_integrity_score: 75 }) === 'hot_pql',
    'matrice hot_pql'
  )
  assert(
    classifyGovernanceMatrix({ entity_trust_score: 80, audit_integrity_score: 30 }) ===
      'rushed_curious',
    'matrice rushed_curious'
  )
  assert(
    classifyGovernanceMatrix({ entity_trust_score: 40, audit_integrity_score: 75 }) ===
      'ghost_consultant',
    'matrice ghost_consultant'
  )
  assert(
    classifyGovernanceMatrix({ entity_trust_score: 30, audit_integrity_score: 20 }) ===
      'bot_or_abuse',
    'matrice bot_or_abuse'
  )
}

async function assertLiveSchema(): Promise<void> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) {
    console.error('NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY requis dans .env.local')
    process.exit(1)
  }

  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const probes: Array<{ table: string; columns: string }> = [
    {
      table: 'profiles',
      columns:
        'profile_type, naf_code, siren_verified_pappers, academic_institution, academic_department, entity_trust_score, engagement_score, siren_collision_flag, monthly_reset_count, last_reset_at',
    },
    {
      table: 'companies',
      columns:
        'lifecycle_status, deletion_token_hash, purge_requested_at, purge_available_at, soft_deleted_at',
    },
    {
      table: 'usecases',
      columns:
        'lifecycle_status, deletion_token_hash, purge_requested_at, purge_available_at, soft_deleted_at, audit_integrity_score, input_telemetry',
    },
    {
      table: 'admin_alerts',
      columns:
        'id, alert_type, siren, primary_profile_id, secondary_profile_id, status, metadata, created_at, updated_at',
    },
    {
      table: 'user_device_sessions',
      columns: 'id, user_id, device_id, user_agent_hash, ip_hash, last_active_at, created_at',
    },
  ]

  for (const probe of probes) {
    const { error } = await admin.from(probe.table).select(probe.columns).limit(1)
    if (error) {
      console.error(`ÉCHEC lecture ${probe.table} : ${error.message}`)
      process.exit(1)
    }
    console.log(`OK : colonnes lisibles sur ${probe.table}`)
  }

  const { count: completedCount, error: completedError } = await admin
    .from('usecases')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'completed')

  if (completedError) {
    console.error(`ÉCHEC comptage completed : ${completedError.message}`)
    process.exit(1)
  }
  assert(completedCount === 199, `usecases status=completed reste à 199 (lu ${completedCount})`)

  const { count: intactCount, error: intactError } = await admin
    .from('usecases')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'completed')
    .eq('lifecycle_status', 'active')
    .is('audit_integrity_score', null)

  if (intactError) {
    console.error(`ÉCHEC vérification rétrocompatibilité : ${intactError.message}`)
    process.exit(1)
  }
  assert(
    intactCount === 199,
    `les 199 completed ont lifecycle_status=active et audit_integrity_score null (lu ${intactCount})`
  )
}

async function main(): Promise<void> {
  assertBadge()
  assertSlot()
  assertMatrix()
  await assertLiveSchema()
  console.log('Toutes les assertions gouvernance sont passées.')
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
