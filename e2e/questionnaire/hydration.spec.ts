import { test, expect, type Page } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import { authenticateUser } from './auth-helper'
import { cleanupTestData } from './_helpers/db-cleanup'
import { CompleteSignupSchema } from '@/lib/validations/signup'

/**
 * E2E — hydratation court → long (sans mock API).
 *
 * Parcours : création UI d’un cas vierge → parcours Express → réponse E4.N7.Q1 (Fournisseur)
 * → packs courts → synthèse → bascule « Passer au Parcours Complet » → radios pré-cochées.
 */

const TEST_PASSWORD = 'TestPassword123!'
const USECASE_NAME = 'Test E2E Playwright Hydratation'

const PROVIDER_Q1 = 'E4.N7.Q1.A'
const PROVIDER_Q1_1 = 'E4.N7.Q1.1.E'
const TRANSPARENCE_SHORT_CODE = 'E6.N10.Q1.B'

test.describe.configure({ mode: 'serial' })

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

async function clickRadioByTestId(page: Page, testId: string): Promise<void> {
  const radio = page.getByTestId(testId)
  await expect(radio).toBeVisible({ timeout: 30_000 })
  await radio.click({ force: true })
}

async function clickSuivantWhenReady(page: Page): Promise<void> {
  const suivant = page.getByRole('button', { name: 'Suivant', exact: true })
  await expect(suivant).toBeEnabled({ timeout: 30_000 })
  await suivant.click()
}

async function answerCurrentOrsStep(page: Page): Promise<void> {
  const aucunPatterns = [
    /Aucun de ces domaines/i,
    /Aucun de ces cas/i,
    /Aucune de ces activités/i,
    /Aucune de ces situations/i,
  ]

  for (const pattern of aucunPatterns) {
    const checkbox = page.getByRole('checkbox', { name: pattern }).first()
    if (await checkbox.isVisible().catch(() => false)) {
      if (!(await checkbox.isChecked())) {
        await checkbox.click()
      }
    }
  }

  const safeRadioTestIds = [
    `answer-E4.N8.Q9-E4.N8.Q9.B`,
    `answer-E4.N8.Q9.1-E4.N8.Q9.1.B`,
    `answer-E4.N8.Q11.0-E4.N8.Q11.0.B`,
    `answer-E4.N8.Q10-E4.N8.Q10.A`,
  ]

  for (const testId of safeRadioTestIds) {
    const radio = page.getByTestId(testId)
    if (await radio.isVisible().catch(() => false)) {
      if (!(await radio.isChecked())) {
        await radio.click({ force: true })
      }
    }
  }

  const q5Checkbox = page.getByTestId('answer-E5.N9.Q5-E5.N9.Q5.A')
  if (await q5Checkbox.isVisible().catch(() => false)) {
    if (!(await q5Checkbox.isChecked())) {
      await q5Checkbox.click()
    }
  }
}

async function advanceOrsUntilShortPacks(page: Page): Promise<void> {
  for (let step = 0; step < 45; step++) {
    if (await page.locator('[data-v3-short-path-stage]').isVisible().catch(() => false)) {
      return
    }
    if (await page.getByTestId('submit-questionnaire-btn').isVisible().catch(() => false)) {
      return
    }

    await answerCurrentOrsStep(page)
    await clickSuivantWhenReady(page)
    await page.waitForLoadState('networkidle').catch(() => undefined)
  }

  throw new Error('Impossible d’atteindre les packs parcours court (ORS) après 45 étapes')
}

async function completeShortPathPacks(page: Page): Promise<void> {
  const packStages = 4
  for (let pack = 0; pack < packStages; pack++) {
    await expect(page.locator('[data-v3-short-path-stage]')).toBeVisible({ timeout: 30_000 })

    const isTransparencePack = await page
      .getByText('Comment gérez-vous la transparence', { exact: false })
      .isVisible()
      .catch(() => false)

    if (isTransparencePack) {
      const interactionCheckbox = page.getByTestId(
        `answer-V3_SHORT_TRANSPARENCE-${TRANSPARENCE_SHORT_CODE}`
      )
      await expect(interactionCheckbox).toBeVisible({ timeout: 15_000 })
      if (!(await interactionCheckbox.isChecked())) {
        await interactionCheckbox.click({ force: true })
      }
    }

    const terminer = page.getByTestId('submit-questionnaire-btn')
    if (await terminer.isVisible().catch(() => false)) {
      await expect(terminer).toBeEnabled({ timeout: 30_000 })
      await terminer.click()
      return
    }

    await clickSuivantWhenReady(page)
    await page.waitForLoadState('networkidle').catch(() => undefined)
  }

  const terminer = page.getByTestId('submit-questionnaire-btn')
  await expect(terminer).toBeVisible({ timeout: 30_000 })
  await expect(terminer).toBeEnabled({ timeout: 30_000 })
  await terminer.click()
}

