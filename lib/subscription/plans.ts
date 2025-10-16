/**
 * Service de mapping des plans d'abonnement
 * Fait le lien entre les IDs de plans et leurs informations d'affichage
 * Les plans sont maintenant récupérés depuis l'API /api/plans
 */

import { PlanInfo } from './types'
import { fetchPlans, type MaydAIPlan } from '@/lib/api/plans'

// Cache des plans
let plansCache: PlanInfo[] | null = null
let cacheTimestamp: number = 0
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

/**
 * Convertit un MaydAIPlan en PlanInfo
 */
function mapMaydAIPlanToPlanInfo(plan: MaydAIPlan): PlanInfo {
  return {
    id: plan.id,
    name: plan.id,
    displayName: plan.name,
    description: plan.description,
    isFree: plan.free || false
  }
}

/**
 * Vérifie si une chaîne est un UUID valide
 */
function isUUID(value: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  return uuidRegex.test(value)
}

/**
 * Récupère un plan depuis la DB par son UUID
 * Utilise directement Supabase pour éviter les problèmes d'authentification avec l'API
 */
async function fetchPlanByUuid(uuid: string): Promise<PlanInfo | null> {
  try {
    // Importer dynamiquement pour éviter les problèmes côté serveur
    const { supabase } = await import('@/lib/supabase')

    // Récupérer directement depuis Supabase
    const { data: plan, error } = await supabase
      .from('plans')
      .select('*')
      .eq('id', uuid)
      .single()

    if (error || !plan) {
      console.warn(`⚠️ Plan non trouvé pour UUID ${uuid}`)
      return null
    }

    return {
      id: plan.plan_id, // Utiliser le plan_id textuel comme id pour compatibilité
      name: plan.plan_id,
      displayName: plan.display_name,
      description: plan.description || '',
      isFree: plan.price_monthly === 0 && plan.price_yearly === 0
    }
  } catch (error) {
    console.error('Error fetching plan by UUID:', error)
    return null
  }
}

/**
 * Récupère tous les plans depuis l'API avec cache
 */
async function fetchAllPlans(): Promise<PlanInfo[]> {
  const now = Date.now()

  // Utiliser le cache si valide
  if (plansCache && (now - cacheTimestamp) < CACHE_DURATION) {
    return plansCache
  }

  // Récupérer depuis l'API
  try {
    const maydaiPlans = await fetchPlans()
    plansCache = maydaiPlans.map(mapMaydAIPlanToPlanInfo)
    cacheTimestamp = now
    return plansCache
  } catch (error) {
    console.error('Error fetching plans:', error)
    // Si le cache existe, l'utiliser même s'il est expiré
    if (plansCache) {
      return plansCache
    }
    // Sinon, retourner un plan par défaut
    return [{
      id: 'freemium',
      name: 'freemium',
      displayName: 'Freemium',
      description: 'Plan gratuit pour découvrir MaydAI',
      isFree: true
    }]
  }
}

/**
 * Récupère les informations d'affichage d'un plan
 * @param planId - L'ID du plan (peut être un UUID ou un plan_id textuel comme "starter", "pro")
 * @returns Les informations du plan ou le plan par défaut
 */
export async function getPlanInfo(planId: string): Promise<PlanInfo> {
  // Si c'est un UUID, chercher directement dans la DB
  if (isUUID(planId)) {
    const planFromUuid = await fetchPlanByUuid(planId)
    if (planFromUuid) {
      return planFromUuid
    }
  }

  // Sinon, chercher dans le cache par plan_id textuel
  const plans = await fetchAllPlans()
  return plans.find(p => p.id === planId) || plans[0]
}

/**
 * Version synchrone de getPlanInfo pour les cas où on a besoin d'une valeur immédiate
 * Retourne le cache ou un plan par défaut
 * @deprecated Utilisez getPlanInfo() qui est maintenant asynchrone
 * Note: Cette fonction ne gère PAS les UUIDs (car elle est synchrone).
 * Pour gérer les UUIDs, utilisez getPlanInfo() qui est asynchrone.
 */
export function getPlanInfoSync(planId: string): PlanInfo {
  // Si c'est un UUID, on ne peut pas le résoudre de manière synchrone
  // Retourner le plan par défaut et logger un warning
  if (isUUID(planId)) {
    console.warn('⚠️ getPlanInfoSync ne peut pas résoudre les UUIDs. Utilisez getPlanInfo() (async) à la place.')
    console.warn(`   UUID fourni: ${planId}`)
    return {
      id: 'freemium',
      name: 'freemium',
      displayName: 'Freemium',
      description: 'Plan gratuit pour découvrir MaydAI',
      isFree: true
    }
  }

  if (plansCache) {
    return plansCache.find(p => p.id === planId) || plansCache[0]
  }
  return {
    id: 'freemium',
    name: 'freemium',
    displayName: 'Freemium',
    description: 'Plan gratuit pour découvrir MaydAI',
    isFree: true
  }
}

/**
 * Récupère le plan par défaut (plan gratuit)
 * @returns Le plan freemium par défaut
 */
export async function getDefaultPlan(): Promise<PlanInfo> {
  const plans = await fetchAllPlans()
  return plans.find(p => p.id === 'freemium') || plans[0]
}

/**
 * Vérifie si un plan existe
 * @param planId - L'ID du plan à vérifier
 * @returns true si le plan existe, false sinon
 */
export async function isPlanValid(planId: string): Promise<boolean> {
  const plans = await fetchAllPlans()
  return plans.some(p => p.id === planId)
}

/**
 * Récupère tous les plans disponibles
 * @returns La liste de tous les plans
 */
export async function getAllPlans(): Promise<PlanInfo[]> {
  return fetchAllPlans()
}

/**
 * Récupère seulement les plans payants
 * @returns La liste des plans payants
 */
export async function getPaidPlans(): Promise<PlanInfo[]> {
  const plans = await fetchAllPlans()
  return plans.filter(plan => !plan.isFree)
}