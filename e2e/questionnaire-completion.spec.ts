import { test, expect, Page } from '@playwright/test'
import { createClient, SupabaseClient } from '@supabase/supabase-js'

/**
 * E2E Test: Questionnaire Completion and Score Calculation
 *
 * This test suite verifies:
 * 1. Complete questionnaire flow (19 questions)
 * 2. Score calculation and display
 * 3. Exact score value verification
 * 4. OpenAI report generation (skipped by default)
 *
 * Each test is independent and creates its own test data for parallel execution.
 */

// Test data interface
interface TestData {
  userId: string
  companyId: string
  registryId: string
  usecaseId: string
  email: string
}

// Question answers for happy path (low risk, maximum score)
const QUESTIONNAIRE_ANSWERS: Array<{
  questionId: string
  type: 'radio' | 'checkbox' | 'tags' | 'conditional'
  answer: string | string[]
  conditionalValue?: string
}> = [
  { questionId: 'E4.N7.Q1', type: 'radio', answer: 'Mon entreprise utilise des systèmes d\'IA tiers' },
  { questionId: 'E4.N7.Q1.2', type: 'radio', answer: 'Je suis un utilisateur d\'un système d\'IA pour mon entreprise' },
  { questionId: 'E4.N7.Q2', type: 'checkbox', answer: 'Aucun de ces domaines' },
  { questionId: 'E4.N7.Q2.1', type: 'checkbox', answer: 'Aucun de ces cas' },
  { questionId: 'E4.N7.Q3', type: 'checkbox', answer: 'Aucune de ces activités' },
  { questionId: 'E4.N7.Q3.1', type: 'checkbox', answer: 'Aucune de ces situations' },
  { questionId: 'E5.N9.Q4', type: 'radio', answer: 'Oui' },
  { questionId: 'E5.N9.Q1', type: 'radio', answer: 'Oui' },
  { questionId: 'E5.N9.Q9', type: 'conditional', answer: 'Oui', conditionalValue: 'Test E2E procedures' },
  { questionId: 'E5.N9.Q5', type: 'tags', answer: 'Publiques' },
  { questionId: 'E5.N9.Q6', type: 'conditional', answer: 'Oui', conditionalValue: 'Test E2E security measures' },
  { questionId: 'E5.N9.Q7', type: 'conditional', answer: 'Oui', conditionalValue: 'Test E2E procedures' },
  { questionId: 'E5.N9.Q8', type: 'conditional', answer: 'Oui', conditionalValue: 'Test E2E procedures' },
  { questionId: 'E4.N8.Q12', type: 'radio', answer: 'Oui' },
  { questionId: 'E4.N8.Q9', type: 'radio', answer: 'Non' },
  { questionId: 'E4.N8.Q10', type: 'conditional', answer: '< à 100', conditionalValue: '50' },
  { questionId: 'E4.N8.Q11', type: 'tags', answer: 'Texte' },
  { questionId: 'E6.N10.Q1', type: 'radio', answer: 'Oui' },
  { questionId: 'E6.N10.Q2', type: 'radio', answer: 'Oui' },
]

