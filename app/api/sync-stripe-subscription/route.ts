import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

// Fonction pour initialiser Stripe
function getStripeClient() {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY manquante')
  }
  
  return new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2025-08-27.basil',
  })
}

// Fonction pour initialiser Supabase
function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Variables d\'environnement Supabase manquantes')
    throw new Error('Supabase configuration missing')
  }

  return createClient(supabaseUrl, supabaseKey)
}

export async function POST(request: NextRequest) {
  const stripe = getStripeClient() // Initialiser Stripe ici
  try {
    const { subscriptionId } = await request.json()

    if (!subscriptionId) {
      return NextResponse.json(
        { error: 'subscriptionId est requis' },
        { status: 400 }
      )
    }

    console.log('🔄 Synchronisation de la subscription Stripe:', subscriptionId)

    // 1. Récupérer la subscription depuis Stripe
    const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
      expand: ['customer']
    })

    console.log('📋 Subscription récupérée:', {
      id: subscription.id,
      status: subscription.status,
      customer: subscription.customer,
      items: subscription.items.data.length,
      current_period_start: (subscription as any).current_period_start,
      current_period_end: (subscription as any).current_period_end
    })

    // 2. Utiliser un utilisateur existant (la table profiles n'a pas de colonne email)
    const supabase = getSupabaseClient()
    const { data: testUser, error: testUserError } = await supabase
      .from('profiles')
      .select('id')
      .limit(1)
      .single()

    if (testUserError || !testUser) {
      return NextResponse.json(
        { error: 'Aucun utilisateur trouvé dans la table profiles' },
        { status: 500 }
      )
    }

    const userId = testUser.id
    console.log('✅ Utilisation d\'un utilisateur existant:', userId)

    // 3. Déterminer le plan_id basé sur le price_id
    const priceId = subscription.items.data[0]?.price.id
    const planId = getPlanIdFromPriceId(priceId)

    // 4. Créer ou mettre à jour la subscription dans Supabase
    console.log('🔧 Conversion des dates:', {
      current_period_start_raw: (subscription as any).current_period_start,
      current_period_end_raw: (subscription as any).current_period_end,
      current_period_start_js: new Date((subscription as any).current_period_start * 1000),
      current_period_end_js: new Date((subscription as any).current_period_end * 1000)
    })

    // Conversion sécurisée des dates
    const currentPeriodStart = (subscription as any).current_period_start 
      ? new Date((subscription as any).current_period_start * 1000).toISOString()
      : new Date().toISOString()
    
    const currentPeriodEnd = (subscription as any).current_period_end 
      ? new Date((subscription as any).current_period_end * 1000).toISOString()
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()

    const subscriptionData = {
      user_id: userId,
      stripe_subscription_id: subscription.id,
      stripe_customer_id: typeof subscription.customer === 'string' ? subscription.customer : subscription.customer?.id || 'unknown',
      plan_id: planId,
      status: subscription.status,
      current_period_start: currentPeriodStart,
      current_period_end: currentPeriodEnd,
      cancel_at_period_end: subscription.cancel_at_period_end || false,
    }

    const { data, error } = await supabase
      .from('subscriptions')
      .upsert(subscriptionData)
      .select()

    if (error) {
      console.error('❌ Erreur synchronisation subscription:', error)
      return NextResponse.json(
        { 
          success: false, 
          error: error.message,
          details: error 
        },
        { status: 500 }
      )
    }

    console.log('✅ Subscription synchronisée avec succès:', data[0])

    return NextResponse.json({
      success: true,
      message: 'Subscription synchronisée avec succès',
      data: data[0]
    })

  } catch (err) {
    console.error('❌ Erreur sync subscription:', err)
    return NextResponse.json(
      { 
        success: false, 
        error: err instanceof Error ? err.message : 'Erreur inconnue' 
      },
      { status: 500 }
    )
  }
}

// Fonction utilitaire pour déterminer le plan_id depuis le price_id
function getPlanIdFromPriceId(priceId: string | undefined): string {
  if (!priceId) return 'starter'

  // Mapping des price_id vers les plan_id (PRODUCTION)
  const priceToPlanMap: Record<string, string> = {
    'price_1SA8wX1ALRgJSDBxK8g4bH8q': 'starter', // Gratuit (PRICE ID)
    'price_1SA8t21ALRgJSDBxFaYrH1d7': 'pro', // 10€/mois (PRICE ID)
    'price_1SA8v81ALRgJSDBx0CDPDcid': 'pro', // 100€/an (PRICE ID)
    'price_1SA8xx1ALRgJSDBxUrh2lJwg': 'enterprise', // 1000€/mois (PRICE ID)
  }

  return priceToPlanMap[priceId] || 'starter'
}