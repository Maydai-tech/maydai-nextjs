'use client'

import { useState } from 'react'
import { loadStripe } from '@stripe/stripe-js'
import { CreateCheckoutSessionRequest, CreateCheckoutSessionResponse } from '@/lib/stripe/types'

// Initialiser Stripe côté client
const stripePublishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
const stripePromise = stripePublishableKey ? loadStripe(stripePublishableKey) : null

export function useStripe() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const createCheckoutSession = async (priceId: string, mode: 'subscription' | 'payment') => {
    setLoading(true)
    setError(null)

    try {
      // Vérifier si Stripe est configuré
      if (!stripePublishableKey) {
        throw new Error('Stripe n\'est pas configuré. Veuillez ajouter NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY dans les variables d\'environnement.')
      }

      if(process.env.NODE_ENV === 'development') {
        priceId = 'price_1S8JkN16FiJU1KS5MjGTdcIo'
      }

      // Appeler notre API route
      const response = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ priceId, mode } as CreateCheckoutSessionRequest),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erreur lors de la création de la session')
      }

      const { sessionId } = await response.json() as CreateCheckoutSessionResponse

      // Rediriger vers Stripe Checkout
      const stripe = await stripePromise
      if (!stripe) {
        throw new Error('Stripe n\'a pas pu être chargé')
      }

      const { error: stripeError } = await stripe.redirectToCheckout({
        sessionId,
      })

      if (stripeError) {
        throw new Error(stripeError.message)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue')
      console.error('Erreur Stripe:', err)
    } finally {
      setLoading(false)
    }
  }

  return {
    createCheckoutSession,
    loading,
    error,
  }
}
