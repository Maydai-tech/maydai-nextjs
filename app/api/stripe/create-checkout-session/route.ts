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

    let customerId: string | undefined = undefined

    // Si un userId est fourni, créer un customer avec métadonnées
    if (userId) {
      try {
        // Créer un nouveau customer avec user_id dans les métadonnées
        const customer = await stripe.customers.create({
          metadata: {
            user_id: userId
          }
        })
        customerId = customer.id
      } catch (error) {
        console.error('❌ Erreur lors de la création du customer:', error)
        // Continuer sans customer si erreur
      }
    }

    // Créer la session de paiement Stripe
    const sessionConfig: any = {
      mode: mode as 'subscription' | 'payment',
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : process.env.NEXT_PUBLIC_APP_URL}/settings?payment_success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings`,
      metadata: {
        ...(userId && { user_id: userId }),
      },
      automatic_tax: { enabled: true },
    }

    // Ajouter le customer si disponible
    if (customerId) {
      sessionConfig.customer = customerId
    } else {
      // Forcer la création d'un customer pendant le checkout
      sessionConfig.customer_creation = 'always'
    }

    const session = await stripe.checkout.sessions.create(sessionConfig)

    const response: CreateCheckoutSessionResponse = { sessionId: session.id }
    return NextResponse.json(response, { status: 200 })
  } catch (error) {
    return handleStripeError(error)
  }
}
