import { test, expect } from '@playwright/test'
import { assertE2eKillSwitchNotProductionSupabase } from './_helpers/kill-switch-6-6'
import { getAdminClient } from './_helpers/supabase-admin'
import { authenticateUser } from './auth-helper'
import {
  assertEventBeforeSpaNavigation,
  assertOfficialGtmEnabledOnHome,
  GA_COLLECT_REQUEST_PATTERN,
  GTM_JS_REQUEST_PATTERN,
  installDataLayerTrace,
  triggerDeferredGtmLoad,
  waitForDataLayerEvent,
} from './_helpers/tracking-instrumentation'

const TEST_PASSWORD = 'TestPassword123!'
const LOGIN_TEST_EMAIL = `e2e-tracking-login-${Date.now()}@maydai-test.com`
const REGISTRY_TEST_EMAIL = `e2e-tracking-registry-${Date.now()}@maydai-test.com`
const MOCK_REGISTRY_ID = 'e2e-tracking-registry-id'

test.describe.configure({ mode: 'serial' })

test.describe('GTM tracking — Phases 1 & 2 (règle 6.6)', { tag: ['@tracking', '@gtm'] }, () => {
  test.beforeAll(() => {
    assertE2eKillSwitchNotProductionSupabase()
  })

  test.describe('Phase 1 — Injection GTM', () => {
    test('charge gtm.js et initialise window.dataLayer sur la page d’accueil', async ({ page }) => {
      test.setTimeout(60_000)

      const gtmRequest = page.waitForRequest(
        (request) => GTM_JS_REQUEST_PATTERN.test(request.url()),
        { timeout: 20_000 },
      )

      await page.goto('/', { waitUntil: 'domcontentloaded' })
      await assertOfficialGtmEnabledOnHome(page)

      await triggerDeferredGtmLoad(page)
      await gtmRequest

      const dataLayerState = await page.evaluate(() => ({
        defined: typeof window.dataLayer !== 'undefined',
        isArray: Array.isArray(window.dataLayer),
      }))

      expect(dataLayerState.defined).toBe(true)
      expect(dataLayerState.isArray).toBe(true)
    })
  })

  test.describe('Phase 2 — dataLayer avant redirection (règle 6.4)', () => {
    test.beforeAll(async () => {
      const admin = getAdminClient()
      const { error } = await admin.auth.admin.createUser({
        email: REGISTRY_TEST_EMAIL,
        password: TEST_PASSWORD,
        email_confirm: true,
      })
      if (error) {
        throw new Error(`Failed to seed registry E2E user: ${error.message}`)
      }
    })

    test('login : événement login dans dataLayer avant changement d’URL', async ({ page }) => {
      test.setTimeout(90_000)
      await installDataLayerTrace(page)

      const gaCollectOptional = page
        .waitForRequest((request) => GA_COLLECT_REQUEST_PATTERN.test(request.url()), {
          timeout: 20_000,
        })
        .catch(() => null)

      await page.route('**/auth/v1/otp**', async (route) => {
        if (route.request().method() === 'POST') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({}),
          })
          return
        }
        await route.continue()
      })

      await page.route('**/auth/v1/verify**', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            access_token: 'e2e-tracking-access-token',
            token_type: 'bearer',
            expires_in: 3600,
            refresh_token: 'e2e-tracking-refresh-token',
            user: {
              id: 'e2e-tracking-user-id',
              aud: 'authenticated',
              role: 'authenticated',
              email: LOGIN_TEST_EMAIL,
              email_confirmed_at: new Date().toISOString(),
              app_metadata: { provider: 'email', providers: ['email'] },
              user_metadata: {},
              created_at: new Date().toISOString(),
            },
          }),
        })
      })

      const urlBefore = '/login'
      await page.goto(urlBefore, { waitUntil: 'domcontentloaded' })

      await page.getByLabel(/^email$/i).fill(LOGIN_TEST_EMAIL)
      await page.getByRole('button', { name: /se connecter/i }).click()

      await expect(page.getByText(/code à 6 chiffres/i)).toBeVisible({
        timeout: 30_000,
      })

      const otpInputs = page.locator('input[inputmode="numeric"], input[type="text"][maxlength="1"]')
      await expect(otpInputs.first()).toBeVisible({ timeout: 15_000 })

      const navigationPromise = page.waitForURL(/\/dashboard\/registries/, { timeout: 45_000 })
      const loginEventPromise = waitForDataLayerEvent(page, 'login', 15_000)

      for (let i = 0; i < 6; i += 1) {
        await otpInputs.nth(i).fill(String((i + 1) % 10))
      }

      await loginEventPromise

      const urlAfterEvent = page.url()
      expect(urlAfterEvent).toContain('/login')

      await assertEventBeforeSpaNavigation(page, 'login')
      await navigationPromise

      expect(page.url()).toMatch(/\/dashboard\/registries/)
      await gaCollectOptional
    })

    test('création de registre : registry_creation dans dataLayer avant redirection dashboard', async ({
      page,
    }) => {
      test.setTimeout(90_000)
      await installDataLayerTrace(page)
      await authenticateUser(page, REGISTRY_TEST_EMAIL)

      await page.route('**/api/companies', async (route) => {
        if (route.request().method() !== 'POST') {
          await route.continue()
          return
        }

        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: MOCK_REGISTRY_ID,
            name: 'E2E Tracking Registry',
            role: 'owner',
          }),
        })
      })

      await page.goto('/registries/new', { waitUntil: 'domcontentloaded' })
      await expect(page.getByRole('heading', { name: /créer un registre/i })).toBeVisible({
        timeout: 30_000,
      })

      const urlBeforeSubmit = page.url()

      await page.locator('form').getByRole('combobox').first().selectOption('entreprise')
      await page.getByLabel(/nom du registre/i).fill(`E2E Tracking ${Date.now()}`)

      const registryEventPromise = waitForDataLayerEvent(page, 'registry_creation', 15_000)
      const navigationPromise = page.waitForURL(
        new RegExp(`/dashboard/${MOCK_REGISTRY_ID.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`),
        { timeout: 45_000 },
      )

      await page.locator('form').getByRole('button', { name: /créer le registre/i }).click()

      await registryEventPromise
      expect(page.url()).toBe(urlBeforeSubmit)

      await assertEventBeforeSpaNavigation(page, 'registry_creation')
      await navigationPromise
    })
  })
})