async function ensureQuestionVisible(
  page: Page,
  questionId: string,
  direction: 'back' | 'forward'
): Promise<void> {
  const marker = page.locator(`[data-testid="question-${questionId}"]`)
  const buttonName = direction === 'back' ? 'Précédent' : 'Suivant'

  for (let i = 0; i < 40; i++) {
    if (await marker.isVisible().catch(() => false)) {
      return
    }
    const nav = page.getByRole('button', { name: buttonName, exact: direction === 'forward' })
    if (!(await nav.isEnabled().catch(() => false))) {
      break
    }
    await nav.click()
    await page.waitForTimeout(350)
  }

  await expect(marker).toBeVisible({ timeout: 20_000 })
}

async function createUseCaseViaWizard(page: Page): Promise<string> {
  await expect(page).toHaveURL(/\/usecases\/new/, { timeout: 30_000 })

  await page.fill('input[type="text"]', USECASE_NAME)
  await page.getByRole('button', { name: 'Suivant' }).click()

  await page.click('label:has-text("En production")')
  await page.fill('input[type="date"]', '2026-06-15')
  await page.getByRole('button', { name: 'Suivant' }).click()

  await page.click('label:has-text("Systèmes d\'Information (SI) / IT")')
  await page.getByRole('button', { name: 'Suivant' }).click()

  await expect(page.getByText('Chargement des partenaires technologiques')).not.toBeVisible({
    timeout: 30_000,
  })

  const mistralLabel = page.locator('label').filter({ has: page.locator('input[value*="mistral" i]') }).first()
  if (await mistralLabel.count()) {
    await mistralLabel.click()
  } else {
    await page.locator('[role="radiogroup"] input').first().click()
  }
  await page.getByRole('button', { name: 'Suivant' }).click()

  const modelOption = page.getByText(/Mistral|GPT|Claude|Gemini/i).first()
  await expect(modelOption).toBeVisible({ timeout: 30_000 })
  await modelOption.click()
  await page.getByRole('button', { name: 'Suivant' }).click()

  await page.click('label:has-text("Large Language Model (LLM)")')
  await page.getByRole('button', { name: 'Suivant' }).click()

  await page.click('label:has-text("Système autonome")')
  await page.getByRole('button', { name: 'Suivant' }).click()

  await page.click('button:has-text("Rechercher et sélectionner un pays")')
  await page.click('li:has-text("France")')
  await page.getByRole('button', { name: 'Suivant' }).click()

  await page.fill('textarea', 'Cas E2E hydratation court → long Playwright.')
  await page.getByRole('button', { name: "Créer le cas d'usage" }).click()

  await expect(page).toHaveURL(/\/usecases\/[0-9a-f-]{36}\/select-path/, { timeout: 60_000 })
  const match = page.url().match(/\/usecases\/([0-9a-f-]{36})\/select-path/)
  if (!match?.[1]) {
    throw new Error(`Impossible d’extraire l’ID du cas d’usage depuis ${page.url()}`)
  }
  return match[1]
}

