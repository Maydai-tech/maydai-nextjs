import { createSupabaseServerClient } from '@/lib/supabase/server'

/**
 * État auth pour le site vitrine — lecture cookies côté serveur (sans AuthProvider client).
 * Retourne false si Supabase n'est pas configuré ou en cas d'erreur.
 */
export async function isMarketingUserAuthenticated(): Promise<boolean> {
  try {
    const supabase = await createSupabaseServerClient()
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser()

    if (error) {
      return false
    }

    return Boolean(user)
  } catch {
    return false
  }
}
