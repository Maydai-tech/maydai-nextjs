import { test, expect, type Page } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import { authenticateUser } from './auth-helper'
import { cleanupTestData } from './_helpers/db-cleanup'
import { seedV2Usecase } from './_helpers/seed-usecase'

/**
 * UI — élimination AI Act (parcours V3, bloc ORS).
 * Graphe V3 : E4.N7.Q1 → Q1.1 → Q3 → Q3.1 → Q2.1 → Q2 (Annexe III) → …
 * Chaque scénario utilise un cas d’usage dédié pour isoler l’état en base.
 * Scénarios 1–3 : élimination stricte (score 0 + badge). Scénario 4 : Annexe III Q2.A = haut risque / malus, pas d’élimination.
 */

test.describe.configure({ mode: 'serial' })

const TEST_PASSWORD = 'TestPassword123!'

function getAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set for E2E tests')
  }
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

async function submitEliminationAndAssertReport(
  page: Page,
  baseURL: string,
  usecaseId: string,
  questionId: string,
  optionCode: string
) {
  await page.goto(`${baseURL}/usecases/${usecaseId}/evaluation`, {
    waitUntil: 'domcontentloaded',
  })

  const questionRoot = page.getByTestId(`question-${questionId}`)
  await expect(questionRoot).toBeVisible({ timeout: 30_000 })
  await questionRoot.scrollIntoViewIfNeeded()

  const eliminationAnswer = page.getByTestId(`answer-${questionId}-${optionCode}`)
  await expect(eliminationAnswer).toBeVisible()
  await eliminationAnswer.click({ force: true })

  const nextBtn = page.getByRole('button', { name: 'Suivant' })
  await expect(nextBtn).toBeEnabled()
  await nextBtn.click()

  await page.goto(`${baseURL}/usecases/${usecaseId}/rapport`, {
    waitUntil: 'domcontentloaded',
  })

  const scoreValue = page.getByTestId('final-score-value').first()
  await expect(scoreValue).toBeVisible({ timeout: 60_000 })
  await expect(scoreValue).toContainText('0')
  await expect(page.getByTestId('elimination-warning-badge').first()).toBeVisible()
}

/** Parcours identique à l’élimination, mais attend un score strictement positif (malus, pas score 0) et aucun badge d’élimination. */
async function submitHighRiskAndAssertReport(
  page: Page,
  baseURL: string,
  usecaseId: string,
  questionId: string,
  optionCode: string
) {
  await page.goto(`${baseURL}/usecases/${usecaseId}/evaluation`, {
    waitUntil: 'domcontentloaded',
  })

  const questionRoot = page.getByTestId(`question-${questionId}`)
  await expect(questionRoot).toBeVisible({ timeout: 30_000 })
  await questionRoot.scrollIntoViewIfNeeded()

  const highRiskAnswer = page.getByTestId(`answer-${questionId}-${optionCode}`)
  await expect(highRiskAnswer).toBeVisible()
  await highRiskAnswer.click({ force: true })

  const nextBtn = page.getByRole('button', { name: 'Suivant' })
  await expect(nextBtn).toBeEnabled()
  await nextBtn.click()

  await page.goto(`${baseURL}/usecases/${usecaseId}/rapport`, {
    waitUntil: 'domcontentloaded',
  })

  const scoreValue = page.getByTestId('final-score-value').first()
  await expect(scoreValue).toBeVisible({ timeout: 60_000 })

  const raw = (await scoreValue.textContent())?.trim() ?? ''
  const displayed = Number.parseInt(raw, 10)
  expect(Number.isNaN(displayed)).toBe(false)
  expect(displayed).toBeGreaterThan(0)

  await expect(page.getByTestId('elimination-warning-badge')).toHaveCount(0)
}