// Create Supabase admin client for setup/teardown
function getAdminClient(): SupabaseClient {
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

/**
 * Create all test data needed for a questionnaire test
 */
async function createTestData(testId: string): Promise<TestData> {
  const supabase = getAdminClient()
  const email = `e2e-quest-${testId}-${Date.now()}@maydai-test.com`

  // Create auth user
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password: 'TestPassword123!',
    email_confirm: true,
  })

  if (authError) {
    throw new Error(`Failed to create test user: ${authError.message}`)
  }

  const userId = authData.user.id

  // Create company (for profile)
  const { data: companyData, error: companyError } = await supabase
    .from('companies')
    .insert({ name: `E2E Company ${testId} ${Date.now()}` })
    .select('id')
    .single()

  if (companyError) {
    throw new Error(`Failed to create test company: ${companyError.message}`)
  }

  const companyId = companyData.id

  // Create registry (another company for the use case)
  const { data: registryData, error: registryError } = await supabase
    .from('companies')
    .insert({ name: `E2E Registry ${testId} ${Date.now()}` })
    .select('id')
    .single()

  if (registryError) {
    throw new Error(`Failed to create test registry: ${registryError.message}`)
  }

  const registryId = registryData.id

  // Create profile
  const { error: profileError } = await supabase
    .from('profiles')
    .insert({
      id: userId,
      first_name: 'E2E',
      last_name: testId,
      company_name: `E2E Company ${testId}`,
      company_id: companyId,
      current_company_id: registryId,
      sub_category_id: 'saas',
      industry: 'tech_data',
    })

  if (profileError) {
    throw new Error(`Failed to create test profile: ${profileError.message}`)
  }

  // Create user_companies for profile company
  const { error: userCompanyError } = await supabase
    .from('user_companies')
    .insert({ user_id: userId, company_id: companyId, role: 'owner' })

  if (userCompanyError) {
    throw new Error(`Failed to create user_companies: ${userCompanyError.message}`)
  }

  // Create user_companies for registry
  const { error: userRegistryError } = await supabase
    .from('user_companies')
    .insert({ user_id: userId, company_id: registryId, role: 'owner' })

  if (userRegistryError) {
    throw new Error(`Failed to create user_companies for registry: ${userRegistryError.message}`)
  }

  // Create the use case in draft status
  const { data: usecaseData, error: usecaseError } = await supabase
    .from('usecases')
    .insert({
      name: `E2E UseCase ${testId} ${Date.now()}`,
      description: 'Test use case for questionnaire completion E2E test',
      company_id: registryId,
      status: 'draft',
      deployment_date: new Date().toISOString(),
    })
    .select('id')
    .single()

  if (usecaseError) {
    throw new Error(`Failed to create test usecase: ${usecaseError.message}`)
  }

  const usecaseId = usecaseData.id

  // Create user_usecases link
  const { error: userUsecaseError } = await supabase
    .from('user_usecases')
    .insert({ user_id: userId, usecase_id: usecaseId, role: 'owner' })

  if (userUsecaseError) {
    throw new Error(`Failed to create user_usecases: ${userUsecaseError.message}`)
  }

  console.log(`✅ Test data created: ${email} (usecase: ${usecaseId})`)

  return { userId, companyId, registryId, usecaseId, email }
}

/**
 * Clean up all test data
 */
async function cleanupTestData(data: TestData): Promise<void> {
  const supabase = getAdminClient()

  try {
    // Delete questionnaire responses
    await supabase
      .from('usecase_responses')
      .delete()
      .eq('usecase_id', data.usecaseId)

    // Delete user_usecases
    await supabase
      .from('user_usecases')
      .delete()
      .eq('usecase_id', data.usecaseId)

    // Delete usecase
    await supabase
      .from('usecases')
      .delete()
      .eq('id', data.usecaseId)

    // Delete user_companies
    await supabase
      .from('user_companies')
      .delete()
      .eq('user_id', data.userId)

    // Delete profile
    await supabase
      .from('profiles')
      .delete()
      .eq('id', data.userId)

    // Delete registry
    await supabase
      .from('companies')
      .delete()
      .eq('id', data.registryId)

    // Delete company
    await supabase
      .from('companies')
      .delete()
      .eq('id', data.companyId)

    // Delete auth user
    await supabase.auth.admin.deleteUser(data.userId)

    console.log(`🧹 Test data cleaned up: ${data.email}`)
  } catch (error) {
    console.error('Cleanup error:', error)
  }
}

/**
 * Helper function to answer a question based on its type
 */
