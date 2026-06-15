/**
 * Seed manuel pour tester la suppression RGPD en cascade (storage cleanup).
 *
 * Crée, sur la base Supabase configurée dans .env.local :
 *   - un utilisateur auth (email e2e-*@maydai-test.com, mdp TestPassword123!)
 *   - une company + une "registry" company (préfixées E2E), liens owner
 *   - un profil
 *   - un use case draft rattaché à la registry company
 *   - un dossier + un dossier_document AVEC un vrai fichier dans le bucket `dossiers`
 *
 * But : pouvoir supprimer le use case (ou la company) depuis l'UI et vérifier
 * que le binaire disparaît bien du Storage (chemin imprimé en fin de script).
 *
 * Usage :
 *   node scripts/seed-manual-rgpd-test.js                       # crée le jeu de données (email e2e-*)
 *   node scripts/seed-manual-rgpd-test.js --email <addr>        # crée avec un email précis (ex. alias gmail)
 *   node scripts/seed-manual-rgpd-test.js --otp <addr>          # régénère un code de connexion email (OTP)
 *   node scripts/seed-manual-rgpd-test.js --cleanup <userId>    # supprime tout
 *
 * Convention E2E (cf. memory infra-topology) : entités namespacées + nettoyables.
 */

const path = require('path')
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env.local') })
const { createClient } = require('@supabase/supabase-js')

const PASSWORD = 'TestPassword123!'
const DOC_TYPE = 'technical_documentation'

function admin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY requis dans .env.local')
  }
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}

/**
 * Génère un code de connexion par email (OTP) sans envoyer de mail.
 * Le code renvoyé est celui qu'attend l'écran de connexion par email de l'app.
 */
async function generateEmailOtp(supabase, email) {
  const { data, error } = await supabase.auth.admin.generateLink({ type: 'magiclink', email })
  if (error) throw new Error(`generateLink: ${error.message}`)
  return {
    otp: data?.properties?.email_otp || null,
    actionLink: data?.properties?.action_link || null,
  }
}

async function cleanup(supabase, userId) {
  if (!userId) throw new Error('Usage: --cleanup <userId>')
  // Récupère les companies du user pour purge complète
  const { data: ucs } = await supabase.from('user_companies').select('company_id').eq('user_id', userId)
  const companyIds = (ucs || []).map((u) => u.company_id)
  const { data: usecases } = companyIds.length
    ? await supabase.from('usecases').select('id').in('company_id', companyIds)
    : { data: [] }
  const usecaseIds = (usecases || []).map((u) => u.id)

  if (usecaseIds.length) {
    const { data: doss } = await supabase.from('dossiers').select('id, company_id').in('usecase_id', usecaseIds)
    const dossierIds = (doss || []).map((d) => d.id)
    if (dossierIds.length) {
      const { data: docs } = await supabase.from('dossier_documents').select('file_url').in('dossier_id', dossierIds)
      const paths = (docs || [])
        .map((d) => {
          if (!d.file_url) return null
          const m = new URL(d.file_url).pathname.match(/\/storage\/v1\/object\/public\/dossiers\/(.+)/)
          return m && m[1] ? decodeURIComponent(m[1]) : null
        })
        .filter(Boolean)
      if (paths.length) await supabase.storage.from('dossiers').remove(paths)
      await supabase.from('dossier_documents').delete().in('dossier_id', dossierIds)
      await supabase.from('dossiers').delete().in('id', dossierIds)
    }
    await supabase.from('usecase_responses').delete().in('usecase_id', usecaseIds)
    await supabase.from('usecase_history').delete().in('usecase_id', usecaseIds)
    await supabase.from('usecase_nextsteps').delete().in('usecase_id', usecaseIds)
    await supabase.from('user_usecases').delete().in('usecase_id', usecaseIds)
    await supabase.from('contact_requests').delete().in('usecase_id', usecaseIds)
    await supabase.from('usecases').delete().in('id', usecaseIds)
  }
  await supabase.from('user_companies').delete().eq('user_id', userId)
  await supabase.from('profiles').delete().eq('id', userId)
  if (companyIds.length) await supabase.from('companies').delete().in('id', companyIds)
  await supabase.auth.admin.deleteUser(userId)
  console.log(`🧹 Cleanup terminé pour user ${userId}`)
}

