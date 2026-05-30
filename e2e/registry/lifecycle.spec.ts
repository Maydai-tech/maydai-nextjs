import { test, expect } from '@playwright/test'
import { RegistrySchema } from '@/lib/validations/registry'
import { getAdminClient } from '../_helpers/supabase-admin'

const TEST_PASSWORD = 'TestPassword123!'

test.describe.configure({ mode: 'serial' })

test.describe.skip('Registre — cycle de vie API', () => {
  let createdRegistryId: string | null = null
  let testUserId: string | null = null

  const testUserEmail = `e2e-registry-lifecycle-${Date.now()}@maydai-test.com`
  const registryName = `Test Registry ${Date.now()}`

  const mockRegistryPayload = RegistrySchema.parse({
    name: registryName,
    industry: 'tech_data',
    sub_category_id: 'saas',
    city: 'Paris',
    country: 'France',
    type: 'entreprise',
    maydai_as_registry: false,
  })

  /** Payload aligné sur le contrat HTTP POST `/api/companies`. */
  const apiCreatePayload = {
    name: mockRegistryPayload.name,
    mainIndustryId: mockRegistryPayload.industry,
    subCategoryId: mockRegistryPayload.sub_category_id,
    type: mockRegistryPayload.type,
  }

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
      throw new Error(`Failed to create test user: ${createUserError?.message ?? 'no user'}`)
    }

    const { data: signInData, error: signInError } = await adminClient.auth.signInWithPassword({
      email: testUserEmail,
      password: TEST_PASSWORD,
    })

    if (signInError || !signInData.session?.access_token || !signInData.user) {
      throw new Error(`Failed to sign in test user: ${signInError?.message ?? 'missing session'}`)
    }

    const user = signInData.user
    testUserId = user.id

    const { error: profileUpsertError } = await adminClient.from('profiles').upsert({
      id: user.id,
      first_name: 'Test',
      last_name: 'E2E',
    })

    if (profileUpsertError) {
      throw new Error(`Failed to upsert test profile: ${profileUpsertError.message}`)
    }

    accessToken = signInData.session.access_token
  })

  test('ÉTAPE 1 — POST /api/companies crée le registre', async ({ request }) => {
    const response = await request.post(`${baseUrl()}/api/companies`, {
      headers: authHeaders(),
      data: apiCreatePayload,
    })

    expect([200, 201]).toContain(response.status())

    const body = (await response.json()) as { id?: string }
    expect(body.id).toBeTruthy()
    createdRegistryId = body.id ?? null
  })

  test('ÉTAPE 2 — GET /api/companies/:id retourne les données initiales', async ({ request }) => {
    expect(createdRegistryId).toBeTruthy()

    const response = await request.get(`${baseUrl()}/api/companies/${createdRegistryId}`, {
      headers: authHeaders(),
    })

    expect(response.ok()).toBe(true)

    const company = (await response.json()) as {
      name?: string
      industry?: string | null
      sub_category_id?: string | null
      city?: string | null
      country?: string | null
      type?: string | null
      maydai_as_registry?: boolean
    }

    expect(company.name).toBe(mockRegistryPayload.name)
    expect(company.industry).toBe(mockRegistryPayload.industry)
    expect(company.sub_category_id).toBe(mockRegistryPayload.sub_category_id)
    expect(company.type).toBe(mockRegistryPayload.type)
    expect(company.maydai_as_registry).toBe(false)
  })

  test('ÉTAPE 3 — PUT /api/companies/:id active maydai_as_registry', async ({ request }) => {
    expect(createdRegistryId).toBeTruthy()

    const response = await request.put(`${baseUrl()}/api/companies/${createdRegistryId}`, {
      headers: authHeaders(),
      data: { maydai_as_registry: true },
    })

    expect(response.status()).toBe(200)

    const updated = (await response.json()) as { maydai_as_registry?: boolean }
    expect(updated.maydai_as_registry).toBe(true)
  })

  test.afterAll(async ({ request }) => {
    const adminClient = getAdminClient()

    if (createdRegistryId && accessToken) {
      const deleteResponse = await request.delete(`${baseUrl()}/api/companies/${createdRegistryId}`, {
        headers: authHeaders(),
      })

      expect([200, 204]).toContain(deleteResponse.status())
    }

    if (testUserId) {
      await adminClient.from('profiles').delete().eq('id', testUserId)
    }
  })
})
