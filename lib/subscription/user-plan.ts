/**
 * Service centralisé pour récupérer le plan d'abonnement d'un utilisateur
 * Gère automatiquement le fallback vers le plan freemium si aucune subscription n'existe
 */

import { supabase } from '@/lib/supabase'
import { getPlanInfo, getDefaultPlan } from './plans'
import type { Subscription, PlanInfo } from './types'
import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Interface pour les données complètes du plan utilisateur
 */
export interface UserPlanData {
  subscription: Subscription | null
  planInfo: PlanInfo
  hasActiveSubscription: boolean
}

/**
 * Récupère la subscription d'un utilisateur depuis la table subscriptions
 * @param userId - L'ID de l'utilisateur
 * @param client - Client Supabase optionnel (authentifié). Si non fourni, utilise le client par défaut.
 * @returns La subscription ou null si aucune n'existe
 */
async function getUserSubscription(userId: string, client?: SupabaseClient): Promise<Subscription | null> {
  try {
    const supabaseClient = client || supabase
    const { data, error } = await supabaseClient
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) {
      console.error('Erreur lors de la récupération de la subscription:', error)
      return null
    }

    return data
  } catch (error) {
    console.error('Erreur inattendue lors de la récupération de la subscription:', error)
    return null
  }
}

/**
 * Récupère le plan actuel d'un utilisateur avec toutes les informations
 * Si l'utilisateur n'a pas de subscription, retourne automatiquement le plan freemium
 *
 * @param userId - L'ID de l'utilisateur
 * @param supabaseClient - Client Supabase optionnel (authentifié). Requis côté serveur pour RLS.
 * @returns Les données complètes du plan utilisateur
 *
 * @example
 * ```typescript
 * // Côté client (le client Supabase a déjà le contexte auth)
 * const userPlan = await getCurrentUserPlan(user.id)
 *
 * // Côté serveur (passer le client authentifié)
 * const userPlan = await getCurrentUserPlan(user.id, supabase)
 * ```
 */
export async function getCurrentUserPlan(userId: string, supabaseClient?: SupabaseClient): Promise<UserPlanData> {
  if (!userId) {
    // Si pas d'userId, retourner le plan freemium par défaut
    const defaultPlan = await getDefaultPlan()
    return {
      subscription: null,
      planInfo: defaultPlan,
      hasActiveSubscription: false
    }
  }

  // Récupérer la subscription de l'utilisateur
  const subscription = await getUserSubscription(userId, supabaseClient)

  // Si pas de subscription, utiliser le plan freemium par défaut
  if (!subscription) {
    const defaultPlan = await getDefaultPlan()
    return {
      subscription: null,
      planInfo: defaultPlan,
      hasActiveSubscription: false
    }
  }

  // Vérifier si la subscription est active
  const isActive = subscription.status === 'active' || subscription.status === 'trialing'

  // Si la subscription n'est pas active, retourner freemium
  if (!isActive) {
    const defaultPlan = await getDefaultPlan()
    return {
      subscription,
      planInfo: defaultPlan,
      hasActiveSubscription: false
    }
  }

  // Récupérer les informations du plan depuis le plan_id (UUID ou textuel)
  const planInfo = await getPlanInfo(subscription.plan_id)

  return {
    subscription,
    planInfo,
    hasActiveSubscription: true
  }
}

/**
 * Version simplifiée qui retourne uniquement les informations du plan
 * Utile quand on a juste besoin du PlanInfo sans les détails de subscription
 *
 * @param userId - L'ID de l'utilisateur
 * @param supabaseClient - Client Supabase optionnel (authentifié). Requis côté serveur pour RLS.
 * @returns Les informations du plan (freemium par défaut si pas de subscription)
 *
 * @example
 * ```typescript
 * const planInfo = await getUserPlanInfo(user.id)
 * console.log(planInfo.displayName) // "Pro" ou "Freemium"
 * ```
 */
export async function getUserPlanInfo(userId: string, supabaseClient?: SupabaseClient): Promise<PlanInfo> {
  const userPlan = await getCurrentUserPlan(userId, supabaseClient)
  return userPlan.planInfo
}

/**
 * Vérifie si un utilisateur a une subscription active
 * @param userId - L'ID de l'utilisateur
 * @param supabaseClient - Client Supabase optionnel (authentifié). Requis côté serveur pour RLS.
 * @returns true si l'utilisateur a une subscription active, false sinon
 *
 * @example
 * ```typescript
 * const hasSubscription = await hasActiveSubscription(user.id)
 * if (hasSubscription) {
 *   // Afficher les fonctionnalités premium
 * }
 * ```
 */
export async function hasActiveSubscription(userId: string, supabaseClient?: SupabaseClient): Promise<boolean> {
  if (!userId) {
    return false
  }

  const subscription = await getUserSubscription(userId, supabaseClient)

  if (!subscription) {
    return false
  }

  return subscription.status === 'active' || subscription.status === 'trialing'
}

/**
 * Vérifie si un utilisateur est sur le plan freemium
 * @param userId - L'ID de l'utilisateur
 * @param supabaseClient - Client Supabase optionnel (authentifié). Requis côté serveur pour RLS.
 * @returns true si l'utilisateur est sur le plan freemium
 */
export async function isFreemiumUser(userId: string, supabaseClient?: SupabaseClient): Promise<boolean> {
  const userPlan = await getCurrentUserPlan(userId, supabaseClient)
  return userPlan.planInfo.isFree
}

/**
 * Récupère le plan du propriétaire d'un registre (company)
 * Utile pour vérifier les limites du plan lors de la création de use cases par des collaborateurs
 *
 * @param companyId - L'ID du registre (company)
 * @param supabaseClient - Client Supabase authentifié (requis pour les requêtes RLS)
 * @returns Les données du plan du propriétaire du registre
 *
 * @example
 * ```typescript
 * const ownerPlan = await getRegistryOwnerPlan(companyId, supabase)
 * const maxUseCases = ownerPlan.planInfo.maxUseCasesPerRegistry
 * ```
 */
export async function getRegistryOwnerPlan(
  companyId: string,
  supabaseClient: SupabaseClient
): Promise<UserPlanData> {
  if (!companyId) {
    const defaultPlan = await getDefaultPlan()
    return {
      subscription: null,
      planInfo: defaultPlan,
      hasActiveSubscription: false
    }
  }

  try {
    // Récupérer l'owner du registre via user_companies
    const { data: ownerData, error: ownerError } = await supabaseClient
      .from('user_companies')
      .select('user_id')
      .eq('company_id', companyId)
      .in('role', ['owner', 'company_owner'])
      .limit(1)
      .single()

    if (ownerError || !ownerData) {
      console.error('Erreur lors de la récupération du propriétaire du registre:', ownerError)
      const defaultPlan = await getDefaultPlan()
      return {
        subscription: null,
        planInfo: defaultPlan,
        hasActiveSubscription: false
      }
    }

    // Récupérer le plan du propriétaire
    return await getCurrentUserPlan(ownerData.user_id, supabaseClient)
  } catch (error) {
    console.error('Erreur inattendue lors de la récupération du plan du propriétaire:', error)
    const defaultPlan = await getDefaultPlan()
    return {
      subscription: null,
      planInfo: defaultPlan,
      hasActiveSubscription: false
    }
  }
}
