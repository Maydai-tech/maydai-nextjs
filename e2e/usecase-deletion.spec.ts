import { test, expect } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'

/**
 * E2E Test: UseCase Deletion
 *
 * This test creates a test account with a registry and a use case,
 * logs in, deletes the use case via the 3-dot menu on the dashboard,
 * and verifies the toast notification appears.
 */

// Test user data
const TEST_USER = {
  email: `e2e-usecase-delete-${Date.now()}@maydai-test.com`,
  password: 'TestPassword123!',
  firstName: 'E2E',
  lastName: 'DeleteTest',
  companyName: 'E2E Delete Test Company',
  mainIndustryId: 'tech_data',
  subCategoryId: 'saas',
}

const TEST_REGISTRY = {
  name: `E2E Registry Delete ${Date.now()}`,
}

const TEST_USECASE = {
  name: `E2E UseCase To Delete ${Date.now()}`,
  description: 'This use case will be deleted during the E2E test.',
  ai_category: 'Large Language Model (LLM)',
  responsible_service: 'IT',
}

// Store IDs for cleanup
let testUserId: string | null = null
let testCompanyId: string | null = null
let testRegistryId: string | null = null
let testUseCaseId: string | null = null

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

test.describe('UseCase Deletion', () => {
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

    // Create registry (another company for the use case)
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
        current_company_id: testRegistryId,
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

    // Create a use case to delete
    const { data: useCaseData, error: useCaseError } = await supabase
      .from('usecases')
      .insert({
        name: TEST_USECASE.name,
        description: TEST_USECASE.description,
        ai_category: TEST_USECASE.ai_category,
        responsible_service: TEST_USECASE.responsible_service,
        company_id: testRegistryId,
        status: 'draft',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        updated_by: testUserId,
      })
      .select('id')
      .single()

    if (useCaseError) {
      throw new Error(`Failed to create test use case: ${useCaseError.message}`)
    }

    testUseCaseId = useCaseData.id

    console.log(`Test user created: ${TEST_USER.email}`)
    console.log(`Test registry created: ${testRegistryId}`)
    console.log(`Test use case created: ${testUseCaseId}`)
  })

  test.afterAll(async () => {
    const supabase = getAdminClient()

    try {
      // Delete use case if it still exists (in case test failed)
      if (testUseCaseId) {
        // Delete related data first
        await supabase.from('usecase_responses').delete().eq('usecase_id', testUseCaseId)
        await supabase.from('usecase_history').delete().eq('usecase_id', testUseCaseId)
        await supabase.from('usecase_nextsteps').delete().eq('usecase_id', testUseCaseId)
        await supabase.from('user_usecases').delete().eq('usecase_id', testUseCaseId)
        await supabase.from('contact_requests').delete().eq('usecase_id', testUseCaseId)
        await supabase.from('dossiers').delete().eq('usecase_id', testUseCaseId)
        await supabase.from('usecases').delete().eq('id', testUseCaseId)
        console.log(`Test use case cleaned up: ${testUseCaseId}`)
      }

      // Delete user_companies
      if (testUserId) {
        await supabase.from('user_companies').delete().eq('user_id', testUserId)
      }

      // Delete profile
      if (testUserId) {
        await supabase.from('profiles').delete().eq('id', testUserId)
        console.log(`Test profile deleted: ${testUserId}`)
      }

      // Delete registry
      if (testRegistryId) {
        await supabase.from('companies').delete().eq('id', testRegistryId)
        console.log(`Test registry deleted: ${testRegistryId}`)
      }

      // Delete company
      if (testCompanyId) {
        await supabase.from('companies').delete().eq('id', testCompanyId)
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

  test('should delete a use case via the 3-dot menu and show toast notification', async ({ page }) => {
    const supabase = getAdminClient()

    // Generate magic link for authentication
    const baseUrl = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000'
    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: TEST_USER.email,
      options: {
        redirectTo: baseUrl,
      },
    })

    if (linkError) {
      throw new Error(`Failed to generate magic link: ${linkError.message}`)
    }

    // Authenticate via magic link
    await page.goto(linkData.properties.action_link)
    await page.waitForTimeout(2000)

    // Navigate to registry dashboard
    await page.goto(`/dashboard/${testRegistryId}`)
    await page.waitForLoadState('networkidle')

    // Verify the use case is displayed
    await expect(page.locator(`text=${TEST_USECASE.name}`)).toBeVisible({ timeout: 10000 })

    // Click on the 3-dot menu button for the use case
    // The menu button is inside the use case card
    const useCaseCard = page.locator(`text=${TEST_USECASE.name}`).locator('..').locator('..').locator('..')
    const menuButton = useCaseCard.locator('button').filter({ has: page.locator('svg.lucide-more-vertical') }).first()

    // If the above selector doesn't work, try a more direct approach
    // Find the card containing the use case name and click the menu button within it
    await page.locator(`text=${TEST_USECASE.name}`).first().scrollIntoViewIfNeeded()
    await page.waitForTimeout(500)

    // Click the 3-dot menu - it's positioned absolute in the top-right of each card
    const cards = page.locator('.relative.group')
    const targetCard = cards.filter({ hasText: TEST_USECASE.name }).first()
    await targetCard.locator('button').first().click()
    await page.waitForTimeout(300)

    // Click "Supprimer" in the dropdown menu
    await page.click('button:has-text("Supprimer")')
    await page.waitForTimeout(300)

    // The delete confirmation modal should appear
    await expect(page.locator('text=Confirmer la suppression')).toBeVisible({ timeout: 5000 })

    // Confirm deletion by clicking the confirm button
    await page.click('button:has-text("Supprimer"):not(:has-text("Annuler"))')

    // Wait for the deletion to complete
    await page.waitForTimeout(1000)

    // Verify the toast notification appears in the bottom-right
    const toast = page.locator('.fixed.bottom-6.right-6')
    await expect(toast).toBeVisible({ timeout: 5000 })
    await expect(toast.locator(`text=supprimé avec succès`)).toBeVisible()

    // Verify the use case is no longer in the list
    await expect(page.locator(`text=${TEST_USECASE.name}`)).not.toBeVisible({ timeout: 5000 })

    // Mark use case as deleted so cleanup doesn't fail
    testUseCaseId = null

    console.log('UseCase deletion successful with toast notification')
  })
})
