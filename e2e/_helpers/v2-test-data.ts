import type { SupabaseClient } from '@supabase/supabase-js'

/** Identifiers returned by {@link seedV2Usecase} for UI tests and teardown. */
export interface V2TestData {
  userId: string
  companyId: string
  registryId: string
  usecaseId: string
  email: string
  /** Exact `usecases.name` — utile pour les locators du dashboard. */
  usecaseName: string
}

/**
 * Seeds a V2 draft use case: auth user, profile company + registry, owner links,
 * draft `usecases` row (`questionnaire_version: 2`), and `user_usecases`.
 */
export async function seedV2Usecase(
  supabase: SupabaseClient,
  testId = 'deletion'
): Promise<V2TestData> {
  const email = `e2e-delete-${testId}-${Date.now()}@maydai-test.com`

  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password: 'TestPassword123!', // mot de passe fixe pour les E2E (connexion par mot de passe)
    email_confirm: true,
  })

  if (authError) {
    throw new Error(`Failed to create test user: ${authError.message}`)
  }

  const userId = authData.user.id

  const { data: companyData, error: companyError } = await supabase
    .from('companies')
    .insert({ name: `E2E Delete Company ${testId} ${Date.now()}` })
    .select('id')
    .single()

  if (companyError) {
    throw new Error(`Failed to create test company: ${companyError.message}`)
  }

  const companyId = companyData.id

  const { data: registryData, error: registryError } = await supabase
    .from('companies')
    .insert({ name: `E2E Delete Registry ${testId} ${Date.now()}` })
    .select('id')
    .single()

  if (registryError) {
    throw new Error(`Failed to create test registry: ${registryError.message}`)
  }

  const registryId = registryData.id

  const { error: profileError } = await supabase.from('profiles').insert({
    id: userId,
    first_name: 'E2E',
    last_name: `Delete${testId}`,
    company_name: `E2E Delete Company ${testId}`,
    company_id: companyId,
    current_company_id: registryId,
    sub_category_id: 'saas',
    industry: 'tech_data',
  })

  if (profileError) {
    throw new Error(`Failed to create test profile: ${profileError.message}`)
  }

  const { error: userCompanyError } = await supabase.from('user_companies').insert({
    user_id: userId,
    company_id: companyId,
    role: 'owner',
  })

  if (userCompanyError) {
    throw new Error(`Failed to create user_companies: ${userCompanyError.message}`)
  }

  const { error: userRegistryError } = await supabase.from('user_companies').insert({
    user_id: userId,
    company_id: registryId,
    role: 'owner',
  })

  if (userRegistryError) {
    throw new Error(`Failed to create user_companies for registry: ${userRegistryError.message}`)
  }

  const usecaseName = `E2E UseCase To Delete ${testId} ${Date.now()}`

  const { data: usecaseData, error: usecaseError } = await supabase
    .from('usecases')
    .insert({
      name: usecaseName,
      description: 'E2E — cas d’usage à supprimer depuis le dashboard.',
      company_id: registryId,
      status: 'draft',
      deployment_date: new Date().toISOString(),
      questionnaire_version: 2,
      ai_category: 'Large Language Model (LLM)',
      responsible_service: "Systèmes d'Information (SI) / IT",
      deployment_phase: 'En production',
      updated_by: userId,
    })
    .select('id')
    .single()

  if (usecaseError) {
    throw new Error(`Failed to create test usecase: ${usecaseError.message}`)
  }

  const usecaseId = usecaseData.id

  // Obligatoire pour le dashboard / RLS : le front et les policies s’appuient sur cette liaison.
  const { error: userUsecaseError } = await supabase.from('user_usecases').insert({
    user_id: userId,
    usecase_id: usecaseId,
    role: 'owner',
  })

  if (userUsecaseError) {
    throw new Error(`Failed to create user_usecases: ${userUsecaseError.message}`)
  }

  console.log(`✅ V2 seed: ${email} (usecase: ${usecaseId})`)

  return { userId, companyId, registryId, usecaseId, email, usecaseName }
}

/**
 * Removes all rows created for a V2 E2E dataset (FK-safe order).
 * Safe to call after the use case was deleted in the UI (child deletes are no-ops).
 */
export async function cleanupTestData(supabase: SupabaseClient, data: V2TestData): Promise<void> {
  try {
    const id = data.usecaseId

    await supabase.from('usecase_responses').delete().eq('usecase_id', id)
    await supabase.from('usecase_history').delete().eq('usecase_id', id)
    await supabase.from('usecase_nextsteps').delete().eq('usecase_id', id)
    // Avant suppression du use case (FK / cohérence avec le seed).
    await supabase.from('user_usecases').delete().eq('usecase_id', id)
    await supabase.from('contact_requests').delete().eq('usecase_id', id)
    await supabase.from('dossiers').delete().eq('usecase_id', id)
    await supabase.from('usecases').delete().eq('id', id)

    await supabase.from('user_companies').delete().eq('user_id', data.userId)
    await supabase.from('profiles').delete().eq('id', data.userId)
    await supabase.from('companies').delete().eq('id', data.registryId)
    await supabase.from('companies').delete().eq('id', data.companyId)
    await supabase.auth.admin.deleteUser(data.userId)

    console.log(`🧹 V2 cleanup: ${data.email}`)
  } catch (error) {
    console.error('Cleanup error:', error)
  }
}
