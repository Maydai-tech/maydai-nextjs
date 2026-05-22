import { test, expect } from '@playwright/test'
import type { SupabaseClient } from '@supabase/supabase-js'
import { authenticateUser } from './auth-helper'
import { getAdminClient } from './_helpers/supabase-admin'
import { cleanupTestData } from './_helpers/db-cleanup'
import { seedV2Usecase } from './_helpers/seed-usecase'
/**
 * E2E — ID 8.2 — **[TODO] - Instructions Système** (Notion)
 *
 * todo-list → dossier textarea → POST sans gain de score.
 *
 * **Comportement du Score (Mise à jour produit) :**
 * - La question catalogue `E5.N9.Q3` est désormais correctement mappée à `todo_action: "system_prompt"`.
 * - À la sauvegarde, l'API renvoie bien un objet `scoreChange`.
 * - Cependant, comme aucun malus `E5.N9.Q3.A` n'est seedé dans ce test, `pointsGained` est de 0 et les scores en base restent inchangés.
 *
 * Prérequis (.env.local) :
 *   - NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
 *   - App sur http://localhost:3000
 *
 * Lancer :
 *   npx playwright test e2e/todo-system-prompt.spec.ts
 *   npx playwright test e2e/todo-system-prompt.spec.ts -g "@SystemPrompt"
 */
const TEST_PASSWORD = 'TestPassword123!'
/** Texte saisi dans le textarea — doit correspondre au payload POST. */
const MOCK_SYSTEM_INSTRUCTIONS =
  'Instructions système pour le test E2E de conformité AI Act.'
