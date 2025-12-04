import { isValidPriceId } from '../config/plans'
import type { CreateCheckoutSessionRequest } from '../types'

// Valide les paramètres pour créer une session checkout (version synchrone)
// Note: Ne vérifie pas si le priceId est valide dans la DB, seulement le format
export function validateCheckoutSessionRequest(data: any): { isValid: boolean; error?: string } {
  // Vérifier que priceId existe
  if (!data.priceId) {
    return { isValid: false, error: 'priceId est requis' }
  }

  // Vérifier que le mode existe et est valide
  if (!data.mode || !['subscription', 'payment'].includes(data.mode)) {
    return { isValid: false, error: 'mode doit être "subscription" ou "payment"' }
  }

  // Vérifier le format basique du priceId Stripe
  if (typeof data.priceId !== 'string' || !data.priceId.startsWith('price_')) {
    return { isValid: false, error: 'priceId invalide (doit commencer par price_)' }
  }

  return { isValid: true }
}

// Version async pour validation complète avec vérification DB
export async function validateCheckoutSessionRequestAsync(data: any): Promise<{ isValid: boolean; error?: string }> {
  // Validation synchrone basique
  const syncValidation = validateCheckoutSessionRequest(data)
  if (!syncValidation.isValid) {
    return syncValidation
  }

  // Vérifier que le priceId est valide selon notre configuration DB
  const isValid = await isValidPriceId(data.priceId)
  if (!isValid) {
    return { isValid: false, error: 'priceId invalide (non trouvé dans les plans)' }
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