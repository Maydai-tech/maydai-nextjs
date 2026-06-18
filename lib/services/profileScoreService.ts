import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { calculateProfileCompletenessScore } from '@/lib/validations/profile-completeness'

export type ProfileCompletenessRow = {
  first_name?: string | null
  last_name?: string | null
  company_name?: string | null
  industry?: string | null
  sub_category_id?: string | null
  phone?: string | null
  siren?: string | null
}

function getServiceRoleClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error(
      'NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY manquant(e) pour la persistance du score profil'
    )
  }
  return createClient(url, key)
}

/** Calcule le score à partir d'une ligne profil Supabase (snake_case, champs nullables). */
export function computeProfileCompletenessScoreFromRow(
  profile: ProfileCompletenessRow,
  hasCollaborators = false
): number {
  return calculateProfileCompletenessScore({
    first_name: profile.first_name ?? '',
    last_name: profile.last_name ?? '',
    company_name: profile.company_name ?? '',
    industry: profile.industry ?? '',
    sub_category_id: profile.sub_category_id ?? '',
    phone: profile.phone ?? '',
    siren: profile.siren ?? '',
    has_collaborators: hasCollaborators,
  })
}

/**
 * Persiste completeness_score via service-role (bypass RLS) et vérifie qu'une ligne a bien été modifiée.
 * PostgREST peut renvoyer error=null même si 0 ligne n'est touchée (politique RLS) : on refuse ce cas.
 */
async function persistProfileCompletenessScore(
  userId: string,
  completeness_score: number
): Promise<void> {
  const supabaseAdmin = getServiceRoleClient()

  const { data: updatedRow, error: updateError } = await supabaseAdmin
    .from('profiles')
    .update({
      completeness_score,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId)
    .select('id')
    .maybeSingle()

  if (updateError) {
    throw new Error(`Échec persistance completeness_score: ${updateError.message}`)
  }

  if (!updatedRow) {
    throw new Error(
      `Échec persistance completeness_score: aucune ligne mise à jour pour ${userId}`
    )
  }
}

/**
 * Recalcule et persiste profiles.completeness_score pour un utilisateur.
 * Même logique que scripts/backfill-completeness-scores.ts et PATCH /api/profile.
 */
export async function calculateAndSaveProfileCompleteness(
  userId: string,
  supabaseClient: any
): Promise<number> {
  const { data: profile, error: profileError } = await supabaseClient
    .from('profiles')
    .select('first_name, last_name, company_name, industry, sub_category_id, phone, siren')
    .eq('id', userId)
    .single()

  if (profileError) {
    throw new Error(`Échec lecture profil pour scoring: ${profileError.message}`)
  }

  const { count: collabCount, error: collabError } = await supabaseClient
    .from('user_profiles')
    .select('*', { count: 'exact', head: true })
    .eq('inviter_user_id', userId)

  if (collabError) {
    throw new Error(`Échec comptage collaborateurs pour scoring: ${collabError.message}`)
  }

  const completeness_score = computeProfileCompletenessScoreFromRow(
    profile ?? {},
    (collabCount ?? 0) > 0
  )

  await persistProfileCompletenessScore(userId, completeness_score)

  return completeness_score
}
