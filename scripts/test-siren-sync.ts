/**
 * Test d'intégration local — cascade SIREN + auto-healing GET registre
 *
 * 1. (Optionnel) Empoisonne completeness_score via Service Role
 * 2. (Optionnel) Simule GET /api/companies/[id] et valide l'auto-healing HTTP + DB
 * 3. Injecte un SIREN Luhn-valide, exécute syncProfileSirenToRegistries, affiche diff
 *
 * Usage :
 *   TEST_SIREN_SYNC_USER_ID=<uuid> npx tsx scripts/test-siren-sync.ts
 *
 * Auto-heal (reproduit le bug score figé à 85) :
 *   TEST_SIREN_SYNC_USER_ID=<uuid> TEST_POISON_SCORE=85 npx tsx scripts/test-siren-sync.ts
 *   TEST_SIREN_SYNC_USER_ID=<uuid> npx tsx scripts/test-siren-sync.ts --poison-score 85
 *
 * Options (env) :
 *   TEST_SIREN_VALUE=732829320        SIREN injecté (défaut : Apple France)
 *   TEST_SIREN_SKIP_PROFILE=1         Ne pas mettre à jour profiles.siren
 *   TEST_POISON_SCORE=85              Score figé avant auto-heal (défaut phase off)
 *   TEST_COMPANY_ID=<uuid>            Registre cible (sinon tous les registres owner)
 *   TEST_ACCESS_TOKEN=<jwt>           JWT pour GET API (sinon magic link auto)
 *   TEST_API_BASE=http://localhost:3000
 *
 * Prérequis (.env.local) :
 *   NEXT_PUBLIC_SUPABASE_URL
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * Prérequis auto-heal HTTP :
 *   Serveur Next.js local (npm run dev)
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'
import { syncProfileSirenToRegistries } from '../lib/services/registryScoreService'
import { validateSIREN } from '../lib/validation/siren'
import { calculateRegistryCompletenessScore } from '../lib/validations/registry-completeness'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

/** SIREN de référence (Apple France) — valide Luhn. */
const DEFAULT_TEST_SIREN = '732829320'
const DEFAULT_API_BASE = 'http://localhost:3000'

type RegistrySnapshot = {
  id: string
  name: string | null
  siren: string | null
  completeness_score: number | null
}

type CompanyRowForHeal = {
  id: string
  name: string | null
  industry: string | null
  sub_category_id: string | null
  city: string | null
  country: string | null
  type: string | null
  siren: string | null
  maydai_as_registry: boolean | null
  is_centralized_registry: boolean | null
  completeness_score: number | null
}

function parsePoisonScoreFromArgs(argv: string[]): number | null {
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--poison-score' && argv[i + 1]) {
      const parsed = Number(argv[i + 1])
      if (!Number.isFinite(parsed)) {
        throw new Error(`--poison-score invalide : ${argv[i + 1]}`)
      }
      return Math.round(parsed)
    }
  }
  return null
}

function resolvePoisonScore(argv: string[]): number | null {
  const fromCli = parsePoisonScoreFromArgs(argv)
  if (fromCli !== null) return fromCli

  const fromEnv = process.env.TEST_POISON_SCORE?.trim()
  if (!fromEnv) return null

  const parsed = Number(fromEnv)
  if (!Number.isFinite(parsed)) {
    throw new Error(`TEST_POISON_SCORE invalide : ${fromEnv}`)
  }
  return Math.round(parsed)
}

function getServiceClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error(
      'NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY requis dans .env.local'
    )
  }
  return createClient(url, key)
}

function getAnonClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) {
    throw new Error(
      'NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY requis pour le GET HTTP'
    )
  }
  return createClient(url, key)
}

async function fetchOwnedRegistries(
  supabase: SupabaseClient,
  userId: string,
  companyIdFilter?: string
): Promise<RegistrySnapshot[]> {
  const { data: links, error: linksError } = await supabase
    .from('user_companies')
    .select('company_id')
    .eq('user_id', userId)
    .eq('role', 'owner')

  if (linksError) {
    throw new Error(`Lecture user_companies: ${linksError.message}`)
  }

  let companyIds = (links ?? [])
    .map((row) => row.company_id)
    .filter((id): id is string => typeof id === 'string' && id.length > 0)

  if (companyIdFilter) {
    if (!companyIds.includes(companyIdFilter)) {
      throw new Error(
        `TEST_COMPANY_ID=${companyIdFilter} n'est pas un registre owner de userId=${userId}`
      )
    }
    companyIds = [companyIdFilter]
  }

  if (companyIds.length === 0) {
    return []
  }

  const { data: companies, error: companiesError } = await supabase
    .from('companies')
    .select('id, name, siren, completeness_score')
    .in('id', companyIds)
    .order('name')

  if (companiesError) {
    throw new Error(`Lecture companies: ${companiesError.message}`)
  }

  return (companies ?? []) as RegistrySnapshot[]
}

