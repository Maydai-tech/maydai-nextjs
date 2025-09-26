import Stripe from 'stripe'
import { 
  createSubscription, 
  updateSubscription, 
  deleteSubscription, 
  syncSubscriptionFromStripe 
} from './supabase'

/**
 * Gestionnaire pour l'événement checkout.session.completed
 * Se déclenche quand un utilisateur termine un paiement
 */
export async function handleCheckoutSessionCompleted(
  session: Stripe.Checkout.Session, 
  stripe: Stripe
): Promise<void> {
  console.log('🛒 Checkout session completed:', session.id)

  // Si c'est un abonnement, traiter la création
  if (session.mode === 'subscription' && session.subscription) {
    try {
      // Récupérer l'abonnement complet avec les détails
      const subscription = await stripe.subscriptions.retrieve(
        session.subscription as string,
        { expand: ['customer'] }
      )

      // Déléguer au handler de création d'abonnement
      await handleSubscriptionCreated(subscription, stripe)
      
      console.log('✅ Subscription créé avec succès depuis checkout:', subscription.id)
    } catch (error) {
      console.error('❌ Erreur lors du traitement checkout session:', error)
      throw error
    }
  }
}

/**
 * Gestionnaire pour l'événement customer.subscription.created
 * Se déclenche quand un nouvel abonnement est créé
 */
export async function handleSubscriptionCreated(
  subscription: Stripe.Subscription, 
  stripe: Stripe
): Promise<void> {
  console.log('📝 Subscription created:', subscription.id)

  try {
    // Utiliser le service centralisé pour synchroniser l'abonnement
    await syncSubscriptionFromStripe(subscription, stripe)
    console.log('✅ Subscription synchronisé avec succès:', subscription.id)
  } catch (error) {
    console.error('❌ Erreur lors de la création subscription:', error)
    throw error
  }
}

/**
 * Gestionnaire pour l'événement customer.subscription.updated
 * Se déclenche quand un abonnement est modifié (changement de plan, statut, etc.)
 */
export async function handleSubscriptionUpdated(
  subscription: Stripe.Subscription, 
  stripe: Stripe
): Promise<void> {
  console.log('🔄 Subscription updated:', subscription.id)

  try {
    // Mettre à jour avec les nouvelles données
    await updateSubscription(subscription.id, {
      status: subscription.status,
      current_period_start: (subscription as any).current_period_start 
        ? new Date((subscription as any).current_period_start * 1000).toISOString()
        : new Date().toISOString(),
      current_period_end: (subscription as any).current_period_end 
        ? new Date((subscription as any).current_period_end * 1000).toISOString()
        : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      cancel_at_period_end: subscription.cancel_at_period_end,
    })
    
    console.log('✅ Subscription mis à jour avec succès:', subscription.id)
  } catch (error) {
    console.error('❌ Erreur lors de la mise à jour subscription:', error)
    throw error
  }
}

/**
 * Gestionnaire pour l'événement customer.subscription.deleted
 * Se déclenche quand un abonnement est annulé/supprimé
 */
export async function handleSubscriptionDeleted(
  subscription: Stripe.Subscription, 
  stripe: Stripe
): Promise<void> {
  console.log('🗑️ Subscription deleted:', subscription.id)

  try {
    // Marquer comme annulé dans la base de données
    await deleteSubscription(subscription.id)
    console.log('✅ Subscription marqué comme annulé:', subscription.id)
  } catch (error) {
    console.error('❌ Erreur lors de la suppression subscription:', error)
    throw error
  }
}

/**
 * Gestionnaire pour l'événement invoice.payment_succeeded
 * Se déclenche quand un paiement de facture réussit
 */
export async function handleInvoicePaymentSucceeded(
  invoice: Stripe.Invoice, 
  stripe: Stripe
): Promise<void> {
  console.log('💳 Invoice payment succeeded:', invoice.id)

  // Si la facture est liée à un abonnement
  if ((invoice as any).subscription) {
    try {
      // Mettre à jour le statut à "active"
      await updateSubscription((invoice as any).subscription as string, {
        status: 'active',
      })
      
      console.log('✅ Subscription activé après paiement réussi')
    } catch (error) {
      console.error('❌ Erreur lors de la mise à jour après paiement:', error)
      throw error
    }
  }
}

/**
 * Gestionnaire pour l'événement invoice.payment_failed
 * Se déclenche quand un paiement de facture échoue
 */
export async function handleInvoicePaymentFailed(
  invoice: Stripe.Invoice, 
  stripe: Stripe
): Promise<void> {
  console.log('❌ Invoice payment failed:', invoice.id)

  // Si la facture est liée à un abonnement
  if ((invoice as any).subscription) {
    try {
      // Mettre à jour le statut à "past_due"
      await updateSubscription((invoice as any).subscription as string, {
        status: 'past_due',
      })
      
      console.log('⚠️ Subscription marqué comme en retard de paiement')
    } catch (error) {
      console.error('❌ Erreur lors de la mise à jour après échec paiement:', error)
      throw error
    }
  }
}

/**
 * Fonction utilitaire pour gérer tous les types d'événements webhook
 * Simplifie le routing dans la route webhook principale
 */
export async function handleWebhookEvent(event: Stripe.Event, stripe: Stripe): Promise<void> {
  console.log(`🔔 Traitement événement webhook: ${event.type}`)

  switch (event.type) {
    case 'checkout.session.completed':
      await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session, stripe)
      break

    case 'customer.subscription.created':
      await handleSubscriptionCreated(event.data.object as Stripe.Subscription, stripe)
      break

    case 'customer.subscription.updated':
      await handleSubscriptionUpdated(event.data.object as Stripe.Subscription, stripe)
      break

    case 'customer.subscription.deleted':
      await handleSubscriptionDeleted(event.data.object as Stripe.Subscription, stripe)
      break

    case 'invoice.payment_succeeded':
      await handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice, stripe)
      break

    case 'invoice.payment_failed':
      await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice, stripe)
      break

    default:
      console.log(`ℹ️ Événement non géré: ${event.type}`)
      // Ne pas lancer d'erreur pour les événements non gérés
      return
  }

  console.log(`✅ Événement ${event.type} traité avec succès`)
}
