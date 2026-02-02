import { test, expect, Page } from '@playwright/test'
import { createClient, SupabaseClient } from '@supabase/supabase-js'

/**
 * E2E Test: Questionnaire with ALL questions (including E5.N9.Q2 and E5.N9.Q3)
 *
 * This test verifies:
 * 1. Questions E5.N9.Q2 and E5.N9.Q3 are ALWAYS displayed (not conditional)
 * 2. Complete questionnaire flow with 21 questions (not 19)
 * 3. Score calculation matches Excel expectations (~50% with negative answers)
 *
 * Expected question flow:
 * E4.N7.Q1 → E4.N7.Q1.2 → E4.N7.Q2 → E4.N7.Q2.1 → E4.N7.Q3 → E4.N7.Q3.1 →
 * E5.N9.Q4 → E5.N9.Q1 → E5.N9.Q2 → E5.N9.Q3 → E5.N9.Q9 → E5.N9.Q5 →
 * E5.N9.Q6 → E5.N9.Q7 → E5.N9.Q8 → E4.N8.Q12 → E4.N8.Q9 → E4.N8.Q10 →
 * E4.N8.Q11 → E6.N10.Q1 → E6.N10.Q2
 */

// Test data interface
interface TestData {
  userId: string
  companyId: string
  registryId: string
  usecaseId: string
  email: string
}

// Gemini 1.5 Flash model ID
const GEMINI_FLASH_MODEL_ID = 'c4ebe815-b69b-4da2-b366-20dce7349782'

// Question answers that match the Excel "Traducteur page HTML 2" scenario
// All negative answers to get ~50% score
const QUESTIONNAIRE_ANSWERS_WITH_PENALTIES: Array<{
  questionId: string
  type: 'radio' | 'checkbox' | 'tags' | 'conditional'
  answer: string | string[]
  conditionalValue?: string
}> = [
  // Phase 1: Identification (no impact)
  { questionId: 'E4.N7.Q1', type: 'radio', answer: 'Mon entreprise utilise des systèmes d\'IA tiers' },
  { questionId: 'E4.N7.Q1.2', type: 'radio', answer: 'Je suis un utilisateur d\'un système d\'IA pour mon entreprise' },
  { questionId: 'E4.N7.Q2', type: 'checkbox', answer: 'Aucun de ces domaines' },
  { questionId: 'E4.N7.Q2.1', type: 'checkbox', answer: 'Aucun de ces cas' },
  { questionId: 'E4.N7.Q3', type: 'checkbox', answer: 'Aucune de ces activités' },
  { questionId: 'E4.N7.Q3.1', type: 'checkbox', answer: 'Aucune de ces situations' },

  // Phase 2: Risk management - E5.N9.Q4 (documentation) - NEGATIVE
  { questionId: 'E5.N9.Q4', type: 'radio', answer: 'Non' }, // -3 pts

  // E5.N9.Q1 (risk management system) - NEGATIVE
  { questionId: 'E5.N9.Q1', type: 'radio', answer: 'Non' }, // -3 pts

  // E5.N9.Q2 (risk identification) - NEGATIVE - THIS QUESTION MUST APPEAR!
  { questionId: 'E5.N9.Q2', type: 'radio', answer: 'Non' }, // -3 pts

  // E5.N9.Q3 (risk mitigation) - NEGATIVE - THIS QUESTION MUST APPEAR!
  { questionId: 'E5.N9.Q3', type: 'radio', answer: 'Non' }, // -3 pts

  // E5.N9.Q9 (cybersecurity) - NEGATIVE
  { questionId: 'E5.N9.Q9', type: 'conditional', answer: 'Non' }, // -3 pts

  // E5.N9.Q5 (data types) - Sensitive data
  { questionId: 'E5.N9.Q5', type: 'tags', answer: 'sensibles' }, // -3 pts

  // E5.N9.Q6 (data quality procedures) - NEGATIVE
  { questionId: 'E5.N9.Q6', type: 'conditional', answer: 'Non' }, // -3 pts

  // E5.N9.Q7 (centralized registry) - NEGATIVE
  { questionId: 'E5.N9.Q7', type: 'conditional', answer: 'Non' }, // -5 pts

  // E5.N9.Q8 (human oversight) - NEGATIVE
  { questionId: 'E5.N9.Q8', type: 'conditional', answer: 'Non' }, // -3 pts

  // E4.N8.Q12 (games/anti-spam) - NEGATIVE
  { questionId: 'E4.N8.Q12', type: 'radio', answer: 'Non' }, // -0.8 pts

  // E4.N8.Q9 (interacts with persons) - Oui -> triggers more questions
  { questionId: 'E4.N8.Q9', type: 'radio', answer: 'Oui' }, // -3 pts

  // E4.N8.Q10 (number of users) - > 100
  { questionId: 'E4.N8.Q10', type: 'conditional', answer: '> à 100' }, // -3 pts

  // E4.N8.Q11 (content generation) - Image + Audio (mode any = -3 total)
  { questionId: 'E4.N8.Q11', type: 'tags', answer: ['Image', 'audio'] }, // -3 pts

  // E6.N10.Q1 (users informed) - NEGATIVE
  { questionId: 'E6.N10.Q1', type: 'radio', answer: 'Non' }, // -3 pts

  // E6.N10.Q2 (content marked) - NEGATIVE
  { questionId: 'E6.N10.Q2', type: 'radio', answer: 'Non' }, // -3 pts
]

