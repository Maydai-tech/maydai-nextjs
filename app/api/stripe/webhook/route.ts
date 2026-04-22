import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { getStripeClient } from '@/lib/stripe/config/client'
import { syncSubscriptionFromStripe, updateSubscription } from '@/lib/stripe/services/supabase'
import { applyStripePaymentToLeads } from '@/lib/stripe/services/lead-ltv'
import { validateWebhookSignature } from '@/lib/stripe/utils/validation'
import { handleWebhookError, handleValidationError, logError } from '@/lib/stripe/utils/error-handling'
import type { WebhookResponse } from '@/lib/stripe/types'

function resolveUserIdFromCheckoutSession(session: Stripe.Checkout.Session): string | null {
  const m = session.metadata || {}
  const fromMeta =
    (typeof m.userId === 'string' && m.userId.trim()) ||
    (typeof m.user_id === 'string' && m.user_id.trim()) ||
    null
  if (fromMeta) return fromMeta
  const cr = session.client_reference_id
  if (typeof cr === 'string' && cr.trim()) return cr.trim()
  return null
}

function resolveEmailFromCheckoutSession(session: Stripe.Checkout.Session): string | null {
  const d = session.customer_details?.email
  if (typeof d === 'string' && d.trim()) return d.trim().toLowerCase()
  const legacy = (session as Stripe.Checkout.Session & { customer_email?: string | null })
    .customer_email
  if (typeof legacy === 'string' && legacy.trim()) return legacy.trim().toLowerCase()
  return null
}

/** Premier achat (Checkout) — amount_total en centimes. */
async function tryApplyLeadLtvFromCheckoutSession(
  session: Stripe.Checkout.Session
): Promise<void> {
  try {
    const userId = resolveUserIdFromCheckoutSession(session)
    const email = resolveEmailFromCheckoutSession(session)
    const amountTotal = session.amount_total
    if (amountTotal == null || amountTotal <= 0) {
      console.log(
        '[stripe-ltv] checkout.session.completed — ignoré (pas de amount_total)',
        { sessionId: session.id }
      )
      return
    }
    const amountEuros = amountTotal / 100
    console.log('[stripe-ltv] checkout.session.completed — attribution', {
      sessionId: session.id,
      mode: session.mode,
      userId: userId ?? '(absent)',
      email: email ?? '(absent)',
      amount_cents: amountTotal,
      amount_euros: amountEuros,
    })
    await applyStripePaymentToLeads({
      context: `checkout.session.completed:${session.id}`,
      userId,
      email,
      amountEuros,
      stripePaymentId: session.id,
    })
  } catch (e) {
    console.log('[stripe-ltv] checkout.session.completed — erreur capturée (non bloquant)', e)
  }
}

async function resolveUserIdFromStripeSubscription(
  stripe: Stripe,
  subscription: Stripe.Subscription
): Promise<string | null> {
  if (subscription.metadata?.user_id?.trim()) {
    return subscription.metadata.user_id.trim()
  }
  if (subscription.metadata?.userId?.trim()) {
    return subscription.metadata.userId.trim()
  }

  const customerRef = subscription.customer
  if (!customerRef) return null

  let customer: Stripe.Customer | Stripe.DeletedCustomer
  if (typeof customerRef === 'string') {
    customer = await stripe.customers.retrieve(customerRef)
  } else {
    customer = customerRef as Stripe.Customer
  }

  if (customer.deleted) return null
  const c = customer as Stripe.Customer
  if (c.metadata?.user_id?.trim()) return c.metadata.user_id.trim()
  if (c.metadata?.userId?.trim()) return c.metadata.userId.trim()
  return null
}

async function resolveInvoiceCustomerEmail(
  stripe: Stripe,
  invoice: Stripe.Invoice
): Promise<string | null> {
  const direct = (invoice as Stripe.Invoice & { customer_email?: string | null }).customer_email
  if (typeof direct === 'string' && direct.trim()) {
    return direct.trim().toLowerCase()
  }
  const custRef = invoice.customer
  const custId = typeof custRef === 'string' ? custRef : custRef?.id
  if (!custId) return null
  const c = await stripe.customers.retrieve(custId)
  if ((c as Stripe.DeletedCustomer).deleted) return null
  const email = (c as Stripe.Customer).email
  return typeof email === 'string' && email.trim() ? email.trim().toLowerCase() : null
}

/**
 * Renouvellements d’abonnement uniquement (évite double comptage avec le 1er paiement Checkout).
 * Écoute invoice.paid et invoice.payment_succeeded.
 */
async function tryApplyLeadLtvFromPaidSubscriptionInvoice(
  stripe: Stripe,
  invoice: Stripe.Invoice,
  eventType: string
): Promise<void> {
  try {
    const billingReason = (invoice as Stripe.Invoice & { billing_reason?: string | null })
      .billing_reason
    if (billingReason !== 'subscription_cycle') {
      console.log(`[stripe-ltv] ${eventType} — ignoré (pas un renouvellement)`, {
        invoiceId: invoice.id,
        billing_reason: billingReason ?? '(vide)',
      })
      return
    }

    const amountPaid = invoice.amount_paid
    if (amountPaid == null || amountPaid <= 0) {
      console.log(`[stripe-ltv] ${eventType} — ignoré (amount_paid)`, {
        invoiceId: invoice.id,
        amount_paid: amountPaid,
      })
      return
    }

    const subRef = (invoice as Stripe.Invoice & { subscription?: string | Stripe.Subscription | null })
      .subscription
    const subId = typeof subRef === 'string' ? subRef : subRef?.id
    if (!subId) {
      console.log(`[stripe-ltv] ${eventType} — ignoré (pas d’abonnement)`, {
        invoiceId: invoice.id,
      })
      return
    }

    const subscription = await stripe.subscriptions.retrieve(subId)
    const userId = await resolveUserIdFromStripeSubscription(stripe, subscription)
    const email = await resolveInvoiceCustomerEmail(stripe, invoice)
    const amountEuros = amountPaid / 100

    console.log(`[stripe-ltv] ${eventType} — renouvellement`, {
      invoiceId: invoice.id,
      subscriptionId: subId,
      userId: userId ?? '(absent)',
      email: email ?? '(absent)',
      amount_cents: amountPaid,
      amount_euros: amountEuros,
    })

    await applyStripePaymentToLeads({
      context: `${eventType}:${invoice.id}`,
      userId,
      email,
      amountEuros,
      stripePaymentId: invoice.id,
    })
  } catch (e) {
    console.log(`[stripe-ltv] facture — erreur capturée (non bloquant)`, e)
  }
}

