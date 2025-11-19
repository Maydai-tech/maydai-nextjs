import { SupabaseClient } from '@supabase/supabase-js'

/**
 * Updates the E5.N9.Q7 questionnaire response for all use cases belonging to a company
 * based on whether MaydAI is declared as the centralized registry.
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
      // No use cases to update
      return { success: true, updatedCount: 0 }
    }

    const questionCode = 'E5.N9.Q7'
    const timestamp = new Date().toISOString()

    // 2. Prepare the response data based on useMaydai flag
    let responseData: {
      question_code: string
      conditional_main: string | null
      conditional_keys: string[] | null
      conditional_values: string[] | null
      single_value: string | null
      multiple_codes: string[] | null
      multiple_labels: string[] | null
      answered_by: string
      answered_at: string
      updated_at: string
    }

    if (useMaydai) {
      // MaydAI is the centralized registry
      // Response: "Oui" (E5.N9.Q7.B) with system_name = "MaydAI"
      responseData = {
        question_code: questionCode,
        conditional_main: 'E5.N9.Q7.B',
        conditional_keys: ['system_name'],
        conditional_values: ['MaydAI'],
        single_value: null,
        multiple_codes: null,
        multiple_labels: null,
        answered_by: userEmail,
        answered_at: timestamp,
        updated_at: timestamp
      }
    } else {
      // MaydAI is NOT the centralized registry
      // Response: "Non" (E5.N9.Q7.A)
      responseData = {
        question_code: questionCode,
        conditional_main: null,
        conditional_keys: null,
        conditional_values: null,
        single_value: 'E5.N9.Q7.A',
        multiple_codes: null,
        multiple_labels: null,
        answered_by: userEmail,
        answered_at: timestamp,
        updated_at: timestamp
      }
    }

    // 3. Update each use case's response using upsert
    let successCount = 0
    let failureCount = 0

    for (const useCase of useCases) {
      const { error: upsertError } = await supabase
        .from('usecase_responses')
        .upsert(
          {
            usecase_id: useCase.id,
            ...responseData
          },
          {
            onConflict: 'usecase_id,question_code',
            ignoreDuplicates: false
          }
        )

      if (upsertError) {
        console.error(`Error updating use case ${useCase.id}:`, upsertError)
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