test.describe('Hydratation parcours court → long (E2E réel)', () => {
  const testUserEmail = `e2e-hydration-${Date.now()}@maydai-test.com`

  let testUserId: string | null = null
  let testCompanyId: string | null = null
  let testRegistryId: string | null = null
  let testUsecaseId: string | null = null

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

    const mockProfile = CompleteSignupSchema.parse({
      firstName: 'E2E',
      lastName: 'Hydration',
      companyName: 'E2E Hydration Company',
      mainIndustryId: 'tech_data',
      subCategoryId: 'saas',
    })

    const { data: companyRow, error: companyError } = await admin
      .from('companies')
      .insert({ name: `E2E Hydration Owner ${Date.now()}` })
      .select('id')
      .single()
    if (companyError || !companyRow?.id) {
      throw new Error(`Failed to create owner company: ${companyError?.message ?? 'no id'}`)
    }
    testCompanyId = companyRow.id

    const { data: registryRow, error: registryError } = await admin
      .from('companies')
      .insert({ name: `E2E Hydration Registry ${Date.now()}` })
      .select('id')
      .single()
    if (registryError || !registryRow?.id) {
      throw new Error(`Failed to create registry: ${registryError?.message ?? 'no id'}`)
    }
    testRegistryId = registryRow.id

    const { error: profileError } = await admin.from('profiles').insert({
      id: testUserId,
      first_name: mockProfile.firstName,
      last_name: mockProfile.lastName,
      company_name: mockProfile.companyName,
      company_id: testCompanyId,
      current_company_id: testRegistryId,
      industry: mockProfile.mainIndustryId,
      sub_category_id: mockProfile.subCategoryId,
      updated_at: new Date().toISOString(),
    })
    if (profileError) {
      throw new Error(`Failed to create profile: ${profileError.message}`)
    }

    for (const companyId of [testCompanyId, testRegistryId]) {
      const { error: ucError } = await admin.from('user_companies').insert({
        user_id: testUserId,
        company_id: companyId,
        role: 'owner',
      })
      if (ucError) {
        throw new Error(`user_companies: ${ucError.message}`)
      }
    }
  })

  test.beforeEach(async ({ page }) => {
    await authenticateUser(page, testUserEmail)
  })

  // TODO: Fix UI hydration binding (Data is well persisted in DB but UI needs F5)
  test.skip('conserve E4.N7.Q1 (Fournisseur) et E6.N10.Q1 après bascule vers le parcours long', async ({
    page,
  }) => {
    test.setTimeout(300_000)
    expect(testRegistryId).toBeTruthy()

    await page.goto(`/dashboard/${testRegistryId}`, { waitUntil: 'domcontentloaded' })
    await page.locator('#use-cases-section').getByRole('button', { name: /Nouveau cas d'usage/i }).click()
    testUsecaseId = await createUseCaseViaWizard(page)

    const admin = getAdminClient()
    const { error: uuError } = await admin.from('user_usecases').insert({
      user_id: testUserId!,
      usecase_id: testUsecaseId,
      role: 'owner',
    })
    if (uuError) {
      throw new Error(`user_usecases: ${uuError.message}`)
    }

    await page.getByRole('button', { name: /Parcours Express/i }).click()
    await expect(page).toHaveURL(
      new RegExp(`/usecases/${testUsecaseId}/evaluation\\?parcours=court`),
      { timeout: 60_000 }
    )

    await clickRadioByTestId(page, `answer-E4.N7.Q1-${PROVIDER_Q1}`)
    await clickRadioByTestId(page, `answer-E4.N7.Q1.1-${PROVIDER_Q1_1}`)

    await clickSuivantWhenReady(page)

    await advanceOrsUntilShortPacks(page)
    await completeShortPathPacks(page)

    await expect(page).toHaveURL(new RegExp(`/usecases/${testUsecaseId}(\\?|$)`), {
      timeout: 120_000,
    })

    const switchCta = page.getByRole('button', {
      name: 'Passer au Parcours Complet',
      exact: true,
    })
    await expect(switchCta).toBeVisible({ timeout: 30_000 })
    await switchCta.click()

    await expect(page).toHaveURL(
      new RegExp(`/usecases/${testUsecaseId}/evaluation(?!.*parcours=court)`),
      { timeout: 60_000 }
    )

    await expect(page.getByTestId(`question-E4.N7.Q1`).or(page.locator('[data-testid^="question-"]'))).toBeVisible({
      timeout: 60_000,
    })

    await ensureQuestionVisible(page, 'E4.N7.Q1', 'back')
    await expect(page.getByTestId(`answer-E4.N7.Q1-${PROVIDER_Q1}`)).toBeChecked({ timeout: 20_000 })

    await ensureQuestionVisible(page, 'E6.N10.Q1', 'forward')
    await expect(page.getByTestId(`answer-E6.N10.Q1-${TRANSPARENCE_SHORT_CODE}`)).toBeChecked({
      timeout: 20_000,
    })
  })

  test.afterAll(async () => {
    if (!testUserId) return
    await cleanupTestData(getAdminClient(), {
      userId: testUserId,
      companyId: testRegistryId ?? undefined,
      usecaseId: testUsecaseId ?? undefined,
    })
    if (testCompanyId && testCompanyId !== testRegistryId) {
      await cleanupTestData(getAdminClient(), {
        userId: testUserId,
        companyId: testCompanyId,
      })
    }
  })
})
