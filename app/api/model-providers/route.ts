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

    // Get all model providers that have tooltips configured, including those without models yet
    // This allows new providers to appear in the list even if they don't have models in compl_ai_models
    const { data: providers, error: providersError } = await supabase
      .from('model_providers')
      .select(`
        id, 
        name,
        tooltip_title,
        tooltip_short_content,
        tooltip_full_content,
        tooltip_icon,
        tooltip_rank,
        tooltip_rank_text
      `)
      .not('tooltip_title', 'is', null)
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

    // Clean the response to return id, name and tooltip data (remove compl_ai_models data)
    const cleanProviders = providers.map(provider => ({
      id: provider.id,
      name: provider.name,
      tooltip_title: provider.tooltip_title,
      tooltip_short_content: provider.tooltip_short_content,
      tooltip_full_content: provider.tooltip_full_content,
      tooltip_icon: provider.tooltip_icon,
      tooltip_rank: provider.tooltip_rank,
      tooltip_rank_text: provider.tooltip_rank_text
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