import { NextRequest, NextResponse } from 'next/server'
import { getStripeClient } from '@/lib/stripe/config/client'
import { validateCheckoutSessionRequest } from '@/lib/stripe/utils/validation'
import { handleStripeError, handleValidationError } from '@/lib/stripe/utils/error-handling'
import type { CreateCheckoutSessionRequest, CreateCheckoutSessionResponse } from '@/lib/stripe/types'

export async function POST(request: NextRequest) {
  try {
    // Récupérer les données de la requête
    const requestData = await request.json()

    // Valider les paramètres de la requête
    const requestValidation = validateCheckoutSessionRequest(requestData)
    if (!requestValidation.isValid) {
      return handleValidationError(requestValidation.error!)
    }

    // Typer les données validées
    const { priceId, mode, userId }: CreateCheckoutSessionRequest = requestData

    // Initialiser Stripe avec la configuration centralisée
    // Cette fonction inclut déjà la validation d'environnement
    const stripe = getStripeClient()

    // Créer la session de paiement Stripe
    const session = await stripe.checkout.sessions.create({
      mode: mode as 'subscription' | 'payment',
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings?payment_success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings`,
      metadata: {
        ...(userId && { user_id: userId }),
      },
    })

    const response: CreateCheckoutSessionResponse = { sessionId: session.id }
    return NextResponse.json(response, { status: 200 })
  } catch (error) {
    return handleStripeError(error)
  }
}
