/**
 * Service client pour l'API /api/plans
 * Récupère les plans depuis la base de données via l'API
 * Note: L'API /api/plans est publique (les tarifs sont visibles par tous)
 */

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
  max_usecases_per_registry: number | null
  max_storage_mb: number
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
  maxRegistries?: number
  maxCollaborators?: number
  maxUseCasesPerRegistry?: number
  maxStorageMb?: number
}

// Mapping des icônes et couleurs par défaut selon le plan_id
const PLAN_STYLES: Record<string, { icon: string; color: string }> = {
  freemium: { icon: 'level-up.png', color: 'gray' },
  starter: { icon: 'speedometer.png', color: 'blue' },
  pro: { icon: 'business-and-trade.png', color: 'purple' },
  enterprise: { icon: 'corporation.png', color: 'gold' }
}

/**
 * Formate le stockage en Mo ou Go selon la taille
 */
function formatStorage(storageMb: number): string {
  if (storageMb >= 1024) {
    const storageGb = storageMb / 1024
    return `${storageGb} Go de stockage`
  }
  return `${storageMb} Mo de stockage`
}

/**
 * Génère dynamiquement les features d'un plan en fonction des limites définies dans la DB
 */
function generateDynamicFeatures(maxRegistries: number, maxCollaborators: number, maxUseCasesPerRegistry: number | null, maxStorageMb: number): string[] {
  const registriesText = maxRegistries === 1
    ? '1 Registre IA Act'
    : `${maxRegistries} Registres IA Act`

  const collaboratorsText = maxCollaborators === 1
    ? "Jusqu'à 1 collaborateur"
    : `Jusqu'à ${maxCollaborators} collaborateurs`

  const useCasesText = maxUseCasesPerRegistry === null || maxUseCasesPerRegistry === -1
    ? 'Cas d\'usage illimités'
    : maxUseCasesPerRegistry === 1
    ? '1 cas d\'usage par registre'
    : `${maxUseCasesPerRegistry} cas d\'usage par registre`

  const storageText = formatStorage(maxStorageMb)

  return [
    registriesText,
    collaboratorsText,
    useCasesText,
    storageText
  ]
}

/**
 * Récupère les plans depuis l'API
 * Note: L'API /api/plans est publique (les tarifs sont visibles par tous)
 */
export async function fetchPlans(): Promise<MaydAIPlan[]> {
  const response = await fetch('/api/plans')

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
  const features = generateDynamicFeatures(planDB.max_registries, planDB.max_collaborators, planDB.max_usecases_per_registry, planDB.max_storage_mb)

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
    custom: planDB.plan_id === 'corporate',
    maxRegistries: planDB.max_registries,
    maxCollaborators: planDB.max_collaborators,
    maxUseCasesPerRegistry: planDB.max_usecases_per_registry ?? undefined,
    maxStorageMb: planDB.max_storage_mb
  }
}

/**
 * Récupère un plan spécifique par son ID
 */
export async function fetchPlanById(planId: string): Promise<MaydAIPlan | undefined> {
  const plans = await fetchPlans()
  return plans.find(plan => plan.id === planId)
}
