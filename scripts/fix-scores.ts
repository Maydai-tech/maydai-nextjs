/**
 * Script temporaire — recalcul ciblé de scores via l’API Next.js calculate-score.
 *
 * Usage :
 *   npx tsx scripts/fix-scores.ts
 *
 * Prérequis :
 *   - `.env.local` : NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
 *   - Serveur local : http://localhost:3000 (ou FIX_SCORES_API_BASE)
 *
 * Auth API : pour chaque cas d’usage, session utilisateur membre de l’entreprise
 * (admin.generateLink + verifyOtp), ou FIX_SCORES_AUTH_EMAIL / FIX_SCORES_AUTH_PASSWORD.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const USECASE_IDS = [
  '006b7163-60ef-4e39-a7f3-3f2688b522c1',
  'a9bd298d-54f3-41de-be4b-94546e050dd5',
  '202aaee3-da39-4f18-baea-1d6fa8d3c9c4',
  'a706438d-8727-4ad6-8867-da668b8f1931',
] as const

const API_BASE = (process.env.FIX_SCORES_API_BASE ?? 'http://localhost:3000').replace(/\/$/, '')

type UsecaseSnapshot = {
  id: string
  name: string | null
  company_id: string
  score_base: number | null
  score_model: number | null
  score_final: number | null
  path_mode: string | null
  questionnaire_version: number | null
  risk_level: string | null
  last_calculation_date: string | null
}

function requireEnv(name: string): string {
  const value = process.env[name]?.trim()
  if (!value) {
    console.error(`❌ Variable d'environnement manquante : ${name}`)
    process.exit(1)
  }
  return value
}

function createAdminClient(): SupabaseClient {
  return createClient(requireEnv('NEXT_PUBLIC_SUPABASE_URL'), requireEnv('SUPABASE_SERVICE_ROLE_KEY'), {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

function createAnonClient(): SupabaseClient {
  return createClient(requireEnv('NEXT_PUBLIC_SUPABASE_URL'), requireEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY'), {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

async function fetchUsecaseSnapshot(
  admin: SupabaseClient,
  usecaseId: string
): Promise<UsecaseSnapshot | null> {
  const { data, error } = await admin
    .from('usecases')
    .select(
      'id, name, company_id, score_base, score_model, score_final, path_mode, questionnaire_version, risk_level, last_calculation_date'
    )
    .eq('id', usecaseId)
    .maybeSingle()

  if (error) {
    console.error(`   ❌ Lecture usecase : ${error.message}`)
    return null
  }
  return data as UsecaseSnapshot | null
}

function logSnapshot(label: string, row: UsecaseSnapshot): void {
  console.log(`   ${label}`)
  console.log(`     nom              : ${row.name ?? '(sans nom)'}`)
  console.log(`     company_id       : ${row.company_id}`)
  console.log(`     questionnaire_v  : ${row.questionnaire_version ?? '—'}`)
  console.log(`     path_mode        : ${row.path_mode ?? '—'}`)
  console.log(`     score_base       : ${row.score_base ?? '—'}`)
  console.log(`     score_model      : ${row.score_model ?? '—'}`)
  console.log(`     score_final      : ${row.score_final ?? '—'}`)
  console.log(`     risk_level       : ${row.risk_level ?? '—'}`)
  console.log(`     last_calculation : ${row.last_calculation_date ?? '—'}`)
}

async function resolveMemberUserId(admin: SupabaseClient, companyId: string): Promise<string | null> {
  const { data, error } = await admin
    .from('user_companies')
    .select('user_id')
    .eq('company_id', companyId)
    .limit(1)
    .maybeSingle()

  if (error) {
    console.error(`   ❌ user_companies : ${error.message}`)
    return null
  }
  return data?.user_id ?? null
}

async function resolveUserEmail(admin: SupabaseClient, userId: string): Promise<string | null> {
  const { data: profile, error: profileError } = await admin
    .from('profiles')
    .select('email')
    .eq('id', userId)
    .maybeSingle()

  if (!profileError && profile?.email) {
    return profile.email as string
  }

  const { data: authUser, error: authError } = await admin.auth.admin.getUserById(userId)
  if (authError) {
    console.error(`   ❌ auth.admin.getUserById : ${authError.message}`)
    return null
  }
  return authUser.user?.email ?? null
}

async function getAccessTokenViaPassword(anon: SupabaseClient): Promise<string | null> {
  const email = process.env.FIX_SCORES_AUTH_EMAIL?.trim()
  const password = process.env.FIX_SCORES_AUTH_PASSWORD?.trim()
  if (!email || !password) return null

  const { data, error } = await anon.auth.signInWithPassword({ email, password })
  if (error || !data.session?.access_token) {
    console.error(`   ❌ signInWithPassword : ${error?.message ?? 'session vide'}`)
    return null
  }
  return data.session.access_token
}

async function getAccessTokenViaMagicLink(
  admin: SupabaseClient,
  anon: SupabaseClient,
  email: string
): Promise<string | null> {
  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email,
  })

  if (linkError || !linkData.properties?.hashed_token) {
    console.error(`   ❌ generateLink : ${linkError?.message ?? 'hashed_token absent'}`)
    return null
  }

  const { data: verifyData, error: verifyError } = await anon.auth.verifyOtp({
    type: 'email',
    token_hash: linkData.properties.hashed_token,
  })

  if (verifyError || !verifyData.session?.access_token) {
    console.error(`   ❌ verifyOtp : ${verifyError?.message ?? 'session vide'}`)
    return null
  }

  return verifyData.session.access_token
}

async function getAccessTokenForCompany(
  admin: SupabaseClient,
  anon: SupabaseClient,
  companyId: string
): Promise<string | null> {
  const passwordToken = await getAccessTokenViaPassword(anon)
  if (passwordToken) {
    const { data: membership } = await admin
      .from('user_companies')
      .select('user_id')
      .eq('company_id', companyId)
      .limit(1)
      .maybeSingle()

    if (membership?.user_id) {
      const { data: authData } = await anon.auth.getUser(passwordToken)
      const userId = authData.user?.id
      if (userId) {
        const { data: access } = await admin
          .from('user_companies')
          .select('user_id')
          .eq('user_id', userId)
          .eq('company_id', companyId)
          .maybeSingle()
        if (access) return passwordToken
        console.warn(
          '   ⚠️  FIX_SCORES_AUTH_* ne correspond pas à un membre de l’entreprise ; tentative magic link…'
        )
      }
    }
  }

  const memberUserId = await resolveMemberUserId(admin, companyId)
  if (!memberUserId) {
    console.error('   ❌ Aucun utilisateur lié à cette entreprise (user_companies).')
    return null
  }

  const email = await resolveUserEmail(admin, memberUserId)
  if (!email) {
    console.error('   ❌ Impossible de résoudre l’email du membre entreprise.')
    return null
  }

  console.log(`   🔑 Session via magic link pour : ${email}`)
  return getAccessTokenViaMagicLink(admin, anon, email)
}

async function callCalculateScore(
  usecaseId: string,
  accessToken: string,
  pathMode: string | null
): Promise<{ ok: boolean; status: number; body: unknown }> {
  const body: Record<string, string> = { usecase_id: usecaseId }
  if (pathMode === 'short') {
    body.path_mode = 'short'
  }

  const response = await fetch(`${API_BASE}/api/usecases/${usecaseId}/calculate-score`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  let parsed: unknown
  const text = await response.text()
  try {
    parsed = text ? JSON.parse(text) : null
  } catch {
    parsed = text
  }

  return { ok: response.ok, status: response.status, body: parsed }
}

async function processUsecase(
  admin: SupabaseClient,
  anon: SupabaseClient,
  usecaseId: string,
  index: number,
  total: number
): Promise<boolean> {
  const banner = `\n${'═'.repeat(72)}\n[${index + 1}/${total}] Use case ${usecaseId}\n${'═'.repeat(72)}`
  console.log(banner)

  console.log('\n📋 AVANT recalcul')
  const before = await fetchUsecaseSnapshot(admin, usecaseId)
  if (!before) {
    console.error('   ❌ Cas d’usage introuvable en base.')
    return false
  }
  logSnapshot('état DB', before)

  const accessToken = await getAccessTokenForCompany(admin, anon, before.company_id)
  if (!accessToken) {
    return false
  }

  console.log('\n🔄 Appel API calculate-score…')
  console.log(`   POST ${API_BASE}/api/usecases/${usecaseId}/calculate-score`)
  if (before.path_mode === 'short') {
    console.log('   body.path_mode = short')
  }

  let apiResult: { ok: boolean; status: number; body: unknown }
  try {
    apiResult = await callCalculateScore(usecaseId, accessToken, before.path_mode)
  } catch (err) {
    console.error(`   ❌ Erreur réseau : ${err instanceof Error ? err.message : String(err)}`)
    console.error(`   💡 Le serveur tourne-t-il sur ${API_BASE} ?`)
    return false
  }

  if (!apiResult.ok) {
    console.error(`   ❌ HTTP ${apiResult.status}`)
    console.error('   Réponse :', JSON.stringify(apiResult.body, null, 2))
    return false
  }

  const scores = (apiResult.body as { scores?: { score_base?: number; score_model?: number | null; score_final?: number } })
    ?.scores
  if (scores) {
    console.log('   ✅ Réponse API (extrait scores)')
    console.log(`     score_base  : ${scores.score_base ?? '—'}`)
    console.log(`     score_model : ${scores.score_model ?? '—'}`)
    console.log(`     score_final : ${scores.score_final ?? '—'}`)
  } else {
    console.log('   ✅ HTTP 200 — voir réponse complète ci-dessous')
    console.log(JSON.stringify(apiResult.body, null, 2))
  }

  console.log('\n📋 APRÈS recalcul')
  const after = await fetchUsecaseSnapshot(admin, usecaseId)
  if (!after) {
    console.error('   ❌ Impossible de relire le cas d’usage après recalcul.')
    return false
  }
  logSnapshot('état DB', after)

  if (before.score_final != null && after.score_final != null) {
    const delta = after.score_final - before.score_final
    const sign = delta > 0 ? '+' : ''
    console.log(`   Δ score_final : ${sign}${delta}`)
  }

  return true
}

async function main(): Promise<void> {
  console.log('🚀 fix-scores — recalcul ciblé via calculate-score')
  console.log(`   API base : ${API_BASE}`)
  console.log(`   Cibles   : ${USECASE_IDS.length} cas d’usage\n`)

  requireEnv('NEXT_PUBLIC_SUPABASE_URL')
  requireEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY')
  requireEnv('SUPABASE_SERVICE_ROLE_KEY')

  const admin = createAdminClient()
  const anon = createAnonClient()

  let ok = 0
  let failed = 0

  for (let i = 0; i < USECASE_IDS.length; i++) {
    const id = USECASE_IDS[i]!
    const success = await processUsecase(admin, anon, id, i, USECASE_IDS.length)
    if (success) ok++
    else failed++
  }

  console.log(`\n${'═'.repeat(72)}`)
  console.log('📊 RÉSUMÉ')
  console.log(`   ✅ Succès : ${ok}`)
  console.log(`   ❌ Échecs : ${failed}`)
  console.log(`${'═'.repeat(72)}\n`)

  if (failed > 0) {
    process.exit(1)
  }
}

main().catch((err) => {
  console.error('💥 Erreur fatale :', err)
  process.exit(1)
})
