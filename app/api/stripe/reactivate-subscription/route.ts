import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedSupabaseClient } from '@/lib/api-auth'
import { reactivateStripeSubscription } from '@/lib/stripe/services/subscription'
import { updateSubscription } from '@/lib/stripe/services/supabase'
import { handleStripeError } from '@/lib/stripe/utils/error-handling'

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

    // Vérifier que l'abonnement est bien marqué pour annulation
    if (!subscription.cancel_at_period_end) {
      return NextResponse.json(
        { error: 'Cet abonnement n\'est pas marqué pour annulation' },
        { status: 400 }
      )
    }

    // Réactiver l'abonnement dans Stripe
    const reactivateResult = await reactivateStripeSubscription(
      subscription.stripe_subscription_id
    )

    if (!reactivateResult.success) {
      return NextResponse.json(
        { error: 'Erreur lors de la réactivation de l\'abonnement' },
        { status: 400 }
      )
    }

    // Mettre à jour Supabase pour synchroniser cancel_at_period_end
    await updateSubscription(subscription.stripe_subscription_id, {
      cancel_at_period_end: false,
      updated_at: new Date().toISOString()
    })

    console.log('✅ Abonnement réactivé avec succès:', subscription.stripe_subscription_id)

    return NextResponse.json({
      success: true,
      message: 'Abonnement réactivé avec succès'
    }, { status: 200 })

  } catch (error: any) {
    console.error('❌ Erreur lors de la réactivation d\'abonnement:', error)
    return handleStripeError(error)
  }
}
