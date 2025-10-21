import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedSupabaseClient } from '@/lib/api-auth'
import { getStripeClient } from '@/lib/stripe/config/client'
import { updateSubscription } from '@/lib/stripe/services/supabase'
import { handleStripeError } from '@/lib/stripe/utils/error-handling'
import type { UpdateSubscriptionRequest, UpdateSubscriptionResponse } from '@/lib/stripe/types'

async function getPlanUuidFromPriceId(priceId: string, request: NextRequest): Promise<string | null> {
  const { supabase } = await getAuthenticatedSupabaseClient(request)

  // Déterminer si on est en mode test
  const isTestMode = process.env.NODE_ENV === 'development' ||
                     process.env.NEXT_PUBLIC_STRIPE_TEST_MODE === 'true'

  // Chercher le plan par price_id (test ou prod selon l'environnement)
  const { data, error } = await supabase
    .from('plans')
    .select('id, plan_id')
    .or(
      isTestMode
        ? `test_stripe_price_id_monthly.eq.${priceId},test_stripe_price_id_yearly.eq.${priceId}`
        : `stripe_price_id_monthly.eq.${priceId},stripe_price_id_yearly.eq.${priceId}`
    )
    .single()

  if (error || !data) {
    console.warn(`⚠️ Plan non trouvé pour price_id ${priceId}`)
    return null
  }

  console.log(`✅ Plan trouvé: ${data.plan_id} (UUID: ${data.id}) pour price_id ${priceId}`)
  return data.id
}

export async function POST(request: NextRequest) {
  try {
    // Authentification Bearer token uniquement
    const { user, supabase } = await getAuthenticatedSupabaseClient(request)

    if (!user) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      )
    }

    // Récupérer les données de la requête
    const requestData: UpdateSubscriptionRequest = await request.json()
    const { newPriceId } = requestData

    if (!newPriceId) {
      return NextResponse.json(
        { error: 'Le nouveau price_id est requis' },
        { status: 400 }
      )
    }

    // Récupérer l'abonnement actuel de l'utilisateur
    const { data: subscription, error: subscriptionError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single()

    if (subscriptionError || !subscription) {
      return NextResponse.json(
        { error: 'Aucun abonnement actif trouvé' },
        { status: 404 }
      )
    }

    // Récupérer le plan UUID depuis le nouveau price_id
    const newPlanUuid = await getPlanUuidFromPriceId(newPriceId, request)

    if (!newPlanUuid) {
      return NextResponse.json(
        { error: 'Plan non trouvé pour ce price_id' },
        { status: 400 }
      )
    }

    // Vérifier si l'utilisateur essaie de passer au même plan
    if (subscription.plan_id === newPlanUuid) {
      return NextResponse.json(
        { error: 'Vous êtes déjà abonné à ce plan' },
        { status: 400 }
      )
    }

    // Initialiser Stripe
    const stripe = getStripeClient()

    // Récupérer l'abonnement Stripe complet
    const stripeSubscription = await stripe.subscriptions.retrieve(
      subscription.stripe_subscription_id
    )

    // Vérifier que l'abonnement a au moins un item
    if (!stripeSubscription.items.data.length) {
      return NextResponse.json(
        { error: 'Abonnement Stripe invalide' },
        { status: 400 }
      )
    }

    const subscriptionItemId = stripeSubscription.items.data[0].id

    // Modifier l'abonnement dans Stripe
    const updatedSubscription = await stripe.subscriptions.update(
      subscription.stripe_subscription_id,
      {
        items: [{
          id: subscriptionItemId,
          price: newPriceId,
        }],
        proration_behavior: 'create_prorations', // Calcul automatique du prorata
      }
    )

    console.log('✅ Abonnement Stripe mis à jour:', updatedSubscription.id)

    // Mettre à jour le plan_id dans Supabase
    await updateSubscription(subscription.stripe_subscription_id, {
      plan_id: newPlanUuid,
      updated_at: new Date().toISOString()
    })

    console.log('✅ Abonnement Supabase mis à jour avec le nouveau plan_id')

    // Calculer le montant du prorata si disponible
    const latestInvoice = updatedSubscription.latest_invoice
    let prorationAmount = 0

    if (latestInvoice && typeof latestInvoice === 'object' && 'amount_due' in latestInvoice) {
      prorationAmount = (latestInvoice as any).amount_due / 100 // Convertir de centimes en euros
    }

    const response: UpdateSubscriptionResponse = {
      success: true,
      message: 'Abonnement modifié avec succès',
      prorationAmount,
      newPlanId: newPlanUuid
    }

    return NextResponse.json(response, { status: 200 })

  } catch (error: any) {
    console.error('❌ Erreur lors de la modification d\'abonnement:', error)
    return handleStripeError(error)
  }
}