function printSnapshot(label: string, rows: RegistrySnapshot[]) {
  console.log(`\n── ${label} (${rows.length} registre(s)) ──`)
  if (rows.length === 0) {
    console.log('   (aucun registre owner pour cet utilisateur)')
    return
  }
  for (const row of rows) {
    console.log(
      `   • ${row.name ?? '(sans nom)'} [${row.id}]` +
        ` | siren=${row.siren ?? 'null'}` +
        ` | completeness_score=${row.completeness_score ?? 'null'}`
    )
  }
}

function printDiff(before: RegistrySnapshot[], after: RegistrySnapshot[]) {
  console.log('\n── Diff completeness_score / siren ──')
  const afterById = new Map(after.map((r) => [r.id, r]))
  for (const prev of before) {
    const next = afterById.get(prev.id)
    if (!next) {
      console.log(`   ⚠ ${prev.id} : disparu après sync`)
      continue
    }
    const scoreChanged = prev.completeness_score !== next.completeness_score
    const sirenChanged = prev.siren !== next.siren
    if (!scoreChanged && !sirenChanged) {
      console.log(`   = ${next.name ?? prev.id} : inchangé (score=${next.completeness_score})`)
      continue
    }
    console.log(`   ↻ ${next.name ?? prev.id}`)
    if (sirenChanged) {
      console.log(`       siren  : ${prev.siren ?? 'null'} → ${next.siren ?? 'null'}`)
    }
    if (scoreChanged) {
      console.log(
        `       score  : ${prev.completeness_score ?? 'null'} → ${next.completeness_score ?? 'null'}`
      )
    }
  }
}

async function poisonRegistryScores(
  supabase: SupabaseClient,
  companyIds: string[],
  poisonScore: number
): Promise<void> {
  for (const companyId of companyIds) {
    const { error } = await supabase
      .from('companies')
      .update({ completeness_score: poisonScore })
      .eq('id', companyId)

    if (error) {
      throw new Error(`Empoisonnement registre ${companyId}: ${error.message}`)
    }
  }
}

async function fetchCompanyForExpectedScore(
  supabase: SupabaseClient,
  companyId: string,
  ownerUserId: string
): Promise<number> {
  const { data: company, error: companyError } = await supabase
    .from('companies')
    .select(
      'name, industry, sub_category_id, city, country, type, siren, maydai_as_registry, is_centralized_registry'
    )
    .eq('id', companyId)
    .single()

  if (companyError || !company) {
    throw new Error(`Lecture registre ${companyId}: ${companyError?.message ?? 'introuvable'}`)
  }

  const { count: memberCount } = await supabase
    .from('user_companies')
    .select('*', { count: 'exact', head: true })
    .eq('company_id', companyId)

  const { data: ownerProfile } = await supabase
    .from('profiles')
    .select('siren')
    .eq('id', ownerUserId)
    .maybeSingle()

  const row = company as CompanyRowForHeal
  const isCentralized =
    row.is_centralized_registry === true || row.maydai_as_registry === true

  return calculateRegistryCompletenessScore({
    name: row.name,
    industry: row.industry,
    sub_category_id: row.sub_category_id,
    city: row.city,
    country: row.country,
    type: row.type,
    siren: row.siren,
    profileSirenFallback: ownerProfile?.siren?.trim() ?? '',
    has_collaborators: (memberCount ?? 0) > 1,
    is_centralized_registry: isCentralized,
  })
}

