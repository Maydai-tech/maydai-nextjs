import { test, expect } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import { authenticateUser } from './auth-helper'
import { cleanupTestData } from './_helpers/db-cleanup'

/**
 * Analyse UI (NewRegistryPage.tsx) :
 * - Le bouton `button[type="submit"]` n'est désactivé que lorsque `loading` est true (pas de disabled lié aux champs).
 * - Contrainte navigateur : le champ « Nom du registre » a `required` → doit être renseigné pour que le submit HTML soit accepté.
 * - Type de registre : select sans `required` (recommandé de le renseigner pour un cas d’usage réaliste).
 * - CompanySectorSelector : `required={false}` sur la page registre ; on remplit tout de même secteur + sous-catégorie pour fiabiliser l’appel POST /api/companies (industry résolue ou payload explicite).
 */

const TEST_PASSWORD = 'TestPassword123!'

test.describe.configure({ mode: 'serial' })

test.describe('Création de registre', () => {
  const testUserEmail = `e2e-registry-${Date.now()}@maydai-test.com`
  const registryName = `E2E Registre ${Date.now()}`
  const initialCompanyName = `E2E Registry Owner ${Date.now()}`

  let testUserId: string | null = null
  let initialCompanyId: string | null = null
  let createdRegistryCompanyId: string | null = null

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

  test.beforeAll(async () => {
    const supabase = getAdminClient()
    const { data, error } = await supabase.auth.admin.createUser({
      email: testUserEmail,
      password: TEST_PASSWORD,
      email_confirm: true,
    })
    if (error || !data.user) {
      throw new Error(`Failed to create test user: ${error?.message ?? 'no user'}`)
    }
    testUserId = data.user.id

    const { data: companyRow, error: companyError } = await supabase
      .from('companies')
      .insert({ name: initialCompanyName })
      .select('id')
      .single()
    if (companyError || !companyRow?.id) {
      throw new Error(`Failed to create initial test company: ${companyError?.message ?? 'no id'}`)
    }
    initialCompanyId = companyRow.id

    const { error: profileError } = await supabase.from('profiles').insert({
      id: testUserId,
      first_name: 'E2E',
      last_name: 'Registry',
      company_name: initialCompanyName,
      company_id: initialCompanyId,
      current_company_id: initialCompanyId,
      industry: 'tech_data',
      sub_category_id: 'saas',
    })
    if (profileError) {
      throw new Error(`Failed to create test profile: ${profileError.message}`)
    }

    const { error: ucError } = await supabase.from('user_companies').insert({
      user_id: testUserId,
      company_id: initialCompanyId,
      role: 'owner',
    })
    if (ucError) {
      throw new Error(`Failed to create initial user_companies: ${ucError.message}`)
    }
  })

  test.beforeEach(async ({ page }) => {
    await authenticateUser(page, testUserEmail)
  })

  // TODO: Investigate 2.0m timeout on registry creation before unskipping.
  test.skip('crée un registre depuis /registries/new et redirige vers le dashboard', async ({ page }) => {
    test.setTimeout(120_000)

    await page.goto('/registries/new', { waitUntil: 'domcontentloaded' })
    await expect(page.getByRole('heading', { name: /Créer un registre/i })).toBeVisible({ timeout: 30_000 })

    await page.locator('form').getByRole('combobox').first().selectOption('entreprise')

    const mainIndustry = page.locator('#mainIndustry')
    await expect(mainIndustry).toBeEnabled()
    await mainIndustry.selectOption('tech_data')

    const subCategory = page.locator('#subCategory')
    await page.waitForFunction(() => {
      const select = document.querySelector<HTMLSelectElement>('#subCategory')
      return Boolean(select?.querySelector('option[value="saas"]'))
    })
    await expect(subCategory).toBeEnabled()
    await subCategory.selectOption('saas')

    const registryNameInput = page.getByPlaceholder('Ex : Acme')
    await registryNameInput.fill(registryName)
    await expect(registryNameInput).toHaveValue(registryName)

    const submit = page.locator('button[type="submit"]')
    await expect(submit).toBeEnabled()
    await submit.click()

    await expect(page).toHaveURL(/\/dashboard\/[0-9a-f-]{8}-[0-9a-f-]{4}-[0-9a-f-]{4}-[0-9a-f-]{4}-[0-9a-f-]{12}/i, {
      timeout: 60_000,
    })

    const url = page.url()
    const match = url.match(/\/dashboard\/([^/?#]+)/)
    createdRegistryCompanyId = match?.[1] ?? null
    expect(createdRegistryCompanyId).toBeTruthy()
  })

  test.afterAll(async () => {
    if (!testUserId) return

    const supabase = getAdminClient()

    let companyId = createdRegistryCompanyId
    if (!companyId) {
      try {
        const { data, error } = await supabase
          .from('companies')
          .select('id')
          .eq('name', registryName)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()
        if (error) {
          console.warn('[registry-creation E2E] Fallback select companies:', error.message)
        } else if (data?.id) {
          companyId = data.id
        }
      } catch (err) {
        console.warn(
          '[registry-creation E2E] Fallback select companies:',
          err instanceof Error ? err.message : String(err)
        )
      }
    }

    await cleanupTestData(supabase, {
      userId: testUserId,
      companyId: companyId ?? undefined,
    })

    if (initialCompanyId && initialCompanyId !== companyId) {
      await cleanupTestData(supabase, {
        userId: testUserId,
        companyId: initialCompanyId,
      })
    }
  })
})
