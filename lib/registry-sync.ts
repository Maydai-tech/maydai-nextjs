import { SupabaseClient } from '@supabase/supabase-js'
import { mergeChecklistIntoDbResponseRows } from '@/lib/merge-checklist-into-user-responses'
import {
  extractEffectiveSingleValue,
  recalculateDossierUseCaseScore,
  syncTodoActionToResponse,
} from '@/lib/todo-action-sync'

const REGISTRY_QUESTION = 'E5.N9.Q7'
const REGISTRY_NEGATIVE = 'E5.N9.Q7.A'
const REGISTRY_POSITIVE_MAIN = 'E5.N9.Q7.B'

function isMaydaiResponse(r: {
  single_value?: string | null
  conditional_main?: string | null
  conditional_values?: string[] | null
} | null): boolean {
  if (!r) return false
  if (r.conditional_main !== REGISTRY_POSITIVE_MAIN) return false
  const systemName = (r.conditional_values?.[0] ?? '').toLowerCase()
  return systemName === 'maydai'
}

function isOtherRegistryResponse(r: {
  conditional_main?: string | null
  conditional_values?: string[] | null
} | null): boolean {
  if (!r || r.conditional_main !== REGISTRY_POSITIVE_MAIN) return false
  const systemName = (r.conditional_values?.[0] ?? '').toLowerCase()
  return systemName !== '' && systemName !== 'maydai'
}

export type RegistrySyncOptions = {
  scoreRecalcToken?: string
  scoreRecalcBaseUrl?: string
}

/**
 * Synchronise E5.N9.Q7 pour tous les cas d'une entreprise (toggle MaydAI registre).
 * Fusionne checklists + usecase_responses pour détecter les malus « Non ».
 */
export async function updateUseCaseRegistryResponses(
  companyId: string,
  useMaydai: boolean,
  userEmail: string,
  supabase: SupabaseClient,
  options?: RegistrySyncOptions
): Promise<{ success: boolean; updatedCount: number; scoresRecalculated: number; error?: string }> {
  try {
    const { data: useCases, error: fetchError } = await supabase
      .from('usecases')
      .select('id, checklist_gov_enterprise, checklist_gov_usecase')
      .eq('company_id', companyId)

    if (fetchError) {
      console.error('Error fetching use cases:', fetchError)
      return { success: false, updatedCount: 0, scoresRecalculated: 0, error: fetchError.message }
    }

    if (!useCases?.length) {
      return { success: true, updatedCount: 0, scoresRecalculated: 0 }
    }

    const usecaseIds = useCases.map((uc) => uc.id)

    const { data: existingResponses, error: responsesError } = await supabase
      .from('usecase_responses')
      .select('usecase_id, single_value, conditional_main, conditional_values')
      .eq('question_code', REGISTRY_QUESTION)
      .in('usecase_id', usecaseIds)

    if (responsesError) {
      console.error('Error fetching existing responses:', responsesError)
      return { success: false, updatedCount: 0, scoresRecalculated: 0, error: responsesError.message }
    }

    const responseByUsecase = new Map<
      string,
      {
        single_value?: string | null
        conditional_main?: string | null
        conditional_values?: string[] | null
      }
    >()
    for (const r of existingResponses ?? []) {
      if (typeof r.usecase_id === 'string') {
        responseByUsecase.set(r.usecase_id, {
          single_value: r.single_value,
          conditional_main: r.conditional_main,
          conditional_values: r.conditional_values,
        })
      }
    }

    const toUpdate: Array<{ usecaseId: string; hadNegativeMalus: boolean }> = []

    for (const useCase of useCases) {
      const rawRow = responseByUsecase.get(useCase.id) ?? null
      const rowsForUc = (existingResponses ?? []).filter((r) => r.usecase_id === useCase.id)
      const merged = mergeChecklistIntoDbResponseRows(
        rowsForUc.map((r) => ({
          question_code: REGISTRY_QUESTION,
          single_value: r.single_value,
          conditional_main: r.conditional_main,
          conditional_values: r.conditional_values,
        })),
        useCase.checklist_gov_enterprise,
        useCase.checklist_gov_usecase
      )
      const mergedRow = merged.find((m) => m.question_code === REGISTRY_QUESTION)
      const effective = mergedRow ? extractEffectiveSingleValue(mergedRow) : null

      if (useMaydai) {
        if (isOtherRegistryResponse(rawRow)) continue
        const hadNegative = effective === REGISTRY_NEGATIVE
        if (hadNegative || effective === null) {
          toUpdate.push({ usecaseId: useCase.id, hadNegativeMalus: hadNegative })
        }
      } else if (isMaydaiResponse(rawRow)) {
        toUpdate.push({ usecaseId: useCase.id, hadNegativeMalus: false })
      }
    }

    if (toUpdate.length === 0) {
      return { success: true, updatedCount: 0, scoresRecalculated: 0 }
    }

    const timestamp = new Date().toISOString()
    const responseData = useMaydai
      ? {
          question_code: REGISTRY_QUESTION,
          conditional_main: REGISTRY_POSITIVE_MAIN,
          conditional_keys: ['system_name'] as string[],
          conditional_values: ['MaydAI'] as string[],
          single_value: null as string | null,
          multiple_codes: null as string[] | null,
          multiple_labels: null as string[] | null,
          answered_by: userEmail,
          answered_at: timestamp,
          updated_at: timestamp,
        }
      : {
          question_code: REGISTRY_QUESTION,
          conditional_main: null as string | null,
          conditional_keys: null as string[] | null,
          conditional_values: null as string[] | null,
          single_value: REGISTRY_NEGATIVE as string,
          multiple_codes: null as string[] | null,
          multiple_labels: null as string[] | null,
          answered_by: userEmail,
          answered_at: timestamp,
          updated_at: timestamp,
        }

    let successCount = 0
    let failureCount = 0
    let scoresRecalculated = 0
    const canRecalc = Boolean(options?.scoreRecalcToken && options?.scoreRecalcBaseUrl)

    for (const { usecaseId, hadNegativeMalus } of toUpdate) {
      if (useMaydai && hadNegativeMalus && canRecalc) {
        const sync = await syncTodoActionToResponse(supabase, usecaseId, 'registry_proof', userEmail)
        if (sync.shouldRecalculate) {
          const recalc = await recalculateDossierUseCaseScore(
            supabase,
            usecaseId,
            options!.scoreRecalcToken!,
            options!.scoreRecalcBaseUrl!
          )
          if (recalc) scoresRecalculated++
        }
      }

      const { error: upsertError } = await supabase.from('usecase_responses').upsert(
        {
          usecase_id: usecaseId,
          ...responseData,
        },
        { onConflict: 'usecase_id,question_code', ignoreDuplicates: false }
      )

      if (upsertError) {
        console.error(`Error updating use case ${usecaseId}:`, upsertError)
        failureCount++
      } else {
        successCount++
      }
    }

    if (failureCount > 0) {
      return {
        success: false,
        updatedCount: successCount,
        scoresRecalculated,
        error: `${failureCount} use case(s) failed to update`,
      }
    }

    return { success: true, updatedCount: successCount, scoresRecalculated }
  } catch (error) {
    console.error('Unexpected error in updateUseCaseRegistryResponses:', error)
    return {
      success: false,
      updatedCount: 0,
      scoresRecalculated: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}
