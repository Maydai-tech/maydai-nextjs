import { test, expect } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import { authenticateUser } from './auth-helper'
import { cleanupTestData } from './_helpers/db-cleanup'
import { seedV2Usecase } from './_helpers/seed-usecase'

/**
 * Calcul score avec modèle COMPL-AI (Gemini) : appel POST calculate-score,
 * vérification des scores persistés (base + modèle + final).
 *
 * `seedV2Usecase` : setup « nouvelle archi » E2E (checklists JSONB, path long) ;
 * le barème API utilise un dénominateur 150 en parcours long (non court V3).
 */

const GEMINI_MODEL_ID = 'c4ebe815-b69b-4da2-b366-20dce7349782'

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

function getAuthStorageKey(): string {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const projectRef = new URL(supabaseUrl).hostname.split('.')[0]
  return `sb-${projectRef}-auth-token`
}

test.describe('Calcul de score avec modèle COMPL-AI', () => {
  const testUserEmail = `e2e-score-model-${Date.now()}@maydai-test.com`

  let testUserId: string | null = null
  let testCompanyId: string | null = null
  let testUsecaseId: string | null = null

  test.beforeAll(async () => {
    const supabaseAdmin = getAdminClient()

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: testUserEmail,
      password: 'TestPassword123!',
      email_confirm: true,
    })
    if (authError || !authData.user) {
      throw new Error(`Failed to create test user: ${authError?.message ?? 'no user'}`)
    }
    testUserId = authData.user.id

    const { data: companyRow, error: companyError } = await supabaseAdmin
      .from('companies')
      .insert({ name: `E2E ScoreModel ${Date.now()}` })
      .select('id')
      .single()

    if (companyError || !companyRow?.id) {
      throw new Error(`Failed to create test company: ${companyError?.message ?? 'no id'}`)
    }
    testCompanyId = companyRow.id
    const companyId = companyRow.id

    const { error: profileError } = await supabaseAdmin.from('profiles').insert({
      id: testUserId,
      first_name: 'E2E',
      last_name: 'ScoreModel',
      company_name: `E2E ScoreModel ${Date.now()}`,
      company_id: companyId,
      current_company_id: companyId,
      industry: 'tech_data',
      sub_category_id: 'saas',
    })
    if (profileError) {
      throw new Error(`profiles: ${profileError.message}`)
    }

    const usecaseId = await seedV2Usecase(supabaseAdmin, {
      companyId,
      pathMode: 'long',
      checklistGovEnterprise: [],
      checklistGovUsecase: [],
    })
    testUsecaseId = usecaseId

    const { error: linkModelError } = await supabaseAdmin
      .from('usecases')
      .update({ primary_model_id: GEMINI_MODEL_ID })
      .eq('id', usecaseId)
    if (linkModelError) {
      throw new Error(`primary_model_id update: ${linkModelError.message}`)
    }

    const { error: ucError } = await supabaseAdmin.from('user_companies').insert({
      user_id: testUserId,
      company_id: companyId,
      role: 'owner',
    })
    if (ucError) {
      throw new Error(`user_companies: ${ucError.message}`)
    }

    const { error: uuError } = await supabaseAdmin.from('user_usecases').insert({
      user_id: testUserId,
      usecase_id: testUsecaseId,
      role: 'owner',
    })
    if (uuError) {
      throw new Error(`user_usecases: ${uuError.message}`)
    }

    const { error: respError } = await supabaseAdmin.from('usecase_responses').insert({
      usecase_id: testUsecaseId,
      question_code: 'E4.N7.Q1',
      single_value: 'E4.N7.Q1.B',
      answered_by: testUserEmail,
      answered_at: new Date().toISOString(),
    })
    if (respError) {
      throw new Error(`usecase_responses: ${respError.message}`)
    }
  })

  test.beforeEach(async ({ page }) => {
    await authenticateUser(page, testUserEmail)
  })

  test('Calcule le score de base + la pondération du modèle', async ({ page }) => {
    expect(testUsecaseId).toBeTruthy()

    const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000'
    await page.goto(`${baseURL}/`, { waitUntil: 'domcontentloaded' })

    const storageKey = getAuthStorageKey()
    const accessToken = await page.evaluate((key: string) => {
      const raw = localStorage.getItem(key)
      if (!raw) return null
      try {
        const session = JSON.parse(raw) as { access_token?: string }
        return session.access_token ?? null
      } catch {
        return null
      }
    }, storageKey)

    expect(accessToken).toBeTruthy()

    const scoreRes = await page.request.post(`${baseURL}/api/usecases/${testUsecaseId}/calculate-score`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      data: { path_mode: 'long' },
    })

    if (!scoreRes.ok()) {
      throw new Error(`calculate-score HTTP ${scoreRes.status()}: ${await scoreRes.text()}`)
    }

    const supabaseAdmin = getAdminClient()
    const { data, error: fetchError } = await supabaseAdmin
      .from('usecases')
      .select('score_base, score_model, score_final')
      .eq('id', testUsecaseId!)
      .single()

    expect(fetchError).toBeNull()
    expect(data).toBeTruthy()

    expect(data!.score_base).toBe(90)
    expect(Number(data!.score_model)).toBeCloseTo(12.07, 1)
    expect(Number(data!.score_final)).toBe(80)
  })

  test.afterAll(async () => {
    if (!testUserId) return
    await cleanupTestData(getAdminClient(), {
      userId: testUserId,
      companyId: testCompanyId ?? undefined,
      usecaseId: testUsecaseId ?? undefined,
    })
  })
})
