// Types pour l'intégration Stripe

export interface StripeCheckoutRequest {
  priceId: string
  mode: 'subscription' | 'payment'
}

export interface StripeCheckoutResponse {
  sessionId: string
}

export interface StripeError {
  error: string
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
  features: string[]
  limitations: string[]
  popular?: boolean
  free?: boolean
  custom?: boolean
}

// Types pour les sessions de paiement
export interface CheckoutSession {
  id: string
  url: string
  status: string
  payment_status: string
  customer_email?: string
  amount_total?: number
  currency?: string
}
