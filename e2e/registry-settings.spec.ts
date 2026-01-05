import { test, expect } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'

/**
 * E2E Test: Registry Settings (Modification & Deletion)
 *
 * This test creates a test account with a registry, logs in,
 * modifies the registry info, and then deletes it.
 */

// Test user data
const TEST_USER = {
  email: `e2e-settings-${Date.now()}@maydai-test.com`,
  password: 'TestPassword123!',
  firstName: 'E2E',
  lastName: 'SettingsTest',
  companyName: 'E2E Settings Test Company',
  mainIndustryId: 'tech_data',
  subCategoryId: 'saas',
}

const TEST_REGISTRY = {
  name: `E2E Registry Settings ${Date.now()}`,
  updatedName: `E2E Registry Updated ${Date.now()}`,
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

test.describe('Registry Settings', () => {
  test.beforeAll(async () => {
    const supabase = getAdminClient()

    // Create auth user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: TEST_USER.email,
      password: TEST_USER.password,
      email_confirm: true,
    })

    if (authError) {
      throw new Error(`Failed to create test user: ${authError.message}`)
    }

    testUserId = authData.user.id

    // Create company (for profile)
    const { data: companyData, error: companyError } = await supabase
      .from('companies')
      .insert({ name: TEST_USER.companyName })
      .select('id')
      .single()

    if (companyError) {
      throw new Error(`Failed to create test company: ${companyError.message}`)
    }

    testCompanyId = companyData.id

    // Create registry (another company for testing settings)
    const { data: registryData, error: registryError } = await supabase
      .from('companies')
      .insert({ name: TEST_REGISTRY.name })
      .select('id')
      .single()

    if (registryError) {
      throw new Error(`Failed to create test registry: ${registryError.message}`)
    }

    testRegistryId = registryData.id

    // Create profile
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: testUserId,
        first_name: TEST_USER.firstName,
        last_name: TEST_USER.lastName,
        company_name: TEST_USER.companyName,
        company_id: testCompanyId,
        current_company_id: testRegistryId, // Set registry as current
        sub_category_id: TEST_USER.subCategoryId,
        industry: TEST_USER.mainIndustryId,
      })

    if (profileError) {
      throw new Error(`Failed to create test profile: ${profileError.message}`)
    }

    // Create user_companies for profile company
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

    // Create user_companies for registry
    const { error: userRegistryError } = await supabase
      .from('user_companies')
      .insert({
        user_id: testUserId,
        company_id: testRegistryId,
        role: 'owner',
      })

    if (userRegistryError) {
      throw new Error(`Failed to create user_companies for registry: ${userRegistryError.message}`)
    }

    console.log(`Test user created: ${TEST_USER.email}`)
    console.log(`Test registry created: ${testRegistryId}`)
  })

  test.afterAll(async () => {
    const supabase = getAdminClient()

    try {
      // Delete user_companies
      if (testUserId) {
        await supabase
          .from('user_companies')
          .delete()
          .eq('user_id', testUserId)
      }

      // Delete profile
      if (testUserId) {
        await supabase
          .from('profiles')
          .delete()
          .eq('id', testUserId)

        console.log(`Test profile deleted: ${testUserId}`)
      }

      // Delete registry (may already be deleted by the test)
      if (testRegistryId) {
        await supabase
          .from('companies')
          .delete()
          .eq('id', testRegistryId)

        console.log(`Test registry deleted: ${testRegistryId}`)
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

  test('should modify registry information', async ({ page }) => {
    const supabase = getAdminClient()

    // Generate magic link for authentication
    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: TEST_USER.email,
    })

    if (linkError) {
      throw new Error(`Failed to generate magic link: ${linkError.message}`)
    }

    // Authenticate via magic link
    await page.goto(linkData.properties.action_link)
    await page.waitForTimeout(2000)

    // Navigate to registry settings page
    await page.goto(`/dashboard/${testRegistryId}/settings`)
    await page.waitForLoadState('networkidle')

    // Click "Modifier" to enter edit mode
    await page.click('button:has-text("Modifier")')
    await page.waitForTimeout(1000)

    // Wait for the form to be in edit mode (inputs should appear)
    await page.waitForSelector('input[placeholder="Nom du registre"]', { timeout: 10000 })

    // Modify registry name
    const nameInput = page.locator('input[placeholder="Nom du registre"]')
    await nameInput.clear()
    await nameInput.fill(TEST_REGISTRY.updatedName)

    // Modify city
    const cityInput = page.locator('input[placeholder="Ville"]')
    await cityInput.clear()
    await cityInput.fill('Paris')

    // Save changes
    await page.click('button:has-text("Enregistrer")')
    await page.waitForTimeout(1000)

    // Verify the changes were saved by checking the page content
    await page.waitForLoadState('networkidle')

    // Verify updated name is displayed
    await expect(page.locator(`text=${TEST_REGISTRY.updatedName}`)).toBeVisible({ timeout: 5000 })

    console.log('Registry modification successful')
  })

  test('should delete registry', async ({ page }) => {
    const supabase = getAdminClient()

    // Generate magic link for authentication
    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: TEST_USER.email,
    })

    if (linkError) {
      throw new Error(`Failed to generate magic link: ${linkError.message}`)
    }

    // Authenticate via magic link
    await page.goto(linkData.properties.action_link)
    await page.waitForTimeout(2000)

    // Navigate to registry settings page
    await page.goto(`/dashboard/${testRegistryId}/settings`)
    await page.waitForLoadState('networkidle')

    // Click delete button to open confirmation modal
    await page.click('button:has-text("Supprimer le registre")')
    await page.waitForTimeout(500)

    // The modal should be visible
    await expect(page.locator('[data-testid="delete-registry-button"]')).toBeVisible()

    // Get the expected registry name from the modal to ensure we type the correct one
    // (This handles cases where the previous test was skipped and the name wasn't updated)
    const registryName = await page.getByTestId('registry-name-to-confirm').textContent()
    if (!registryName) throw new Error('Registry name not found in modal')

    const confirmInput = page.locator('input[placeholder="Saisissez le nom du registre"]')
    await confirmInput.fill(registryName)

    // Wait for the button to be enabled (state update might take a tick)
    await expect(page.locator('[data-testid="delete-registry-button"]')).toBeEnabled()

    // Click confirm delete button
    await page.click('[data-testid="delete-registry-button"]')

    // Wait for redirect to registries list
    await page.waitForURL(/\/dashboard\/registries/, { timeout: 10000 })

    // Verify we're redirected to registries page
    await expect(page).toHaveURL(/\/dashboard\/registries/)

    // Mark registry as deleted so cleanup doesn't try to delete it again
    testRegistryId = null

    console.log('Registry deletion successful')
  })
})
