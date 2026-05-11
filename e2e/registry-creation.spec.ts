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

  let testUserId: string | null = null
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
  })

  test.beforeEach(async ({ page }) => {
    await authenticateUser(page, testUserEmail)
  })

  test('crée un registre depuis /registries/new et redirige vers le dashboard', async ({ page }) => {
    test.setTimeout(120_000)

    await page.goto('/registries/new', { waitUntil: 'domcontentloaded' })
    await expect(page.getByRole('heading', { name: /Créer un registre/i })).toBeVisible({ timeout: 30_000 })

    await page.getByPlaceholder('Ex : Acme').fill(registryName)

    await page.locator('form').getByRole('combobox').first().selectOption('entreprise')

    await page.locator('#mainIndustry').selectOption('tech_data')
    await expect(page.locator('#subCategory')).toBeVisible({ timeout: 10_000 })
    await page.locator('#subCategory').selectOption('saas')

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
  })
})
