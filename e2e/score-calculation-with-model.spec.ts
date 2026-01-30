import { test, expect, Page } from '@playwright/test'
import { createClient, SupabaseClient } from '@supabase/supabase-js'

/**
 * E2E Test: Score Calculation with COMPL-AI Model
 *
 * This test verifies:
 * 1. Score calculation with a specific LLM model (Gemini 1.5 Flash)
 * 2. Correct score formula: ((score_base + score_model × 2.5) / 150) × 100
 * 3. Perfect questionnaire (score_base = 90) + model score = expected final score
 *
 * Expected calculation for Gemini 1.5 Flash:
 * - score_base: 90 (perfect questionnaire, no penalties)
 * - score_model: ~12.07 (sum of MaydAI scores for the model)
 * - score_final: ((90 + 12.07 × 2.5) / 150) × 100 = 80.12%
 */

// Test data interface
interface TestData {
  userId: string
  companyId: string
  registryId: string
  usecaseId: string
  email: string
}

// Gemini 1.5 Flash model ID (from compl_ai_models table)
const GEMINI_FLASH_MODEL_ID = 'c4ebe815-b69b-4da2-b366-20dce7349782'

// Question answers for perfect score (all positive answers, no penalties)
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
  { questionId: 'E5.N9.Q9', type: 'conditional', answer: 'Oui', conditionalValue: 'Test E2E security procedures' },
  { questionId: 'E5.N9.Q5', type: 'tags', answer: 'Publiques' },
  { questionId: 'E5.N9.Q6', type: 'conditional', answer: 'Oui', conditionalValue: 'Test E2E quality procedures' },
  { questionId: 'E5.N9.Q7', type: 'conditional', answer: 'Oui', conditionalValue: 'Test E2E registry' },
  { questionId: 'E5.N9.Q8', type: 'conditional', answer: 'Oui', conditionalValue: 'Test E2E supervisor' },
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
 * Create all test data needed for a score calculation test with a specific model
 */
