import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'

// Fonction pour initialiser Stripe
function getStripeClient() {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY manquante')
  }
  
  return new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2025-08-27.basil',
  })
}

export async function POST(request: NextRequest) {
  try {
    // Vérifier que les variables d'environnement sont disponibles
    if (!process.env.STRIPE_SECRET_KEY) {
      console.error('❌ STRIPE_SECRET_KEY manquante')
      return NextResponse.json(
        { error: 'Configuration Stripe manquante' },
        { status: 500 }
      )
    }

    if (!process.env.NEXT_PUBLIC_APP_URL) {
      console.error('❌ NEXT_PUBLIC_APP_URL manquante')
      return NextResponse.json(
        { error: 'Configuration application manquante' },
        { status: 500 }
      )
    }

    // Initialiser Stripe
    const stripe = getStripeClient()

    const { priceId, mode } = await request.json()

    // Validation des paramètres requis
    if (!priceId) {
      return NextResponse.json(
        { error: 'priceId est requis' },
        { status: 400 }
      )
    }

    if (!mode || !['subscription', 'payment'].includes(mode)) {
      return NextResponse.json(
        { error: 'mode doit être "subscription" ou "payment"' },
        { status: 400 }
      )
    }

    // Créer la session de paiement Stripe
    const session = await stripe.checkout.sessions.create({
      mode: mode as 'subscription' | 'payment',
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/abonnement`,
      // Métadonnées pour identifier l'utilisateur (optionnel)
      metadata: {
        // Tu pourras ajouter l'ID utilisateur ici plus tard
      },
    })

    return NextResponse.json({ sessionId: session.id }, { status: 200 })
  } catch (error) {
    console.error('Erreur lors de la création de la session Stripe:', error)
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    )
  }
}






