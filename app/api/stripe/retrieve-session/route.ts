import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'

// Initialiser Stripe avec la clé secrète
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-08-27.basil',
})

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('session_id')

    if (!sessionId) {
      return NextResponse.json(
        { error: 'session_id est requis' },
        { status: 400 }
      )
    }

    // Récupérer la session Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['subscription']
    })

    // Formater les données pour le frontend
    const paymentDetails = {
      id: session.id,
      amount_total: session.amount_total || 0,
      currency: session.currency || 'eur',
      customer_email: session.customer_email || '',
      payment_status: session.payment_status,
      status: session.status,
      subscription: session.subscription ? {
        id: typeof session.subscription === 'object' ? session.subscription.id : session.subscription,
        current_period_end: typeof session.subscription === 'object' 
          ? (session.subscription as any).current_period_end 
          : undefined
      } : undefined
    }

    return NextResponse.json(paymentDetails, { status: 200 })
  } catch (error) {
    console.error('Erreur lors de la récupération de la session Stripe:', error)
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    )
  }
}
