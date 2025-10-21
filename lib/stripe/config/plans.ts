/**
 * Configuration centralisée des plans Stripe MaydAI
 *
 * Ce fichier contient :
 * - Mapping price_id → plan_id pour les webhooks
 * - Fonctions utilitaires pour récupérer les plans
 * - Les plans sont maintenant récupérés depuis l'API /api/plans
 */

import { MaydAIPlan } from '@/lib/stripe/types'
import { fetchPlans } from '@/lib/api/plans'

// Cache des plans pour éviter les appels répétés
let plansCache: MaydAIPlan[] | null = null
let cacheTimestamp: number = 0
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

// ==================== FONCTIONS UTILITAIRES ====================

/**
 * Récupère les plans depuis l'API avec cache
 * Note: Cette fonction est asynchrone maintenant
 */
export async function getPlans(): Promise<MaydAIPlan[]> {
  const now = Date.now()

  // Utiliser le cache si valide
  if (plansCache && (now - cacheTimestamp) < CACHE_DURATION) {
    return plansCache
  }

  // Récupérer depuis l'API
  try {
    const plans = await fetchPlans()
    plansCache = plans
    cacheTimestamp = now
    return plans
  } catch (error) {
    console.error('Error fetching plans:', error)
    // Si le cache existe, l'utiliser même s'il est expiré
    if (plansCache) {
      return plansCache
    }
    // Sinon, retourner un tableau vide
    return []
  }
}

/**
 * Version synchrone de getPlans pour les cas où on a besoin d'une valeur immédiate
 * Retourne le cache ou un tableau vide
 * @deprecated Utilisez getPlans() qui est maintenant asynchrone
 */
export function getPlansSync(): MaydAIPlan[] {
  return plansCache || []
}

/**
 * Récupère un plan spécifique par son ID
 */
export async function getPlanById(planId: string): Promise<MaydAIPlan | undefined> {
  const plans = await getPlans()
  return plans.find(plan => plan.id === planId)
}

/**
 * Détermine le plan_id depuis un price_id Stripe
 * Fonction utilisée par les webhooks pour identifier le plan associé
 */
export async function getPlanIdFromPriceId(priceId: string | undefined): Promise<string> {
  if (!priceId) return 'freemium'

  const plans = await getPlans()
  const plan = plans.find(p => p.stripePriceId.monthly === priceId || p.stripePriceId.yearly === priceId)

  return plan?.id || 'freemium'
}

/**
 * Récupère un plan par son price_id Stripe
 */
export async function getPlanByPriceId(priceId: string): Promise<MaydAIPlan | undefined> {
  const planId = await getPlanIdFromPriceId(priceId)
  return getPlanById(planId)
}

/**
 * Récupère tous les price_id pour un plan donné
 */
export async function getPriceIdsForPlan(planId: string): Promise<{ monthly: string; yearly: string } | undefined> {
  const plan = await getPlanById(planId)
  return plan?.stripePriceId
}

/**
 * Vérifie si un price_id est valide
 */
export async function isValidPriceId(priceId: string): Promise<boolean> {
  const plans = await getPlans()
  const priceMap = plans.find(plan => plan.stripePriceId.monthly === priceId || plan.stripePriceId.yearly === priceId)
  return priceMap !== undefined
}

/**
 * Récupère le plan par défaut (gratuit)
 */
export async function getDefaultPlan(): Promise<MaydAIPlan> {
  const plans = await getPlans()
  return plans.find(p => p.id === 'freemium') || plans[0]
}

/**
 * Récupère tous les plans payants (non gratuits)
 */
export async function getPaidPlans(): Promise<MaydAIPlan[]> {
  const plans = await getPlans()
  return plans.filter(plan => !plan.free)
}

/**
 * Récupère le plan populaire (recommandé)
 */
export async function getPopularPlan(): Promise<MaydAIPlan | undefined> {
  const plans = await getPlans()
  return plans.find(plan => plan.popular)
}

// ==================== CONSTANTES ====================

/**
 * Liste des IDs de plans disponibles
 */
export const PLAN_IDS = ['freemium', 'starter', 'pro', 'enterprise'] as const

/**
 * Type pour les IDs de plans
 */
export type PlanId = typeof PLAN_IDS[number]

/**
 * Cycles de facturation disponibles
 */
export const BILLING_CYCLES = ['monthly', 'yearly'] as const

/**
 * Type pour les cycles de facturation
 */
export type BillingCycle = typeof BILLING_CYCLES[number]
