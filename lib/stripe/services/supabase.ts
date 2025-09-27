import { createClient } from '@supabase/supabase-js'
import Stripe from 'stripe'
import { getPlanIdFromPriceId } from '../config/plans'

interface SubscriptionData {
  user_id: string
  stripe_subscription_id: string
  stripe_customer_id: string
  plan_id: string
  status: string
  current_period_start: string
  current_period_end: string
  cancel_at_period_end: boolean
}

interface SubscriptionUpdateData {
  status?: string
  current_period_start?: string
  current_period_end?: string
  cancel_at_period_end?: boolean
  updated_at?: string
}

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase configuration missing')
  }

  return createClient(supabaseUrl, supabaseKey)
}

export async function createSubscription(subscriptionData: SubscriptionData) {
  const supabase = getSupabaseClient()
  
  const { data, error } = await supabase
    .from('subscriptions')
    .upsert(subscriptionData)
    .select()

  if (error) {
    throw new Error(`Error creating subscription: ${error.message}`)
  }

  return data[0]
}

export async function updateSubscription(stripeSubscriptionId: string, updateData: SubscriptionUpdateData) {
  const supabase = getSupabaseClient()
  
  const { data, error } = await supabase
    .from('subscriptions')
    .update({
      ...updateData,
      updated_at: new Date().toISOString()
    })
    .eq('stripe_subscription_id', stripeSubscriptionId)
    .select()

  if (error) {
    throw new Error(`Error updating subscription: ${error.message}`)
  }

  return data[0]
}

export async function getSubscriptionByStripeId(stripeSubscriptionId: string) {
  const supabase = getSupabaseClient()
  
  const { data, error } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('stripe_subscription_id', stripeSubscriptionId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return null
    }
    throw new Error(`Error getting subscription: ${error.message}`)
  }

  return data
}

export async function getSubscriptionByUserId(userId: string) {
  const supabase = getSupabaseClient()
  
  const { data, error } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return null
    }
    throw new Error(`Error getting user subscription: ${error.message}`)
  }

  return data
}

export async function deleteSubscription(stripeSubscriptionId: string) {
  const supabase = getSupabaseClient()
  
  const { error } = await supabase
    .from('subscriptions')
    .update({
      status: 'canceled',
      updated_at: new Date().toISOString()
    })
    .eq('stripe_subscription_id', stripeSubscriptionId)

  if (error) {
    throw new Error(`Error deleting subscription: ${error.message}`)
  }

  return true
}

export async function syncSubscriptionFromStripe(stripeSubscription: Stripe.Subscription, stripe: Stripe, sessionUserId?: string) {
  let userId: string | null = null

  // 1. Essayer les métadonnées de la subscription
  if (stripeSubscription.metadata?.user_id) {
    userId = stripeSubscription.metadata.user_id
  }
  // 2. Essayer les métadonnées du customer
  else if (stripeSubscription.customer) {
    let customer: Stripe.Customer | null = null

    // Vérifier si customer est déjà un objet ou juste un ID
    if (typeof stripeSubscription.customer === 'string') {
      customer = await stripe.customers.retrieve(stripeSubscription.customer) as Stripe.Customer
    } else if (typeof stripeSubscription.customer === 'object' && stripeSubscription.customer.id) {
      customer = stripeSubscription.customer as Stripe.Customer
    }

    if (customer && !customer.deleted && customer.metadata?.user_id) {
      userId = customer.metadata.user_id
    }
  }

  // 3. Utiliser le fallback de la session checkout
  if (!userId && sessionUserId) {
    userId = sessionUserId
  }

  if (!userId) {
    console.error('❌ Aucun user_id trouvé pour la subscription:', {
      subscriptionId: stripeSubscription.id,
      subscriptionMetadata: stripeSubscription.metadata,
      customerType: typeof stripeSubscription.customer,
      sessionUserId: sessionUserId
    })
    throw new Error('No user_id found for subscription')
  }

  const planId = getPlanIdFromPriceId(stripeSubscription.items.data[0]?.price.id)

  // Récupérer l'ID du customer (string ou depuis l'objet)
  const customerId = typeof stripeSubscription.customer === 'string'
    ? stripeSubscription.customer
    : stripeSubscription.customer?.id || ''

  const subscriptionData: SubscriptionData = {
    user_id: userId,
    stripe_subscription_id: stripeSubscription.id,
    stripe_customer_id: customerId,
    plan_id: planId,
    status: stripeSubscription.status,
    current_period_start: (stripeSubscription as any).current_period_start 
      ? new Date((stripeSubscription as any).current_period_start * 1000).toISOString()
      : new Date().toISOString(),
    current_period_end: (stripeSubscription as any).current_period_end 
      ? new Date((stripeSubscription as any).current_period_end * 1000).toISOString()
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    cancel_at_period_end: stripeSubscription.cancel_at_period_end,
  }

  const existingSubscription = await getSubscriptionByStripeId(stripeSubscription.id)
  
  if (existingSubscription) {
    return await updateSubscription(stripeSubscription.id, {
      status: subscriptionData.status,
      current_period_start: subscriptionData.current_period_start,
      current_period_end: subscriptionData.current_period_end,
      cancel_at_period_end: subscriptionData.cancel_at_period_end
    })
  } else {
    return await createSubscription(subscriptionData)
  }
}
