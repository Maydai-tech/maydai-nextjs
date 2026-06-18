/**
 * E2E local : inscription → complete-signup → vérif DB → GET dashboard/registries (SSR).
 *
 * Usage :
 *   npx tsx scripts/test-e2e-cache.ts [email]
 *
 * Prérequis :
 *   - Next.js sur http://localhost:3000
 *   - .env.local (SUPABASE + anon key)
 */

import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import * as dotenv from 'dotenv'
import * as path from 'path'
import { computeProfileCompletenessScoreFromRow } from '../lib/services/profileScoreService'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const BASE_URL = process.env.E2E_BASE_URL ?? 'http://localhost:3000'
const TEST_EMAIL = (process.argv[2] ?? 't.chippeaux+139@gmail.com').trim()
const TEST_PASSWORD = 'TestPassword123!'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !anonKey || !serviceKey) {
  console.error('❌ Variables manquantes dans .env.local (URL, anon, service-role)')
  process.exit(1)
}

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

type CookieEntry = { name: string; value: string }

async function findUserByEmail(email: string) {
  const perPage = 100
  let page = 1
  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage })
    if (error) throw new Error(`listUsers: ${error.message}`)
    const user = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase())
    if (user) return user
    if (data.users.length < perPage) return null
    page++
  }
}

async function deleteUserIfExists(email: string) {
  const existing = await findUserByEmail(email)
  if (!existing) return null
  const { error } = await admin.auth.admin.deleteUser(existing.id)
  if (error) throw new Error(`deleteUser: ${error.message}`)
  return existing.id
}

function buildCookieHeader(cookies: CookieEntry[]): string {
  return cookies.map((c) => `${c.name}=${c.value}`).join('; ')
}

function createSsrCookieClient() {
  const cookies: CookieEntry[] = []
  const client = createServerClient(url!, anonKey!, {
    cookies: {
      getAll() {
        return cookies
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          const idx = cookies.findIndex((c) => c.name === name)
          if (idx >= 0) cookies[idx] = { name, value }
          else cookies.push({ name, value })
        }
      },
    },
  })
  return { client, cookies }
}

function parseDashboardScore(htmlOrRsc: string): {
  profileCompleteness: number | null
  zeroPercentVisible: boolean
  sixtyPercentVisible: boolean
  snippets: string[]
} {
  const snippets: string[] = []

  const patterns = [
    /"profileCompleteness"\s*:\s*(\d+)/g,
    /profileCompleteness\\":(\d+)/g,
    /profileCompleteness["\s]*[:=]["\s]*(\d+)/g,
    /"initialMetrics"\s*:\s*\{[^}]*"profileCompleteness"\s*:\s*(\d+)/g,
  ]

  let profileCompleteness: number | null = null
  for (const pattern of patterns) {
    for (const match of htmlOrRsc.matchAll(pattern)) {
      const n = Number(match[1])
      snippets.push(`pattern ${pattern.source} → ${n}`)
      if (profileCompleteness == null) profileCompleteness = n
    }
  }

  const zeroPercentVisible = />\s*0\s*%/.test(htmlOrRsc) || /Complétude du profil\s*:\s*0/.test(htmlOrRsc)
  const sixtyPercentVisible = />\s*60\s*%/.test(htmlOrRsc) || /Complétude du profil\s*:\s*60/.test(htmlOrRsc)

  return { profileCompleteness, zeroPercentVisible, sixtyPercentVisible, snippets }
}

async function assertServerUp() {
  try {
    const res = await fetch(BASE_URL, { redirect: 'manual' })
    if (res.status >= 500) {
      throw new Error(`HTTP ${res.status}`)
    }
  } catch (e) {
    throw new Error(
      `Next.js inaccessible sur ${BASE_URL} — lancez "npm run dev" puis relancez ce script. (${e})`
    )
  }
}

