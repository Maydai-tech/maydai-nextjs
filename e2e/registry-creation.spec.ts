import { test, expect } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import { authenticateUser } from './auth-helper'

/**
 * E2E Test: Registry Creation
 *
 * This test creates a test account, logs in, creates a registry,
 * and then cleans up all created data.
 */

// Test user data
const TEST_USER = {
  email: `e2e-test-${Date.now()}@maydai-test.com`,
  password: 'TestPassword123!',
  firstName: 'E2E',
  lastName: 'TestUser',
  companyName: 'E2E Test Company',
  mainIndustryId: 'tech_data',
  subCategoryId: 'saas',
}

const TEST_REGISTRY = {
  name: `E2E Registry ${Date.now()}`,
  type: 'filiale',
}

// Store IDs for cleanup
let testUserId: string | null = null
let testCompanyId: string | null = null
let testRegistryId: string | null = null

// Create Supabase admin client for setup/teardown
function getAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error(
      'NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set for E2E tests'
    )
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

test.describe('Registry Creation', () => {
  test.beforeAll(async () => {
    // Create test user via Supabase Admin API
    const supabase = getAdminClient()

    // Create auth user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: TEST_USER.email,
      password: TEST_USER.password,
      email_confirm: true, // Auto-confirm email for testing
    })

    if (authError) {
      throw new Error(`Failed to create test user: ${authError.message}`)
    }

    testUserId = authData.user.id

    // Create company
    const { data: companyData, error: companyError } = await supabase
      .from('companies')
      .insert({
        name: TEST_USER.companyName,
      })
      .select('id')
      .single()

    if (companyError) {
      throw new Error(`Failed to create test company: ${companyError.message}`)
    }

    testCompanyId = companyData.id

    // Create profile
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: testUserId,
        first_name: TEST_USER.firstName,
        last_name: TEST_USER.lastName,
        company_name: TEST_USER.companyName,
        company_id: testCompanyId,
        current_company_id: testCompanyId,
        sub_category_id: TEST_USER.subCategoryId,
        industry: TEST_USER.mainIndustryId,
      })

    if (profileError) {
      throw new Error(`Failed to create test profile: ${profileError.message}`)
    }

    // Create user_companies relationship
    const { error: userCompanyError } = await supabase
      .from('user_companies')
      .insert({
        user_id: testUserId,
        company_id: testCompanyId,
        role: 'owner',
      })

    if (userCompanyError) {
      throw new Error(`Failed to create user_companies: ${userCompanyError.message}`)
    }

    console.log(`Test user created: ${TEST_USER.email}`)
  })

  test.afterAll(async () => {
    // Cleanup all test data
    const supabase = getAdminClient()

    try {
      // Delete registry if created
      if (testRegistryId) {
        // Delete user_companies for the registry
        await supabase
          .from('user_companies')
          .delete()
          .eq('company_id', testRegistryId)

        // Delete the registry (company)
        await supabase
          .from('companies')
          .delete()
          .eq('id', testRegistryId)

        console.log(`Test registry deleted: ${testRegistryId}`)
      }

      // Delete user_companies for original company
      if (testUserId && testCompanyId) {
        await supabase
          .from('user_companies')
          .delete()
          .eq('user_id', testUserId)
          .eq('company_id', testCompanyId)
      }

      // Delete profile
      if (testUserId) {
        await supabase
          .from('profiles')
          .delete()
          .eq('id', testUserId)

        console.log(`Test profile deleted: ${testUserId}`)
      }

      // Delete company
      if (testCompanyId) {
        await supabase
          .from('companies')
          .delete()
          .eq('id', testCompanyId)

        console.log(`Test company deleted: ${testCompanyId}`)
      }

      // Delete auth user
      if (testUserId) {
        await supabase.auth.admin.deleteUser(testUserId)
        console.log(`Test user deleted: ${TEST_USER.email}`)
      }
    } catch (error) {
      console.error('Cleanup error:', error)
    }
  })

  test('should login and create a new registry', async ({ page }) => {
    test.setTimeout(90000)

    const supabase = getAdminClient()

    await authenticateUser(page, TEST_USER.email)

    // The app should process the hash and set the session
    // Then navigate to dashboard/registries
    await page.goto('/dashboard/registries', { waitUntil: 'domcontentloaded' })

    // Wait for page to load and verify we're authenticated
    await page.waitForLoadState('networkidle')

    // 4. Navigate to registry creation page
    await page.goto('/registries/new', { waitUntil: 'domcontentloaded' })
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {})
    await expect(page.getByRole('heading', { name: 'Créer un registre' })).toBeVisible()

    // 5. Fill in registry name
    const registryNameInput = page.locator('form input[type="text"]').first()
    await expect(registryNameInput).toBeEditable()
    await registryNameInput.fill(TEST_REGISTRY.name)
    await expect(registryNameInput).toHaveValue(TEST_REGISTRY.name)

    // 6. Select registry type (target the "Type de registre" select explicitly)
    const registryTypeSelect = page
      .locator('label:has-text("Type de registre")')
      .locator('..')
      .locator('select')
    await registryTypeSelect.selectOption(TEST_REGISTRY.type)
    await expect(registryTypeSelect).toHaveValue(TEST_REGISTRY.type)

    // 7. Select industry (CompanySectorSelector)
    // These fields are optional (API fallback exists), but we select them to validate the new UI.
    const mainIndustry = page.locator('#mainIndustry')
    if (await mainIndustry.isVisible({ timeout: 5000 }).catch(() => false)) {
      await mainIndustry.selectOption(TEST_USER.mainIndustryId)

      const subCategory = page.locator('#subCategory')
      if (await subCategory.isVisible({ timeout: 5000 }).catch(() => false)) {
        await subCategory.selectOption(TEST_USER.subCategoryId)
      }
    }

    await expect(registryNameInput).toHaveValue(TEST_REGISTRY.name)
    await expect(registryTypeSelect).toHaveValue(TEST_REGISTRY.type)

    // 8. Submit form
    const createResponsePromise = page.waitForResponse(
      response =>
        response.url().includes('/api/companies') &&
        response.request().method() === 'POST',
      { timeout: 15000 }
    )
    await page.getByRole('button', { name: 'Créer le registre' }).click()
    const createResponse = await createResponsePromise
    expect(createResponse.ok()).toBe(true)

    const createdRegistry = await createResponse.json()
    testRegistryId = createdRegistry.id

    // 9. Verify the registry was created in the database.
    for (let i = 0; i < 10 && !testRegistryId; i++) {
      const { data: registry } = await supabase
        .from('companies')
        .select('id')
        .eq('name', TEST_REGISTRY.name)
        .maybeSingle()

      if (registry?.id) {
        testRegistryId = registry.id
        break
      }

      await page.waitForTimeout(1000)
    }

    expect(testRegistryId).toBeTruthy()

    console.log(`Registry created successfully: ${testRegistryId}`)
  })
})
