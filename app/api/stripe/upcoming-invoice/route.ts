import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedSupabaseClient } from '@/lib/api-auth'
import { getUpcomingInvoice } from '@/lib/stripe/services/subscription'
import type { UpcomingInvoiceResponse } from '@/lib/stripe/types'

/**
 * Route API pour récupérer la prochaine facture à venir
 * GET /api/stripe/upcoming-invoice
 *
 * Récupère la prochaine facture depuis Stripe avec le montant TTC incluant les taxes
 */
export async function GET(request: NextRequest) {
  try {
    // 1. Récupérer l'utilisateur connecté avec authentification Bearer
    const { user, supabase } = await getAuthenticatedSupabaseClient(request)

    if (!user) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      )
    }

    // 2. Récupérer l'abonnement de l'utilisateur pour obtenir customer_id et subscription_id
    const { data: subscription, error: subError } = await supabase
      .from('subscriptions')
      .select('stripe_customer_id, stripe_subscription_id, status')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (subError) {
      console.error('Erreur lors de la récupération de l\'abonnement:', subError)
      return NextResponse.json(
        { error: 'Erreur lors de la récupération de l\'abonnement' },
        { status: 500 }
      )
    }

    // 3. Vérifier qu'il y a un abonnement actif
    if (!subscription || !subscription.stripe_customer_id || !subscription.stripe_subscription_id) {
      return NextResponse.json<UpcomingInvoiceResponse>(
        {
          success: false,
          amount_due: 0,
          subtotal: 0,
          tax: 0,
          total: 0,
          currency: 'eur',
          period_start: 0,
          period_end: 0,
          error: 'Aucun abonnement actif'
        },
        { status: 200 }
      )
    }

    // 4. Récupérer la facture à venir depuis Stripe
    const invoiceData = await getUpcomingInvoice(
      subscription.stripe_customer_id,
      subscription.stripe_subscription_id
    )

    // 5. Retourner les données
    return NextResponse.json<UpcomingInvoiceResponse>(invoiceData, { status: 200 })

  } catch (error: any) {
    console.error('❌ Erreur dans /api/stripe/upcoming-invoice:', error)

    return NextResponse.json<UpcomingInvoiceResponse>(
      {
        success: false,
        amount_due: 0,
        subtotal: 0,
        tax: 0,
        total: 0,
        currency: 'eur',
        period_start: 0,
        period_end: 0,
        error: error.message || 'Erreur lors de la récupération de la facture'
      },
      { status: 500 }
    )
  }
}
