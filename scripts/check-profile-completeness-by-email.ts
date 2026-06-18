/**
 * Diagnostic : lit completeness_score en base pour un compte (service-role).
 *
 * Usage :
 *   npx tsx scripts/check-profile-completeness-by-email.ts t.chippeaux+138@gmail.com
 *
 * Prérequis (.env.local) :
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'
import { computeProfileCompletenessScoreFromRow } from '../lib/services/profileScoreService'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const email = process.argv[2]?.trim()

if (!email) {
  console.error('Usage: npx tsx scripts/check-profile-completeness-by-email.ts <email>')
  process.exit(1)
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !serviceKey) {
  console.error('NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY requis dans .env.local')
  process.exit(1)
}

const admin = createClient(url, serviceKey)

async function main() {
  const { data: usersData, error: usersError } = await admin.auth.admin.listUsers()

  if (usersError) {
    console.error('Erreur auth.admin.listUsers:', usersError.message)
    process.exit(1)
  }

  const authUser = usersData.users.find(
    (u) => u.email?.toLowerCase() === email.toLowerCase()
  )

  if (!authUser) {
    console.error(`Aucun utilisateur auth pour: ${email}`)
    process.exit(1)
  }

  const { data: profile, error: profileError } = await admin
    .from('profiles')
    .select(
      'id, completeness_score, first_name, last_name, company_name, industry, sub_category_id, phone, siren, created_at, updated_at'
    )
    .eq('id', authUser.id)
    .maybeSingle()

  if (profileError) {
    console.error('Erreur lecture profiles:', profileError.message)
    process.exit(1)
  }

  if (!profile) {
    console.error(`Profil absent pour ${email} (auth id: ${authUser.id})`)
    process.exit(1)
  }

  const { count: collabCount } = await admin
    .from('user_profiles')
    .select('*', { count: 'exact', head: true })
    .eq('inviter_user_id', authUser.id)

  const expectedScore = computeProfileCompletenessScoreFromRow(
    profile,
    (collabCount ?? 0) > 0
  )

  console.log('\n── Diagnostic completeness_score ──')
  console.log(`Email          : ${email}`)
  console.log(`User ID        : ${authUser.id}`)
  console.log(`DB score       : ${profile.completeness_score ?? 'null'}`)
  console.log(`Score attendu  : ${expectedScore}`)
  console.log(`Écart          : ${(profile.completeness_score ?? 0) - expectedScore}`)
  console.log(`Prénom / Nom   : ${profile.first_name ?? '—'} / ${profile.last_name ?? '—'}`)
  console.log(`Entreprise     : ${profile.company_name ?? '—'}`)
  console.log(`Secteur        : ${profile.industry ?? '—'} / ${profile.sub_category_id ?? '—'}`)
  console.log(`Phone / SIREN  : ${profile.phone ?? '—'} / ${profile.siren ?? '—'}`)
  console.log(`Créé / MAJ     : ${profile.created_at} → ${profile.updated_at}`)

  if (profile.completeness_score === expectedScore) {
    console.log('\n✅ Base cohérente. Si le front affiche 0 %, le problème est cache/SSR côté Next.js.')
  } else {
    console.log('\n❌ Incohérence en base — le scoring backend doit être recalculé.')
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
