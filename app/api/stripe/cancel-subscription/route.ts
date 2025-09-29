import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedSupabaseClient } from '@/lib/api-auth'
import { cancelStripeSubscription } from '@/lib/stripe/services/subscription'
import { handleStripeError } from '@/lib/stripe/utils/error-handling'
import type { CancelSubscriptionResponse } from '@/lib/stripe/types'

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

    // Vérifier que l'abonnement n'est pas déjà marqué pour annulation
    if (subscription.cancel_at_period_end) {
      return NextResponse.json(
        { error: 'Cet abonnement est déjà programmé pour annulation' },
        { status: 400 }
      )
    }

    // Annuler l'abonnement dans Stripe (à la fin de la période)
    const cancelResult = await cancelStripeSubscription(
      subscription.stripe_subscription_id,
      false // Annulation à la fin de la période
    )

    if (!cancelResult.success) {
      return NextResponse.json(
        { error: cancelResult.message },
        { status: 400 }
      )
    }

    // Mettre à jour l'abonnement dans Supabase
    const { error: updateError } = await supabase
      .from('subscriptions')
      .update({
        cancel_at_period_end: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', subscription.id)

    if (updateError) {
      console.error('❌ Erreur lors de la mise à jour Supabase:', updateError)
      // L'annulation Stripe a réussi, mais pas la mise à jour locale
      // On peut continuer car le webhook Stripe synchronisera les données
    }

    const response: CancelSubscriptionResponse = {
      success: true,
      message: cancelResult.message,
      cancelAtPeriodEnd: cancelResult.cancelAtPeriodEnd,
      periodEnd: cancelResult.periodEnd
    }

    return NextResponse.json(response, { status: 200 })

  } catch (error: any) {
    console.error('❌ Erreur lors de l\'annulation d\'abonnement:', error)

    // Utiliser le gestionnaire d'erreurs Stripe existant
    return handleStripeError(error)
  }
}

// Méthode GET pour vérifier si l'annulation est possible
export async function GET(request: NextRequest) {
  try {
    // Authentification Bearer token uniquement
    const { user, supabase } = await getAuthenticatedSupabaseClient(request)

    if (!user) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      )
    }

    // Récupérer l'abonnement actuel
    const { data: subscription, error: subscriptionError } = await supabase
      .from('subscriptions')
      .select('stripe_subscription_id, status, cancel_at_period_end')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single()

    if (subscriptionError || !subscription) {
      return NextResponse.json({
        canCancel: false,
        reason: 'Aucun abonnement actif'
      })
    }

    const canCancel = !subscription.cancel_at_period_end

    return NextResponse.json({
      canCancel,
      reason: canCancel ? null : 'Abonnement déjà programmé pour annulation',
      currentStatus: subscription.status,
      cancelAtPeriodEnd: subscription.cancel_at_period_end
    })

  } catch (error) {
    console.error('❌ Erreur lors de la vérification d\'annulation:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}