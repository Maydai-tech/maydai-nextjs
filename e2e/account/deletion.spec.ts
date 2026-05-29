import { test, expect } from '@playwright/test'
import { authenticateUser } from '@/e2e/auth-helper'
import { getAdminClient } from './_helpers/supabase-admin'
import { seedV2Usecase, cleanupTestData, type V2TestData } from './_helpers/v2-test-data'

const baseUrl = (process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000').replace(/\/$/, '')

test.describe('Account deletion (Settings › Zone de danger)', () => {
  const supabaseAdmin = getAdminClient()
  let ctx: V2TestData
  // Dossiers / fichiers Storage créés manuellement par un test (nettoyage best-effort)
  let extraDossierIds: string[] = []
  let extraStoragePaths: string[] = []

  // Un utilisateur seedé frais par test : le happy path détruit le compte,
  // donc chaque test doit partir d'un état propre.
  test.beforeEach(async () => {
    ctx = await seedV2Usecase(supabaseAdmin, `account-del-${Date.now()}`)
    extraDossierIds = []
    extraStoragePaths = []
  })

  // cleanupTestData est idempotent (try/catch) : sans danger même si le test
  // a déjà supprimé le compte via l'UI.
  test.afterEach(async () => {
    try {
      if (extraStoragePaths.length > 0) {
        await supabaseAdmin.storage.from('dossiers').remove(extraStoragePaths)
      }
      for (const id of extraDossierIds) {
        await supabaseAdmin.from('dossier_documents').delete().eq('dossier_id', id)
        await supabaseAdmin.from('dossiers').delete().eq('id', id)
      }
    } catch {
      // best-effort : les lignes/fichiers ont pu être supprimés par le test
    }
    if (ctx) {
      await cleanupTestData(supabaseAdmin, ctx)
    }
  })

  async function openSettingsAndDeleteModal(page: import('@playwright/test').Page) {
    await authenticateUser(page, ctx.email)
    await page.goto(`${baseUrl}/settings`)

    // Gérer une éventuelle redirection auth transitoire
    if (page.url().includes('/login')) {
      await page.goto(`${baseUrl}/settings`)
    }

    await expect(page.getByText(/Chargement/i)).toBeHidden({ timeout: 25000 })

    // Ouvre la modale depuis la carte "Zone de danger"
    await page.getByRole('button', { name: /Supprimer mon compte/i }).click()
    await expect(page.getByRole('heading', { name: /Supprimer mon compte/i })).toBeVisible()
  }

  test('ne supprime rien si l\'utilisateur annule (garde-fou)', async ({ page }) => {
    await openSettingsAndDeleteModal(page)

    // La confirmation listant les entreprises possédées doit apparaître
    await expect(page.getByText(/E2E Delete/i).first()).toBeVisible({ timeout: 15000 })

    // Bouton de confirmation désactivé tant que "SUPPRIMER" n'est pas saisi
    const confirmBtn = page.getByRole('button', { name: /Supprimer définitivement/i })
    await expect(confirmBtn).toBeDisabled()

    // Annulation → modale fermée
    await page.getByRole('button', { name: /^Annuler$/i }).click()
    await expect(page.getByRole('heading', { name: /Supprimer mon compte/i })).toBeHidden()

    // Le compte existe toujours en base
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('id', ctx.userId)
      .maybeSingle()
    expect(profile?.id).toBe(ctx.userId)
  })

  test('supprime le compte et toutes les données associées', async ({ page }) => {
    await openSettingsAndDeleteModal(page)

    // Attendre le chargement de l'aperçu (entreprises possédées)
    await expect(page.getByText(/E2E Delete/i).first()).toBeVisible({ timeout: 15000 })

    // Saisir le mot de confirmation puis confirmer
    await page.getByPlaceholder('SUPPRIMER').fill('SUPPRIMER')
    const confirmBtn = page.getByRole('button', { name: /Supprimer définitivement/i })
    await expect(confirmBtn).toBeEnabled()
    await confirmBtn.click()

    // Après suppression, l'utilisateur est déconnecté : on quitte /settings vers
    // une page publique. Le signOut() déclenche la redirection de la page protégée
    // vers /login (qui gagne la course contre le router.push('/') de la modale) —
    // les deux destinations sont acceptables ; la preuve d'effacement = les vérifs DB.
    await page.waitForURL(
      (url) => {
        const pathname = new URL(url.toString()).pathname
        return pathname === '/' || pathname.startsWith('/login')
      },
      { timeout: 20000 }
    )

    // Vérifications base de données (client service-role)
    const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(ctx.userId)
    expect(authUser?.user ?? null).toBeNull()

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('id', ctx.userId)
      .maybeSingle()
    expect(profile).toBeNull()

    const { data: usecases } = await supabaseAdmin
      .from('usecases')
      .select('id')
      .in('company_id', [ctx.companyId, ctx.registryId])
    expect(usecases ?? []).toHaveLength(0)

    const { data: memberships } = await supabaseAdmin
      .from('user_companies')
      .select('user_id')
      .eq('user_id', ctx.userId)
    expect(memberships ?? []).toHaveLength(0)

    // companies possédées supprimées
    const { data: companies } = await supabaseAdmin
      .from('companies')
      .select('id')
      .in('id', [ctx.companyId, ctx.registryId])
    expect(companies ?? []).toHaveLength(0)
  })

  test('supprime aussi les fichiers Storage des dossiers', async ({ page }) => {
    const bucket = supabaseAdmin.storage.from('dossiers')

    // 1. Uploader un VRAI fichier dans le bucket (même schéma de chemin que la route d'upload)
    const filename = `e2e-${Date.now()}.txt`
    const storagePath = `${ctx.registryId}/${ctx.usecaseId}/registry_proof/${filename}`
    const { error: uploadError } = await bucket.upload(
      storagePath,
      Buffer.from('contenu e2e à effacer lors de la suppression du compte'),
      { contentType: 'text/plain', upsert: true }
    )
    expect(uploadError).toBeNull()
    extraStoragePaths.push(storagePath)

    const fileUrl = bucket.getPublicUrl(storagePath).data.publicUrl

    // dossier lié à la company possédée + son usecase
    const { data: dossier, error: dossierError } = await supabaseAdmin
      .from('dossiers')
      .insert({ usecase_id: ctx.usecaseId, company_id: ctx.registryId })
      .select('id')
      .single()
    expect(dossierError).toBeNull()
    extraDossierIds.push(dossier!.id)

    const { error: docError } = await supabaseAdmin.from('dossier_documents').insert({
      dossier_id: dossier!.id,
      doc_type: 'registry_proof',
      file_url: fileUrl,
      status: 'complete',
      updated_by: ctx.userId,
    })
    expect(docError).toBeNull()

    // Sanity : le fichier existe bien avant la suppression
    const before = await bucket.download(storagePath)
    expect(before.data).not.toBeNull()

    // 2. Supprimer le compte via l'UI
    await openSettingsAndDeleteModal(page)
    await expect(page.getByText(/E2E Delete/i).first()).toBeVisible({ timeout: 15000 })
    await page.getByPlaceholder('SUPPRIMER').fill('SUPPRIMER')
    const confirmBtn = page.getByRole('button', { name: /Supprimer définitivement/i })
    await expect(confirmBtn).toBeEnabled()
    await confirmBtn.click()
    await page.waitForURL(
      (url) => {
        const pathname = new URL(url.toString()).pathname
        return pathname === '/' || pathname.startsWith('/login')
      },
      { timeout: 20000 }
    )

    // 3. Le fichier Storage a bien été supprimé
    const after = await bucket.download(storagePath)
    expect(after.data).toBeNull()
    expect(after.error).not.toBeNull()

    // ... et la ligne dossier_documents aussi
    const { data: docsLeft } = await supabaseAdmin
      .from('dossier_documents')
      .select('id')
      .eq('dossier_id', dossier!.id)
    expect(docsLeft ?? []).toHaveLength(0)
  })
})
