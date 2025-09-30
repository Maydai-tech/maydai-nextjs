/**
 * Configuration centralisée des plans Stripe MaydAI
 * 
 * Ce fichier contient :
 * - Définition des plans de production et de test
 * - Mapping price_id → plan_id pour les webhooks
 * - Fonctions utilitaires pour récupérer les plans
 */

import { MaydAIPlan } from '@/lib/stripe/types'

// ==================== PLANS DE PRODUCTION ====================

export const PRODUCTION_PLANS: MaydAIPlan[] = [
  {
    id: 'starter',
    name: 'La Mise en Bouche',
    description: 'Vous souhaitez agir tout de suite, vous mettre en conformité ou tester des projets IA.',
    price: { monthly: 0, yearly: 0 },
    stripePriceId: {
      monthly: 'price_1SA8wX1ALRgJSDBxK8g4bH8q', // Gratuit (PRICE ID)
      yearly: 'price_1SA8wX1ALRgJSDBxK8g4bH8q'   // Gratuit (PRICE ID)
    },
    icon: 'level-up.png',
    color: 'blue',
    features: [
      '1 registre IA Act',
      '1 Dashboard Entreprise',
      "6 cas d'usage IA disponibles",
      "6 modèles de cas d'usage disponibles",
      '3 invitations pour collaborer',
      'Support Email'
    ],
    limitations: [],
    free: true
  },
  {
    id: 'pro',
    name: 'Le Lève-tôt',
    description: "Vous avez la volonté de centraliser et d'évaluer tous les cas d'usages de votre entreprise et/ou de ses filiales.",
    price: { monthly: 10, yearly: 100 },
    stripePriceId: {
      monthly: 'price_1SA8t21ALRgJSDBxFaYrH1d7', // 10€/mois (PRICE ID)
      yearly: 'price_1SA8v81ALRgJSDBx0CDPDcid'   // 100€/an (PRICE ID)
    },
    icon: 'le-coucher-du-soleil.png',
    color: 'purple',
    features: [
      '1 super registre IA Act',
      '3 registres IA Act',
      '4 Dashboards Entreprise',
      "12 cas d'usage IA disponibles",
      "12 modèles de cas d'usage disponibles",
      '6 invitations pour collaborer',
      'Support prioritaire'
    ],
    limitations: [],
    popular: true
  },
  {
    id: 'enterprise',
    name: 'Le Pilote',
    description: "Devis entreprise: Vous avez besoin d'être accompagné en matière de formation, de création d'audit IA act et de registre entreprise.",
    price: { monthly: 1000, yearly: 10000 },
    stripePriceId: {
      monthly: 'price_1SA8xx1ALRgJSDBxUrh2lJwg', // 1000€/mois (PRICE ID)
      yearly: 'price_1SA8xx1ALRgJSDBxUrh2lJwg'   // 1000€/mois (PRICE ID)
    },
    icon: 'chapeau-de-pilote.png',
    color: 'gold',
    features: [
      '1 formation sur site',
      '1 atelier audit IA act',
      'Création du Dashboard Entreprise',
      "Cas d'usage IA illimités",
      'Collaboration illimitée',
      "Support juridique relecture cas d'usage",
      'Support prioritaire'
    ],
    limitations: [],
    custom: true
  }
]

// ==================== PLANS DE TEST ====================

