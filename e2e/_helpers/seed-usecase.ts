import type { SupabaseClient } from '@supabase/supabase-js'
import type { ChecklistCodeArray } from '@/lib/validations/usecases'

export type SeedV2UsecaseParams = {
  companyId: string
  pathMode?: 'short' | 'long'
  checklistGovEnterprise?: ChecklistCodeArray
  checklistGovUsecase?: ChecklistCodeArray
}

/**
 * Insère un cas d’usage de test (checklists gouvernance + contraintes métier courantes).
 * Client Supabase : service role (bypass RLS).
 */
export async function seedV2Usecase(
  supabaseAdmin: SupabaseClient,
  params: SeedV2UsecaseParams
): Promise<string> {
  const {
    companyId,
    pathMode = 'long',
    checklistGovEnterprise = [],
    checklistGovUsecase = [],
  } = params

  const { data, error } = await supabaseAdmin
    .from('usecases')
    .insert({
      company_id: companyId,
      name: 'E2E Test Usecase V2',
      deployment_phase: 'en_projet',
      path_mode: pathMode,
      questionnaire_version: 3,
      checklist_gov_enterprise: checklistGovEnterprise,
      checklist_gov_usecase: checklistGovUsecase,
    })
    .select('id')
    .single()

  if (error || !data?.id) {
    console.error('[seedV2Usecase] Insert usecases failed:', error?.message ?? 'no row returned', error)
    throw new Error(
      `seedV2Usecase: échec insert usecases — ${error?.message ?? 'identifiant absent'}`
    )
  }

  return data.id
}
