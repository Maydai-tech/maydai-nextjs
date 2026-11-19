/**
 * Backfill des scores de complétude (profiles + companies).
 *
 * Recalcule completeness_score pour toutes les lignes historiques (ex. mises à 0 par migration)
 * sans action utilisateur.
 *
 * Usage :
 *   npx tsx scripts/backfill-completeness-scores.ts
 *
 * Prérequis (.env.local à la racine du projet) :
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'
import { calculateProfileCompletenessScore } from '../lib/validations/profile-completeness'
import { calculateRegistryCompletenessScore } from '../lib/validations/registry-completeness'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

type ProfileRow = {
  id: string
  first_name: string | null
  last_name: string | null
  company_name: string | null
  industry: string | null
  sub_category_id: string | null
  phone: string | null
  siren: string | null
  completeness_score: number | null
}

type CompanyRow = {
  id: string
  name: string | null
  industry: string | null
  sub_category_id: string | null
  city: string | null
  country: string | null
  type: string | null
  siren: string | null
  is_centralized_registry: boolean | null
  maydai_as_registry: boolean | null
  completeness_score: number | null
}

async function countProfileCollaborators(
  supabase: SupabaseClient,
  profileId: string
): Promise<boolean> {
  const { count, error } = await supabase
    .from('user_profiles')
    .select('*', { count: 'exact', head: true })
    .eq('inviter_user_id', profileId)

  if (error) {
    throw new Error(`user_profiles count for profile ${profileId}: ${error.message}`)
  }

  return (count ?? 0) > 0
}

async function countCompanyMembers(
  supabase: SupabaseClient,
  companyId: string
): Promise<number> {
  const { count, error } = await supabase
    .from('user_companies')
    .select('*', { count: 'exact', head: true })
    .eq('company_id', companyId)

  if (error) {
    throw new Error(`user_companies count for company ${companyId}: ${error.message}`)
  }

  return count ?? 0
}

async function getOwnerSiren(
  supabase: SupabaseClient,
  companyId: string
): Promise<string> {
  const { data: ownerLink, error: ownerError } = await supabase
    .from('user_companies')
    .select('user_id')
    .eq('company_id', companyId)
    .eq('role', 'owner')
    .maybeSingle()

  if (ownerError) {
    throw new Error(`owner lookup for company ${companyId}: ${ownerError.message}`)
  }

  if (!ownerLink?.user_id) {
    return ''
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('siren')
    .eq('id', ownerLink.user_id)
    .maybeSingle()

  if (profileError) {
    throw new Error(`profile siren for company ${companyId}: ${profileError.message}`)
  }

  return profile?.siren?.trim() ?? ''
}

async function backfillProfiles(supabase: SupabaseClient): Promise<{
  updated: number
  errors: number
}> {
  console.log('\n📋 Backfill des profils (profiles)...')

  const { data: profiles, error } = await supabase
    .from('profiles')
    .select(
      'id, first_name, last_name, company_name, industry, sub_category_id, phone, siren, completeness_score'
    )

  if (error) {
    throw new Error(`Fetch profiles: ${error.message}`)
  }

  if (!profiles?.length) {
    console.log('   Aucun profil trouvé.')
    return { updated: 0, errors: 0 }
  }

  console.log(`   ${profiles.length} profil(s) à traiter.`)

  let updated = 0
  let errors = 0

  for (const profile of profiles as ProfileRow[]) {
    try {
      const hasCollaborators = await countProfileCollaborators(supabase, profile.id)

      const score = calculateProfileCompletenessScore({
        first_name: profile.first_name ?? '',
        last_name: profile.last_name ?? '',
        company_name: profile.company_name ?? '',
        industry: profile.industry ?? '',
        sub_category_id: profile.sub_category_id ?? '',
        phone: profile.phone ?? '',
        siren: profile.siren ?? '',
        has_collaborators: hasCollaborators,
      })

      if (profile.completeness_score === score) {
        continue
      }

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ completeness_score: score })
        .eq('id', profile.id)

      if (updateError) {
        throw new Error(updateError.message)
      }

      updated++
      console.log(`   ✓ ${profile.id}: ${profile.completeness_score ?? 'null'} → ${score}`)
    } catch (err) {
      errors++
      console.error(
        `   ✗ ${profile.id}:`,
        err instanceof Error ? err.message : err
      )
    }
  }

  return { updated, errors }
}

async function backfillCompanies(supabase: SupabaseClient): Promise<{
  updated: number
  errors: number
}> {
  console.log('\n🏢 Backfill des registres (companies)...')

  const { data: companies, error } = await supabase
    .from('companies')
    .select(
      'id, name, industry, sub_category_id, city, country, type, siren, is_centralized_registry, maydai_as_registry, completeness_score'
    )

  if (error) {
    throw new Error(`Fetch companies: ${error.message}`)
  }

  if (!companies?.length) {
    console.log('   Aucun registre trouvé.')
    return { updated: 0, errors: 0 }
  }

  console.log(`   ${companies.length} registre(s) à traiter.`)

  let updated = 0
  let errors = 0

  for (const company of companies as CompanyRow[]) {
    try {
      const memberCount = await countCompanyMembers(supabase, company.id)
      const ownerSiren = await getOwnerSiren(supabase, company.id)
      const isCentralized =
        company.is_centralized_registry === true || company.maydai_as_registry === true

      const score = calculateRegistryCompletenessScore({
        name: company.name ?? '',
        industry: company.industry ?? '',
        sub_category_id: company.sub_category_id ?? '',
        city: company.city ?? '',
        country: company.country ?? '',
        type: company.type ?? '',
        siren: company.siren ?? '',
        profileSirenFallback: ownerSiren,
        has_collaborators: memberCount > 1,
        is_centralized_registry: isCentralized,
      })

      if (company.completeness_score === score) {
        continue
      }

      const { error: updateError } = await supabase
        .from('companies')
        .update({ completeness_score: score })
        .eq('id', company.id)

      if (updateError) {
        throw new Error(updateError.message)
      }

      updated++
      console.log(`   ✓ ${company.id}: ${company.completeness_score ?? 'null'} → ${score}`)
    } catch (err) {
      errors++
      console.error(
        `   ✗ ${company.id}:`,
        err instanceof Error ? err.message : err
      )
    }
  }

  return { updated, errors }
}

async function main() {
  console.log('🚀 Backfill completeness_score (profiles + companies)\n')

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Variables d\'environnement manquantes dans .env.local')
    console.error('   NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✓' : '✗')
    console.error('   SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '✓' : '✗')
    process.exit(1)
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const profileStats = await backfillProfiles(supabase)
  const companyStats = await backfillCompanies(supabase)

  console.log('\n📊 Résumé')
  console.log(
    `   Profils  : ${profileStats.updated} mis à jour, ${profileStats.errors} erreur(s)`
  )
  console.log(
    `   Registres: ${companyStats.updated} mis à jour, ${companyStats.errors} erreur(s)`
  )

  if (profileStats.errors + companyStats.errors > 0) {
    process.exit(1)
  }

  console.log('\n✅ Backfill terminé.')
}

main().catch((err) => {
  console.error('❌ Échec du backfill:', err)
  process.exit(1)
})
