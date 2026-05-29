import { SupabaseClient } from '@supabase/supabase-js'
import { logger } from '@/lib/secure-logger'
import { getStripeClient } from '@/lib/stripe/config/client'
import { cancelStripeSubscription } from '@/lib/stripe/services/subscription'

/**
 * Helpers de suppression de compte et de cascade des données associées.
 *
 * Ces fonctions sont conçues pour être appelées avec un client Supabase
 * **service-role** (admin) afin de pouvoir supprimer des données réparties
 * sur plusieurs companies sans être bloqué par les politiques RLS, et pour
 * pouvoir appeler `auth.admin.deleteUser`.
 */

/** Bucket Supabase Storage hébergeant les fichiers de dossiers. */
const DOSSIERS_BUCKET = 'dossiers'

/**
 * Extrait le chemin Storage à partir d'une URL publique de fichier dossier.
 * Format attendu : .../storage/v1/object/public/dossiers/<path>
 * Renvoie null si l'URL est absente ou non reconnue.
 * (Même logique que la route d'upload des dossiers.)
 */
export function extractDossierStoragePath(fileUrl: string | null | undefined): string | null {
  if (!fileUrl) return null
  try {
    const url = new URL(fileUrl)
    const match = url.pathname.match(/\/storage\/v1\/object\/public\/dossiers\/(.+)/)
    return match && match[1] ? decodeURIComponent(match[1]) : null
  } catch {
    return null
  }
}

export interface DeletionPreviewCollaborator {
  id: string
  email: string | null
  firstName: string | null
  lastName: string | null
  role: string
}

export interface DeletionPreviewCompany {
  id: string
  name: string | null
  usecaseCount: number
  collaborators: DeletionPreviewCollaborator[]
}

export interface DeletionPreview {
  ownedCompanies: DeletionPreviewCompany[]
  collaboratingCompanies: { id: string; name: string | null }[]
}

/**
 * Supprime une company et TOUTES ses données associées, dans un ordre
 * compatible avec les contraintes de clés étrangères réelles du schéma.
 *
 * La plupart des tables enfant sont en `ON DELETE NO ACTION` (et non CASCADE) :
 * il faut donc les vider explicitement AVANT de supprimer le parent, sinon
 * Postgres lève une violation de contrainte.
 *
 * Ordre :
 *   1. fichiers Storage (bucket "dossiers") puis dossier_documents → dossiers
 *      (dossiers liés à la company ou à ses usecases)
 *   2. enfants des usecases : contact_requests, usecase_history,
 *      usecase_nextsteps, user_usecases, usecase_responses
 *      (evaluation_path_runs est en CASCADE → automatique)
 *   3. usecases
 *   4. contact_requests restants (liés à la company)
 *   5. NULL profiles.company_id / current_company_id
 *   6. user_companies
 *   7. companies
 *
 * La suppression des fichiers Storage est best-effort (loggée, non bloquante) :
 * un échec côté Storage n'empêche pas l'effacement des données en base.
 *
 * Lève une Error en cas d'échec d'une étape (hors Storage).
 */