test.describe.skip('Élimination AI Act — interface V3 (ORS)', () => {
  const testUserEmail = `e2e-ui-elim-${Date.now()}@maydai-test.com`

  let testUserId: string | null = null
  let testCompanyId: string | null = null
  let usecaseIdQ3: string | null = null
  let usecaseIdQ21: string | null = null
  let usecaseIdQ31: string | null = null
  let usecaseIdQ2: string | null = null

  test.beforeAll(async () => {
    const admin = getAdminClient()

    const { data: authData, error: authError } = await admin.auth.admin.createUser({
      email: testUserEmail,
      password: TEST_PASSWORD,
      email_confirm: true,
    })
    if (authError || !authData.user) {
      throw new Error(`Failed to create test user: ${authError?.message ?? 'no user'}`)
    }
    testUserId = authData.user.id

    const { data: companyRow, error: companyError } = await admin
      .from('companies')
      .insert({ name: `E2E UiElim ${Date.now()}` })
      .select('id')
      .single()

    if (companyError || !companyRow?.id) {
      throw new Error(`Failed to create test company: ${companyError?.message ?? 'no id'}`)
    }
    const companyId = companyRow.id
    testCompanyId = companyId

    const { error: profileError } = await admin.from('profiles').insert({
      id: testUserId,
      first_name: 'E2E',
      last_name: 'UiElim',
      company_name: `E2E UiElim ${Date.now()}`,
      company_id: companyId,
      current_company_id: companyId,
      industry: 'tech_data',
      sub_category_id: 'saas',
    })
    if (profileError) {
      throw new Error(`profiles: ${profileError.message}`)
    }

    const { error: ucError } = await admin.from('user_companies').insert({
      user_id: testUserId,
      company_id: companyId,
      role: 'owner',
    })
    if (ucError) {
      throw new Error(`user_companies: ${ucError.message}`)
    }

    const answeredAt = new Date().toISOString()
    const mkUserUsecase = async (usecaseId: string) => {
      const { error } = await admin.from('user_usecases').insert({
        user_id: testUserId!,
        usecase_id: usecaseId,
        role: 'owner',
      })
      if (error) throw new Error(`user_usecases: ${error.message}`)
    }

    // Scénario 1 : première question ORS affichée = E4.N7.Q3 (après Q1.1 en V3).
    const idQ3 = await seedV2Usecase(admin, {
      companyId,
      pathMode: 'long',
      checklistGovEnterprise: [],
      checklistGovUsecase: [],
    })
    usecaseIdQ3 = idQ3
    await mkUserUsecase(idQ3)
    const { error: r1 } = await admin.from('usecase_responses').insert([
      {
        usecase_id: idQ3,
        question_code: 'E4.N7.Q1',
        single_value: 'E4.N7.Q1.A',
        answered_by: testUserEmail,
        answered_at: answeredAt,
      },
      {
        usecase_id: idQ3,
        question_code: 'E4.N7.Q1.1',
        single_value: 'E4.N7.Q1.1.A',
        answered_by: testUserEmail,
        answered_at: answeredAt,
      },
    ])
    if (r1) throw new Error(`usecase_responses (scénario Q3): ${r1.message}`)

    // Scénario 2 : Q2.1 atteinte après Q1, Q1.1, Q3 et Q3.1 sans élimination (réponses « Aucune »).
    const idQ21 = await seedV2Usecase(admin, {
      companyId,
      pathMode: 'long',
      checklistGovEnterprise: [],
      checklistGovUsecase: [],
    })
    usecaseIdQ21 = idQ21
    await mkUserUsecase(idQ21)
    const { error: r2 } = await admin.from('usecase_responses').insert([
      {
        usecase_id: idQ21,
        question_code: 'E4.N7.Q1',
        single_value: 'E4.N7.Q1.A',
        answered_by: testUserEmail,
        answered_at: answeredAt,
      },
      {
        usecase_id: idQ21,
        question_code: 'E4.N7.Q1.1',
        single_value: 'E4.N7.Q1.1.A',
        answered_by: testUserEmail,
        answered_at: answeredAt,
      },
      {
        usecase_id: idQ21,
        question_code: 'E4.N7.Q3',
        multiple_codes: ['E4.N7.Q3.E'],
        multiple_labels: ['E4.N7.Q3.E'],
        answered_by: testUserEmail,
        answered_at: answeredAt,
      },
      {
        usecase_id: idQ21,
        question_code: 'E4.N7.Q3.1',
        multiple_codes: ['E4.N7.Q3.1.E'],
        multiple_labels: ['E4.N7.Q3.1.E'],
        answered_by: testUserEmail,
        answered_at: answeredAt,
      },
    ])
    if (r2) throw new Error(`usecase_responses (scénario Q2.1): ${r2.message}`)

    // Scénario 3 : E4.N7.Q3.1 — Q3 répondu « Aucune », écran courant = Q3.1.
    const idQ31 = await seedV2Usecase(admin, {
      companyId,
      pathMode: 'long',
      checklistGovEnterprise: [],
      checklistGovUsecase: [],
    })
    usecaseIdQ31 = idQ31
    await mkUserUsecase(idQ31)
    const { error: r3 } = await admin.from('usecase_responses').insert([
      {
        usecase_id: idQ31,
        question_code: 'E4.N7.Q1',
        single_value: 'E4.N7.Q1.A',
        answered_by: testUserEmail,
        answered_at: answeredAt,
      },
      {
        usecase_id: idQ31,
        question_code: 'E4.N7.Q1.1',
        single_value: 'E4.N7.Q1.1.A',
        answered_by: testUserEmail,
        answered_at: answeredAt,
      },
      {
        usecase_id: idQ31,
        question_code: 'E4.N7.Q3',
        multiple_codes: ['E4.N7.Q3.E'],
        multiple_labels: ['E4.N7.Q3.E'],
        answered_by: testUserEmail,
        answered_at: answeredAt,
      },
    ])
    if (r3) throw new Error(`usecase_responses (scénario Q3.1): ${r3.message}`)

    // Scénario 4 : E4.N7.Q2 — après Q1, Q1.1, Q3, Q3.1 (safe) et Q2.1 (E = aucun cas prohibé), l’écran courant = Q2 (domaines Annexe III).
    const idQ2 = await seedV2Usecase(admin, {
      companyId,
      pathMode: 'long',
      checklistGovEnterprise: [],
      checklistGovUsecase: [],
    })
    usecaseIdQ2 = idQ2
    await mkUserUsecase(idQ2)
    const { error: r4 } = await admin.from('usecase_responses').insert([
      {
        usecase_id: idQ2,
        question_code: 'E4.N7.Q1',
        single_value: 'E4.N7.Q1.A',
        answered_by: testUserEmail,
        answered_at: answeredAt,
      },
      {
        usecase_id: idQ2,
        question_code: 'E4.N7.Q1.1',
        single_value: 'E4.N7.Q1.1.A',
        answered_by: testUserEmail,
        answered_at: answeredAt,
      },
      {
        usecase_id: idQ2,
        question_code: 'E4.N7.Q3',
        multiple_codes: ['E4.N7.Q3.E'],
        multiple_labels: ['E4.N7.Q3.E'],
        answered_by: testUserEmail,
        answered_at: answeredAt,
      },
      {
        usecase_id: idQ2,
        question_code: 'E4.N7.Q3.1',
        multiple_codes: ['E4.N7.Q3.1.E'],
        multiple_labels: ['E4.N7.Q3.1.E'],
        answered_by: testUserEmail,
        answered_at: answeredAt,
      },
      {
        usecase_id: idQ2,
        question_code: 'E4.N7.Q2.1',
        multiple_codes: ['E4.N7.Q2.1.E'],
        multiple_labels: ['E4.N7.Q2.1.E'],
        answered_by: testUserEmail,
        answered_at: answeredAt,
      },
    ])
    if (r4) throw new Error(`usecase_responses (scénario Q2): ${r4.message}`)
  })

  test.beforeEach(async ({ page }) => {
    await authenticateUser(page, testUserEmail)
  })

  test.afterAll(async () => {
    const admin = getAdminClient()
    for (const id of [usecaseIdQ3, usecaseIdQ21, usecaseIdQ31, usecaseIdQ2]) {
      if (id) {
        await cleanupTestData(admin, { usecaseId: id })
      }
    }
    if (testUserId && testCompanyId) {
      await cleanupTestData(admin, { userId: testUserId, companyId: testCompanyId })
    }
  })

  test('Scénario 1 — E4.N7.Q3.A (pratiques prohibées générales, identification biométrique) @UI @Scoring @Smoke', async ({
    page,
  }) => {
    expect(usecaseIdQ3).toBeTruthy()
    const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000'
    await submitEliminationAndAssertReport(page, baseURL, usecaseIdQ3!, 'E4.N7.Q3', 'E4.N7.Q3.A')
  })

  test('Scénario 2 — E4.N7.Q2.1.A (identification biométrique temps réel, Annexe III) @UI @Scoring @Smoke', async ({
    page,
  }) => {
    expect(usecaseIdQ21).toBeTruthy()
    const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000'
    await submitEliminationAndAssertReport(page, baseURL, usecaseIdQ21!, 'E4.N7.Q2.1', 'E4.N7.Q2.1.A')
  })

  test('Scénario 3 — E4.N7.Q3.1.A (situations prohibées, bloc Q3.1) @UI @Scoring @Smoke', async ({ page }) => {
    expect(usecaseIdQ31).toBeTruthy()
    const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000'
    await submitEliminationAndAssertReport(page, baseURL, usecaseIdQ31!, 'E4.N7.Q3.1', 'E4.N7.Q3.1.A')
  })

  test('Scénario 4 — E4.N7.Q2.A (domaines risqués / Annexe III, haut risque sans élimination) @UI @Scoring @Smoke', async ({
    page,
  }) => {
    expect(usecaseIdQ2).toBeTruthy()
    const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000'
    await submitHighRiskAndAssertReport(page, baseURL, usecaseIdQ2!, 'E4.N7.Q2', 'E4.N7.Q2.A')
  })
})
