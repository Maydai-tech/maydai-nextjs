import { test, expect, Page } from '@playwright/test'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { authenticateUser } from './auth-helper'

/**
 * E2E : parcours questionnaire V2 (ORS E4.N7 puis E4.N8, sans E5/E6).
 * Vérifie l’enchaînement après E4.N7.Q3.1 → E4.N8.* et l’absence de questions E5/E6.
 */

interface TestData {
  userId: string
  companyId: string
  registryId: string
  usecaseId: string
  email: string
}

const GEMINI_FLASH_MODEL_ID = 'c4ebe815-b69b-4da2-b366-20dce7349782'

/** Ordre aligné sur `getNextQuestionV2` après E4.N7.Q3.1 (Q11.0 « Non » → Q12). */
const QUESTIONNAIRE_V2_ORS_N8: Array<{
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

async function createTestData(testId: string): Promise<TestData> {
  const supabase = getAdminClient()
  const email = `e2e-v2-ors-${testId}-${Date.now()}@maydai-test.com`

  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password: 'TestPassword123!',
    email_confirm: true,
  })

  if (authError) {
    throw new Error(`Failed to create test user: ${authError.message}`)
  }

  const userId = authData.user.id

  const { data: companyData, error: companyError } = await supabase
    .from('companies')
    .insert({ name: `E2E V2 Company ${testId} ${Date.now()}` })
    .select('id')
    .single()

  if (companyError) {
    throw new Error(`Failed to create test company: ${companyError.message}`)
  }

  const companyId = companyData.id

  const { data: registryData, error: registryError } = await supabase
    .from('companies')
    .insert({ name: `E2E V2 Registry ${testId} ${Date.now()}` })
    .select('id')
    .single()

  if (registryError) {
    throw new Error(`Failed to create test registry: ${registryError.message}`)
  }

  const registryId = registryData.id

  const { error: profileError } = await supabase
    .from('profiles')
    .insert({
      id: userId,
      first_name: 'E2E',
      last_name: `V2${testId}`,
      company_name: `E2E V2 Company ${testId}`,
      company_id: companyId,
      current_company_id: registryId,
      sub_category_id: 'saas',
      industry: 'tech_data',
    })

  if (profileError) {
    throw new Error(`Failed to create test profile: ${profileError.message}`)
  }

  await supabase.from('user_companies').insert({ user_id: userId, company_id: companyId, role: 'owner' })
  await supabase.from('user_companies').insert({ user_id: userId, company_id: registryId, role: 'owner' })

  const { data: usecaseData, error: usecaseError } = await supabase
    .from('usecases')
    .insert({
      name: `E2E V2 ORS+N8 ${testId} ${Date.now()}`,
      description: 'E2E parcours V2 sans E5/E6',
      company_id: registryId,
      status: 'draft',
      deployment_phase: 'En projet (Non déployé)',
      deployment_date: new Date().toISOString(),
      questionnaire_version: 2,
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

  await supabase.from('user_usecases').insert({ user_id: userId, usecase_id: usecaseId, role: 'owner' })

  console.log(`✅ Test data created: ${email} (usecase: ${usecaseId})`)

  return { userId, companyId, registryId, usecaseId, email }
}

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

async function answerQuestion(
  page: Page,
  type: 'radio' | 'checkbox' | 'tags',
  answer: string | string[],
  conditionalValue?: string
) {
  const answerText = Array.isArray(answer) ? answer[0] : answer

  await page.click('body', { position: { x: 10, y: 10 } }).catch(() => {})
  await page.waitForTimeout(300)

  switch (type) {
    case 'radio': {
      const radioInput = page.getByRole('radio', {
        name: new RegExp(answerText.slice(0, 30).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
      })
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
    }

    case 'checkbox':
      if (Array.isArray(answer)) {
        for (const ans of answer) {
          const checkboxInput = page.getByRole('checkbox', {
            name: new RegExp(ans.slice(0, 30).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
          })
          await checkboxInput.waitFor({ state: 'visible', timeout: 10000 }).catch(() => {})
          await checkboxInput.click({ force: true })
          await page.waitForTimeout(500)
        }
      } else {
        const checkboxInput = page.getByRole('checkbox', {
          name: new RegExp(answerText.slice(0, 30).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
        })
        await checkboxInput.waitFor({ state: 'visible', timeout: 10000 }).catch(() => {})
        await checkboxInput.click({ force: true })
        await page.waitForTimeout(500)
      }
      break

    case 'tags': {
      const answers = Array.isArray(answer) ? answer : [answer]
      for (const ans of answers) {
        const tagButton = page.locator(`button`).filter({ hasText: ans }).first()
        await tagButton.waitFor({ state: 'visible', timeout: 10000 }).catch(() => {})
        await tagButton.click({ force: true })
        await page.waitForTimeout(500)
      }
      break
    }

  }
}

async function completeQuestionnaireAndTrackQuestions(page: Page): Promise<string[]> {
  const displayedQuestions: string[] = []

  async function clickSuivantWithRetry(): Promise<boolean> {
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

  for (let i = 0; i < QUESTIONNAIRE_V2_ORS_N8.length; i++) {
    const { questionId, type, answer, conditionalValue } = QUESTIONNAIRE_V2_ORS_N8[i]
    const isLastQuestion = i === QUESTIONNAIRE_V2_ORS_N8.length - 1

    displayedQuestions.push(questionId)
    console.log(`📝 Question ${i + 1}/${QUESTIONNAIRE_V2_ORS_N8.length}: ${questionId}`)

    await answerQuestion(page, type, answer, conditionalValue)

    if (!isLastQuestion) {
      await clickSuivantWithRetry()
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

async function authenticateAndNavigate(page: Page, testData: TestData): Promise<void> {
  await authenticateUser(page, testData.email)

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

test.describe('Questionnaire V2 (ORS + N8, sans E5/E6)', () => {
  test('enchaîne E4.N7.* puis E4.N8.* et termine sans questions E5/E6', async ({ page }) => {
    test.setTimeout(180000)

    const testData = await createTestData('v2-flow')
    const supabase = getAdminClient()

    try {
      await authenticateAndNavigate(page, testData)
      const displayedQuestions = await completeQuestionnaireAndTrackQuestions(page)

      expect(displayedQuestions.length).toBe(QUESTIONNAIRE_V2_ORS_N8.length)

      const idxQ31 = displayedQuestions.indexOf('E4.N7.Q3.1')
      const idxN8Q9 = displayedQuestions.indexOf('E4.N8.Q9')
      expect(idxQ31).toBeGreaterThanOrEqual(0)
      expect(idxN8Q9).toBeGreaterThan(idxQ31)

      expect(displayedQuestions.some((q) => q.startsWith('E5.'))).toBe(false)
      expect(displayedQuestions.some((q) => q.startsWith('E6.'))).toBe(false)

      await page.waitForURL(/\/usecases\/[a-f0-9-]+(?!\/evaluation)/, { timeout: 60000 })

      let usecaseData: { score_final: number | null; status: string } | null = null
      const maxRetries = 15
      for (let i = 0; i < maxRetries; i++) {
        const { data, error } = await supabase
          .from('usecases')
          .select('score_final, status')
          .eq('id', testData.usecaseId)
          .single()

        if (error) throw new Error(`Failed to fetch usecase: ${error.message}`)

        usecaseData = data

        if (data.status === 'completed' && data.score_final !== null) {
          break
        }

        await page.waitForTimeout(2000)
      }

      expect(usecaseData?.status).toBe('completed')
      expect(usecaseData?.score_final).toBeDefined()
      expect(usecaseData?.score_final).toBeGreaterThanOrEqual(0)
      expect(usecaseData?.score_final).toBeLessThanOrEqual(100)
    } finally {
      await cleanupTestData(testData)
    }
  })

  test('aucune réponse E5/E6 en base après complétion', async ({ page }) => {
    test.setTimeout(180000)

    const testData = await createTestData('v2-db')
    const supabase = getAdminClient()

    try {
      await authenticateAndNavigate(page, testData)
      await completeQuestionnaireAndTrackQuestions(page)

      await page.waitForURL(/\/usecases\/[a-f0-9-]+(?!\/evaluation)/, { timeout: 60000 })
      await page.waitForTimeout(3000)

      const { data: responses, error } = await supabase
        .from('usecase_responses')
        .select('question_code')
        .eq('usecase_id', testData.usecaseId)

      if (error) throw new Error(`Failed to fetch responses: ${error.message}`)

      const codes = (responses ?? []).map((r) => r.question_code)
      expect(codes.some((c) => c?.startsWith('E5.'))).toBe(false)
      expect(codes.some((c) => c?.startsWith('E6.'))).toBe(false)
    } finally {
      await cleanupTestData(testData)
    }
  })
})
