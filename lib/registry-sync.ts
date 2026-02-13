import { SupabaseClient } from '@supabase/supabase-js'

/**
 * Determines if the current E5.N9.Q7 response is "Oui + MaydAI".
 */
function isMaydaiResponse(r: { single_value?: string | null; conditional_main?: string | null; conditional_values?: string[] | null } | null): boolean {
  if (!r) return false
  if (r.conditional_main !== 'E5.N9.Q7.B') return false
  const systemName = (r.conditional_values?.[0] ?? '').toLowerCase()
  return systemName === 'maydai'
}

/**
 * Determines if the current E5.N9.Q7 response is "Non".
 */
function isNoResponse(r: { single_value?: string | null } | null): boolean {
  return r?.single_value === 'E5.N9.Q7.A'
}

/**
 * Determines if the current E5.N9.Q7 response is "Oui + other" (should be left unchanged when activating).
 */
function isOtherRegistryResponse(r: { conditional_main?: string | null; conditional_values?: string[] | null } | null): boolean {
  if (!r || r.conditional_main !== 'E5.N9.Q7.B') return false
  const systemName = (r.conditional_values?.[0] ?? '').toLowerCase()
  return systemName !== '' && systemName !== 'maydai'
}

/**
 * Updates the E5.N9.Q7 questionnaire response for use cases belonging to a company
 * based on whether MaydAI is declared as the centralized registry.
 *
 * Rules:
 * - When activating (useMaydai true): only update use cases with "Non" or no response. Leave "Oui + other" unchanged.
 * - When deactivating (useMaydai false): only update use cases with "Oui + MaydAI" → set to "Non". Leave "Oui + other" unchanged.
 *
 * @param companyId - The company ID
 * @param useMaydai - true if MaydAI is the centralized registry, false otherwise
 * @param userEmail - Email of the user making the change (for audit trail)
 * @param supabase - Authenticated Supabase client
 * @returns Object containing success status and number of use cases updated
 */
export async function updateUseCaseRegistryResponses(
  companyId: string,
  useMaydai: boolean,
  userEmail: string,
  supabase: SupabaseClient
): Promise<{ success: boolean; updatedCount: number; error?: string }> {
  try {
    // 1. Fetch all use cases for this company
    const { data: useCases, error: fetchError } = await supabase
      .from('usecases')
      .select('id')
      .eq('company_id', companyId)

    if (fetchError) {
      console.error('Error fetching use cases:', fetchError)
      return { success: false, updatedCount: 0, error: fetchError.message }
    }

    if (!useCases || useCases.length === 0) {
      return { success: true, updatedCount: 0 }
    }

    const questionCode = 'E5.N9.Q7'
    const usecaseIds = useCases.map((uc) => uc.id)

    // 2. Fetch current E5.N9.Q7 responses for all use cases
    const { data: existingResponses, error: responsesError } = await supabase
      .from('usecase_responses')
      .select('usecase_id, single_value, conditional_main, conditional_values')
      .eq('question_code', questionCode)
      .in('usecase_id', usecaseIds)

    if (responsesError) {
      console.error('Error fetching existing responses:', responsesError)
      return { success: false, updatedCount: 0, error: responsesError.message }
    }

    const responseByUsecase = new Map<string | number, { single_value?: string | null; conditional_main?: string | null; conditional_values?: string[] | null }>()
    for (const r of existingResponses || []) {
      responseByUsecase.set(r.usecase_id, {
        single_value: r.single_value,
        conditional_main: r.conditional_main,
        conditional_values: r.conditional_values
      })
    }

    // 3. Determine which use cases to update
    const toUpdate: string[] = []
    for (const useCase of useCases) {
      const current = responseByUsecase.get(useCase.id) ?? null
      if (useMaydai) {
        // Activate: update only "Non" or no response; do not touch "Oui + other"
        if (isOtherRegistryResponse(current)) continue
        if (isNoResponse(current) || !current) toUpdate.push(useCase.id)
      } else {
        // Deactivate: update only "Oui + MaydAI" → "Non"; leave "Oui + other" unchanged
        if (isMaydaiResponse(current)) toUpdate.push(useCase.id)
      }
    }

    if (toUpdate.length === 0) {
      return { success: true, updatedCount: 0 }
    }

    const timestamp = new Date().toISOString()

    const responseData = useMaydai
      ? {
          question_code: questionCode,
          conditional_main: 'E5.N9.Q7.B' as const,
          conditional_keys: ['system_name'] as string[],
          conditional_values: ['MaydAI'] as string[],
          single_value: null as string | null,
          multiple_codes: null as string[] | null,
          multiple_labels: null as string[] | null,
          answered_by: userEmail,
          answered_at: timestamp,
          updated_at: timestamp
        }
      : {
          question_code: questionCode,
          conditional_main: null as string | null,
          conditional_keys: null as string[] | null,
          conditional_values: null as string[] | null,
          single_value: 'E5.N9.Q7.A' as string,
          multiple_codes: null as string[] | null,
          multiple_labels: null as string[] | null,
          answered_by: userEmail,
          answered_at: timestamp,
          updated_at: timestamp
        }

    let successCount = 0
    let failureCount = 0

    for (const usecaseId of toUpdate) {
      const { error: upsertError } = await supabase
        .from('usecase_responses')
        .upsert(
          {
            usecase_id: usecaseId,
            ...responseData
          },
          {
            onConflict: 'usecase_id,question_code',
            ignoreDuplicates: false
          }
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
        error: `${failureCount} use case(s) failed to update`
      }
    }

    return { success: true, updatedCount: successCount }
  } catch (error) {
    console.error('Unexpected error in updateUseCaseRegistryResponses:', error)
    return {
      success: false,
      updatedCount: 0,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}
