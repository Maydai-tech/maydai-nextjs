'use client'

import { useState } from 'react'
import { loadStripe } from '@stripe/stripe-js'
import { StripeCheckoutRequest, StripeCheckoutResponse } from '@/types/stripe'

// Initialiser Stripe côté client
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

export function useStripe() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const createCheckoutSession = async (priceId: string, mode: 'subscription' | 'payment') => {
    setLoading(true)
    setError(null)

    try {
      // Appeler notre API route
      const response = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ priceId, mode } as StripeCheckoutRequest),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erreur lors de la création de la session')
      }

      const { sessionId } = await response.json() as StripeCheckoutResponse

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