async function resolveAccessToken(
  admin: SupabaseClient,
  anon: SupabaseClient,
  userId: string
): Promise<string> {
  const preset = process.env.TEST_ACCESS_TOKEN?.trim()
  if (preset) return preset

  const { data: authData, error: authError } = await admin.auth.admin.getUserById(userId)
  if (authError || !authData.user?.email) {
    throw new Error(
      `Impossible de résoudre l'email pour userId=${userId}: ${authError?.message ?? 'email absent'}`
    )
  }

  const email = authData.user.email
  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email,
  })

  if (linkError || !linkData.properties?.hashed_token) {
    throw new Error(`generateLink échoué: ${linkError?.message ?? 'hashed_token absent'}`)
  }

  const { data: verifyData, error: verifyError } = await anon.auth.verifyOtp({
    type: 'email',
    token_hash: linkData.properties.hashed_token,
  })

  if (verifyError || !verifyData.session?.access_token) {
    throw new Error(`verifyOtp échoué: ${verifyError?.message ?? 'session vide'}`)
  }

  console.log(`   🔑 JWT obtenu via magic link (${email})`)
  return verifyData.session.access_token
}

async function simulateGetAutoHeal(
  apiBase: string,
  companyId: string,
  accessToken: string
): Promise<{ status: number; body: Record<string, unknown> }> {
  const response = await fetch(`${apiBase}/api/companies/${companyId}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    cache: 'no-store',
  })

  let body: Record<string, unknown> = {}
  const text = await response.text()
  try {
    body = text ? (JSON.parse(text) as Record<string, unknown>) : {}
  } catch {
    body = { raw: text }
  }

  return { status: response.status, body }
}

async function runAutoHealPhase(
  supabase: SupabaseClient,
  userId: string,
  companyIds: string[],
  poisonScore: number
): Promise<boolean> {
  console.log('\n🧪 Phase Auto-Heal GET (empoisonnement + purge silencieuse)')
  console.log(`   score empoisonné cible : ${poisonScore}`)

  const apiBase = (process.env.TEST_API_BASE ?? DEFAULT_API_BASE).replace(/\/$/, '')
  const anon = getAnonClient()

  await poisonRegistryScores(supabase, companyIds, poisonScore)
  const poisoned = await fetchOwnedRegistries(
    supabase,
    userId,
    process.env.TEST_COMPANY_ID?.trim()
  )
  printSnapshot('APRÈS empoisonnement (Service Role)', poisoned)

  const accessToken = await resolveAccessToken(supabase, anon, userId)
  let allPassed = true

  for (const companyId of companyIds) {
    const expectedScore = await fetchCompanyForExpectedScore(supabase, companyId, userId)
    console.log(`\n   → GET ${apiBase}/api/companies/${companyId}`)
    console.log(`     score attendu (moteur local) : ${expectedScore}`)

    let httpResult: { status: number; body: Record<string, unknown> }
    try {
      httpResult = await simulateGetAutoHeal(apiBase, companyId, accessToken)
    } catch (err) {
      console.error(`   ❌ Erreur réseau GET: ${err instanceof Error ? err.message : String(err)}`)
      console.error(`   💡 Le serveur tourne-t-il sur ${apiBase} ?`)
      allPassed = false
      continue
    }

    const apiScore = httpResult.body.completeness_score
    console.log(`     HTTP ${httpResult.status} | completeness_score réponse : ${apiScore ?? '—'}`)

    if (httpResult.status !== 200) {
      console.error('   ❌ GET non OK:', JSON.stringify(httpResult.body, null, 2))
      allPassed = false
      continue
    }

    if (typeof apiScore !== 'number') {
      console.error('   ❌ completeness_score absent ou non numérique dans la réponse HTTP')
      allPassed = false
      continue
    }

    if (apiScore === poisonScore) {
      console.error(
        `   ❌ Auto-heal échoué : la réponse HTTP renvoie encore le score empoisonné (${poisonScore})`
      )
      allPassed = false
      continue
    }

    if (apiScore !== expectedScore) {
      console.error(
        `   ❌ Score HTTP (${apiScore}) ≠ score attendu (${expectedScore})`
      )
      allPassed = false
      continue
    }

    const { data: dbRow, error: dbError } = await supabase
      .from('companies')
      .select('completeness_score')
      .eq('id', companyId)
      .single()

    if (dbError) {
      console.error(`   ❌ Relecture DB après GET: ${dbError.message}`)
      allPassed = false
      continue
    }

    const dbScore = dbRow?.completeness_score
    console.log(`     completeness_score DB après GET : ${dbScore ?? '—'}`)

    if (dbScore === poisonScore) {
      console.error(
        `   ❌ Anomalie persistée en base : completeness_score toujours à ${poisonScore}`
      )
      allPassed = false
      continue
    }

    if (dbScore !== expectedScore) {
      console.error(`   ❌ DB (${dbScore}) ≠ score attendu (${expectedScore})`)
      allPassed = false
      continue
    }

    const healedPct = expectedScore === 100 ? '100%' : `${expectedScore}%`
    console.log(`   ✅ Auto-heal validé — HTTP + DB purgés (${healedPct})`)
  }

  return allPassed
}

async function main() {
  const poisonScore = resolvePoisonScore(process.argv.slice(2))
  const userId = process.env.TEST_SIREN_SYNC_USER_ID?.trim()
  if (!userId) {
    console.error('❌ Définir TEST_SIREN_SYNC_USER_ID=<uuid utilisateur existant>')
    console.error('   Exemple : TEST_SIREN_SYNC_USER_ID=… npx tsx scripts/test-siren-sync.ts')
    console.error('   Auto-heal : … TEST_POISON_SCORE=85 npx tsx scripts/test-siren-sync.ts')
    process.exit(1)
  }

  const siren = (process.env.TEST_SIREN_VALUE ?? DEFAULT_TEST_SIREN).trim()
  if (!validateSIREN(siren)) {
    console.error(`❌ TEST_SIREN_VALUE invalide (Luhn) : ${siren}`)
    process.exit(1)
  }

  const skipProfileUpdate = process.env.TEST_SIREN_SKIP_PROFILE === '1'
  const companyIdFilter = process.env.TEST_COMPANY_ID?.trim()
  const supabase = getServiceClient()

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, first_name, last_name, siren')
    .eq('id', userId)
    .maybeSingle()

  if (profileError) {
    console.error('❌ Lecture profil:', profileError.message)
    process.exit(1)
  }
  if (!profile) {
    console.error(`❌ Aucun profil trouvé pour userId=${userId}`)
    process.exit(1)
  }

  console.log('🔬 Test intégration cascade SIREN + auto-healing')
  console.log(`   userId : ${userId}`)
  console.log(
    `   profil : ${profile.first_name ?? ''} ${profile.last_name ?? ''}`.trim() ||
      '(nom vide)'
  )
  console.log(`   siren profil actuel : ${profile.siren ?? 'null'}`)
  console.log(`   siren cible         : ${siren}`)
  if (poisonScore !== null) {
    console.log(`   poison score        : ${poisonScore}`)
  }

  const ownedBefore = await fetchOwnedRegistries(supabase, userId, companyIdFilter)
  if (ownedBefore.length === 0) {
    console.error('❌ Aucun registre owner — impossible de continuer.')
    process.exit(1)
  }

  const companyIds = ownedBefore.map((r) => r.id)

  if (poisonScore !== null) {
    const healOk = await runAutoHealPhase(supabase, userId, companyIds, poisonScore)
    if (!healOk) {
      console.error('\n❌ Phase auto-heal GET en échec.')
      process.exit(1)
    }
    console.log('\n✅ Phase auto-heal GET terminée avec succès.')
  }

  console.log('\n🔬 Phase cascade SIREN')
  const before = await fetchOwnedRegistries(supabase, userId, companyIdFilter)
  printSnapshot('AVANT sync SIREN', before)

  if (!skipProfileUpdate) {
    const { error: profileUpdateError } = await supabase
      .from('profiles')
      .update({ siren, updated_at: new Date().toISOString() })
      .eq('id', userId)

    if (profileUpdateError) {
      console.error('❌ Mise à jour profiles.siren:', profileUpdateError.message)
      process.exit(1)
    }
    console.log('\n✅ profiles.siren mis à jour')
  } else {
    console.log('\n⏭ TEST_SIREN_SKIP_PROFILE=1 — profil non modifié')
  }

  console.log('\n🔄 Exécution syncProfileSirenToRegistries…')
  const syncResult = await syncProfileSirenToRegistries(userId, siren)
  console.log(
    `✅ Sync terminée : ${syncResult.updatedCount} registre(s) mis à jour`
  )
  if (syncResult.companyIds.length > 0) {
    console.log(`   companyIds : ${syncResult.companyIds.join(', ')}`)
  }

  const after = await fetchOwnedRegistries(supabase, userId, companyIdFilter)
  printSnapshot('APRÈS sync SIREN', after)
  printDiff(before, after)

  console.log('\n🏁 Fin du test.')
}

main().catch((err) => {
  console.error('❌ Erreur fatale:', err)
  process.exit(1)
})
