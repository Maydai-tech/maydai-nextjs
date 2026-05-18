import { test, expect } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import { authenticateUser } from './auth-helper'
import { cleanupTestData } from './_helpers/db-cleanup'
import { seedV2Usecase } from './_helpers/seed-usecase'
import { ChecklistArraySchema } from '@/lib/validations/usecases'

/**
 * Parcours court V3 : page d’évaluation sous `/usecases/[id]/evaluation?parcours=court`.
 * Une réponse `usecase_responses` minimale est insérée en setup : l’API `calculate-score`
 * exige au moins une entrée (réponses et/ou checklists) sans quoi elle répond 404.
 */

const TEST_PASSWORD = 'TestPassword123!'

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

test.describe('Questionnaire V3 — parcours court (scoring)', () => {
  const testUserEmail = `e2e-short-path-${Date.now()}@maydai-test.com`

  let testUserId: string | null = null
  let testCompanyId: string | null = null
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

    const { data: companyRow, error: companyError } = await admin
      .from('companies')
      .insert({ name: `E2E ShortPath ${Date.now()}` })
      .select('id')
      .single()

    if (companyError || !companyRow?.id) {
      throw new Error(`Failed to create test company: ${companyError?.message ?? 'no id'}`)
    }
    testCompanyId = companyRow.id
    const companyId = companyRow.id

    const { error: profileError } = await admin.from('profiles').insert({
      id: testUserId,
      first_name: 'E2E',
      last_name: 'ShortPath',
      company_name: `E2E ShortPath ${Date.now()}`,
      company_id: companyId,
      current_company_id: companyId,
      industry: 'tech_data',
      sub_category_id: 'saas',
    })
    if (profileError) {
      throw new Error(`profiles: ${profileError.message}`)
    }

    const usecaseId = await seedV2Usecase(admin, {
      companyId,
      pathMode: 'short',
      checklistGovEnterprise: [],
      checklistGovUsecase: [],
    })
    testUsecaseId = usecaseId

    const { error: ucError } = await admin.from('user_companies').insert({
      user_id: testUserId,
      company_id: companyId,
      role: 'owner',
    })
    if (ucError) {
      console.error('[questionnaire-short-path] user_companies insert failed:', ucError.message)
      throw new Error(`user_companies: ${ucError.message}`)
    }

    const { error: uuError } = await admin.from('user_usecases').insert({
      user_id: testUserId,
      usecase_id: testUsecaseId,
      role: 'owner',
    })
    if (uuError) {
      console.error('[questionnaire-short-path] user_usecases insert failed:', uuError.message)
      throw new Error(`user_usecases: ${uuError.message}`)
    }

    const { error: respError } = await admin.from('usecase_responses').insert({
      usecase_id: testUsecaseId,
      question_code: 'E4.N7.Q1',
      single_value: 'E4.N7.Q1.B',
      answered_by: testUserEmail,
      answered_at: new Date().toISOString(),
    })
    if (respError) {
      console.error('[questionnaire-short-path] usecase_responses insert failed:', respError.message)
      throw new Error(`usecase_responses: ${respError.message}`)
    }
  })

  test.beforeEach(async ({ page }) => {
    await authenticateUser(page, testUserEmail)
  })

  test('navigation évaluation + calculate-score persiste le parcours court', async ({ page }) => {
    expect(testUsecaseId).toBeTruthy()

    const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000'
    await page.goto(`${baseURL}/usecases/${testUsecaseId}/evaluation?parcours=court`, {
      waitUntil: 'domcontentloaded',
    })

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
      data: { path_mode: 'short' },
    })

    if (!scoreRes.ok()) {
      throw new Error(`calculate-score HTTP ${scoreRes.status()}: ${await scoreRes.text()}`)
    }

    const admin = getAdminClient()
    const { data: row, error: fetchError } = await admin
      .from('usecases')
      .select('path_mode, checklist_gov_enterprise, checklist_gov_usecase, short_path_completed_at')
      .eq('id', testUsecaseId!)
      .single()

    expect(fetchError).toBeNull()
    expect(row).toBeTruthy()

    expect(row!.path_mode).toBe('short')

    const enterpriseParsed = ChecklistArraySchema.safeParse(row!.checklist_gov_enterprise ?? [])
    const usecaseParsed = ChecklistArraySchema.safeParse(row!.checklist_gov_usecase ?? [])
    expect(enterpriseParsed.success).toBe(true)
    expect(usecaseParsed.success).toBe(true)
    expect(enterpriseParsed.data).toEqual([])
    expect(usecaseParsed.data).toEqual([])

    expect(row!.short_path_completed_at).toBeTruthy()
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
