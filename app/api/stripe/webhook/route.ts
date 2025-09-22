import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

// Initialiser Stripe avec la clé secrète
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-08-27.basil',
})

// Initialiser Supabase avec les variables d'environnement côté serveur
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variables d\'environnement Supabase manquantes dans webhook')
}

const supabase = createClient(supabaseUrl, supabaseKey)

// Webhook secret pour vérifier la signature
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const signature = request.headers.get('stripe-signature')

    let event: Stripe.Event

    // Mode test : accepter les événements sans signature
    if (process.env.NODE_ENV === 'development' && body.includes('"test":true')) {
      console.log('🧪 Mode test : traitement sans vérification de signature')
      event = JSON.parse(body) as Stripe.Event
    } else {
      // Mode production : vérifier la signature
      if (!signature) {
        console.error('Missing stripe-signature header')
        return NextResponse.json(
          { error: 'Missing stripe-signature header' },
          { status: 400 }
        )
      }

      // Vérifier la signature du webhook
      try {
        event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
      } catch (err) {
        console.error('Webhook signature verification failed:', err)
        return NextResponse.json(
          { error: 'Invalid signature' },
          { status: 400 }
        )
      }
    }

    console.log('Webhook event received:', event.type)

    // Traiter les différents types d'événements
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session)
        break

      case 'customer.subscription.created':
        await handleSubscriptionCreated(event.data.object as Stripe.Subscription)
        break

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription)
        break

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription)
        break

      case 'invoice.payment_succeeded':
        await handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice)
        break

      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice)
        break

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    )
  }
}

// Gérer la session de checkout complétée
async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  console.log('Checkout session completed:', session.id)

  if (session.mode === 'subscription' && session.subscription) {
    // Récupérer l'abonnement complet
    const subscription = await stripe.subscriptions.retrieve(
      session.subscription as string,
      { expand: ['customer'] }
    )

    await handleSubscriptionCreated(subscription)
  }
}

// Gérer la création d'un abonnement
async function handleSubscriptionCreated(subscription: Stripe.Subscription) {
  console.log('Subscription created:', subscription.id)

  try {
    // Récupérer l'utilisateur depuis les métadonnées ou le customer
    let userId: string | null = null

    // Essayer de récupérer l'user_id depuis les métadonnées
    if (subscription.metadata?.user_id) {
      userId = subscription.metadata.user_id
    } else if (subscription.customer) {
      // Si pas de métadonnées, essayer de récupérer depuis le customer
      const customer = await stripe.customers.retrieve(subscription.customer as string)
      if (customer && !customer.deleted && customer.metadata?.user_id) {
        userId = customer.metadata.user_id
      }
    }

    if (!userId) {
      console.error('No user_id found for subscription:', subscription.id)
      return
    }

    // Déterminer le plan_id basé sur le price_id
    const planId = getPlanIdFromPriceId(subscription.items.data[0]?.price.id)

    // Insérer ou mettre à jour l'abonnement
    const { error } = await supabase
      .from('subscriptions')
      .upsert({
        user_id: userId,
        stripe_subscription_id: subscription.id,
        stripe_customer_id: subscription.customer as string,
        plan_id: planId,
        status: subscription.status,
        current_period_start: (subscription as any).current_period_start 
          ? new Date((subscription as any).current_period_start * 1000).toISOString()
          : new Date().toISOString(),
        current_period_end: (subscription as any).current_period_end 
          ? new Date((subscription as any).current_period_end * 1000).toISOString()
          : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // +30 jours par défaut
        cancel_at_period_end: subscription.cancel_at_period_end,
      })

    if (error) {
      console.error('Error inserting subscription:', error)
    } else {
      console.log('Subscription inserted successfully:', subscription.id)
    }
  } catch (error) {
    console.error('Error handling subscription created:', error)
  }
}

// Gérer la mise à jour d'un abonnement
async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  console.log('Subscription updated:', subscription.id)

  try {
    const { error } = await supabase
      .from('subscriptions')
      .update({
        status: subscription.status,
        current_period_start: (subscription as any).current_period_start 
          ? new Date((subscription as any).current_period_start * 1000).toISOString()
          : new Date().toISOString(),
        current_period_end: (subscription as any).current_period_end 
          ? new Date((subscription as any).current_period_end * 1000).toISOString()
          : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // +30 jours par défaut
        cancel_at_period_end: subscription.cancel_at_period_end,
        updated_at: new Date().toISOString(),
      })
      .eq('stripe_subscription_id', subscription.id)

    if (error) {
      console.error('Error updating subscription:', error)
    } else {
      console.log('Subscription updated successfully:', subscription.id)
    }
  } catch (error) {
    console.error('Error handling subscription updated:', error)
  }
}

// Gérer la suppression d'un abonnement
async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  console.log('Subscription deleted:', subscription.id)

  try {
    const { error } = await supabase
      .from('subscriptions')
      .update({
        status: 'canceled',
        updated_at: new Date().toISOString(),
      })
      .eq('stripe_subscription_id', subscription.id)

    if (error) {
      console.error('Error updating deleted subscription:', error)
    } else {
      console.log('Subscription marked as canceled:', subscription.id)
    }
  } catch (error) {
    console.error('Error handling subscription deleted:', error)
  }
}

// Gérer le paiement d'une facture réussi
async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
  console.log('Invoice payment succeeded:', invoice.id)

  if ((invoice as any).subscription) {
    // Mettre à jour le statut de l'abonnement
    const { error } = await supabase
      .from('subscriptions')
      .update({
        status: 'active',
        updated_at: new Date().toISOString(),
      })
      .eq('stripe_subscription_id', (invoice as any).subscription as string)

    if (error) {
      console.error('Error updating subscription after payment:', error)
    }
  }
}

// Gérer l'échec du paiement d'une facture
async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  console.log('Invoice payment failed:', invoice.id)

  if ((invoice as any).subscription) {
    // Mettre à jour le statut de l'abonnement
    const { error } = await supabase
      .from('subscriptions')
      .update({
        status: 'past_due',
        updated_at: new Date().toISOString(),
      })
      .eq('stripe_subscription_id', (invoice as any).subscription as string)

    if (error) {
      console.error('Error updating subscription after payment failure:', error)
    }
  }
}

// Fonction utilitaire pour déterminer le plan_id depuis le price_id
function getPlanIdFromPriceId(priceId: string | undefined): string {
  if (!priceId) return 'starter'

  // Mapping des price_id vers les plan_id
  const priceToPlanMap: Record<string, string> = {
    'price_1S8JY316FiJU1KS5V9k250i7': 'starter', // Gratuit
    'price_1S8JkN16FiJU1KS5MjGTdcIo': 'pro', // 10€/mois
    'price_1S8JkN16FiJU1KS5L9MBToBM': 'pro', // 100€/an
    'price_1S8IL716FiJU1KS5cpmO81Ct': 'enterprise', // 1000€/mois
  }

  return priceToPlanMap[priceId] || 'starter'
}


