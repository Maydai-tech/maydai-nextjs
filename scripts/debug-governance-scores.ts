/**
 * Contrats des 3 scores, mapping NAF et quotas en lecture seule.
 *
 * Commande :
 *   pnpm debug:governance-scores
 */

import * as path from 'path'
import * as dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import { mapNafToMaydaiIndustry } from '../lib/services/pappersService'
import {
  calculateAuditIntegrityScorePure,
  calculateEntityTrustScorePure,
} from '../lib/services/governanceScoreService'
import {
  countActiveOwnedRegistries,
  countActiveUseCasesForRegistry,
} from '../lib/subscription/quota-guards'
import { validateIndustrySelection } from '../lib/validation/industries'
import { getAuditIntegrityBadge } from '../lib/validations/governance-scores'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

function assert(condition: boolean, message: string): void {
  if (!condition) {
    console.error(`ÉCHEC : ${message}`)
    process.exit(1)
  }
  console.log(`OK : ${message}`)
}

function assertNafMapping(): void {
  const samples: Array<{ code: string; sensitive: boolean }> = [
    { code: '62.01Z', sensitive: false },
    { code: '64.19Z', sensitive: true },
    { code: '86.10Z', sensitive: true },
    { code: '85.42Z', sensitive: true },
    { code: '69.10Z', sensitive: true },
  ]

  for (const sample of samples) {
    const mapped = mapNafToMaydaiIndustry(sample.code)
    assert(mapped !== null, `${sample.code} produit un mapping`)
    if (!mapped) continue
    const validation = validateIndustrySelection(mapped.mainIndustryId, mapped.subCategoryId)
    assert(validation.valid === true, `${sample.code} → ${mapped.mainIndustryId}/${mapped.subCategoryId}`)
    assert(
      mapped.annex_iii_sensitive === sample.sensitive,
      `${sample.code} annex_iii_sensitive=${String(mapped.annex_iii_sensitive)}`
    )
  }
}

function assertEntityTrust(): void {
  const generic = calculateEntityTrustScorePure({
    email: 'jean.dupont+test@gmail.com',
  })
  assert(generic.final_score === 20, `email générique + alias = 20 (lu ${generic.final_score})`)
  assert(generic.email_domain_points === -10, 'domaine générique = -10')
  assert(generic.email_alias_penalty === -20, 'alias + = -20')

  const verified = calculateEntityTrustScorePure({
    email: 'contact@zubrow.io',
    company_name: 'ZUBROW CORP',
    siren_verified_pappers: true,
    siren: '123456782',
    profile_type: 'company',
  })
  assert(verified.final_score === 100, `Zubrow vérifié = 100 (lu ${verified.final_score})`)

  const academic = calculateEntityTrustScorePure({
    email: 'prof@univ-paris.fr',
    profile_type: 'academic',
    company_name: 'Univ Paris',
    siren_verified_pappers: true,
    siren: '123456782',
  })
  assert(academic.final_score === 75, `académique plafonné à 75 (lu ${academic.final_score})`)
  assert(academic.academic_cap_applied === true, 'academic_cap_applied')
}

function assertAuditIntegrity(): void {
  const bot = calculateAuditIntegrityScorePure({
    path_mode: 'long',
    completion_seconds: 30,
    input_telemetry: {
      keystrokes_count: 0,
      paste_events_count: 0,
      pasted_chars_count: 0,
      total_chars_count: 150,
    },
    siren_verified_pappers: false,
  })
  assert(bot.final_score === 0, `bot long = 0 (lu ${bot.final_score})`)
  const botBadge = getAuditIntegrityBadge({ audit_integrity_score: bot.final_score })
  assert(botBadge?.level === 'exploratory', 'bot < 40 → exploratory')

  const seriousInput = {
    path_mode: 'long' as const,
    completion_seconds: 300,
    input_telemetry: {
      keystrokes_count: 80,
      paste_events_count: 1,
      pasted_chars_count: 20,
      total_chars_count: 200,
    },
    siren_verified_pappers: true,
  }
  const serious = calculateAuditIntegrityScorePure(seriousInput)
  assert(serious.final_score === 100, `audit sérieux = 100 (lu ${serious.final_score})`)
  const seriousBadge = getAuditIntegrityBadge({ audit_integrity_score: serious.final_score })
  assert(seriousBadge?.level === 'high_integrity', 'audit sérieux ≥ 80 → high_integrity')

  const academic = calculateAuditIntegrityScorePure({
    ...seriousInput,
    profile_type: 'academic',
  })
  assert(academic.final_score === 75, `audit académique plafonné à 75 (lu ${academic.final_score})`)
  const academicBadge = getAuditIntegrityBadge({
    audit_integrity_score: academic.final_score,
    profile_type: 'academic',
  })
  assert(academicBadge?.level === 'standard', '75 académique → badge standard')
  assert(academicBadge?.colorVariant === 'blue', '75 académique → bleu')
}

async function assertLiveQuotas(): Promise<void> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) {
    console.error('NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY requis dans .env.local')
    process.exit(1)
  }

  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { data: ownerLink, error: ownerError } = await admin
    .from('user_companies')
    .select('user_id, company_id')
    .eq('role', 'owner')
    .limit(1)
    .maybeSingle()

  if (ownerError) {
    console.error('[debug:governance-scores] owner', ownerError)
    process.exit(1)
  }

  if (ownerLink?.user_id && ownerLink.company_id) {
    const registries = await countActiveOwnedRegistries(ownerLink.user_id, admin)
    const usecases = await countActiveUseCasesForRegistry(ownerLink.company_id, admin)
    assert(Number.isInteger(registries) && registries >= 0, `registres actifs = ${registries}`)
    assert(Number.isInteger(usecases) && usecases >= 0, `cas actifs du registre = ${usecases}`)
  } else {
    console.log('OK : aucun owner à compter, fonctions non appelées sur une ligne réelle')
  }

  const { count: completedCount, error: completedError } = await admin
    .from('usecases')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'completed')

  if (completedError) {
    console.error('[debug:governance-scores] completed', completedError)
    process.exit(1)
  }
  assert(completedCount === 199, `status=completed reste à 199 (lu ${completedCount})`)

  const { count: intactCount, error: intactError } = await admin
    .from('usecases')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'completed')
    .is('audit_integrity_score', null)

  if (intactError) {
    console.error('[debug:governance-scores] audit null', intactError)
    process.exit(1)
  }
  assert(
    intactCount === 199,
    `les 199 completed ont encore audit_integrity_score null (lu ${intactCount})`
  )
}

async function main(): Promise<void> {
  assertNafMapping()
  assertEntityTrust()
  assertAuditIntegrity()
  await assertLiveQuotas()
  console.log('Toutes les assertions des scores de gouvernance sont passées.')
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