export const TEST_PLANS: MaydAIPlan[] = [
  {
    id: 'starter',
    name: 'Test Gratuit',
    description: 'Plan de test gratuit',
    price: { monthly: 0, yearly: 0 },
    stripePriceId: { 
      monthly: 'price_1S8JY316FiJU1KS5V9k250i7',
      yearly: 'price_1S8JY316FiJU1KS5V9k250i7'
    },
    icon: 'level-up.png',
    color: 'blue',
    features: [
      '1 registre IA Act',
      '1 Dashboard Entreprise',
      "6 cas d'usage IA disponibles",
      "6 modèles de cas d'usage disponibles",
      '3 invitations pour collaborer',
      'Support Email'
    ],
    limitations: [],
    free: true
  },
  {
    id: 'pro',
    name: 'Test Pro',
    description: 'Plan de test Pro - 10€/mois',
    price: { monthly: 10, yearly: 100 },
    stripePriceId: { 
      monthly: 'price_1S8JkN16FiJU1KS5MjGTdcIo',
      yearly: 'price_1S8JkN16FiJU1KS5L9MBToBM'
    },
    icon: 'le-coucher-du-soleil.png',
    color: 'purple',
    features: [
      '1 super registre IA Act',
      '3 registres IA Act',
      '4 Dashboards Entreprise',
      "12 cas d'usage IA disponibles",
      "12 modèles de cas d'usage disponibles",
      '6 invitations pour collaborer',
      'Support prioritaire'
    ],
    limitations: [],
    popular: true
  },
  {
    id: 'enterprise',
    name: 'Test Enterprise',
    description: 'Plan de test Enterprise - 1000€/mois',
    price: { monthly: 1000, yearly: 10000 },
    stripePriceId: { 
      monthly: 'price_1S8IL716FiJU1KS5cpmO81Ct',
      yearly: 'price_1S8IL716FiJU1KS5cpmO81Ct'
    },
    icon: 'chapeau-de-pilote.png',
    color: 'gold',
    features: [
      '1 formation sur site',
      '1 atelier audit IA act',
      'Création du Dashboard Entreprise',
      "Cas d'usage IA illimités",
      'Collaboration illimitée',
      "Support juridique relecture cas d'usage",
      'Support prioritaire'
    ],
    limitations: [],
    custom: true
  }
]

// ==================== FONCTIONS UTILITAIRES ====================

/**
 * Récupère les plans selon l'environnement (production ou test)
 */
export function getPlans(): MaydAIPlan[] {
  return process.env.NODE_ENV === 'development' ? TEST_PLANS : PRODUCTION_PLANS
}

/**
 * Récupère un plan spécifique par son ID
 */
export function getPlanById(planId: string): MaydAIPlan | undefined {
  const plans = getPlans()
  return plans.find(plan => plan.id === planId)
}

/**
 * Détermine le plan_id depuis un price_id Stripe
 * Fonction utilisée par les webhooks pour identifier le plan associé
 */
export function getPlanIdFromPriceId(priceId: string | undefined): string {
  if (!priceId) return 'starter'

  let planId

  if(process.env.NODE_ENV === 'development') {
    planId = TEST_PLANS.find(plan => plan.stripePriceId.monthly === priceId || plan.stripePriceId.yearly === priceId)?.id || 'starter'
  } else {
    planId = PRODUCTION_PLANS.find(plan => plan.stripePriceId.monthly === priceId || plan.stripePriceId.yearly === priceId)?.id || 'starter'
  }

  return planId
}

/**
 * Récupère un plan par son price_id Stripe
 */
export function getPlanByPriceId(priceId: string): MaydAIPlan | undefined {
  const planId = getPlanIdFromPriceId(priceId)
  return getPlanById(planId)
}

/**
 * Récupère tous les price_id pour un plan donné
 */
export function getPriceIdsForPlan(planId: string): { monthly: string; yearly: string } | undefined {
  const plan = getPlanById(planId)
  return plan?.stripePriceId
}

/**
 * Vérifie si un price_id est valide
 */
export function isValidPriceId(priceId: string): boolean {
    
  let priceMap: MaydAIPlan | undefined

  if(process.env.NODE_ENV === 'development') {
    priceMap = TEST_PLANS.find(plan => plan.stripePriceId.monthly === priceId || plan.stripePriceId.yearly === priceId)
  } else {
    priceMap = PRODUCTION_PLANS.find(plan => plan.stripePriceId.monthly === priceId || plan.stripePriceId.yearly === priceId)
  }
  
  return priceMap !== undefined
}

/**
 * Récupère le plan par défaut (gratuit)
 */
export function getDefaultPlan(): MaydAIPlan {
  return getPlanById('starter') || getPlans()[0]
}

/**
 * Récupère tous les plans payants (non gratuits)
 */
export function getPaidPlans(): MaydAIPlan[] {
  return getPlans().filter(plan => !plan.free)
}

/**
 * Récupère le plan populaire (recommandé)
 */
export function getPopularPlan(): MaydAIPlan | undefined {
  return getPlans().find(plan => plan.popular)
}

// ==================== CONSTANTES ====================

/**
 * Liste des IDs de plans disponibles
 */
export const PLAN_IDS = ['starter', 'pro', 'enterprise'] as const

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