export async function deleteCompanyCascade(
  supabase: SupabaseClient,
  companyId: string
): Promise<void> {
  const del = async (table: string, apply: (q: any) => any) => {
    const { error } = await apply(supabase.from(table).delete())
    if (error) {
      throw new Error(`Error deleting ${table} for company ${companyId}: ${error.message}`)
    }
  }

  // Usecases de la company
  const { data: usecases, error: usecasesFetchError } = await supabase
    .from('usecases')
    .select('id')
    .eq('company_id', companyId)

  if (usecasesFetchError) {
    throw new Error(`Error fetching usecases for company ${companyId}: ${usecasesFetchError.message}`)
  }
  const usecaseIds = (usecases || []).map((u) => u.id)

  // 1. dossiers (+ dossier_documents) liés à la company ou à ses usecases
  const dossierIds = new Set<string>()
  const { data: dossiersByCompany, error: dossiersCompanyError } = await supabase
    .from('dossiers')
    .select('id')
    .eq('company_id', companyId)
  if (dossiersCompanyError) {
    throw new Error(`Error fetching dossiers (company ${companyId}): ${dossiersCompanyError.message}`)
  }
  for (const d of dossiersByCompany || []) dossierIds.add(d.id)

  if (usecaseIds.length > 0) {
    const { data: dossiersByUsecase, error: dossiersUsecaseError } = await supabase
      .from('dossiers')
      .select('id')
      .in('usecase_id', usecaseIds)
    if (dossiersUsecaseError) {
      throw new Error(`Error fetching dossiers (usecases): ${dossiersUsecaseError.message}`)
    }
    for (const d of dossiersByUsecase || []) dossierIds.add(d.id)
  }

  if (dossierIds.size > 0) {
    const ids = Array.from(dossierIds)

    // 1a. Supprimer les fichiers physiques du Storage avant de purger les lignes
    const { data: docs, error: docsFetchError } = await supabase
      .from('dossier_documents')
      .select('file_url')
      .in('dossier_id', ids)
    if (docsFetchError) {
      throw new Error(`Error fetching dossier_documents for company ${companyId}: ${docsFetchError.message}`)
    }

    const storagePaths = (docs || [])
      .map((d) => extractDossierStoragePath(d.file_url))
      .filter((p): p is string => !!p)

    if (storagePaths.length > 0) {
      const { error: removeError } = await (supabase as any).storage
        .from(DOSSIERS_BUCKET)
        .remove(storagePaths)
      if (removeError) {
        // Best-effort : ne bloque pas la suppression des données en base
        logger.warn('Could not remove dossier files from storage', {
          companyId,
          error: removeError.message
        })
      }
    }

    await del('dossier_documents', (q) => q.in('dossier_id', ids))
    await del('dossiers', (q) => q.in('id', ids))
  }

  // 2. Enfants des usecases (NO ACTION) puis 3. usecases
  if (usecaseIds.length > 0) {
    await del('contact_requests', (q) => q.in('usecase_id', usecaseIds))
    await del('usecase_history', (q) => q.in('usecase_id', usecaseIds))
    await del('usecase_nextsteps', (q) => q.in('usecase_id', usecaseIds))
    await del('user_usecases', (q) => q.in('usecase_id', usecaseIds))
    await del('usecase_responses', (q) => q.in('usecase_id', usecaseIds))

    // evaluation_path_runs est en ON DELETE CASCADE → supprimé automatiquement
    await del('usecases', (q) => q.eq('company_id', companyId))
  }

  // 4. contact_requests restants liés directement à la company
  await del('contact_requests', (q) => q.eq('company_id', companyId))

  // 5. Mettre à NULL les profils qui référencent cette company
  const { error: updateProfilesError } = await supabase
    .from('profiles')
    .update({
      company_id: null,
      current_company_id: null
    })
    .or(`company_id.eq.${companyId},current_company_id.eq.${companyId}`)

  if (updateProfilesError) {
    throw new Error(`Error updating profiles for company ${companyId}: ${updateProfilesError.message}`)
  }

  // 6. Supprimer toutes les relations user_companies
  await del('user_companies', (q) => q.eq('company_id', companyId))

  // 7. Supprimer la company elle-même
  await del('companies', (q) => q.eq('id', companyId))
}

/**
 * Construit un aperçu de ce qui sera supprimé quand l'utilisateur supprime
 * son compte : companies qu'il possède (avec collaborateurs + nb d'usecases)
 * et companies où il n'est que collaborateur.
 *
 * Alimente la modale d'avertissement côté UI.
 */
