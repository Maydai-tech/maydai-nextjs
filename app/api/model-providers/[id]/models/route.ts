import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Les variables d\'environnement NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY doivent être définies'
  )
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'No authorization header' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const { id: providerId } = await params
    
    // Validate provider ID
    if (!providerId || isNaN(Number(providerId))) {
      return NextResponse.json({ error: 'Invalid provider ID' }, { status: 400 })
    }
    
    // Create Supabase client with the user's token
    const supabase = createClient(supabaseUrl!, supabaseAnonKey!, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    })
    
    // Verify the token and get user
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    // Get models for the specific provider
    const { data: models, error: modelsError } = await supabase
      .from('compl_ai_models')
      .select('id, model_name, model_type, version, notes_short, notes_long, variants, launch_date')
      .eq('model_provider_id', providerId)
      .order('launch_date', { ascending: false, nullsFirst: false })
      .order('model_name', { ascending: true })

    if (modelsError) {
      console.error('Error fetching models:', modelsError)
      return NextResponse.json(
        { error: 'Erreur lors de la récupération des modèles' },
        { status: 500 }
      )
    }

    // Return empty array if no models found (no fallback)
    if (!models || models.length === 0) {
      return NextResponse.json([])
    }

    return NextResponse.json(models)
  } catch (error) {
    console.error('Error in model-providers/[id]/models API:', error)
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    )
  }
}