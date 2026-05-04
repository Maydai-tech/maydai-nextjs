import { test, expect, Page } from '@playwright/test'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { authenticateUser } from './auth-helper'

/**
 * E2E Test: Questionnaire Completion and Score Calculation
 *
 * This test suite verifies:
 * 1. Parcours questionnaire V2 (ORS N7 puis N8, sans blocs E5/E6)
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
  type: 'radio' | 'checkbox' | 'tags'
  answer: string | string[]
  conditionalValue?: string
}> = [
  { questionId: 'E4.N7.Q1', type: 'radio', answer: 'Déployeur (Deployer)' },
  { questionId: 'E4.N7.Q1.2', type: 'radio', answer: 'Je suis un utilisateur d\'un système d\'IA pour mon entreprise' },
  { questionId: 'E4.N7.Q2', type: 'checkbox', answer: 'Aucun de ces domaines' },
  { questionId: 'E4.N7.Q2.1', type: 'checkbox', answer: 'Aucun de ces cas' },
  { questionId: 'E4.N7.Q3', type: 'checkbox', answer: 'Aucune de ces activités' },
  { questionId: 'E4.N7.Q3.1', type: 'checkbox', answer: 'Aucune de ces situations' },
  { questionId: 'E4.N8.Q9', type: 'radio', answer: 'Non (Outil logiciel évident)' },
  { questionId: 'E4.N8.Q9.1', type: 'radio', answer: 'Non (Aucune analyse de ce type)' },
  { questionId: 'E4.N8.Q10', type: 'radio', answer: 'Moins de 100' },
  { questionId: 'E4.N8.Q11.0', type: 'radio', answer: 'Non' },
  { questionId: 'E4.N8.Q12', type: 'radio', answer: 'Oui' },
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
      deployment_phase: 'En projet (Non déployé)',
      deployment_date: new Date().toISOString(),
      questionnaire_version: 2,
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
  type: 'radio' | 'checkbox' | 'tags',
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
      if (conditionalValue) {
        await page.waitForTimeout(500)
        const conditionalInput = page.getByRole('textbox').first()
        if (await conditionalInput.isVisible()) {
          await conditionalInput.fill(conditionalValue)
          await page.waitForTimeout(500)
        }
      }
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
  await authenticateUser(page, testData.email)

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

async function navigateToResults(page: Page, usecaseId: string): Promise<void> {
  const resultsButton = page.getByRole('button', { name: /Voir les résultats/i })
  if (await resultsButton.isVisible().catch(() => false)) {
    await resultsButton.click()
  }

  await page.waitForURL(
    (url) => url.pathname === `/usecases/${usecaseId}`,
    { timeout: 60000 }
  )
}

// Tests can run in parallel since each creates its own data
test.describe('Questionnaire Completion', () => {
  test('should complete questionnaire and display score', async ({ page }) => {
    test.setTimeout(150000)

    const testData = await createTestData('display-score')

    try {
      await authenticateAndNavigate(page, testData)
      await completeQuestionnaire(page)

      await navigateToResults(page, testData.usecaseId)

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
      const scoreText = await page.locator('text=/\\d+\\/\\d+/').first().textContent({ timeout: 30000 })
      expect(scoreText).toMatch(/\d+\/\d+/)

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

      await navigateToResults(page, testData.usecaseId)

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

      // Verify score is calculated for the fixed answer path.
      expect(usecaseData?.score_final).toBeDefined()
      expect(usecaseData?.score_final).toBe(60)

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
          console.log(`📡 generate-report response: ${response.status()}`)
          console.log(`   - next_steps_extracted: ${body.next_steps_extracted}`)
          console.log(`   - next_steps_saved: ${body.next_steps_saved}`)
          console.log(`   - next_steps_error: ${body.next_steps_error}`)
          console.log(`   - validation:`, JSON.stringify(body.next_steps_validation))
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
      await navigateToResults(page, testData.usecaseId)

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

      // Verify nextsteps were saved to database
      const { data: nextstepsData, error: nextstepsError } = await supabase
        .from('usecase_nextsteps')
        .select('*')
        .eq('usecase_id', testData.usecaseId)
        .single()

      if (nextstepsError) {
        console.log('⚠️ No nextsteps found in database:', nextstepsError.message)
      } else {
        console.log('✅ Nextsteps saved to database')
        console.log(`   - priorite_1: ${nextstepsData.priorite_1 ? '✅' : '❌'}`)
        console.log(`   - quick_win_1: ${nextstepsData.quick_win_1 ? '✅' : '❌'}`)
        console.log(`   - action_1: ${nextstepsData.action_1 ? '✅' : '❌'}`)
      }

      // Navigate to use case detail page to verify recommendations are displayed
      await page.goto(`/usecases/${testData.usecaseId}`)
      await page.waitForLoadState('networkidle')

      // Wait for the "Recommandations et plan d'action" section to be visible
      const recommendationsSection = page.locator('h2:has-text("Recommandations et plan d\'action")')
      await expect(recommendationsSection).toBeVisible({ timeout: 30000 })
      console.log('✅ Recommendations section visible on detail page')

      // Verify that at least one priority/quick win/action is displayed (not loading state)
      // The section should contain actual content, not just the loading spinner
      const actionButtons = page.locator('button:has-text("pts")')
      const hasActions = await actionButtons.count() > 0

      // Check for evaluation section content
      const evaluationSection = page.locator('h3:has-text("Évaluation du niveau de risque")')
      const hasEvaluation = await evaluationSection.isVisible().catch(() => false)

      // Check for quick wins section
      const quickWinsSection = page.locator('h3:has-text("Actions immédiates recommandées")')
      const hasQuickWins = await quickWinsSection.isVisible().catch(() => false)

      console.log(`📊 Content verification:`)
      console.log(`   - Has action buttons: ${hasActions}`)
      console.log(`   - Has evaluation section: ${hasEvaluation}`)
      console.log(`   - Has quick wins section: ${hasQuickWins}`)

      // At least one of the content sections should be visible
      expect(hasEvaluation || hasQuickWins || hasActions, 'Report content should be displayed').toBe(true)
      console.log('✅ Report content displayed on use case detail page')

      // Also verify rapport page displays the full report
      await page.goto(`/usecases/${testData.usecaseId}/rapport`)
      await page.waitForLoadState('networkidle')

      const reportContent = page.locator('[class*="prose"]').first()
      await expect(reportContent).toBeVisible({ timeout: 10000 })

      console.log('✅ Full report displayed on rapport page')
    } finally {
      await cleanupTestData(testData)
    }
  })
})