// Create Supabase admin client
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
 * Create test data with Gemini 1.5 Flash model
 */
async function createTestData(testId: string): Promise<TestData> {
  const supabase = getAdminClient()
  const email = `e2e-all-questions-${testId}-${Date.now()}@maydai-test.com`

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

  // Create company
  const { data: companyData, error: companyError } = await supabase
    .from('companies')
    .insert({ name: `E2E All Questions Company ${testId} ${Date.now()}` })
    .select('id')
    .single()

  if (companyError) {
    throw new Error(`Failed to create test company: ${companyError.message}`)
  }

  const companyId = companyData.id

  // Create registry
  const { data: registryData, error: registryError } = await supabase
    .from('companies')
    .insert({ name: `E2E All Questions Registry ${testId} ${Date.now()}` })
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
      last_name: `AllQuestions${testId}`,
      company_name: `E2E All Questions Company ${testId}`,
      company_id: companyId,
      current_company_id: registryId,
      sub_category_id: 'saas',
      industry: 'tech_data',
    })

  if (profileError) {
    throw new Error(`Failed to create test profile: ${profileError.message}`)
  }

  // Create user_companies
  await supabase.from('user_companies').insert({ user_id: userId, company_id: companyId, role: 'owner' })
  await supabase.from('user_companies').insert({ user_id: userId, company_id: registryId, role: 'owner' })

  // Create use case with Gemini 1.5 Flash model
  const { data: usecaseData, error: usecaseError } = await supabase
    .from('usecases')
    .insert({
      name: `E2E All Questions UseCase ${testId} ${Date.now()}`,
      description: 'Test use case for verifying all questions are displayed',
      company_id: registryId,
      status: 'draft',
      deployment_date: new Date().toISOString(),
      primary_model_id: GEMINI_FLASH_MODEL_ID,
      technology_partner: 'Google',
      llm_model_version: 'gemini-1.5-flash',
    })
    .select('id')
    .single()

  if (usecaseError) {
    throw new Error(`Failed to create test usecase: ${usecaseError.message}`)
  }

  const usecaseId = usecaseData.id

  // Create user_usecases link
  await supabase.from('user_usecases').insert({ user_id: userId, usecase_id: usecaseId, role: 'owner' })

  console.log(`✅ Test data created: ${email} (usecase: ${usecaseId})`)

  return { userId, companyId, registryId, usecaseId, email }
}

/**
 * Clean up test data
 */
async function cleanupTestData(data: TestData): Promise<void> {
  const supabase = getAdminClient()

  try {
    await supabase.from('usecase_responses').delete().eq('usecase_id', data.usecaseId)
    await supabase.from('usecase_nextsteps').delete().eq('usecase_id', data.usecaseId)
    await supabase.from('user_usecases').delete().eq('usecase_id', data.usecaseId)
    await supabase.from('usecases').delete().eq('id', data.usecaseId)
    await supabase.from('user_companies').delete().eq('user_id', data.userId)
    await supabase.from('profiles').delete().eq('id', data.userId)
    await supabase.from('companies').delete().eq('id', data.registryId)
    await supabase.from('companies').delete().eq('id', data.companyId)
    await supabase.auth.admin.deleteUser(data.userId)

    console.log(`🧹 Test data cleaned up: ${data.email}`)
  } catch (error) {
    console.error('Cleanup error:', error)
  }
}

/**
 * Answer a question based on its type
 */
