/**
 * Types TypeScript pour la gestion des abonnements
 * Définit les interfaces pour les abonnements, plans et retours des hooks
 */

// Interface pour un abonnement utilisateur depuis la table Supabase
export interface Subscription {
  id: string
  user_id: string
  stripe_subscription_id: string | null
  stripe_customer_id: string | null
  plan_id: string
  status: string
  current_period_start: string | null
  current_period_end: string | null
  cancel_at_period_end: boolean
  created_at: string
  updated_at: string
}

// Interface pour les informations d'affichage d'un plan
export interface PlanInfo {
  id: string
  name: string
  displayName: string
  description: string
  isFree: boolean
}

// Type pour les cycles de facturation
export type BillingCycle = 'monthly' | 'yearly'

// Interface pour le retour du hook useSubscription
export interface UseSubscriptionReturn {
  subscription: Subscription | null
  loading: boolean
  error: string | null
  refreshSubscription: () => Promise<void>
}

// Interface pour les données calculées à afficher
export interface SubscriptionDisplayData {
  planInfo: PlanInfo
  billingCycle: BillingCycle
  nextBillingDate: string
  nextBillingAmount: number
  isActive: boolean
}