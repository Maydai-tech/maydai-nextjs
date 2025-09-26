import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { getStripeClient } from '@/lib/stripe/config/client'
import { handleWebhookEvent } from '@/lib/stripe/services/webhook-handlers'
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

    console.log('📨 Webhook event received:', event.type)

    // Déléguer le traitement aux handlers spécialisés
    await handleWebhookEvent(event, stripe)

    const response: WebhookResponse = { received: true }
    return NextResponse.json(response)
  } catch (error) {
    return handleWebhookError(error)
  }
}