export async function POST(request: NextRequest) {
  try {
    const stripe = getStripeClient()

    const body = await request.text()
    const signature = request.headers.get('stripe-signature')

    let event: Stripe.Event

    if (process.env.NODE_ENV === 'development' && body.includes('"test":true')) {
      console.log('[stripe webhook] Mode test : événement sans vérification de signature')
      event = JSON.parse(body) as Stripe.Event
    } else {
      const signatureValidation = validateWebhookSignature(signature)
      if (!signatureValidation.isValid) {
        return handleValidationError(signatureValidation.error!)
      }

      try {
        const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!
        event = stripe.webhooks.constructEvent(body, signature!, webhookSecret)
        console.log('[stripe webhook] Signature OK, type =', event.type, 'id =', event.id)
      } catch (err) {
        logError('Webhook signature verification failed', err)
        return handleValidationError('Invalid signature')
      }
    }

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session

        if (session.mode === 'subscription' && session.subscription) {
          try {
            const subscription = await stripe.subscriptions.retrieve(
              session.subscription as string,
              { expand: ['customer'] }
            )

            const sessionUserId =
              resolveUserIdFromCheckoutSession(session) ||
              session.metadata?.user_id ||
              undefined

            await syncSubscriptionFromStripe(subscription, stripe, sessionUserId)
          } catch (error) {
            console.error('❌ Erreur lors du traitement checkout session:', error)
            throw error
          }
        }

        await tryApplyLeadLtvFromCheckoutSession(session)
        break
      }

      case 'customer.subscription.created': {
        const createdSubscription = event.data.object as Stripe.Subscription
        try {
          await syncSubscriptionFromStripe(createdSubscription, stripe)
        } catch (error) {
          console.error('❌ Erreur lors de la création subscription:', error)
          throw error
        }
        break
      }

      case 'customer.subscription.updated': {
        const updatedSubscription = event.data.object as Stripe.Subscription
        try {
          let planUuid: string | undefined = undefined
          const priceId = updatedSubscription.items.data[0]?.price.id

          if (priceId) {
            const { createClient } = await import('@supabase/supabase-js')
            const supabase = createClient(
              process.env.NEXT_PUBLIC_SUPABASE_URL!,
              process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
            )

            const isTestMode =
              process.env.NODE_ENV === 'development' ||
              process.env.NEXT_PUBLIC_STRIPE_TEST_MODE === 'true'

            const { data: planData } = await supabase
              .from('plans')
              .select('id, plan_id')
              .or(
                isTestMode
                  ? `test_stripe_price_id_monthly.eq.${priceId},test_stripe_price_id_yearly.eq.${priceId}`
                  : `stripe_price_id_monthly.eq.${priceId},stripe_price_id_yearly.eq.${priceId}`
              )
              .single()

            if (planData) {
              planUuid = planData.id
            }
          }

          await updateSubscription(updatedSubscription.id, {
            status: updatedSubscription.status,
            ...(planUuid && { plan_id: planUuid }),
            current_period_start: (updatedSubscription as any).current_period_start
              ? new Date((updatedSubscription as any).current_period_start * 1000).toISOString()
              : new Date().toISOString(),
            current_period_end: (updatedSubscription as any).current_period_end
              ? new Date((updatedSubscription as any).current_period_end * 1000).toISOString()
              : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            cancel_at_period_end: updatedSubscription.cancel_at_period_end,
          })
          console.log(`✅ Webhook: Abonnement ${updatedSubscription.id} mis à jour dans Supabase`)
        } catch (error) {
          console.error('❌ Erreur lors de la mise à jour subscription:', error)
          throw error
        }
        break
      }

      case 'customer.subscription.deleted': {
        const deletedSubscription = event.data.object as Stripe.Subscription
        console.log(`🗑️ Webhook: Suppression abonnement ${deletedSubscription.id}`)
        try {
          await updateSubscription(deletedSubscription.id, {
            status: 'canceled',
          })
          console.log(`✅ Webhook: Abonnement ${deletedSubscription.id} marqué comme annulé dans Supabase`)
        } catch (error) {
          console.error('❌ Erreur lors de la suppression subscription:', error)
          throw error
        }
        break
      }

      case 'invoice.payment_succeeded':
      case 'invoice.paid': {
        const inv = event.data.object as Stripe.Invoice
        if ((inv as any).subscription) {
          try {
            await updateSubscription((inv as any).subscription as string, {
              status: 'active',
            })
          } catch (error) {
            console.error('❌ Erreur lors de la mise à jour après paiement:', error)
            throw error
          }
        }
        await tryApplyLeadLtvFromPaidSubscriptionInvoice(stripe, inv, event.type)
        break
      }

      case 'invoice.payment_failed': {
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
      }

      default:
        break
    }

    const response: WebhookResponse = { received: true }
    return NextResponse.json(response)
  } catch (error) {
    return handleWebhookError(error)
  }
}