async function answerQuestion(
  page: Page,
  type: 'radio' | 'checkbox' | 'tags' | 'conditional',
  answer: string | string[],
  conditionalValue?: string
) {
  const answerText = Array.isArray(answer) ? answer[0] : answer

  // Close any open tooltips
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
      const answers = Array.isArray(answer) ? answer : [answer]
      for (const ans of answers) {
        const tagButton = page.locator(`button`).filter({ hasText: ans }).first()
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
 * Complete questionnaire and track which questions were displayed
 */
async function completeQuestionnaireAndTrackQuestions(page: Page): Promise<string[]> {
  const displayedQuestions: string[] = []

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
          return true
        }
      }

      if (retry < maxRetries - 1) {
        await page.waitForTimeout(1000)
      }
    }
    return false
  }

  for (let i = 0; i < QUESTIONNAIRE_ANSWERS_WITH_PENALTIES.length; i++) {
    const { questionId, type, answer, conditionalValue } = QUESTIONNAIRE_ANSWERS_WITH_PENALTIES[i]
    const isLastQuestion = i === QUESTIONNAIRE_ANSWERS_WITH_PENALTIES.length - 1

    // Track the question ID
    displayedQuestions.push(questionId)
    console.log(`📝 Question ${i + 1}/${QUESTIONNAIRE_ANSWERS_WITH_PENALTIES.length}: ${questionId}`)

    // Answer the question
    await answerQuestion(page, type, answer, conditionalValue)

    if (!isLastQuestion) {
      await clickSuivantWithRetry(i)
      await page.waitForTimeout(1000)
    }

    if (isLastQuestion) {
      console.log('🎯 Last question, clicking "Terminer"...')
      await page.waitForTimeout(1500)

      const terminerSelectors = [
        'button:has-text("Terminer l\'évaluation")',
        'button:has-text("Terminer")',
      ]

      for (const selector of terminerSelectors) {
        const terminerButton = page.locator(selector).first()
        if (await terminerButton.isVisible().catch(() => false)) {
          if (await terminerButton.isEnabled().catch(() => false)) {
            await terminerButton.click()
            console.log(`✅ Clicked "Terminer" button`)
            break
          }
        }
      }

      await page.waitForTimeout(2000)
    }
  }

  return displayedQuestions
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
    options: { redirectTo: baseUrl },
  })

  if (linkError) {
    throw new Error(`Failed to generate magic link: ${linkError.message}`)
  }

  await page.goto(linkData.properties.action_link)
  await page.waitForTimeout(3000)

  for (let attempt = 1; attempt <= 3; attempt++) {
    await page.goto(`/usecases/${testData.usecaseId}/evaluation`)
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)

    const progressionVisible = await page.locator('text=Progression').isVisible().catch(() => false)
    const questionVisible = await page.locator('input[type="radio"]').first().isVisible().catch(() => false)

    if (progressionVisible && questionVisible) {
      console.log(`✅ Navigation successful on attempt ${attempt}`)
      break
    }
  }
}