async function seed(supabase, emailOverride) {
  const ts = Date.now()
  const email = emailOverride || `e2e-rgpd-manual-${ts}@maydai-test.com`

  // 1. Utilisateur auth
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
  })
  if (authError) throw new Error(`createUser: ${authError.message}`)
  const userId = authData.user.id

  // 2. Une seule company (company_id === current_company_id, comme un vrai compte)
  const { data: company, error: cErr } = await supabase
    .from('companies').insert({ name: `E2E RGPD Company ${ts}` }).select('id').single()
  if (cErr) throw new Error(`company: ${cErr.message}`)
  const companyId = company.id
  const registryId = companyId // les use cases vivent dans cette même company

  // 3. Profil
  const { error: pErr } = await supabase.from('profiles').insert({
    id: userId,
    first_name: 'E2E',
    last_name: 'RGPD',
    company_name: `E2E RGPD Company ${ts}`,
    company_id: companyId,
    current_company_id: companyId,
    sub_category_id: 'saas',
    industry: 'tech_data',
  })
  if (pErr) throw new Error(`profile: ${pErr.message}`)

  // 4. Lien owner
  {
    const { error } = await supabase.from('user_companies').insert({ user_id: userId, company_id: companyId, role: 'owner' })
    if (error) throw new Error(`user_companies: ${error.message}`)
  }

  // 5. Use case draft (rattaché à la company)
  const usecaseName = `E2E RGPD UseCase ${ts}`
  const { data: usecase, error: uErr } = await supabase
    .from('usecases')
    .insert({
      name: usecaseName,
      description: 'Use case de test — supprimer pour vérifier le cleanup Storage RGPD.',
      company_id: registryId,
      status: 'draft',
      deployment_date: new Date().toISOString(),
      questionnaire_version: 2,
      ai_category: 'Large Language Model (LLM)',
      responsible_service: "Systèmes d'Information (SI) / IT",
      deployment_phase: 'en_production',
      updated_by: userId,
    })
    .select('id').single()
  if (uErr) throw new Error(`usecase: ${uErr.message}`)
  const usecaseId = usecase.id

  const { error: uuErr } = await supabase.from('user_usecases')
    .insert({ user_id: userId, usecase_id: usecaseId, role: 'owner' })
  if (uuErr) throw new Error(`user_usecases: ${uuErr.message}`)

  // 6. Dossier + fichier réel dans le bucket `dossiers`
  const { data: dossier, error: dErr } = await supabase
    .from('dossiers').insert({ usecase_id: usecaseId, company_id: registryId }).select('id').single()
  if (dErr) throw new Error(`dossier: ${dErr.message}`)
  const dossierId = dossier.id

  const filename = `test-rgpd-${ts}.pdf`
  const storagePath = `${registryId}/${usecaseId}/${DOC_TYPE}/${filename}`
  const fileBytes = Buffer.from('%PDF-1.4\n% E2E RGPD manual test file\n', 'utf8')

  const { error: upErr } = await supabase.storage
    .from('dossiers').upload(storagePath, fileBytes, { upsert: true, contentType: 'application/pdf' })
  if (upErr) throw new Error(`storage upload: ${upErr.message}`)

  const { data: pub } = supabase.storage.from('dossiers').getPublicUrl(storagePath)
  const fileUrl = pub?.publicUrl || null

  const { data: doc, error: docErr } = await supabase.from('dossier_documents')
    .insert({ dossier_id: dossierId, doc_type: DOC_TYPE, file_url: fileUrl, status: 'complete', updated_by: userId })
    .select('id').single()
  if (docErr) throw new Error(`dossier_documents: ${docErr.message}`)

  return { email, userId, companyId, registryId, usecaseId, usecaseName, dossierId, docId: doc.id, storagePath, fileUrl }
}

async function main() {
  const supabase = admin()
  const args = process.argv.slice(2)

  if (args[0] === '--cleanup') {
    await cleanup(supabase, args[1])
    return
  }

  if (args[0] === '--otp') {
    const email = args[1]
    if (!email) throw new Error('Usage: --otp <email>')
    const { otp, actionLink } = await generateEmailOtp(supabase, email)
    console.log('\n── Code de connexion email ───────────────')
    console.log('  Email :', email)
    console.log('  Code  :', otp, '(valable ~1h, à saisir dans l\'écran de connexion par email)')
    console.log('  Lien  :', actionLink, '\n')
    return
  }

  const emailOverride = args[0] === '--email' ? args[1] : undefined
  if (args[0] === '--email' && !emailOverride) throw new Error('Usage: --email <addr>')

  const r = await seed(supabase, emailOverride)
  const { otp, actionLink } = await generateEmailOtp(supabase, r.email)
  console.log('\n✅ Jeu de données créé sur', process.env.NEXT_PUBLIC_SUPABASE_URL, '\n')
  console.log('── Connexion par email (OTP) ─────────────')
  console.log('  Email :', r.email)
  console.log('  Code  :', otp, '(valable ~1h)')
  console.log('  Lien  :', actionLink)
  console.log('  (mot de passe de secours :', PASSWORD + ')')
  console.log('\n── Entités ───────────────────────────────')
  console.log('  user_id      :', r.userId)
  console.log('  company_id   :', r.companyId, '(registre unique)')
  console.log('  usecase_id   :', r.usecaseId)
  console.log('  usecase name :', r.usecaseName)
  console.log('  dossier_id   :', r.dossierId)
  console.log('  document_id  :', r.docId)
  console.log('\n── Fichier Storage (à surveiller) ────────')
  console.log('  bucket  : dossiers')
  console.log('  path    :', r.storagePath)
  console.log('  url     :', r.fileUrl)
  console.log('\n── Test manuel ───────────────────────────')
  console.log('  0. Régénérer un code si expiré : node scripts/seed-manual-rgpd-test.js --otp', r.email)
  console.log('  1. Connecte-toi avec le code email ci-dessus.')
  console.log('  2. Supprime le use case (ou la company depuis les paramètres RGPD).')
  console.log('  3. Vérifie que le fichier ci-dessus a disparu du bucket `dossiers`.')
  console.log('\n  Nettoyage complet si besoin :')
  console.log(`    node scripts/seed-manual-rgpd-test.js --cleanup ${r.userId}\n`)
}

main().catch((e) => {
  console.error('❌', e.message)
  process.exit(1)
})
