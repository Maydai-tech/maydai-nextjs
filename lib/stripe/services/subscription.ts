import { getStripeClient } from '@/lib/stripe/config/client'
import type { CancelSubscriptionResponse } from '@/lib/stripe/types'

/**
 * Annule un abonnement Stripe
 *
 * @param subscriptionId - ID de l'abonnement Stripe à annuler
 * @param immediately - Si true, annule immédiatement, sinon à la fin de la période
 * @returns Promise<CancelSubscriptionResponse>
 */
export async function cancelStripeSubscription(
  subscriptionId: string,
  immediately: boolean = false
): Promise<CancelSubscriptionResponse> {
  try {
    const stripe = getStripeClient()

    if (immediately) {
      // Annulation immédiate
      const canceledSubscription = await stripe.subscriptions.cancel(subscriptionId)

      return {
        success: true,
        message: 'Abonnement annulé immédiatement',
        cancelAtPeriodEnd: false,
        periodEnd: new Date(canceledSubscription.current_period_end * 1000).toISOString()
      }
    } else {
      // Annulation à la fin de la période (recommandé pour UX)
      const updatedSubscription = await stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: true
      })

      return {
        success: true,
        message: `Abonnement annulé. Vous gardez l'accès jusqu'au ${new Date(updatedSubscription.current_period_end * 1000).toLocaleDateString('fr-FR')}`,
        cancelAtPeriodEnd: true,
        periodEnd: new Date(updatedSubscription.current_period_end * 1000).toISOString()
      }
    }
  } catch (error: any) {
    console.error('❌ Erreur lors de l\'annulation Stripe:', error)

    // Gestion spécifique des erreurs Stripe
    if (error.type === 'StripeCardError') {
      throw new Error('Erreur de carte de crédit')
    } else if (error.type === 'StripeInvalidRequestError') {
      if (error.message?.includes('already canceled')) {
        return {
          success: false,
          message: 'Cet abonnement est déjà annulé'
        }
      }
      throw new Error('Requête invalide: ' + error.message)
    } else if (error.type === 'StripeAPIError') {
      throw new Error('Erreur de l\'API Stripe')
    } else if (error.type === 'StripeConnectionError') {
      throw new Error('Erreur de connexion avec Stripe')
    } else if (error.type === 'StripeAuthenticationError') {
      throw new Error('Erreur d\'authentification Stripe')
    }

    throw new Error('Erreur lors de l\'annulation de l\'abonnement')
  }
}

/**
 * Récupère les détails d'un abonnement Stripe
 *
 * @param subscriptionId - ID de l'abonnement Stripe
 * @returns Promise avec les détails de l'abonnement
 */
export async function getStripeSubscription(subscriptionId: string) {
  try {
    const stripe = getStripeClient()
    const subscription = await stripe.subscriptions.retrieve(subscriptionId)

    return {
      id: subscription.id,
      status: subscription.status,
      current_period_start: subscription.current_period_start,
      current_period_end: subscription.current_period_end,
      cancel_at_period_end: subscription.cancel_at_period_end,
      canceled_at: subscription.canceled_at,
      customer: subscription.customer as string,
      items: subscription.items.data.map(item => ({
        id: item.id,
        price_id: item.price.id,
        quantity: item.quantity
      }))
    }
  } catch (error: any) {
    console.error('❌ Erreur lors de la récupération de l\'abonnement:', error)
    throw new Error('Impossible de récupérer les détails de l\'abonnement')
  }
}

/**
 * Vérifie si un abonnement peut être annulé
 *
 * @param subscriptionId - ID de l'abonnement Stripe
 * @returns Promise<boolean>
 */
export async function canCancelSubscription(subscriptionId: string): Promise<boolean> {
  try {
    const subscription = await getStripeSubscription(subscriptionId)

    // Un abonnement peut être annulé s'il est actif et pas déjà marqué pour annulation
    return subscription.status === 'active' && !subscription.cancel_at_period_end
  } catch (error) {
    console.error('❌ Erreur lors de la vérification d\'annulation:', error)
    return false
  }
}