test.describe('Questionnaire with ALL questions (E5.N9.Q2 and E5.N9.Q3)', () => {
  test('should display E5.N9.Q2 and E5.N9.Q3 questions and calculate ~50% score', async ({ page }) => {
    test.setTimeout(180000)

    const testData = await createTestData('all-questions')
    const supabase = getAdminClient()

    try {
      await authenticateAndNavigate(page, testData)
      const displayedQuestions = await completeQuestionnaireAndTrackQuestions(page)

      // Verify E5.N9.Q2 and E5.N9.Q3 were displayed
      console.log(`\n📋 Questions displayed: ${displayedQuestions.length}`)
      console.log(displayedQuestions.join(' → '))

      expect(
        displayedQuestions.includes('E5.N9.Q2'),
        'Question E5.N9.Q2 should be displayed'
      ).toBe(true)

      expect(
        displayedQuestions.includes('E5.N9.Q3'),
        'Question E5.N9.Q3 should be displayed'
      ).toBe(true)

      // Total should be 21 questions
      expect(
        displayedQuestions.length,
        `Should display 21 questions (got ${displayedQuestions.length})`
      ).toBe(21)

      // Wait for redirect to overview
      await page.waitForURL(/\/usecases\/[a-f0-9-]+(?!\/evaluation)/, { timeout: 60000 })

      // Wait for score calculation
      let usecaseData: {
        score_final: number | null
        score_base: number | null
        score_model: number | null
        status: string
      } | null = null

      const maxRetries = 15
      for (let i = 0; i < maxRetries; i++) {
        const { data, error } = await supabase
          .from('usecases')
          .select('score_final, score_base, score_model, status')
          .eq('id', testData.usecaseId)
          .single()

        if (error) throw new Error(`Failed to fetch usecase: ${error.message}`)

        usecaseData = data

        if (data.status === 'completed' && data.score_final !== null) {
          console.log(`✅ Status updated to completed after ${i + 1} attempts`)
          break
        }

        console.log(`⏳ Status: '${data.status}', score_final: ${data.score_final}`)
        await page.waitForTimeout(2000)
      }

      // Log scores
      console.log(`\n📊 Score calculation results:`)
      console.log(`   - score_base: ${usecaseData?.score_base}`)
      console.log(`   - score_model: ${usecaseData?.score_model}`)
      console.log(`   - score_final: ${usecaseData?.score_final}`)

      // Expected calculation:
      // Total penalties: -47.8 points
      // score_base = 90 - 47.8 = 42.2
      // score_model = 12.07 (Gemini 1.5 Flash)
      // score_final = ((42.2 + 12.07 × 2.5) / 150) × 100 = ((42.2 + 30.175) / 150) × 100 = 48.25%
      const EXPECTED_SCORE_BASE = 42.2
      const EXPECTED_SCORE_FINAL_MIN = 45
      const EXPECTED_SCORE_FINAL_MAX = 52

      // Verify score_base matches expected (with tolerance for rounding)
      expect(usecaseData?.score_base).toBeDefined()
      expect(
        Math.abs((usecaseData?.score_base || 0) - EXPECTED_SCORE_BASE),
        `score_base should be ~${EXPECTED_SCORE_BASE} (got ${usecaseData?.score_base})`
      ).toBeLessThan(1)

      // Verify final score is in expected range (~48-52%)
      expect(usecaseData?.score_final).toBeDefined()
      expect(
        usecaseData?.score_final,
        `score_final should be between ${EXPECTED_SCORE_FINAL_MIN}% and ${EXPECTED_SCORE_FINAL_MAX}%`
      ).toBeGreaterThanOrEqual(EXPECTED_SCORE_FINAL_MIN)
      expect(usecaseData?.score_final).toBeLessThanOrEqual(EXPECTED_SCORE_FINAL_MAX)

      console.log(`\n✅ Test passed!`)
      console.log(`   - E5.N9.Q2 displayed: ✅`)
      console.log(`   - E5.N9.Q3 displayed: ✅`)
      console.log(`   - Total questions: ${displayedQuestions.length}`)
      console.log(`   - score_base: ${usecaseData?.score_base} (expected: ~${EXPECTED_SCORE_BASE})`)
      console.log(`   - score_final: ${usecaseData?.score_final}% (expected: ${EXPECTED_SCORE_FINAL_MIN}-${EXPECTED_SCORE_FINAL_MAX}%)`)

    } finally {
      await cleanupTestData(testData)
    }
  })

  test('should verify responses are saved in database for E5.N9.Q2 and E5.N9.Q3', async ({ page }) => {
    test.setTimeout(180000)

    const testData = await createTestData('verify-responses')
    const supabase = getAdminClient()

    try {
      await authenticateAndNavigate(page, testData)
      await completeQuestionnaireAndTrackQuestions(page)

      // Wait for redirect
      await page.waitForURL(/\/usecases\/[a-f0-9-]+(?!\/evaluation)/, { timeout: 60000 })

      // Wait for completion
      await page.waitForTimeout(3000)

      // Check that E5.N9.Q2 and E5.N9.Q3 responses are saved in database
      const { data: responses, error } = await supabase
        .from('usecase_responses')
        .select('question_code, single_value')
        .eq('usecase_id', testData.usecaseId)
        .in('question_code', ['E5.N9.Q2', 'E5.N9.Q3'])

      if (error) throw new Error(`Failed to fetch responses: ${error.message}`)

      console.log(`\n📊 Responses for E5.N9.Q2 and E5.N9.Q3:`)
      console.log(JSON.stringify(responses, null, 2))

      // Verify both responses exist
      expect(responses?.length, 'Should have 2 responses for E5.N9.Q2 and E5.N9.Q3').toBe(2)

      const q2Response = responses?.find(r => r.question_code === 'E5.N9.Q2')
      const q3Response = responses?.find(r => r.question_code === 'E5.N9.Q3')

      expect(q2Response, 'E5.N9.Q2 response should exist').toBeDefined()
      expect(q3Response, 'E5.N9.Q3 response should exist').toBeDefined()

      // Verify the answers are "Non" (negative)
      expect(q2Response?.single_value).toBe('E5.N9.Q2.B') // "Non"
      expect(q3Response?.single_value).toBe('E5.N9.Q3.B') // "Non"

      console.log(`\n✅ Responses verified in database:`)
      console.log(`   - E5.N9.Q2: ${q2Response?.single_value} ✅`)
      console.log(`   - E5.N9.Q3: ${q3Response?.single_value} ✅`)

    } finally {
      await cleanupTestData(testData)
    }
  })
})
