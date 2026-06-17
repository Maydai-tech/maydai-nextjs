import { calculateProfileCompletenessScore } from '@/lib/validations/profile-completeness'

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

  const completeness_score = calculateProfileCompletenessScore({
    first_name: profile?.first_name ?? '',
    last_name: profile?.last_name ?? '',
    company_name: profile?.company_name ?? '',
    industry: profile?.industry ?? '',
    sub_category_id: profile?.sub_category_id ?? '',
    phone: profile?.phone ?? '',
    siren: profile?.siren ?? '',
    has_collaborators: (collabCount ?? 0) > 0,
  })

  const { error: updateError } = await supabaseClient
    .from('profiles')
    .update({
      completeness_score,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId)

  if (updateError) {
    throw new Error(`Échec persistance completeness_score: ${updateError.message}`)
  }

  return completeness_score
}
