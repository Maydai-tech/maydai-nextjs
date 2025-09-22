import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Initialiser Supabase avec les variables d'environnement côté serveur
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variables d\'environnement Supabase manquantes')
  console.error('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✅' : '❌')
  console.error('NEXT_PUBLIC_SUPABASE_ANON_KEY:', supabaseKey ? '✅' : '❌')
}

const supabase = createClient(supabaseUrl, supabaseKey)

export async function POST(request: NextRequest) {
  try {
    console.log('🧪 Test de synchronisation Stripe-Supabase...')
    
    // 1. D'abord, récupérer un utilisateur existant ou créer un profil de test
    const { data: existingUsers, error: usersError } = await supabase
      .from('profiles')
      .select('id')
      .limit(1)

    let userId: string

    if (usersError || !existingUsers || existingUsers.length === 0) {
      console.log('📝 Aucun utilisateur existant, création d\'un profil de test...')
      
      // Créer un profil de test
      const testProfile = {
        id: '00000000-0000-0000-0000-000000000001',
        email: 'test@example.com',
        full_name: 'Utilisateur Test',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .insert(testProfile)
        .select()

      if (profileError) {
        console.error('❌ Erreur création profil test:', profileError)
        return NextResponse.json(
          { 
            success: false, 
            error: `Erreur création profil: ${profileError.message}`,
            details: profileError 
          },
          { status: 500 }
        )
      }

      userId = profileData[0].id
      console.log('✅ Profil de test créé:', userId)
    } else {
      userId = existingUsers[0].id
      console.log('✅ Utilisation d\'un utilisateur existant:', userId)
    }
    
    // 2. Créer une subscription de test
    const testData = {
      user_id: userId,
      stripe_subscription_id: 'test_sub_' + Date.now(),
      stripe_customer_id: 'test_customer_123',
      plan_id: 'test_plan_monthly',
      status: 'active',
      current_period_start: new Date().toISOString(),
      current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // +30 jours
      cancel_at_period_end: false,
    }

    const { data, error } = await supabase
      .from('subscriptions')
      .insert(testData)
      .select()

    if (error) {
      console.error('❌ Erreur création test subscription:', error)
      return NextResponse.json(
        { 
          success: false, 
          error: error.message,
          details: error 
        },
        { status: 500 }
      )
    }

    console.log('✅ Test subscription créée avec succès:', data)
    
    return NextResponse.json({
      success: true,
      message: 'Subscription de test créée avec succès',
      data: data[0]
    })

  } catch (err) {
    console.error('❌ Erreur test sync:', err)
    return NextResponse.json(
      { 
        success: false, 
        error: err instanceof Error ? err.message : 'Erreur inconnue' 
      },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Récupération des subscriptions...')
    
    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('❌ Erreur récupération subscriptions:', error)
      return NextResponse.json(
        { 
          success: false, 
          error: error.message 
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      count: data?.length || 0,
      data: data || []
    })

  } catch (err) {
    console.error('❌ Erreur récupération:', err)
    return NextResponse.json(
      { 
        success: false, 
        error: err instanceof Error ? err.message : 'Erreur inconnue' 
      },
      { status: 500 }
    )
  }
}
