import type { SupabaseClient } from '@supabase/supabase-js'

export type CleanupTestDataIds = {
  userId?: string
  companyId?: string
  usecaseId?: string
}

/**
 * Nettoie les données de test (ordre respectant les FK).
 * Client Supabase doit être créé avec la SERVICE_ROLE_KEY (auth.admin + bypass RLS).
 */
export async function cleanupTestData(
  supabase: SupabaseClient,
  ids: CleanupTestDataIds
): Promise<void> {
  const { userId, companyId, usecaseId } = ids

  if (usecaseId) {
    try {
      const { error } = await supabase.from('usecase_responses').delete().eq('usecase_id', usecaseId)
      if (error) console.warn('[cleanupTestData] usecase_responses:', error.message)
    } catch (err) {
      console.warn('[cleanupTestData] usecase_responses:', err instanceof Error ? err.message : String(err))
    }
  }

  if (usecaseId) {
    try {
      const { error } = await supabase.from('usecase_history').delete().eq('usecase_id', usecaseId)
      if (error) console.warn('[cleanupTestData] usecase_history:', error.message)
    } catch (err) {
      console.warn('[cleanupTestData] usecase_history:', err instanceof Error ? err.message : String(err))
    }
  }

  if (usecaseId) {
    try {
      const { error } = await supabase.from('usecase_nextsteps').delete().eq('usecase_id', usecaseId)
      if (error) console.warn('[cleanupTestData] usecase_nextsteps:', error.message)
    } catch (err) {
      console.warn('[cleanupTestData] usecase_nextsteps:', err instanceof Error ? err.message : String(err))
    }
  }

  if (usecaseId) {
    try {
      const { error } = await supabase.from('user_usecases').delete().eq('usecase_id', usecaseId)
      if (error) console.warn('[cleanupTestData] user_usecases (usecase_id):', error.message)
    } catch (err) {
      console.warn(
        '[cleanupTestData] user_usecases (usecase_id):',
        err instanceof Error ? err.message : String(err)
      )
    }
  }

  if (userId) {
    try {
      const { error } = await supabase.from('user_usecases').delete().eq('user_id', userId)
      if (error) console.warn('[cleanupTestData] user_usecases (user_id):', error.message)
    } catch (err) {
      console.warn(
        '[cleanupTestData] user_usecases (user_id):',
        err instanceof Error ? err.message : String(err)
      )
    }
  }

  if (usecaseId) {
    try {
      const { error } = await supabase.from('contact_requests').delete().eq('usecase_id', usecaseId)
      if (error) console.warn('[cleanupTestData] contact_requests:', error.message)
    } catch (err) {
      console.warn('[cleanupTestData] contact_requests:', err instanceof Error ? err.message : String(err))
    }
  }

  if (usecaseId) {
    try {
      const { error } = await supabase.from('dossiers').delete().eq('usecase_id', usecaseId)
      if (error) console.warn('[cleanupTestData] dossiers:', error.message)
    } catch (err) {
      console.warn('[cleanupTestData] dossiers:', err instanceof Error ? err.message : String(err))
    }
  }

  if (usecaseId) {
    try {
      const { error } = await supabase.from('usecases').delete().eq('id', usecaseId)
      if (error) console.warn('[cleanupTestData] usecases:', error.message)
    } catch (err) {
      console.warn('[cleanupTestData] usecases:', err instanceof Error ? err.message : String(err))
    }
  }

  if (companyId) {
    try {
      const { error } = await supabase.from('user_companies').delete().eq('company_id', companyId)
      if (error) console.warn('[cleanupTestData] user_companies (company_id):', error.message)
    } catch (err) {
      console.warn(
        '[cleanupTestData] user_companies (company_id):',
        err instanceof Error ? err.message : String(err)
      )
    }
  }

  if (userId) {
    try {
      const { error } = await supabase.from('user_companies').delete().eq('user_id', userId)
      if (error) console.warn('[cleanupTestData] user_companies (user_id):', error.message)
    } catch (err) {
      console.warn(
        '[cleanupTestData] user_companies (user_id):',
        err instanceof Error ? err.message : String(err)
      )
    }
  }

  if (userId) {
    try {
      const { error } = await supabase.from('profiles').delete().eq('id', userId)
      if (error) console.warn('[cleanupTestData] profiles:', error.message)
    } catch (err) {
      console.warn('[cleanupTestData] profiles:', err instanceof Error ? err.message : String(err))
    }
  }

  if (companyId) {
    try {
      const { error } = await supabase.from('companies').delete().eq('id', companyId)
      if (error) console.warn('[cleanupTestData] companies:', error.message)
    } catch (err) {
      console.warn('[cleanupTestData] companies:', err instanceof Error ? err.message : String(err))
    }
  }

  if (userId) {
    try {
      const { error } = await supabase.auth.admin.deleteUser(userId)
      if (error) console.warn('[cleanupTestData] auth.admin.deleteUser:', error.message)
    } catch (err) {
      console.warn(
        '[cleanupTestData] auth.admin.deleteUser:',
        err instanceof Error ? err.message : String(err)
      )
    }
  }
}
