import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Les variables d\'environnement NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY doivent être définies'
  )
}

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'No authorization header' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    
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

    // Get only model providers that have at least one model
    const { data: providers, error: providersError } = await supabase
      .from('model_providers')
      .select(`
        id, 
        name,
        compl_ai_models!inner(id)
      `)
      .order('name', { ascending: true })

    if (providersError) {
      console.error('Error fetching model providers:', providersError)
      return NextResponse.json(
        { error: 'Erreur lors de la récupération des fournisseurs' },
        { status: 500 }
      )
    }

    // Return empty array if no providers found (no fallback)
    if (!providers || providers.length === 0) {
      return NextResponse.json([])
    }

    // Clean the response to only return id and name (remove compl_ai_models data)
    const cleanProviders = providers.map(provider => ({
      id: provider.id,
      name: provider.name
    }))

    return NextResponse.json(cleanProviders)
  } catch (error) {
    console.error('Error in model-providers API:', error)
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    )
  }
}