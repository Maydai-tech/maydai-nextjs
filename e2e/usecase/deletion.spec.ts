import { test, expect } from '@playwright/test'
import { authenticateUser } from '@/e2e/auth-helper'
import { getAdminClient } from './_helpers/supabase-admin'
import { seedV2Usecase, cleanupTestData, type V2TestData } from './_helpers/v2-test-data'

test.describe.skip('Use case deletion (V2)', () => {
  const supabaseAdmin = getAdminClient()
  let testContext: V2TestData

  test.beforeAll(async () => {
    testContext = await seedV2Usecase(supabaseAdmin)
  })

  test.afterAll(async () => {
    if (testContext) {
      await cleanupTestData(supabaseAdmin, testContext)
    }
  })

  test('should delete a use case successfully', async ({ page }) => {
    const baseUrl = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000'
    const cleanBaseUrl = baseUrl.replace(/\/$/, '')

    await authenticateUser(page, testContext.email)

    // Navigation directe vers le dashboard
    await page.goto(`${cleanBaseUrl}/dashboard/${testContext.registryId}`)

    // Si on retombe sur /login, on force une deuxième fois (parfois nécessaire avec les proxies)
    if (page.url().includes('/login')) {
      await page.goto(`${cleanBaseUrl}/dashboard/${testContext.registryId}`)
    }

    // 5. On attend que l'interface soit prête
    await expect(page.getByText(/Chargement/i)).toBeHidden({ timeout: 25000 })

    // 6. Carte limitée au tableau de bord (hors toast de succès post-suppression)
    const dashboardUseCases = page.locator('#use-cases-section')
    const useCaseCard = dashboardUseCases.getByText(testContext.usecaseName).first()

    // Diagnostic de l'état de la page
    console.log('🔗 URL actuelle :', page.url())

    const content = await page.content()
    if (content.includes('Internal Server Error')) {
      console.error('❌ ERREUR 500 DÉTECTÉE')
      // On essaie de choper le message d'erreur de Next.js s'il est affiché
      const errorMessage = await page.locator('pre').textContent().catch(() => 'Pas de stacktrace visible')
      console.error('Détails :', errorMessage)
    }

    await expect(useCaseCard).toBeVisible({ timeout: 20000 })

    // 7. On trouve le bouton de menu (les 3 points ou l'icône de suppression)
    // qui est dans la même zone que le texte
    const container = dashboardUseCases.locator('.relative.group', {
      hasText: testContext.usecaseName,
    })

    await container.locator('button').first().click()
    await page.getByRole('button', { name: /Supprimer/i }).first().click()
    await page.getByRole('button', { name: /Supprimer définitivement/i }).click()

    // 8. Assertions finales
    await expect(page.locator('text=supprimé avec succès')).toBeVisible()
    await expect(useCaseCard).toBeHidden()
  })
})
