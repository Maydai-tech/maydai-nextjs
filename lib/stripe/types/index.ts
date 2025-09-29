// Types pour les requêtes API
export interface CreateCheckoutSessionRequest {
  priceId: string
  mode: 'subscription' | 'payment'
  userId?: string
}

// Types pour les réponses API
export interface CreateCheckoutSessionResponse {
  sessionId: string
}

export interface RetrieveSessionResponse {
  id: string
  amount_total: number
  currency: string
  customer_email: string
  payment_status: string
  status: string
  subscription?: {
    id: string
    current_period_end?: number
  }
}

// Types pour les erreurs API
export interface ApiError {
  error: string
  code?: string
}

// Types pour les webhooks
export interface WebhookResponse {
  received: boolean
}

// Types pour l'annulation d'abonnement
export interface CancelSubscriptionRequest {
  subscriptionId?: string // Optionnel si récupéré depuis la DB
}

export interface CancelSubscriptionResponse {
  success: boolean
  message: string
  cancelAtPeriodEnd?: boolean
  periodEnd?: string
  syncViaWebhook?: boolean
  stripeSubscriptionId?: string
}

// Types pour les données de subscription
export interface SubscriptionData {
  user_id: string
  stripe_subscription_id: string
  stripe_customer_id: string
  plan_id: string
  status: string
  current_period_start: string
  current_period_end: string
  cancel_at_period_end: boolean
  created_at?: string
  updated_at?: string
}

// Types pour les mises à jour de subscription
export interface SubscriptionUpdateData {
  status?: string
  current_period_start?: string
  current_period_end?: string
  cancel_at_period_end?: boolean
  updated_at?: string
}

// Types pour les plans MaydAI
export interface MaydAIPlan {
  id: string
  name: string
  description: string
  price: {
    monthly: number
    yearly: number
  }
  stripePriceId: {
    monthly: string
    yearly: string
  }
  icon?: string
  color?: string
  features: string[]
  limitations: string[]
  popular?: boolean
  free?: boolean
  custom?: boolean
}