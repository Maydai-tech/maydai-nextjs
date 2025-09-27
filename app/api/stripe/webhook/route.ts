import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { getStripeClient } from '@/lib/stripe/config/client'
import { syncSubscriptionFromStripe, updateSubscription } from '@/lib/stripe/services/supabase'
import { validateWebhookSignature } from '@/lib/stripe/utils/validation'
import { handleWebhookError, handleValidationError, logError } from '@/lib/stripe/utils/error-handling'
import type { WebhookResponse } from '@/lib/stripe/types'

export async function POST(request: NextRequest) {
  try {
    // Initialiser Stripe avec la configuration centralisée
    const stripe = getStripeClient()

    // Récupérer le body et la signature
    const body = await request.text()
    const signature = request.headers.get('stripe-signature')

    let event: Stripe.Event

    // Mode test : accepter les événements sans signature
    if (process.env.NODE_ENV === 'development' && body.includes('"test":true')) {
      console.log('🧪 Mode test : traitement sans vérification de signature')
      event = JSON.parse(body) as Stripe.Event
    } else {
      // Mode production : vérifier la signature
      const signatureValidation = validateWebhookSignature(signature)
      if (!signatureValidation.isValid) {
        return handleValidationError(signatureValidation.error!)
      }

      // Construire l'événement avec vérification de signature
      try {
        const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!
        event = stripe.webhooks.constructEvent(body, signature!, webhookSecret)
      } catch (err) {
        logError('Webhook signature verification failed', err)
        return handleValidationError('Invalid signature')
      }
    }

    // Traitement direct des événements Stripe
    switch (event.type) {
      case 'checkout.session.completed':
        const session = event.data.object as Stripe.Checkout.Session

        // Si c'est un abonnement, traiter la création
        if (session.mode === 'subscription' && session.subscription) {
          try {
            // Récupérer l'abonnement complet avec les détails
            const subscription = await stripe.subscriptions.retrieve(
              session.subscription as string,
              { expand: ['customer'] }
            )

            // Passer les métadonnées de la session comme fallback
            await syncSubscriptionFromStripe(subscription, stripe, session.metadata?.user_id)
          } catch (error) {
            console.error('❌ Erreur lors du traitement checkout session:', error)
            throw error
          }
        }
        break

      case 'customer.subscription.created':
        const createdSubscription = event.data.object as Stripe.Subscription
        try {
          await syncSubscriptionFromStripe(createdSubscription, stripe)
        } catch (error) {
          console.error('❌ Erreur lors de la création subscription:', error)
          throw error
        }
        break

      case 'customer.subscription.updated':
        const updatedSubscription = event.data.object as Stripe.Subscription
        try {
          await updateSubscription(updatedSubscription.id, {
            status: updatedSubscription.status,
            current_period_start: (updatedSubscription as any).current_period_start
              ? new Date((updatedSubscription as any).current_period_start * 1000).toISOString()
              : new Date().toISOString(),
            current_period_end: (updatedSubscription as any).current_period_end
              ? new Date((updatedSubscription as any).current_period_end * 1000).toISOString()
              : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            cancel_at_period_end: updatedSubscription.cancel_at_period_end,
          })
        } catch (error) {
          console.error('❌ Erreur lors de la mise à jour subscription:', error)
          throw error
        }
        break

      case 'customer.subscription.deleted':
        const deletedSubscription = event.data.object as Stripe.Subscription
        try {
          await updateSubscription(deletedSubscription.id, {
            status: 'canceled',
          })
        } catch (error) {
          console.error('❌ Erreur lors de la suppression subscription:', error)
          throw error
        }
        break

      case 'invoice.payment_succeeded':
        const successInvoice = event.data.object as Stripe.Invoice
        if ((successInvoice as any).subscription) {
          try {
            await updateSubscription((successInvoice as any).subscription as string, {
              status: 'active',
            })
          } catch (error) {
            console.error('❌ Erreur lors de la mise à jour après paiement:', error)
            throw error
          }
        }
        break

      case 'invoice.payment_failed':
        const failedInvoice = event.data.object as Stripe.Invoice
        if ((failedInvoice as any).subscription) {
          try {
            await updateSubscription((failedInvoice as any).subscription as string, {
              status: 'past_due',
            })
          } catch (error) {
            console.error('❌ Erreur lors de la mise à jour après échec paiement:', error)
            throw error
          }
        }
        break

      default:
        // Ne pas lancer d'erreur pour les événements non gérés
        break
    }

    const response: WebhookResponse = { received: true }
    return NextResponse.json(response)
  } catch (error) {
    return handleWebhookError(error)
  }
}


