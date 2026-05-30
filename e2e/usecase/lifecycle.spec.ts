import { test, expect } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import { getAdminClient } from '@/e2e/_helpers/supabase-admin'

const TEST_PASSWORD = 'TestPassword123!'

test.describe.configure({ mode: 'serial' })

test.describe('Cas d\'usage — cycle de vie API (Zod POST / PUT)', { tag: ['@prod'] }, () => {
  const testUserEmail = `e2e-usecases-api-lifecycle-${Date.now()}@maydai-test.com`

  let testUserId: string | null = null
  let companyId: string | null = null
  let accessToken: string | null = null
  let createdUsecaseId: string | null = null

  const baseUrl = () => process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000'

  function authHeaders(): Record<string, string> {
    if (!accessToken) {
      throw new Error('E2E access token not initialized — run beforeAll first')
    }
    return {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    }
  }

  test.beforeAll(async () => {
    const adminClient = getAdminClient()

    const { data: createUserData, error: createUserError } =
      await adminClient.auth.admin.createUser({
        email: testUserEmail,
        password: TEST_PASSWORD,
        email_confirm: true,
      })

    if (createUserError || !createUserData.user) {
      throw new Error(
        `Failed to create test user: ${createUserError?.message ?? 'no user'}`
      )
    }

    testUserId = createUserData.user.id

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error(
        'NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be set for E2E tests'
      )
    }

    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const { data: signInData, error: signInError } =
      await authClient.auth.signInWithPassword({
        email: testUserEmail,
        password: TEST_PASSWORD,
      })

    if (signInError || !signInData.session?.access_token) {
      throw new Error(
        `Failed to sign in test user: ${signInError?.message ?? 'missing session'}`
      )
    }

    accessToken = signInData.session.access_token

    const { data: companyRow, error: companyError } = await adminClient
      .from('companies')
      .insert({
        name: `E2E Usecases API Lifecycle ${Date.now()}`,
      })
      .select('id')
      .single()

    if (companyError || !companyRow?.id) {
      throw new Error(
        `Failed to create test company: ${companyError?.message ?? 'no id'}`
      )
    }

    companyId = companyRow.id

    const { error: profileError } = await adminClient.from('profiles').upsert({
      id: testUserId,
      first_name: 'E2E',
      last_name: 'UsecasesApi',
      company_id: companyId,
      current_company_id: companyId,
    })

    if (profileError) {
      throw new Error(`Failed to upsert test profile: ${profileError.message}`)
    }

    const { error: userCompanyError } = await adminClient
      .from('user_companies')
      .insert({
        user_id: testUserId,
        company_id: companyId,
        role: 'admin',
      })

    if (userCompanyError) {
      throw new Error(
        `Failed to link user to company: ${userCompanyError.message}`
      )
    }
  })

  test('Test 1 — Validation de la création (POST) - Rétrocompatibilité & Fallback', async ({
    request,
  }) => {
    expect(companyId).toBeTruthy()

    const legacyE5Code = 'E5.N9.Q1.A'
    const response = await request.post(`${baseUrl()}/api/usecases`, {
      headers: authHeaders(),
      data: {
        name: `E2E Zod POST ${Date.now()}`,
        description: 'Payload sans deployment_phase, clés E5 legacy en majuscules.',
        ai_category: 'Large Language Model (LLM)',
        responsible_service: "Systèmes d'Information (SI) / IT",
        company_id: companyId,
        BLOCK_E5_GOVERNANCE: [legacyE5Code],
      },
    })

    expect(response.status()).toBe(201)

    const body = (await response.json()) as {
      id?: string
      deployment_phase?: string
      block_e5_governance?: string[]
      BLOCK_E5_GOVERNANCE?: unknown
    }

    expect(body.id).toBeTruthy()
    createdUsecaseId = body.id ?? null

    expect(body.deployment_phase).toBe('en_projet')
    expect(body.block_e5_governance).toEqual([legacyE5Code])
    expect(body.BLOCK_E5_GOVERNANCE).toBeUndefined()
  })

  test('Test 2 — Interdiction de modification (PUT Strict)', async ({ request }) => {
    expect(createdUsecaseId).toBeTruthy()

    const response = await request.put(
      `${baseUrl()}/api/usecases/${createdUsecaseId}`,
      {
        headers: authHeaders(),
        data: {
          status: 'validated',
          name: 'Nom Piraté',
        },
      }
    )

    expect(response.status()).toBe(400)

    const body = (await response.json()) as {
      error?: string
      details?: unknown
    }

    expect(body.error).toMatch(/interdit|invalide/i)
    expect(body.details).toBeTruthy()
  })

  test('Test 3 — Validation des mutations de parcours (PUT Autorisé)', async ({
    request,
  }) => {
    expect(createdUsecaseId).toBeTruthy()

    const newDescription = 'Nouvelle description'
    const response = await request.put(
      `${baseUrl()}/api/usecases/${createdUsecaseId}`,
      {
        headers: authHeaders(),
        data: {
          description: newDescription,
          path_mode: 'short',
        },
      }
    )

    expect(response.status()).toBe(200)

    const body = (await response.json()) as {
      description?: string
      path_mode?: string | null
    }

    expect(body.description).toBe(newDescription)
    expect(body.path_mode).toBe('short')
  })

  test.afterAll(async () => {
    const adminClient = getAdminClient()

    if (createdUsecaseId) {
      const id = createdUsecaseId
      await adminClient.from('usecase_responses').delete().eq('usecase_id', id)
      await adminClient.from('usecase_history').delete().eq('usecase_id', id)
      await adminClient.from('usecase_nextsteps').delete().eq('usecase_id', id)
      await adminClient.from('user_usecases').delete().eq('usecase_id', id)
      await adminClient.from('contact_requests').delete().eq('usecase_id', id)
      await adminClient.from('dossiers').delete().eq('usecase_id', id)
      await adminClient.from('evaluation_path_runs').delete().eq('usecase_id', id)
      await adminClient.from('usecases').delete().eq('id', id)
    }

    if (testUserId && companyId) {
      await adminClient
        .from('user_companies')
        .delete()
        .eq('user_id', testUserId)
        .eq('company_id', companyId)
    }

    if (companyId) {
      await adminClient.from('companies').delete().eq('id', companyId)
    }

    if (testUserId) {
      await adminClient.from('profiles').delete().eq('id', testUserId)
      await adminClient.auth.admin.deleteUser(testUserId)
    }
  })
})
