import { test, expect } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'

/**
 * E2E Test: UseCase Creation
 *
 * This test creates a test account with a registry, logs in,
 * creates a use case through the wizard, and then cleans up all created data.
 */

// Test user data
const TEST_USER = {
  email: `e2e-usecase-${Date.now()}@maydai-test.com`,
  password: 'TestPassword123!',
  firstName: 'E2E',
  lastName: 'UseCaseTest',
  companyName: 'E2E UseCase Test Company',
  mainIndustryId: 'tech_data',
  subCategoryId: 'saas',
}

const TEST_REGISTRY = {
  name: `E2E Registry UseCase ${Date.now()}`,
}

const TEST_USECASE = {
  name: `E2E UseCase ${Date.now()}`,
  deployment_date: '15/06/2025',
  responsible_service: 'Systèmes d\'Information (SI) / IT',
  ai_category: 'Large Language Model (LLM)',
  system_type: 'Système autonome',
  deployment_country: 'FR',
  description: 'Ceci est un cas d\'usage de test E2E pour vérifier le bon fonctionnement du formulaire de création.',
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

test.describe('UseCase Creation', () => {
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
      // Delete use case if created
      if (testUseCaseId) {
        // Delete usecase_responses first
        await supabase
          .from('usecase_responses')
          .delete()
          .eq('usecase_id', testUseCaseId)

        // Delete user_usecases
        await supabase
          .from('user_usecases')
          .delete()
          .eq('usecase_id', testUseCaseId)

        // Delete the use case
        await supabase
          .from('usecases')
          .delete()
          .eq('id', testUseCaseId)

        console.log(`Test use case deleted: ${testUseCaseId}`)
      }

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

      // Delete registry
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

  test('should create a new use case through the wizard', async ({ page }) => {
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

    // Navigate to use case creation page
    await page.goto(`/usecases/new?company=${testRegistryId}`)
    await page.waitForLoadState('networkidle')

    // Step 1: Name
    await page.fill('input[type="text"]', TEST_USECASE.name)
    await page.click('button:has-text("Suivant")')
    await page.waitForTimeout(500)

    // Step 2: Deployment date
    await page.fill('input[placeholder="DD/MM/YYYY"]', TEST_USECASE.deployment_date)
    await page.click('button:has-text("Suivant")')
    await page.waitForTimeout(500)

    // Step 3: Responsible service (select)
    await page.click(`label:has-text("${TEST_USECASE.responsible_service}")`)
    await page.click('button:has-text("Suivant")')
    await page.waitForTimeout(500)

    // Step 4: Technology partner - select "Autre" and type custom
    await page.click('label:has-text("Autre")')
    await page.waitForTimeout(300)
    await page.fill('input[placeholder*="partenaire"]', 'Test Partner E2E')
    await page.click('button:has-text("Suivant")')
    await page.waitForTimeout(500)

    // Step 5: LLM model - for custom partner, this is a text input
    await page.fill('input[placeholder*="modèle"]', 'Test Model v1.0')
    await page.click('button:has-text("Suivant")')
    await page.waitForTimeout(500)

    // Step 6: AI Category (radio)
    await page.click(`label:has-text("${TEST_USECASE.ai_category}")`)
    await page.click('button:has-text("Suivant")')
    await page.waitForTimeout(500)

    // Step 7: System type (radio)
    await page.click(`label:has-text("${TEST_USECASE.system_type}")`)
    await page.click('button:has-text("Suivant")')
    await page.waitForTimeout(500)

    // Step 8: Deployment countries - select France
    // The country selector is a ReactFlagsSelect component
    // Click on the dropdown to open it
    await page.click('button:has-text("Rechercher et sélectionner un pays")')
    await page.waitForTimeout(500)
    // Click directly on France in the list
    await page.click('li:has-text("France")')
    await page.waitForTimeout(300)
    await page.click('button:has-text("Suivant")')
    await page.waitForTimeout(500)

    // Step 9: Description (textarea)
    await page.fill('textarea', TEST_USECASE.description)

    // Submit the form
    await page.click('button:has-text("Créer le cas d\'usage")')

    // Wait for redirect to evaluation page
    await page.waitForURL(/\/usecases\/[a-f0-9-]+\/evaluation/, { timeout: 15000 })

    // Extract use case ID from URL
    const currentUrl = page.url()
    const useCaseIdMatch = currentUrl.match(/\/usecases\/([a-f0-9-]+)\/evaluation/)

    expect(useCaseIdMatch).not.toBeNull()
    testUseCaseId = useCaseIdMatch![1]

    // Verify we're on the evaluation page
    await expect(page).toHaveURL(/\/usecases\/[a-f0-9-]+\/evaluation/)

    console.log(`UseCase created successfully: ${testUseCaseId}`)
  })
})