async function createTestData(testId: string): Promise<TestData> {
  const supabase = getAdminClient()
  const email = `e2e-score-model-${testId}-${Date.now()}@maydai-test.com`

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
    .insert({ name: `E2E Score Model Company ${testId} ${Date.now()}` })
    .select('id')
    .single()

  if (companyError) {
    throw new Error(`Failed to create test company: ${companyError.message}`)
  }

  const companyId = companyData.id

  // Create registry (another company for the use case)
  const { data: registryData, error: registryError } = await supabase
    .from('companies')
    .insert({ name: `E2E Score Model Registry ${testId} ${Date.now()}` })
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
      last_name: `ScoreModel${testId}`,
      company_name: `E2E Score Model Company ${testId}`,
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

  // Create the use case with Gemini 1.5 Flash model
  const { data: usecaseData, error: usecaseError } = await supabase
    .from('usecases')
    .insert({
      name: `E2E Score Model UseCase ${testId} ${Date.now()}`,
      description: 'Test use case for score calculation with Gemini 1.5 Flash model',
      company_id: registryId,
      status: 'draft',
      deployment_date: new Date().toISOString(),
      primary_model_id: GEMINI_FLASH_MODEL_ID,  // Associate with Gemini 1.5 Flash
      technology_partner: 'Google',
      llm_model_version: 'gemini-1.5-flash',
      ai_category: 'Vision par ordinateur',
      system_type: 'Système autonome',
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

  console.log(`✅ Test data created: ${email} (usecase: ${usecaseId}, model: Gemini 1.5 Flash)`)

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

    // Delete usecase nextsteps
    await supabase
      .from('usecase_nextsteps')
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

    await answerQuestion(page, type, answer, conditionalValue)

    if (!isLastQuestion) {
      const clicked = await clickSuivantWithRetry(i)

      if (clicked) {
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

  await page.goto(linkData.properties.action_link)
  await page.waitForTimeout(3000)

  let navigationSuccess = false
  for (let attempt = 1; attempt <= 3; attempt++) {
    await page.goto(`/usecases/${testData.usecaseId}/evaluation`)
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)

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
    await page.waitForSelector('text=Progression', { timeout: 30000 })
  }
}

test.describe('Score Calculation with COMPL-AI Model', () => {
  test('should calculate correct score with Gemini 1.5 Flash model', async ({ page }) => {
    test.setTimeout(180000)

    const testData = await createTestData('gemini-flash')
    const supabase = getAdminClient()

    try {
      await authenticateAndNavigate(page, testData)
      await completeQuestionnaire(page)

      // Wait for redirect to overview
      await page.waitForURL(/\/usecases\/[a-f0-9-]+(?!\/evaluation)/, { timeout: 60000 })

      // Wait for status to be updated to 'completed' and score to be calculated
      let usecaseData: {
        score_final: number | null
        score_base: number | null
        score_model: number | null
        status: string
        is_eliminated: boolean
      } | null = null
      const maxRetries = 15
      const retryInterval = 2000

      for (let i = 0; i < maxRetries; i++) {
        const { data, error } = await supabase
          .from('usecases')
          .select('score_final, score_base, score_model, status, is_eliminated')
          .eq('id', testData.usecaseId)
          .single()

        if (error) {
          throw new Error(`Failed to fetch usecase: ${error.message}`)
        }

        usecaseData = data

        if (data.status === 'completed' && data.score_final !== null) {
          console.log(`✅ Status updated to completed after ${i + 1} attempts`)
          break
        }

        console.log(`⏳ Status: '${data.status}', score_final: ${data.score_final}, waiting... (attempt ${i + 1}/${maxRetries})`)
        await page.waitForTimeout(retryInterval)
      }

      // Verify status is completed
      expect(usecaseData?.status).toBe('completed')
      expect(usecaseData?.is_eliminated).toBe(false)

      // Log the actual scores for debugging
      console.log(`📊 Score calculation results:`)
      console.log(`   - score_base: ${usecaseData?.score_base}`)
      console.log(`   - score_model: ${usecaseData?.score_model}`)
      console.log(`   - score_final: ${usecaseData?.score_final}`)

      // Expected values for perfect questionnaire + Gemini 1.5 Flash model:
      // - score_base: 90 (perfect questionnaire, no penalties)
      // - score_model: 12.07 (sum of MaydAI scores: 2.44 + 2.10 + 2.80 + 2.91 + 1.82 = 12.07)
      // - score_final: ((90 + 12.07 × 2.5) / 150) × 100 = 80.12% → rounded to 80
      const EXPECTED_SCORE_BASE = 90
      const EXPECTED_SCORE_MODEL = 12.07
      const EXPECTED_SCORE_FINAL = 80.12

      // Verify score_base is exactly 90 (perfect questionnaire with API route logic)
      // If it's 100, it means the edge function was used (BUG!)
      expect(
        usecaseData?.score_base,
        `score_base should be ${EXPECTED_SCORE_BASE} for perfect questionnaire (got ${usecaseData?.score_base})`
      ).toBe(EXPECTED_SCORE_BASE)

      // Verify score_model is exactly 12.07 (Gemini 1.5 Flash COMPL-AI score)
      expect(
        usecaseData?.score_model,
        `score_model should be ${EXPECTED_SCORE_MODEL} for Gemini 1.5 Flash (got ${usecaseData?.score_model})`
      ).toBe(EXPECTED_SCORE_MODEL)

      // Verify the final score is exactly 80.12%
      // Formula: ((90 + 12.07 × 2.5) / 150) × 100 = ((90 + 30.175) / 150) × 100 = 80.1166... → 80.12%
      expect(
        usecaseData?.score_final,
        `score_final should be ${EXPECTED_SCORE_FINAL}% (got ${usecaseData?.score_final}%)`
      ).toBe(EXPECTED_SCORE_FINAL)

      console.log(`✅ Score calculation verified:`)
      console.log(`   score_base: ${usecaseData?.score_base} (expected: ${EXPECTED_SCORE_BASE})`)
      console.log(`   score_model: ${usecaseData?.score_model} (expected: ${EXPECTED_SCORE_MODEL})`)
      console.log(`   score_final: ${usecaseData?.score_final}% (expected: ${EXPECTED_SCORE_FINAL}%)`)
      console.log(`   Formula: ((${EXPECTED_SCORE_BASE} + ${EXPECTED_SCORE_MODEL} × 2.5) / 150) × 100 = ${EXPECTED_SCORE_FINAL}%`)

      console.log(`✅ Score calculation verified successfully!`)
    } finally {
      await cleanupTestData(testData)
    }
  })

  test('should display correct score on UI', async ({ page }) => {
    test.setTimeout(180000)

    const testData = await createTestData('gemini-flash-ui')
    const supabase = getAdminClient()

    try {
      await authenticateAndNavigate(page, testData)
      await completeQuestionnaire(page)

      // Wait for redirect to overview (results page)
      await page.waitForURL(/\/usecases\/[a-f0-9-]+(?!\/evaluation)/, { timeout: 60000 })
      await page.waitForLoadState('networkidle')

      // Wait for the score to be calculated and displayed on UI
      // The main score is displayed as a standalone number (e.g., "80") in a text-3xl font-bold div
      // NOT as "XX/100" which is the category score format
      const EXPECTED_UI_SCORE = 80
      const maxWaitTime = 30000
      const pollInterval = 1000
      const startTime = Date.now()

      let scoreValue: number | null = null

      while (Date.now() - startTime < maxWaitTime) {
        // The main score is displayed in a specific structure:
        // <div class="text-3xl font-bold ...">80</div>
        // It's inside the "Score de conformité" section
        const scoreContainer = page.locator('h3:has-text("Score de conformité")').locator('xpath=..').locator('div.text-3xl.font-bold')
        const isVisible = await scoreContainer.isVisible().catch(() => false)

        if (isVisible) {
          const scoreText = await scoreContainer.textContent()
          scoreValue = scoreText ? parseInt(scoreText.trim(), 10) : null

          // Check if the score is the expected value (not loading/default state)
          if (scoreValue !== null && !isNaN(scoreValue) && scoreValue !== 0) {
            console.log(`✅ Main score displayed on UI: ${scoreValue}`)
            break
          }

          console.log(`⏳ Score is ${scoreValue}, waiting for correct score...`)
        } else {
          console.log(`⏳ Score container not visible yet, waiting...`)
        }

        await page.waitForTimeout(pollInterval)
      }

      // Also check the database value for debugging
      const { data: dbData } = await supabase
        .from('usecases')
        .select('score_final, score_base, score_model')
        .eq('id', testData.usecaseId)
        .single()

      console.log(`📊 Database values:`)
      console.log(`   - score_base: ${dbData?.score_base}`)
      console.log(`   - score_model: ${dbData?.score_model}`)
      console.log(`   - score_final: ${dbData?.score_final}`)

      // Verify the score matches expected value
      expect(scoreValue).not.toBeNull()
      expect(
        scoreValue,
        `UI score should be ${EXPECTED_UI_SCORE} (got ${scoreValue}, DB has score_final=${dbData?.score_final})`
      ).toBe(EXPECTED_UI_SCORE)

      console.log(`✅ UI score verification passed: ${scoreValue} (expected: ${EXPECTED_UI_SCORE})`)
    } finally {
      await cleanupTestData(testData)
    }
  })
})
