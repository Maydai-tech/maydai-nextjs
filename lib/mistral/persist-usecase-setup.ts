import { z } from 'zod'
import type { SupabaseClient, User } from '@supabase/supabase-js'
import { getRegistryOwnerPlan } from '@/lib/subscription/user-plan'
import { QUESTIONNAIRE_VERSION_V3 } from '@/lib/questionnaire-version'
import { recordUseCaseHistory } from '@/lib/usecase-history'
import { logger } from '@/lib/secure-logger'
import { convertDeploymentDateForDb } from '@/lib/convert-deployment-date'
import { matchComplAiModelId } from '@/lib/mistral/match-primary-model'
import type { UseCaseSetupInsert } from '@/lib/mistral/setup-tool'

export type PersistUseCaseSetupResult =
  | { ok: true; usecaseId: string }
  | { ok: false; status: number; error: string; code?: string }

export function parseCompanyId(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  const parsed = z.string().uuid().safeParse(raw.trim())
  return parsed.success ? parsed.data : null
}

/**
 * INSERT d’un cas d’usage draft (questionnaire V3) à partir des 9 champs Setup.
 * Client authentifié (RLS) — même contrat d’accès que POST /api/usecases.
 */
export async function persistUseCaseSetup(
  supabase: SupabaseClient,
  user: User,
  companyId: string,
  data: UseCaseSetupInsert
): Promise<PersistUseCaseSetupResult> {
  const { data: userCompany, error: userCompanyError } = await supabase
    .from('user_companies')
    .select('company_id, role')
    .eq('user_id', user.id)
    .eq('company_id', companyId)
    .maybeSingle()

  if (userCompanyError) {
    logger.error('persistUseCaseSetup: accès user_companies', undefined, {
      details: userCompanyError.message,
    })
    return {
      ok: false,
      status: 500,
      error: 'Erreur lors de la vérification des droits',
      code: 'DB_ERROR',
    }
  }

  if (!userCompany) {
    return {
      ok: false,
      status: 403,
      error: 'Registre introuvable ou accès refusé',
      code: 'ACCESS_DENIED',
    }
  }

  const ownerPlan = await getRegistryOwnerPlan(companyId, supabase)
  const maxUseCases = ownerPlan.planInfo.maxUseCasesPerRegistry || 3

  const { count: currentUseCaseCount, error: countError } = await supabase
    .from('usecases')
    .select('*', { count: 'exact', head: true })
    .eq('company_id', companyId)

  if (countError) {
    logger.error('persistUseCaseSetup: comptage usecases', undefined, {
      details: countError.message,
    })
    return {
      ok: false,
      status: 500,
      error: 'Erreur lors de la vérification de la limite du plan',
    }
  }

  if ((currentUseCaseCount || 0) >= maxUseCases) {
    return {
      ok: false,
      status: 403,
      error: 'Limite du plan atteinte',
      code: 'PLAN_LIMIT_REACHED',
    }
  }

  let primaryModelId: string | null = null
  try {
    primaryModelId = await matchComplAiModelId(supabase, data.llm_model_version)
  } catch {
    primaryModelId = null
  }

  const now = new Date().toISOString()
  const insertData = {
    ...data,
    company_id: companyId,
    status: 'draft' as const,
    questionnaire_version: QUESTIONNAIRE_VERSION_V3,
    primary_model_id: primaryModelId,
    deployment_date: convertDeploymentDateForDb(data.deployment_date),
    path_mode: null,
    created_at: now,
    updated_at: now,
    updated_by: user.id,
  }

  const { data: usecase, error: createError } = await supabase
    .from('usecases')
    .insert([insertData])
    .select('id')
    .single()

  if (createError || !usecase?.id) {
    logger.error('persistUseCaseSetup: insert usecases', undefined, {
      details: createError?.message ?? 'id manquant',
    })
    return {
      ok: false,
      status: 500,
      error: 'Impossible d’enregistrer le cas d’usage',
    }
  }

  await recordUseCaseHistory(supabase, usecase.id, user.id, 'created')

  return { ok: true, usecaseId: usecase.id }
}
