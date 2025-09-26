import { NextRequest, NextResponse } from 'next/server'
import { getStripeClient } from '@/lib/stripe/config/client'
import { validateSessionId } from '@/lib/stripe/utils/validation'
import { handleStripeError, handleValidationError } from '@/lib/stripe/utils/error-handling'
import type { RetrieveSessionResponse } from '@/lib/stripe/types'

export async function GET(request: NextRequest) {
  try {
    // Récupérer et valider le sessionId
    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('session_id')

    const sessionValidation = validateSessionId(sessionId)
    if (!sessionValidation.isValid) {
      return handleValidationError(sessionValidation.error!)
    }

    // Initialiser Stripe avec la configuration centralisée
    // Cette fonction inclut déjà la validation d'environnement
    const stripe = getStripeClient()

    // Récupérer la session Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId!, {
      expand: ['subscription']
    })

    // Formater les données pour le frontend
    const paymentDetails: RetrieveSessionResponse = {
      id: session.id,
      amount_total: session.amount_total || 0,
      currency: session.currency || 'eur',
      customer_email: session.customer_email || '',
      payment_status: session.payment_status,
      status: session.status || 'unknown',
      subscription: session.subscription ? {
        id: typeof session.subscription === 'object' ? session.subscription.id : session.subscription,
        current_period_end: typeof session.subscription === 'object'
          ? (session.subscription as any).current_period_end
          : undefined
      } : undefined
    }

    return NextResponse.json(paymentDetails, { status: 200 })
  } catch (error) {
    return handleStripeError(error)
  }
}
