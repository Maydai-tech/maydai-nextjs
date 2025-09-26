import { isValidPriceId } from '../config/plans'
import type { CreateCheckoutSessionRequest } from '../types'

// Valide les paramètres pour créer une session checkout
export function validateCheckoutSessionRequest(data: any): { isValid: boolean; error?: string } {
  // Vérifier que priceId existe
  if (!data.priceId) {
    return { isValid: false, error: 'priceId est requis' }
  }

  // Vérifier que le mode existe et est valide
  if (!data.mode || !['subscription', 'payment'].includes(data.mode)) {
    return { isValid: false, error: 'mode doit être "subscription" ou "payment"' }
  }

  // Vérifier que le priceId est valide selon notre configuration
  if (!isValidPriceId(data.priceId)) {
    return { isValid: false, error: 'priceId invalide' }
  }

  return { isValid: true }
}

// Valide qu'un sessionId est présent et non vide
export function validateSessionId(sessionId: string | null): { isValid: boolean; error?: string } {
  if (!sessionId) {
    return { isValid: false, error: 'session_id est requis' }
  }

  return { isValid: true }
}

// Valide les variables d'environnement requises
export function validateEnvironmentConfig(): { isValid: boolean; error?: string } {
  if (!process.env.STRIPE_SECRET_KEY) {
    return { isValid: false, error: 'Variable d\'environnement manquante: STRIPE_SECRET_KEY' }
  }

  if (!process.env.NEXT_PUBLIC_APP_URL) {
    return { isValid: false, error: 'Variable d\'environnement manquante: NEXT_PUBLIC_APP_URL' }
  }

  return { isValid: true }
}

// Valide la signature webhook
export function validateWebhookSignature(signature: string | null): { isValid: boolean; error?: string } {
  if (!signature) {
    return { isValid: false, error: 'Missing stripe-signature header' }
  }

  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    return { isValid: false, error: 'Webhook configuration missing' }
  }

  return { isValid: true }
}