export async function buildDeletionPreview(
  supabase: SupabaseClient,
  userId: string
): Promise<DeletionPreview> {
  // Toutes les appartenances de l'utilisateur
  const { data: memberships, error: membershipsError } = await supabase
    .from('user_companies')
    .select('company_id, role')
    .eq('user_id', userId)

  if (membershipsError) {
    throw new Error(`Error fetching user companies: ${membershipsError.message}`)
  }

  const ownedIds = (memberships || []).filter((m) => m.role === 'owner').map((m) => m.company_id)
  const collaboratingIds = (memberships || []).filter((m) => m.role !== 'owner').map((m) => m.company_id)

  const ownedCompanies: DeletionPreviewCompany[] = []
  for (const companyId of ownedIds) {
    // Nom de la company
    const { data: company } = await supabase
      .from('companies')
      .select('name')
      .eq('id', companyId)
      .single()

    // Nombre d'usecases
    const { count: usecaseCount } = await supabase
      .from('usecases')
      .select('id', { count: 'exact', head: true })
      .eq('company_id', companyId)

    // Collaborateurs (tous les membres sauf l'utilisateur courant)
    const { data: members } = await supabase
      .from('user_companies')
      .select('user_id, role')
      .eq('company_id', companyId)
      .neq('user_id', userId)

    const collaborators: DeletionPreviewCollaborator[] = []
    for (const member of members || []) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('email, first_name, last_name')
        .eq('id', member.user_id)
        .single()

      collaborators.push({
        id: member.user_id,
        email: profile?.email ?? null,
        firstName: profile?.first_name ?? null,
        lastName: profile?.last_name ?? null,
        role: member.role
      })
    }

    ownedCompanies.push({
      id: companyId,
      name: company?.name ?? null,
      usecaseCount: usecaseCount ?? 0,
      collaborators
    })
  }

  const collaboratingCompanies: { id: string; name: string | null }[] = []
  for (const companyId of collaboratingIds) {
    const { data: company } = await supabase
      .from('companies')
      .select('name')
      .eq('id', companyId)
      .single()

    collaboratingCompanies.push({ id: companyId, name: company?.name ?? null })
  }

  return { ownedCompanies, collaboratingCompanies }
}

/**
 * Annule et supprime l'abonnement Stripe + le customer associés à un user.
 * Best-effort : ne lève pas, log les erreurs pour ne pas bloquer la
 * suppression RGPD du compte.
 */
async function cleanupStripeForUser(supabase: SupabaseClient, userId: string): Promise<void> {
  const { data: subscriptions, error } = await supabase
    .from('subscriptions')
    .select('stripe_subscription_id, stripe_customer_id')
    .eq('user_id', userId)

  if (error) {
    logger.warn('Could not fetch subscriptions for Stripe cleanup', { userId, error: error.message })
    return
  }

  if (!subscriptions || subscriptions.length === 0) {
    return
  }

  const stripe = getStripeClient()
  const customerIds = new Set<string>()

  for (const sub of subscriptions) {
    if (sub.stripe_subscription_id) {
      try {
        await cancelStripeSubscription(sub.stripe_subscription_id, true)
      } catch (e) {
        logger.warn('Failed to cancel Stripe subscription during account deletion', {
          userId,
          subscriptionId: sub.stripe_subscription_id,
          error: e instanceof Error ? e.message : String(e)
        })
      }
    }
    if (sub.stripe_customer_id) {
      customerIds.add(sub.stripe_customer_id)
    }
  }

  for (const customerId of customerIds) {
    try {
      await stripe.customers.del(customerId)
    } catch (e) {
      logger.warn('Failed to delete Stripe customer during account deletion', {
        userId,
        customerId,
        error: e instanceof Error ? e.message : String(e)
      })
    }
  }
}

/**
 * Supprime définitivement (hard delete RGPD) le compte d'un utilisateur et
 * toutes ses données associées.
 *
 * @param supabaseAdmin client Supabase **service-role** (bypass RLS + auth admin)
 * @param userId        UUID de l'utilisateur (auth.users.id = profiles.id)
 *
 * Ordre :
 *  1. Stripe : annuler les abonnements + supprimer le customer (best-effort)
 *  2. Supprimer les lignes subscriptions
 *  3. Cascade des companies possédées (deleteCompanyCascade)
 *  4. Retirer l'utilisateur des companies où il n'est que collaborateur
 *  5. Supprimer les leads liés (converted_to_user_id)
 *  5b. Supprimer les contact_requests liés (user_id)
 *  5c. user_profiles : supprimer les invitations de l'utilisateur (FK NO ACTION
 *      bloquante) + mettre added_by à NULL sur les invitations qu'il a créées
 *  6. Supprimer le profil
 *  7. Supprimer le compte auth (auth.users → identities/sessions/mfa en CASCADE)
 */