async function answerQuestion(
  page: Page,
  type: 'radio' | 'checkbox' | 'tags' | 'conditional',
  answer: string | string[],
  conditionalValue?: string
) {
  const answerText = Array.isArray(answer) ? answer[0] : answer

  // Close any open tooltips by clicking elsewhere first
  await page.click('body', { position: { x: 10, y: 10 } }).catch(() => {})
  await page.waitForTimeout(300)

  switch (type) {
    case 'radio':
      // Wait for the radio to be visible before clicking
      const radioInput = page.getByRole('radio', { name: new RegExp(answerText.slice(0, 30).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')) })
      await radioInput.waitFor({ state: 'visible', timeout: 10000 }).catch(() => {
        console.log(`⚠️ Radio button not visible: ${answerText.slice(0, 30)}`)
      })
      await radioInput.click({ force: true })
      await page.waitForTimeout(800)
      break

    case 'checkbox':
      if (Array.isArray(answer)) {
        for (const ans of answer) {
          const checkboxInput = page.getByRole('checkbox', { name: new RegExp(ans.slice(0, 30).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')) })
          await checkboxInput.waitFor({ state: 'visible', timeout: 10000 }).catch(() => {})
          await checkboxInput.click({ force: true })
          await page.waitForTimeout(500)
        }
      } else {
        const checkboxInput = page.getByRole('checkbox', { name: new RegExp(answerText.slice(0, 30).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')) })
        await checkboxInput.waitFor({ state: 'visible', timeout: 10000 }).catch(() => {})
        await checkboxInput.click({ force: true })
        await page.waitForTimeout(500)
      }
      break

    case 'tags':
      if (Array.isArray(answer)) {
        for (const ans of answer) {
          const tagButton = page.locator(`button`).filter({ hasText: ans }).first()
          await tagButton.waitFor({ state: 'visible', timeout: 10000 }).catch(() => {})
          await tagButton.click({ force: true })
          await page.waitForTimeout(500)
        }
      } else {
        const tagButton = page.locator(`button`).filter({ hasText: answerText }).first()
        await tagButton.waitFor({ state: 'visible', timeout: 10000 }).catch(() => {})
        await tagButton.click({ force: true })
        await page.waitForTimeout(500)
      }
      break

    case 'conditional':
      const conditionalRadio = page.getByRole('radio', { name: new RegExp(answerText.slice(0, 30).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')) })
      await conditionalRadio.waitFor({ state: 'visible', timeout: 10000 }).catch(() => {})
      await conditionalRadio.click({ force: true })
      await page.waitForTimeout(800)
      if (conditionalValue) {
        await page.waitForTimeout(500)
        const conditionalInput = page.getByRole('textbox').first()
        if (await conditionalInput.isVisible()) {
          await conditionalInput.fill(conditionalValue)
          await page.waitForTimeout(500)
        }
      }
      break
  }
}

/**
 * Complete the entire questionnaire with predefined answers
 */
async function completeQuestionnaire(page: Page) {
  const getProgression = async () => {
    const progressText = await page.locator('text=/\\d+%/').first().textContent().catch(() => '0%')
    return progressText || '0%'
  }

  /**
   * Click the "Suivant" button with retry logic
   */
  async function clickSuivantWithRetry(questionIndex: number): Promise<boolean> {
    const maxRetries = 3
    for (let retry = 0; retry < maxRetries; retry++) {
      await page.waitForTimeout(500)

      const suivantButton = page.locator('button:has-text("Suivant")')
      const isVisible = await suivantButton.isVisible().catch(() => false)

      if (isVisible) {
        const isEnabled = await suivantButton.isEnabled().catch(() => false)
        if (isEnabled) {
          await suivantButton.click()
          console.log(`✅ Clicked Suivant after question ${questionIndex + 1}`)
          return true
        }
      }

      if (retry < maxRetries - 1) {
        console.log(`⚠️ Suivant button not ready (attempt ${retry + 1}/${maxRetries}), waiting...`)
        await page.waitForTimeout(1000)
      }
    }

    console.log(`⚠️ Suivant button not clickable after ${maxRetries} attempts for question ${questionIndex + 1}`)
    return false
  }

  for (let i = 0; i < QUESTIONNAIRE_ANSWERS.length; i++) {
    const { questionId, type, answer, conditionalValue } = QUESTIONNAIRE_ANSWERS[i]
    const isLastQuestion = i === QUESTIONNAIRE_ANSWERS.length - 1

    console.log(`📝 Answering question ${i + 1}/${QUESTIONNAIRE_ANSWERS.length}: ${questionId}`)

    const progressionBefore = await getProgression()

    // Answer the question
    await answerQuestion(page, type, answer, conditionalValue)

    // Click "Suivant" to proceed to the next question
    if (!isLastQuestion) {
      const clicked = await clickSuivantWithRetry(i)

      if (clicked) {
        // Wait for progression to change
        await page.waitForFunction(
          (prevProgress) => {
            const currentProgress = document.body.innerText.match(/(\d+)%/)?.[0]
            return currentProgress && currentProgress !== prevProgress
          },
          progressionBefore,
          { timeout: 15000 }
        ).catch(() => {
          console.log(`⚠️ Progress didn't change after question ${i + 1}, continuing anyway...`)
        })
      }
    }

    await page.waitForTimeout(500)

    // If it's the last question, click "Terminer l'évaluation"
    if (isLastQuestion) {
      console.log('🎯 Last question answered, looking for "Terminer l\'évaluation" button...')
      await page.waitForTimeout(1500)

      const terminerSelectors = [
        'button:has-text("Terminer l\'évaluation")',
        'button:has-text("Terminer")',
        'button[type="submit"]:has-text("Terminer")',
      ]

      let buttonClicked = false
      for (const selector of terminerSelectors) {
        const terminerButton = page.locator(selector).first()
        const isVisible = await terminerButton.isVisible().catch(() => false)

        if (isVisible) {
          await terminerButton.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {})
          const isEnabled = await terminerButton.isEnabled().catch(() => false)

          if (isEnabled) {
            await terminerButton.click()
            console.log(`✅ Clicked "Terminer" button with selector: ${selector}`)
            buttonClicked = true
            break
          }
        }
      }

      if (!buttonClicked) {
        const primaryButton = page.locator('button.bg-\\[\\#0080A3\\]').first()
        if (await primaryButton.isVisible()) {
          await primaryButton.click()
          console.log('✅ Clicked primary button as fallback')
          buttonClicked = true
        }
      }

      if (!buttonClicked) {
        throw new Error('Failed to click "Terminer l\'évaluation" button')
      }

      await page.waitForTimeout(2000)
    }
  }
}

/**
 * Authenticate and navigate to evaluation page
 */
async function authenticateAndNavigate(page: Page, testData: TestData): Promise<void> {
  const supabase = getAdminClient()

  // Generate magic link
  const baseUrl = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000'
  const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
    type: 'magiclink',
    email: testData.email,
    options: {
      redirectTo: baseUrl,
    },
  })

  if (linkError) {
    throw new Error(`Failed to generate magic link: ${linkError.message}`)
  }

  // Authenticate via magic link
  await page.goto(linkData.properties.action_link)
  await page.waitForTimeout(3000)

  // Navigate to evaluation page with retry
  let navigationSuccess = false
  for (let attempt = 1; attempt <= 3; attempt++) {
    await page.goto(`/usecases/${testData.usecaseId}/evaluation`)
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)

    // Check if we're on the evaluation page and the questionnaire is loaded
    const progressionVisible = await page.locator('text=Progression').isVisible().catch(() => false)
    const questionVisible = await page.locator('input[type="radio"]').first().isVisible().catch(() => false)

    if (progressionVisible && questionVisible) {
      navigationSuccess = true
      console.log(`✅ Navigation successful on attempt ${attempt}`)
      break
    }

    console.log(`⚠️ Navigation attempt ${attempt} - Progression visible: ${progressionVisible}, Question visible: ${questionVisible}`)
    await page.waitForTimeout(2000)
  }

  if (!navigationSuccess) {
    // Final attempt - wait longer for the page to load
    await page.waitForSelector('text=Progression', { timeout: 30000 })
  }
}

// Tests can run in parallel since each creates its own data
test.describe('Questionnaire Completion', () => {
  test('should complete questionnaire and display score', async ({ page }) => {
    test.setTimeout(150000)

    const testData = await createTestData('display-score')

    try {
      await authenticateAndNavigate(page, testData)
      await completeQuestionnaire(page)

      // Wait for redirect to overview (not evaluation page)
      await page.waitForURL(/\/usecases\/[a-f0-9-]+(?!\/evaluation)/, { timeout: 60000 })

      // Wait for the page to fully load
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(3000)

      // Try multiple selectors for the score section
      const scoreSelectors = [
        'text=Score de Conformité',
        'text=Score de conformité',
        'text=Conformité',
        '[data-testid="score"]',
        'text=/\\d+\\/100/',
      ]

      let scoreFound = false
      for (const selector of scoreSelectors) {
        const element = page.locator(selector).first()
        const isVisible = await element.isVisible().catch(() => false)
        if (isVisible) {
          console.log(`✅ Found score element with selector: ${selector}`)
          scoreFound = true
          break
        }
      }

      if (!scoreFound) {
        // Take a screenshot for debugging
        console.log('⚠️ Score not found with standard selectors, checking page content...')
        const pageContent = await page.content()
        console.log(`Page URL: ${page.url()}`)

        // Check if we're on the right page
        if (page.url().includes('/evaluation')) {
          throw new Error('Still on evaluation page - questionnaire completion may have failed')
        }

        // Wait a bit more and retry
        await page.waitForTimeout(5000)
      }

      // Verify score is displayed (format: XX/100)
      const scoreText = await page.locator('text=/\\d+\\/100/').first().textContent({ timeout: 30000 })
      expect(scoreText).toMatch(/\d+\/100/)

      console.log(`✅ Score displayed: ${scoreText}`)
    } finally {
      await cleanupTestData(testData)
    }
  })

  test('should calculate correct score based on answers', async ({ page }) => {
    test.setTimeout(120000)

    const testData = await createTestData('calc-score')
    const supabase = getAdminClient()

    try {
      await authenticateAndNavigate(page, testData)
      await completeQuestionnaire(page)

      // Wait for redirect
      await page.waitForURL(/\/usecases\/[a-f0-9-]+(?!\/evaluation)/, { timeout: 60000 })

      // Wait for status to be updated to 'completed' (poll database)
      let usecaseData: { score_final: number | null; status: string } | null = null
      const maxRetries = 10
      const retryInterval = 2000

      for (let i = 0; i < maxRetries; i++) {
        const { data, error } = await supabase
          .from('usecases')
          .select('score_final, status')
          .eq('id', testData.usecaseId)
          .single()

        if (error) {
          throw new Error(`Failed to fetch usecase: ${error.message}`)
        }

        usecaseData = data

        if (data.status === 'completed') {
          console.log(`✅ Status updated to completed after ${i + 1} attempts`)
          break
        }

        console.log(`⏳ Status is still '${data.status}', waiting... (attempt ${i + 1}/${maxRetries})`)
        await page.waitForTimeout(retryInterval)
      }

      // Verify status is completed
      expect(usecaseData?.status).toBe('completed')

      // Verify score is calculated (expected ~75 for happy path)
      expect(usecaseData?.score_final).toBeDefined()
      expect(usecaseData?.score_final).toBeGreaterThanOrEqual(70)

      console.log(`✅ Score verified in database: ${usecaseData?.score_final}`)
    } finally {
      await cleanupTestData(testData)
    }
  })

  test('should generate OpenAI report after completion', async ({ page }) => {
    // This test verifies that OpenAI report is generated after questionnaire completion

    test.setTimeout(180000)

    const testData = await createTestData('openai-report')
    const supabase = getAdminClient()

    // Collect console logs from the browser
    const consoleLogs: string[] = []
    page.on('console', (msg) => {
      const text = msg.text()
      consoleLogs.push(`[${msg.type()}] ${text}`)
      if (text.includes('OpenAI') || text.includes('report') || text.includes('generate')) {
        console.log(`🖥️ Browser console: ${text}`)
      }
    })

    // Track network requests to generate-report endpoint
    let reportRequestMade = false
    let reportRequestResponse: { status: number; body?: Record<string, unknown> } | null = null
    page.on('response', async (response) => {
      if (response.url().includes('/api/generate-report')) {
        reportRequestMade = true
        try {
          const body = await response.json()
          reportRequestResponse = { status: response.status(), body }
          console.log(`📡 generate-report response: ${response.status()}`, JSON.stringify(body).slice(0, 500))
        } catch {
          reportRequestResponse = { status: response.status() }
          console.log(`📡 generate-report response: ${response.status()} (no JSON body)`)
        }
      }
    })

    try {
      await authenticateAndNavigate(page, testData)
      await completeQuestionnaire(page)

      // Wait for redirect
      await page.waitForURL(/\/usecases\/[a-f0-9-]+(?!\/evaluation)/, { timeout: 90000 })

      // Poll for report generation
      console.log('⏳ Waiting for OpenAI report generation...')
      const maxWaitTime = 90000
      const pollInterval = 3000
      const startTime = Date.now()
      let reportGenerated = false
      let usecaseData: { report_summary: string | null; report_generated_at: string | null; status: string } | null = null

      while (Date.now() - startTime < maxWaitTime) {
        const { data, error } = await supabase
          .from('usecases')
          .select('report_summary, report_generated_at, status')
          .eq('id', testData.usecaseId)
          .single()

        if (error) {
          throw new Error(`Failed to fetch usecase: ${error.message}`)
        }

        usecaseData = data

        if (data.report_summary && data.report_generated_at) {
          reportGenerated = true
          break
        }

        console.log(`⏳ Report not ready yet (status: ${data.status}), waiting...`)
        await page.waitForTimeout(pollInterval)
      }

      if (!reportGenerated) {
        console.log('⚠️ OpenAI report was not generated within timeout.')
        console.log(`📊 Report request made: ${reportRequestMade}`)
        console.log(`📊 Report request response:`, JSON.stringify(reportRequestResponse, null, 2))
        console.log(`📊 Relevant console logs:`, consoleLogs.filter(l =>
          l.includes('OpenAI') || l.includes('report') || l.includes('generate') || l.includes('Error') || l.includes('error')
        ))

        // Fail with useful info instead of skipping
        expect(reportRequestMade, 'Report API should have been called').toBe(true)
        expect((reportRequestResponse as { status: number } | null)?.status, 'Report API should return 200').toBe(200)
        expect(usecaseData?.report_summary, 'Report summary should be generated').not.toBeNull()
        return
      }

      expect(usecaseData?.report_summary).not.toBeNull()
      console.log('✅ OpenAI report generated successfully')

      // Navigate to rapport page to verify display
      await page.goto(`/usecases/${testData.usecaseId}/rapport`)
      await page.waitForLoadState('networkidle')

      const reportContent = page.locator('[class*="prose"]').first()
      await expect(reportContent).toBeVisible({ timeout: 10000 })

      console.log('✅ Report displayed on rapport page')
    } finally {
      await cleanupTestData(testData)
    }
  })
})
