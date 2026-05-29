import { test, expect } from '@playwright/test'
import { getAdminClient } from '@/e2e/_helpers/supabase-admin'

const TEST_PASSWORD = 'TestPassword123!'

test.describe.configure({ mode: 'serial' })

test.describe('POST /api/auth/complete-signup — cycle de vie API', { tag: ['@prod'] }, () => {
  const testUserEmail = `e2e-signup-api-${Date.now()}@maydai-test.com`

  let testUserId: string | null = null
  let accessToken: string | null = null

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

    const { data: createUserData, error: createUserError } = await adminClient.auth.admin.createUser({
      email: testUserEmail,
      password: TEST_PASSWORD,
      email_confirm: true,
    })

    if (createUserError || !createUserData.user) {
      throw new Error(`Failed to create auth user: ${createUserError?.message ?? 'no user'}`)
    }

    testUserId = createUserData.user.id

    const { data: signInData, error: signInError } = await adminClient.auth.signInWithPassword({
      email: testUserEmail,
      password: TEST_PASSWORD,
    })

    if (signInError || !signInData.session?.access_token) {
      throw new Error(`Failed to sign in test user: ${signInError?.message ?? 'missing session'}`)
    }

    accessToken = signInData.session.access_token
  })

  test('Test 1 — Validation de la flexibilité (Payload minimal)', async ({ request }) => {
    const response = await request.post(`${baseUrl()}/api/auth/complete-signup`, {
      headers: authHeaders(),
      data: { firstName: 'ArchitecteTest' },
    })

    expect(response.status()).toBe(200)

    const body = (await response.json()) as {
      profile?: {
        first_name?: string | null
        last_name?: string | null
        company_name?: string | null
        siren?: string | null
      }
    }

    expect(body.profile).toBeTruthy()
    expect(body.profile!.first_name).toBe('ArchitecteTest')
    expect(body.profile!.last_name).toBeNull()
    expect(body.profile!.company_name).toBeNull()
    expect(body.profile!.siren).toBeNull()
  })

  test('Test 2 — Validation de l\'hydratation (Payload complet)', async ({ request }) => {
    const fullPayload = {
      firstName: 'John',
      lastName: 'Doe',
      companyName: 'MaydAI Test Corp',
      mainIndustryId: 'tech_data',
      subCategoryId: 'saas',
      siren: '732829320',
    }

    const response = await request.post(`${baseUrl()}/api/auth/complete-signup`, {
      headers: authHeaders(),
      data: fullPayload,
    })

    expect(response.status()).toBe(200)

    const body = (await response.json()) as {
      profile?: {
        id?: string
        first_name?: string | null
        last_name?: string | null
        company_name?: string | null
        industry?: string | null
        sub_category_id?: string | null
        siren?: string | null
      }
    }

    expect(body.profile).toBeTruthy()
    expect(body.profile!.first_name).toBe('John')
    expect(body.profile!.last_name).toBe('Doe')
    expect(body.profile!.company_name).toBe('MaydAI Test Corp')
    expect(body.profile!.industry).toBe('tech_data')
    expect(body.profile!.sub_category_id).toBe('saas')
    expect(body.profile!.siren).toBe('732829320')

    expect(testUserId).toBeTruthy()

    const adminClient = getAdminClient()
    const { data: row, error: readError } = await adminClient
      .from('profiles')
      .select('first_name, last_name, company_name, industry, sub_category_id, siren')
      .eq('id', testUserId!)
      .single()

    expect(readError).toBeNull()
    expect(row).toMatchObject({
      first_name: 'John',
      last_name: 'Doe',
      company_name: 'MaydAI Test Corp',
      industry: 'tech_data',
      sub_category_id: 'saas',
      siren: '732829320',
    })
  })

  test.afterAll(async () => {
    const adminClient = getAdminClient()

    if (testUserId) {
      const { error } = await adminClient.auth.admin.deleteUser(testUserId)
      if (error) {
        throw new Error(`Failed to delete auth user: ${error.message}`)
      }
    }
  })
})
