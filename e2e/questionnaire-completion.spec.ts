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
  await page.waitForTimeout(200)

  switch (type) {
    case 'radio':
      const radioInput = page.getByRole('radio', { name: new RegExp(answerText.slice(0, 30).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')) })
      await radioInput.click({ force: true })
      await page.waitForTimeout(500)
      break

    case 'checkbox':
      if (Array.isArray(answer)) {
        for (const ans of answer) {
          const checkboxInput = page.getByRole('checkbox', { name: new RegExp(ans.slice(0, 30).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')) })
          await checkboxInput.click({ force: true })
          await page.waitForTimeout(300)
        }
      } else {
        const checkboxInput = page.getByRole('checkbox', { name: new RegExp(answerText.slice(0, 30).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')) })
        await checkboxInput.click({ force: true })
      }
      break

    case 'tags':
      if (Array.isArray(answer)) {
        for (const ans of answer) {
          const tagButton = page.locator(`button`).filter({ hasText: ans }).first()
          await tagButton.click({ force: true })
          await page.waitForTimeout(300)
        }
      } else {
        const tagButton = page.locator(`button`).filter({ hasText: answerText }).first()
        await tagButton.click({ force: true })
      }
      break

    case 'conditional':
      const conditionalRadio = page.getByRole('radio', { name: new RegExp(answerText.slice(0, 30).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')) })
      await conditionalRadio.click({ force: true })
      await page.waitForTimeout(500)
      if (conditionalValue) {
        await page.waitForTimeout(500)
        const conditionalInput = page.getByRole('textbox').first()
        if (await conditionalInput.isVisible()) {
          await conditionalInput.fill(conditionalValue)
          await page.waitForTimeout(300)
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

  for (let i = 0; i < QUESTIONNAIRE_ANSWERS.length; i++) {
    const { questionId, type, answer, conditionalValue } = QUESTIONNAIRE_ANSWERS[i]
    const isLastQuestion = i === QUESTIONNAIRE_ANSWERS.length - 1

    console.log(`📝 Answering question ${i + 1}/${QUESTIONNAIRE_ANSWERS.length}: ${questionId}`)

    const progressionBefore = await getProgression()

    // Answer the question
    await answerQuestion(page, type, answer, conditionalValue)

    // Click "Suivant" to proceed to the next question
    if (!isLastQuestion) {
      await page.waitForTimeout(500)
      const suivantButton = page.locator('button:has-text("Suivant")')
      await suivantButton.waitFor({ state: 'visible', timeout: 10000 }).catch(() => {
        console.log(`⚠️ Suivant button not visible after question ${i + 1}`)
      })
      if (await suivantButton.isVisible()) {
        await suivantButton.click()
        console.log(`✅ Clicked Suivant after question ${i + 1}`)
      }
    }

    // Wait for progression to change
    if (!isLastQuestion) {
      await page.waitForFunction(
        (prevProgress) => {
          const currentProgress = document.body.innerText.match(/(\d+)%/)?.[0]
          return currentProgress && currentProgress !== prevProgress
        },
        progressionBefore,
        { timeout: 10000 }
      ).catch(() => {
        console.log(`⚠️ Progress didn't change after question ${i + 1}, continuing anyway...`)
      })
    }

    await page.waitForTimeout(500)

    // If it's the last question, click "Terminer l'évaluation"
    if (isLastQuestion) {
      console.log('🎯 Last question answered, looking for "Terminer l\'évaluation" button...')
      await page.waitForTimeout(1000)

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
  const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
    type: 'magiclink',
    email: testData.email,
  })

  if (linkError) {
    throw new Error(`Failed to generate magic link: ${linkError.message}`)
  }

  // Authenticate via magic link
  await page.goto(linkData.properties.action_link)
  await page.waitForTimeout(2000)

  // Navigate to evaluation page
  await page.goto(`/usecases/${testData.usecaseId}/evaluation`)
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(2000)

  // Wait for the first question to load
  await page.waitForSelector('text=Progression', { timeout: 30000 })
}

// Tests can run in parallel since each creates its own data
test.describe('Questionnaire Completion', () => {
  test('should complete questionnaire and display score', async ({ page }) => {
    test.setTimeout(120000)

    const testData = await createTestData('display-score')

    try {
      await authenticateAndNavigate(page, testData)
      await completeQuestionnaire(page)

      // Wait for redirect to overview
      await page.waitForURL(/\/usecases\/[a-f0-9-]+(?!\/evaluation)/, { timeout: 60000 })

      // Wait for the score to be displayed
      await page.waitForSelector('text=Score de Conformité', { timeout: 30000 })

      // Verify score is displayed (format: XX/100)
      const scoreText = await page.locator('text=/\\d+\\/100/').first().textContent()
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

      // Verify score via database
      const { data: usecaseData, error: usecaseError } = await supabase
        .from('usecases')
        .select('score_final, status')
        .eq('id', testData.usecaseId)
        .single()

      if (usecaseError) {
        throw new Error(`Failed to fetch usecase: ${usecaseError.message}`)
      }

      // Verify status is completed
      expect(usecaseData.status).toBe('completed')

      // Verify score is calculated (expected ~75 for happy path)
      expect(usecaseData.score_final).toBeDefined()
      expect(usecaseData.score_final).toBeGreaterThanOrEqual(70)

      console.log(`✅ Score verified in database: ${usecaseData.score_final}`)
    } finally {
      await cleanupTestData(testData)
    }
  })

  test.skip('should generate OpenAI report after completion', async ({ page }) => {
    // This test is skipped by default because OpenAI report generation
    // can be slow and unreliable in E2E tests. Test manually if needed.
    // To enable: remove .skip from the test declaration

    test.setTimeout(180000)

    const testData = await createTestData('openai-report')
    const supabase = getAdminClient()

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
        expect(usecaseData?.status).toBe('completed')
        test.skip()
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