export async function deleteUserAccount(
  supabaseAdmin: SupabaseClient,
  userId: string
): Promise<void> {
  // 1. Stripe (best-effort, ne bloque pas)
  await cleanupStripeForUser(supabaseAdmin, userId)

  // 2. Supprimer les abonnements en base (hard delete RGPD)
  const { error: deleteSubsError } = await supabaseAdmin
    .from('subscriptions')
    .delete()
    .eq('user_id', userId)

  if (deleteSubsError) {
    throw new Error(`Error deleting subscriptions: ${deleteSubsError.message}`)
  }

  // 3. Companies possédées → cascade complète
  const { data: ownedMemberships, error: ownedError } = await supabaseAdmin
    .from('user_companies')
    .select('company_id')
    .eq('user_id', userId)
    .eq('role', 'owner')

  if (ownedError) {
    throw new Error(`Error fetching owned companies: ${ownedError.message}`)
  }

  for (const membership of ownedMemberships || []) {
    await deleteCompanyCascade(supabaseAdmin, membership.company_id)
  }

  // 4. Retirer l'utilisateur des companies restantes (collaborations)
  const { error: deleteMembershipsError } = await supabaseAdmin
    .from('user_companies')
    .delete()
    .eq('user_id', userId)

  if (deleteMembershipsError) {
    throw new Error(`Error deleting user memberships: ${deleteMembershipsError.message}`)
  }

  // 5. Leads liés à l'utilisateur (RGPD)
  const { error: deleteLeadsError } = await supabaseAdmin
    .from('leads')
    .delete()
    .eq('converted_to_user_id', userId)

  if (deleteLeadsError) {
    // Non bloquant : la table leads peut ne pas exister selon l'environnement
    logger.warn('Could not delete leads during account deletion', {
      userId,
      error: deleteLeadsError.message
    })
  }

  // 5b. contact_requests liés directement à l'utilisateur (PII)
  const { error: deleteContactError } = await supabaseAdmin
    .from('contact_requests')
    .delete()
    .eq('user_id', userId)

  if (deleteContactError) {
    // Pas de FK vers profiles → non bloquant, mais on log pour suivi
    logger.warn('Could not delete contact_requests during account deletion', {
      userId,
      error: deleteContactError.message
    })
  }

  // 5c. user_profiles (invitations) — FK NO ACTION vers profiles : ces lignes
  // bloqueraient la suppression du profil si elles ne sont pas traitées.
  // Lignes où l'utilisateur est invitant/invité → supprimées ;
  // lignes créées par lui pour d'autres (added_by) → added_by mis à NULL.
  const { error: deleteInvitationsError } = await supabaseAdmin
    .from('user_profiles')
    .delete()
    .or(`inviter_user_id.eq.${userId},invited_user_id.eq.${userId}`)

  if (deleteInvitationsError) {
    throw new Error(`Error deleting user_profiles invitations: ${deleteInvitationsError.message}`)
  }

  const { error: nullAddedByError } = await supabaseAdmin
    .from('user_profiles')
    .update({ added_by: null })
    .eq('added_by', userId)

  if (nullAddedByError) {
    throw new Error(`Error clearing user_profiles.added_by: ${nullAddedByError.message}`)
  }

  // 6. Supprimer le profil
  const { error: deleteProfileError } = await supabaseAdmin
    .from('profiles')
    .delete()
    .eq('id', userId)

  if (deleteProfileError) {
    throw new Error(`Error deleting profile: ${deleteProfileError.message}`)
  }

  // 7. Supprimer le compte auth
  const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(userId)

  if (deleteAuthError) {
    throw new Error(`Error deleting auth user: ${deleteAuthError.message}`)
  }
}
