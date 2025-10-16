/**
 * Service client pour l'API /api/plans
 * Récupère les plans depuis la base de données via l'API
 */

import { supabase } from '@/lib/supabase'

// Type pour les plans depuis la DB
export interface PlanFromDB {
  id: string
  plan_id: string
  plan_name: string
  display_name: string
  description: string | null
  stripe_price_id_monthly: string
  stripe_price_id_yearly: string
  test_stripe_price_id_monthly: string
  test_stripe_price_id_yearly: string
  price_monthly: number
  price_yearly: number
  max_registries: number
  max_collaborators: number
  display_order: number
  created_at: string
  updated_at: string
}

// Type compatible avec MaydAIPlan (pour Stripe et les composants)
export interface MaydAIPlan {
  id: string
  name: string
  description: string
  price: { monthly: number; yearly: number }
  stripePriceId: {
    monthly: string
    yearly: string
  }
  icon: string
  color: string
  features: string[]
  limitations: string[]
  free?: boolean
  popular?: boolean
  custom?: boolean
}

// Mapping des icônes et couleurs par défaut selon le plan_id
const PLAN_STYLES: Record<string, { icon: string; color: string }> = {
  starter: { icon: 'level-up.png', color: 'blue' },
  pro: { icon: 'le-coucher-du-soleil.png', color: 'purple' },
  enterprise: { icon: 'chapeau-de-pilote.png', color: 'gold' }
}

// Features par défaut (à adapter selon vos besoins)
const PLAN_FEATURES: Record<string, string[]> = {
  starter: [
    '1 registre IA Act',
    '1 Dashboard Entreprise',
    "6 cas d'usage IA disponibles",
    "6 modèles de cas d'usage disponibles",
    '3 invitations pour collaborer',
    'Support Email'
  ],
  pro: [
    '1 super registre IA Act',
    '3 registres IA Act',
    '4 Dashboards Entreprise',
    "12 cas d'usage IA disponibles",
    "12 modèles de cas d'usage disponibles",
    '6 invitations pour collaborer',
    'Support prioritaire'
  ],
  enterprise: [
    '1 formation sur site',
    '1 atelier audit IA act',
    'Création du Dashboard Entreprise',
    "Cas d'usage IA illimités",
    'Collaboration illimitée',
    "Support juridique relecture cas d'usage",
    'Support prioritaire'
  ]
}

/**
 * Récupère les plans depuis l'API
 */
export async function fetchPlans(): Promise<MaydAIPlan[]> {
  // Récupérer le token d'authentification
  const { data: { session } } = await supabase.auth.getSession()

  if (!session?.access_token) {
    throw new Error('No authentication token available')
  }

  const response = await fetch('/api/plans', {
    headers: {
      'Authorization': `Bearer ${session.access_token}`
    }
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch plans: ${response.statusText}`)
  }

  const plansFromDB: PlanFromDB[] = await response.json()

  // Mapper les plans DB vers le format MaydAIPlan
  return plansFromDB.map(plan => mapDBPlanToMaydAIPlan(plan))
}

/**
 * Mappe un plan depuis la DB vers le format MaydAIPlan
 */
export function mapDBPlanToMaydAIPlan(planDB: PlanFromDB): MaydAIPlan {
  const styles = PLAN_STYLES[planDB.plan_id] || PLAN_STYLES.starter
  const features = PLAN_FEATURES[planDB.plan_id] || []

  // Utiliser les price IDs de test en environnement de développement
  const isTestMode = process.env.NODE_ENV === 'development' ||
                     process.env.NEXT_PUBLIC_STRIPE_TEST_MODE === 'true'

  return {
    id: planDB.plan_id,
    name: planDB.display_name,
    description: planDB.description || '',
    price: {
      monthly: planDB.price_monthly,
      yearly: planDB.price_yearly
    },
    stripePriceId: {
      monthly: isTestMode ? planDB.test_stripe_price_id_monthly : planDB.stripe_price_id_monthly,
      yearly: isTestMode ? planDB.test_stripe_price_id_yearly : planDB.stripe_price_id_yearly
    },
    icon: styles.icon,
    color: styles.color,
    features,
    limitations: [],
    free: planDB.price_monthly === 0 && planDB.price_yearly === 0,
    popular: planDB.plan_id === 'pro',
    custom: planDB.plan_id === 'corporate'
  }
}

/**
 * Récupère un plan spécifique par son ID
 */
export async function fetchPlanById(planId: string): Promise<MaydAIPlan | undefined> {
  const plans = await fetchPlans()
  return plans.find(plan => plan.id === planId)
}
