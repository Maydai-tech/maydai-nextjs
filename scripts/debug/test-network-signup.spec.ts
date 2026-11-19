/**
 * QA — Preuve réseau GTM à l'inscription (temporisation 500 ms avant router.push).
 *
 * Prérequis (GTM OFF en `npm run dev` — le layout charge GTM uniquement en production) :
 *
 *   NODE_ENV=production NEXT_PUBLIC_VERCEL_ENV=production npm run build
 *   NODE_ENV=production NEXT_PUBLIC_VERCEL_ENV=production npm run start
 *
 * Dans un autre terminal (serveur déjà up → Playwright réutilise le port 3000) :
 *
 *   npx playwright test scripts/debug/test-network-signup.spec.ts --headed
 *
 * Garde-fou prod : E2E_PRODUCTION_SUPABASE_URL doit être défini dans .env.local
 * (voir e2e/_helpers/kill-switch-6-6.ts). Les mocks auth/API évitent les écritures Supabase.
 */

import { test, expect } from '@playwright/test'
import { assertE2eKillSwitchNotProductionSupabase } from '../../e2e/_helpers/kill-switch-6-6'
import { triggerDeferredGtmLoad } from '../../e2e/_helpers/tracking-instrumentation'

/** Requêtes GA4 / Google Ads déclenchées par GTM après push dataLayer. */
export const GOOGLE_TRACKING_REQUEST_PATTERN =
  /google-analytics\.com\/g\/collect|google\.com\/pagead\/conversion/i

const SIGNUP_TEST_EMAIL = `e2e-signup-network-${Date.now()}@maydai-test.com`
const MOCK_USER_ID = 'e2e-signup-network-user-id'
const MOCK_ACCESS_TOKEN = 'e2e-signup-network-access-token'

async function grantAnalyticsConsent(page: import('@playwright/test').Page): Promise<void> {
  await page.evaluate(() => {
    const w = window as Window & { gtag?: (...args: unknown[]) => void }
    if (typeof w.gtag === 'function') {
      w.gtag('consent', 'update', {
        ad_storage: 'granted',
        analytics_storage: 'granted',
        ad_user_data: 'granted',
        ad_personalization: 'granted',
      })
    }
  })
}

async function setupIsolatedSignupMocks(page: import('@playwright/test').Page): Promise<void> {
  await page.route('**/api/auth/check-email', async (route) => {
    if (route.request().method() !== 'POST') {
      await route.continue()
      return
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ exists: false }),
    })
  })

  await page.route('**/api/auth/complete-signup', async (route) => {
    if (route.request().method() !== 'POST') {
      await route.continue()
      return
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        profile: {
          id: MOCK_USER_ID,
          first_name: 'QA',
          last_name: 'Network',
          company_name: 'MaydAI QA Sandbox',
        },
      }),
    })
  })

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
        access_token: MOCK_ACCESS_TOKEN,
        token_type: 'bearer',
        expires_in: 3600,
        refresh_token: 'e2e-signup-network-refresh-token',
        user: {
          id: MOCK_USER_ID,
          aud: 'authenticated',
          role: 'authenticated',
          email: SIGNUP_TEST_EMAIL,
          email_confirmed_at: new Date().toISOString(),
          app_metadata: { provider: 'email', providers: ['email'] },
          user_metadata: {},
          created_at: new Date().toISOString(),
        },
      }),
    })
  })
}

async function fillSignupFormAndSubmitOtp(page: import('@playwright/test').Page): Promise<void> {
  await page.goto('/signup', { waitUntil: 'domcontentloaded' })

  const consentScriptCount = await page.locator('script#google-consent-mode').count()
  if (consentScriptCount === 0) {
    test.skip(
      true,
      'GTM inactif (script#google-consent-mode absent). Lancez le serveur production local — voir en-tête de scripts/debug/test-network-signup.spec.ts',
    )
  }

  await triggerDeferredGtmLoad(page)
  await grantAnalyticsConsent(page)

  await page.getByLabel(/^prénom$/i).fill('QA')
  await page.getByLabel(/^nom$/i).fill('Network')
  await page.getByLabel(/^email$/i).fill(SIGNUP_TEST_EMAIL)
  await page.getByRole('button', { name: /^suivant$/i }).click()

  await page.getByLabel(/^entreprise$/i).fill('MaydAI QA Sandbox')
  await page.locator('#mainIndustry').selectOption('tech_data')
  await page.locator('#subCategory').selectOption('saas')
  await page.locator('#acceptTerms').check()

  await page.getByRole('button', { name: /créer mon compte/i }).click()

  await expect(page.getByText(/code à 6 chiffres/i)).toBeVisible({ timeout: 30_000 })

  const otpInputs = page.locator(
    'input[inputmode="numeric"], input[type="text"][maxlength="1"]',
  )
  await expect(otpInputs.first()).toBeVisible({ timeout: 15_000 })

  for (let i = 0; i < 6; i += 1) {
    await otpInputs.nth(i).fill(String((i + 1) % 10))
  }
}

test.describe('Signup — requête réseau Google avant redirection', { tag: ['@tracking', '@gtm', '@debug'] }, () => {
  test.beforeAll(() => {
    assertE2eKillSwitchNotProductionSupabase()
  })

  test('intercepte au moins une requête Google (collect / conversion) avant /dashboard/registries', async ({
    page,
  }) => {
    test.setTimeout(120_000)

    let googleTrackingRequestCount = 0
    const interceptedUrls: string[] = []
    let googleHitBeforeNavigation = false

    page.on('request', (request) => {
      const url = request.url()
      if (!GOOGLE_TRACKING_REQUEST_PATTERN.test(url)) return

      googleTrackingRequestCount += 1
      interceptedUrls.push(url)

      if (!page.url().includes('/dashboard/registries')) {
        googleHitBeforeNavigation = true
      }
    })

    await setupIsolatedSignupMocks(page)

    const navigationPromise = page.waitForURL(/\/dashboard\/registries/, { timeout: 90_000 })

    await fillSignupFormAndSubmitOtp(page)
    await navigationPromise

    expect(page.url()).toMatch(/\/dashboard\/registries/)

    expect(
      googleTrackingRequestCount,
      `Aucune requête Google interceptée. URLs attendues : google-analytics.com/g/collect ou google.com/pagead/conversion. Vérifiez NEXT_PUBLIC_GTM_ID et le serveur production local.`,
    ).toBeGreaterThanOrEqual(1)

    expect(
      googleHitBeforeNavigation,
      'La requête Google doit être émise avant la navigation vers /dashboard/registries (temporisation 500 ms + flush GTM).',
    ).toBe(true)

    // eslint-disable-next-line no-console -- sortie QA locale explicite
    console.log('[QA signup network] Requêtes Google interceptées:', interceptedUrls)
  })
})