async function main() {
  console.log('═══════════════════════════════════════════════════════════')
  console.log(' E2E cache / SSR — completeness_score après inscription')
  console.log('═══════════════════════════════════════════════════════════')
  console.log(`Base URL : ${BASE_URL}`)
  console.log(`Email    : ${TEST_EMAIL}`)
  console.log('')

  await assertServerUp()
  console.log('✓ Serveur Next.js accessible')

  const deletedId = await deleteUserIfExists(TEST_EMAIL)
  if (deletedId) {
    console.log(`✓ Ancien compte supprimé (${deletedId})`)
  } else {
    console.log('✓ Aucun compte préexistant')
  }

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
    email_confirm: true,
  })
  if (createError || !created.user) {
    throw new Error(`createUser: ${createError?.message ?? 'no user'}`)
  }
  const userId = created.user.id
  console.log(`✓ Auth user créé : ${userId}`)

  const { data: signIn, error: signInError } = await admin.auth.signInWithPassword({
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
  })
  if (signInError || !signIn.session) {
    throw new Error(`signIn: ${signInError?.message ?? 'no session'}`)
  }
  console.log('✓ Session obtenue')

  const signupPayload = {
    firstName: 'Tomi',
    lastName: 'Test',
    companyName: 'MaydA',
    mainIndustryId: 'tech_data',
    subCategoryId: 'ai_data',
  }

  const completeRes = await fetch(`${BASE_URL}/api/auth/complete-signup`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${signIn.session.access_token}`,
    },
    body: JSON.stringify(signupPayload),
  })

  const completeBody = await completeRes.text()
  console.log(`\n── POST /api/auth/complete-signup → HTTP ${completeRes.status} ──`)
  if (!completeRes.ok) {
    console.error(completeBody)
    throw new Error('complete-signup a échoué')
  }
  console.log('✓ complete-signup OK')

  const { data: profile, error: profileError } = await admin
    .from('profiles')
    .select(
      'id, completeness_score, first_name, last_name, company_name, industry, sub_category_id, phone, siren, created_at, updated_at'
    )
    .eq('id', userId)
    .single()

  if (profileError || !profile) {
    throw new Error(`Lecture profil DB: ${profileError?.message ?? 'absent'}`)
  }

  const expectedScore = computeProfileCompletenessScoreFromRow(profile, false)

  console.log('\n── Diagnostic DB (service-role) ──')
  console.log(`completeness_score en base : ${profile.completeness_score ?? 'null'}`)
  console.log(`Score attendu (recalcul)   : ${expectedScore}`)

  if (profile.completeness_score !== 60 || expectedScore !== 60) {
    console.error('\n❌ ÉCHEC DB — le score n\'est pas 60 en base.')
    process.exit(1)
  }
  console.log('✅ DB OK — completeness_score = 60')

  const { client: ssrClient, cookies } = createSsrCookieClient()
  const { error: setSessionError } = await ssrClient.auth.setSession({
    access_token: signIn.session.access_token,
    refresh_token: signIn.session.refresh_token,
  })
  if (setSessionError) {
    throw new Error(`setSession SSR cookies: ${setSessionError.message}`)
  }

  const cookieHeader = buildCookieHeader(cookies)
  if (!cookieHeader) {
    throw new Error('Aucun cookie Supabase SSR généré — impossible de tester le dashboard')
  }
  console.log(`\n✓ Cookies SSR générés (${cookies.length} cookie(s))`)

  const dashboardRes = await fetch(`${BASE_URL}/dashboard/registries`, {
    headers: {
      Cookie: cookieHeader,
      Accept: 'text/html,application/xhtml+xml',
      'User-Agent': 'maydai-e2e-cache-test/1.0',
    },
    redirect: 'manual',
  })

  console.log(`\n── GET /dashboard/registries → HTTP ${dashboardRes.status} ──`)

  if (dashboardRes.status === 307 || dashboardRes.status === 302) {
    const loc = dashboardRes.headers.get('location')
    console.error(`Redirection inattendue vers: ${loc}`)
    process.exit(1)
  }

  if (!dashboardRes.ok) {
    const errText = await dashboardRes.text()
    console.error(errText.slice(0, 500))
    throw new Error(`Dashboard HTTP ${dashboardRes.status}`)
  }

  const dashboardHtml = await dashboardRes.text()
  const parsed = parseDashboardScore(dashboardHtml)

  console.log('\n── Analyse réponse SSR (HTML + RSC embarqué) ──')
  if (parsed.snippets.length > 0) {
    parsed.snippets.forEach((s) => console.log(`  • ${s}`))
  } else {
    console.log('  • Aucun token profileCompleteness explicite trouvé dans le payload')
  }
  console.log(`  • profileCompleteness extrait : ${parsed.profileCompleteness ?? 'non trouvé'}`)
  console.log(`  • "0%" visible dans le HTML    : ${parsed.zeroPercentVisible}`)
  console.log(`  • "60%" visible dans le HTML   : ${parsed.sixtyPercentVisible}`)

  const ssrScoreOk = parsed.profileCompleteness === 60

  if (ssrScoreOk) {
    console.log('\n✅ SSR OK — initialMetrics.profileCompleteness = 60 dans le payload RSC Next.js')
    console.log('   (Le HTML affiche "Chargement..." car RegistriesPage attend l\'hydratation client)')
    console.log('═══════════════════════════════════════════════════════════')
    process.exit(0)
  }

  if (parsed.sixtyPercentVisible && !parsed.zeroPercentVisible) {
    console.log('\n✅ SSR OK — 60% visible dans le HTML rendu')
    console.log('═══════════════════════════════════════════════════════════')
    process.exit(0)
  }

  console.error('\n❌ ÉCHEC SSR — le dashboard ne renvoie pas profileCompleteness:60 au premier GET')
  if (parsed.profileCompleteness === 0 || parsed.zeroPercentVisible) {
    console.error('   → Fallback 0 détecté dans la réponse Next.js')
  }
  console.log('═══════════════════════════════════════════════════════════')
  process.exit(1)
}

main().catch((err) => {
  console.error('\n❌ Erreur fatale:', err instanceof Error ? err.message : err)
  process.exit(1)
})
