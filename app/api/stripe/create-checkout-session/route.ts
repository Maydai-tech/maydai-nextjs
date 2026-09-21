import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedSupabaseClient } from '@/lib/api-auth'
import { getStripeClient } from '@/lib/stripe/config/client'
import { validateCheckoutSessionRequest } from '@/lib/stripe/utils/validation'
import { handleStripeError, handleValidationError } from '@/lib/stripe/utils/error-handling'
import type { CreateCheckoutSessionRequest, CreateCheckoutSessionResponse } from '@/lib/stripe/types'

export async function POST(request: NextRequest) {
  try {
    let user
    try {
      const auth = await getAuthenticatedSupabaseClient(request)
      user = auth.user
    } catch {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const requestData = await request.json()

    const requestValidation = validateCheckoutSessionRequest(requestData)
    if (!requestValidation.isValid) {
      return handleValidationError(requestValidation.error!)
    }

    const { priceId, mode }: CreateCheckoutSessionRequest = requestData
    const userId = user.id

    const stripe = getStripeClient()

    let customerId: string | undefined = undefined

    try {
      const customer = await stripe.customers.create({
        metadata: {
          user_id: userId,
        },
      })
      customerId = customer.id
    } catch (error) {
      console.error('❌ Erreur lors de la création du customer:', error)
    }

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
      client_reference_id: userId,
      metadata: {
        user_id: userId,
        userId,
      },
      automatic_tax: { enabled: true },
      customer_update: { address: 'auto' },
      consent_collection: {
        terms_of_service: 'required',
      },
      custom_text: {
        terms_of_service_acceptance: {
          message: 'J\'accepte les [conditions générales de vente](https://maydai.io/conditions-generales)',
        },
      },
    }

    if (customerId) {
      sessionConfig.customer = customerId
    } else {
      sessionConfig.customer_creation = 'always'
    }

    const session = await stripe.checkout.sessions.create(sessionConfig)

    const response: CreateCheckoutSessionResponse = { sessionId: session.id }
    return NextResponse.json(response, { status: 200 })
  } catch (error) {
    return handleStripeError(error)
  }
}
