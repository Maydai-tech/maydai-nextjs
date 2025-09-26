/**
 * 📦 INDEX DES CONFIGURATIONS STRIPE
 * 
 * Ce fichier centralise tous les exports de configuration Stripe
 * pour faciliter les imports dans l'application.
 * 
 * Usage simplifié :
 * ```typescript
 * import { getStripeClient, getStripePublishableKey } from '@/lib/stripe/config'
 * ```
 */

// Export de toutes les fonctions du client Stripe
export {
  getStripeClient,
  getStripePublishableKey,
  default as stripe
} from './client'

// Export de toutes les fonctions de configuration des plans
export { 
  getPlans,
  getPlanById,
  getPlanByPriceId,
  getPriceIdsForPlan,
  isValidPriceId,
  getDefaultPlan,
  getPaidPlans,
  getPopularPlan,
} from './plans'