test.describe.configure({ mode: 'serial' })
test.describe('[TODO] - Instructions Système (ID 8.2)', () => {
  const testUserEmail = `e2e-system-prompt-${Date.now()}@maydai-test.com`
  const ownerCompanyName = `E2E System Prompt Owner ${Date.now()}`
  const companyName = `E2E System Prompt Company ${Date.now()}`
  const usecaseName = `E2E System Prompt Usecase ${Date.now()}`
  let testUserId: string | null = null
  let ownerCompanyId: string | null = null
  let companyId: string | null = null
  let testUsecaseId: string | null = null
  const initialScoreModel = 0
  let initialScoreBase = 80
  let initialScoreFinal =
    Math.round(((initialScoreBase + initialScoreModel * 2.5) / 150) * 100 * 100) / 100
  async function seedSystemPromptUsecase(supabase: SupabaseClient): Promise<string> {
    const usecaseId = await seedV2Usecase(supabase, {
      companyId: companyId!,
      pathMode: 'long',
      checklistGovEnterprise: [],
      checklistGovUsecase: [],
    })
    const { error: updateError } = await supabase
      .from('usecases')
      .update({
        name: usecaseName,
        description: 'E2E — cas terminé, action Instructions système (system_prompt).',
        ai_category: 'Large Language Model (LLM)',
        responsible_service: "Systèmes d'Information (SI) / IT",
        status: 'completed',
        path_mode: 'long',
        questionnaire_version: 3,
        score_base: initialScoreBase,
        score_model: initialScoreModel,
        score_final: initialScoreFinal,
        updated_by: testUserId,
      })
      .eq('id', usecaseId)
    if (updateError) {
      throw new Error(`Échec mise à jour usecase: ${updateError.message}`)
    }
    const { error: linkError } = await supabase.from('user_usecases').insert({
      user_id: testUserId!,
      usecase_id: usecaseId,
      role: 'owner',
    })
    if (linkError) {
      throw new Error(`Échec user_usecases: ${linkError.message}`)
    }
    // Réponse déjà « Oui » : évite un sync null→B qui recalculerait le score (pointsGained ≠ 0).
    const { error: responseSeedError } = await supabase.from('usecase_responses').upsert(
      {
        usecase_id: usecaseId,
        question_code: 'E5.N9.Q3',
        single_value: 'E5.N9.Q3.B',
        answered_by: testUserEmail,
        answered_at: new Date().toISOString(),
        multiple_codes: null,
        multiple_labels: null,
        conditional_main: null,
        conditional_keys: null,
        conditional_values: null,
      },
      { onConflict: 'usecase_id,question_code' }
    )
    if (responseSeedError) {
      throw new Error(`Échec seed E5.N9.Q3.B: ${responseSeedError.message}`)
    }
    return usecaseId
  }
  test.beforeAll(async () => {
    const supabase = getAdminClient()
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: testUserEmail,
      password: TEST_PASSWORD,
      email_confirm: true,
    })
    if (authError || !authData.user) {
      throw new Error(`Échec création utilisateur: ${authError?.message ?? 'no user'}`)
    }
    testUserId = authData.user.id
    const { data: ownerCompany, error: ownerError } = await supabase
      .from('companies')
      .insert({ name: ownerCompanyName, maydai_as_registry: false })
      .select('id')
      .single()
    if (ownerError || !ownerCompany?.id) {
      throw new Error(`Échec société propriétaire: ${ownerError?.message ?? 'no id'}`)
    }
    ownerCompanyId = ownerCompany.id
    const { data: testCompany, error: companyError } = await supabase
      .from('companies')
      .insert({
        name: companyName,
        maydai_as_registry: false,
        industry: 'tech_data',
        sub_category_id: 'saas',
      })
      .select('id')
      .single()
    if (companyError || !testCompany?.id) {
      throw new Error(`Échec création société: ${companyError?.message ?? 'no id'}`)
    }
    companyId = testCompany.id
    const { error: profileError } = await supabase.from('profiles').insert({
      id: testUserId,
      first_name: 'E2E',
      last_name: 'SystemPrompt',
      company_name: ownerCompanyName,
      company_id: ownerCompanyId,
      current_company_id: companyId,
      industry: 'tech_data',
      sub_category_id: 'saas',
    })
    if (profileError) {
      throw new Error(`Échec profil: ${profileError.message}`)
    }
    for (const cid of [ownerCompanyId, companyId]) {
      const { error: ucError } = await supabase.from('user_companies').insert({
        user_id: testUserId,
        company_id: cid,
        role: 'owner',
        added_by: testUserId,
      })
      if (ucError) {
        throw new Error(`Échec user_companies (${cid}): ${ucError.message}`)
      }
    }
    testUsecaseId = await seedSystemPromptUsecase(supabase)

    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: testUserEmail,
      password: TEST_PASSWORD,
    })
    if (signInError || !signInData.session?.access_token) {
      throw new Error(`Échec sign-in seed scores: ${signInError?.message ?? 'no session'}`)
    }
    const baseUrl = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000'
    const calcRes = await fetch(`${baseUrl}/api/usecases/${testUsecaseId}/calculate-score`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${signInData.session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ usecase_id: testUsecaseId }),
    })
    if (!calcRes.ok) {
      throw new Error(`Échec calculate-score seed: ${await calcRes.text()}`)
    }
    const { data: scoreRow, error: scoreRowError } = await supabase
      .from('usecases')
      .select('score_base, score_final')
      .eq('id', testUsecaseId)
      .single()
    if (scoreRowError || scoreRow?.score_base == null || scoreRow?.score_final == null) {
      throw new Error(`Échec lecture scores seed: ${scoreRowError?.message ?? 'missing scores'}`)
    }
    initialScoreBase = scoreRow.score_base
    initialScoreFinal = scoreRow.score_final
  })
  test.beforeEach(async ({ page }) => {
    await authenticateUser(page, testUserEmail)
  })
  test('[TODO] - Instructions Système — [UI] saisie textarea + piège score (scoreChange nul) @SystemPrompt @UI @Tier1', async ({
    page,
  }) => {
    test.setTimeout(120_000)
    const supabase = getAdminClient()
    expect(companyId).toBeTruthy()
    expect(testUsecaseId).toBeTruthy()
    const systemPromptSection = page.locator('#section-system_prompt')
    const expectedDossierUrl = new RegExp(
      `/dashboard/${companyId}/dossiers/${testUsecaseId}(\\?doc=system_prompt)?`
    )
    await test.step('Navigation todo-list', async () => {
      await page.goto(`/dashboard/${companyId}/todo-list`)
      await expect(page.getByRole('heading', { name: /Todo conformité/i })).toBeVisible()
      await expect(page.getByRole('heading', { name: usecaseName, level: 3 })).toBeVisible()
    })
    await test.step('Déplier les actions du cas d’usage', async () => {
      await page.getByRole('button', { name: /Actions à mener/i }).click()
    })
    await test.step('Déplier la TODO Instructions système', async () => {
      const systemPromptTodo = page.locator(`#todo-${testUsecaseId}-system_prompt`)
      await expect(systemPromptTodo.getByText(/Définir les instructions système/i)).toBeVisible()
      await systemPromptTodo
        .getByText(/Définir les instructions système/i)
        .first()
        .click()
    })
    await test.step('Ouvrir le dossier (Compléter le document)', async () => {
      const systemPromptTodo = page.locator(`#todo-${testUsecaseId}-system_prompt`)
      await systemPromptTodo.getByRole('button', { name: /Compléter le document/i }).click()
      await page.waitForURL(expectedDossierUrl, { timeout: 15_000 })
      expect(page.url()).toMatch(/[?&]doc=system_prompt/)
    })
    await test.step('Saisie du textarea Instructions système', async () => {
      await expect(systemPromptSection).toBeVisible({ timeout: 15_000 })
      const textarea = systemPromptSection
        .getByLabel(/Instructions système/i)
        .or(systemPromptSection.getByPlaceholder(/Collez ici l'intégralité/i))
      await textarea.fill(MOCK_SYSTEM_INSTRUCTIONS)
    })
    const saveResponsePromise = page.waitForResponse(
      (res) =>
        res.url().includes('/system_prompt') &&
        res.request().method() === 'POST' &&
        res.status() !== 0
    )
    await test.step('Enregistrer — interception POST', async () => {
      await systemPromptSection.getByRole('button', { name: /Enregistrer|Modifier/i }).click()
    })
    await test.step('Assertion réseau — payload + piège du score (scoreChange nul)', async () => {
      const saveResponse = await saveResponsePromise
      expect(saveResponse.ok(), await saveResponse.text()).toBe(true)
      const requestPayload = saveResponse.request().postDataJSON() as {
        formData?: { system_instructions?: string }
        status?: string
      } | null
      expect(requestPayload).toBeTruthy()
      expect(requestPayload!.formData?.system_instructions).toBe(MOCK_SYSTEM_INSTRUCTIONS)
      expect(requestPayload!.status).toBe('complete')
      const body = (await saveResponse.json()) as {
        ok?: boolean
        scoreChange?: { pointsGained?: number } | null
      }
      expect(body.ok).toBe(true)
      // Le produit a été mis à jour : system_prompt est désormais mappé à E5.N9.Q3.
      // Puisque nous n'avons pas seedé de malus initial, la récupération est de 0, mais l'objet scoreChange existe.
      expect(body.scoreChange).toBeDefined()
      expect(body.scoreChange?.pointsGained).toBe(0)
      const { data: afterRow, error: dbError } = await supabase
        .from('usecases')
        .select('score_base, score_final')
        .eq('id', testUsecaseId!)
        .single()
      expect(dbError).toBeNull()
      expect(afterRow!.score_base).toBe(initialScoreBase)
      expect(afterRow!.score_final).toBe(initialScoreFinal)
      const { data: dossierRow, error: dossierError } = await supabase
        .from('dossiers')
        .select('id')
        .eq('usecase_id', testUsecaseId!)
        .single()
      expect(dossierError).toBeNull()
      expect(dossierRow?.id).toBeTruthy()
      const { data: docRow, error: docError } = await supabase
        .from('dossier_documents')
        .select('form_data, status, doc_type')
        .eq('doc_type', 'system_prompt')
        .eq('dossier_id', dossierRow!.id)
        .maybeSingle()
      expect(docError).toBeNull()
      expect(docRow?.status).toBe('complete')
      const stored = docRow?.form_data as { system_instructions?: string } | null
      expect(stored?.system_instructions).toBe(MOCK_SYSTEM_INSTRUCTIONS)
    })
    await test.step('Assertion UI — section marquée Complété', async () => {
      await expect(systemPromptSection.getByText(/Complété/i).first()).toBeVisible({
        timeout: 15_000,
      })
    })
  })
  test.afterAll(async () => {
    if (!testUserId) return
    const supabase = getAdminClient()
    if (testUsecaseId) {
      await cleanupTestData(supabase, {
        userId: testUserId,
        companyId: companyId ?? undefined,
        usecaseId: testUsecaseId,
      })
    }
    if (ownerCompanyId && ownerCompanyId !== companyId) {
      await cleanupTestData(supabase, {
        companyId: ownerCompanyId,
      })
    }
  })
})
