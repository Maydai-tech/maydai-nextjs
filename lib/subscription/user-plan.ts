/**
 * Service centralisé pour récupérer le plan d'abonnement d'un utilisateur
 * Gère automatiquement le fallback vers le plan freemium si aucune subscription n'existe
 */

import { supabase } from '@/lib/supabase'
import { getPlanInfo, getDefaultPlan } from './plans'
import type { Subscription, PlanInfo } from './types'

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
 * @returns La subscription ou null si aucune n'existe
 */
async function getUserSubscription(userId: string): Promise<Subscription | null> {
  try {
    const { data, error } = await supabase
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
 * @returns Les données complètes du plan utilisateur
 *
 * @example
 * ```typescript
 * const userPlan = await getCurrentUserPlan(user.id)
 * console.log(userPlan.planInfo.displayName) // "Pro" ou "Freemium"
 * console.log(userPlan.hasActiveSubscription) // true ou false
 * ```
 */
export async function getCurrentUserPlan(userId: string): Promise<UserPlanData> {
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
  const subscription = await getUserSubscription(userId)

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
 * @returns Les informations du plan (freemium par défaut si pas de subscription)
 *
 * @example
 * ```typescript
 * const planInfo = await getUserPlanInfo(user.id)
 * console.log(planInfo.displayName) // "Pro" ou "Freemium"
 * ```
 */
export async function getUserPlanInfo(userId: string): Promise<PlanInfo> {
  const userPlan = await getCurrentUserPlan(userId)
  return userPlan.planInfo
}

/**
 * Vérifie si un utilisateur a une subscription active
 * @param userId - L'ID de l'utilisateur
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
export async function hasActiveSubscription(userId: string): Promise<boolean> {
  if (!userId) {
    return false
  }

  const subscription = await getUserSubscription(userId)

  if (!subscription) {
    return false
  }

  return subscription.status === 'active' || subscription.status === 'trialing'
}

/**
 * Vérifie si un utilisateur est sur le plan freemium
 * @param userId - L'ID de l'utilisateur
 * @returns true si l'utilisateur est sur le plan freemium
 */
export async function isFreemiumUser(userId: string): Promise<boolean> {
  const userPlan = await getCurrentUserPlan(userId)
  return userPlan.planInfo.isFree
}
