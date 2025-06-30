import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { logger, createRequestContext } from '@/lib/secure-logger'

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

    // For now, we'll fetch all companies where the user is in the profiles table
    // Later we can implement a proper user-company relationship table
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', user.id)
      .single()

    if (profileError) {
      return NextResponse.json({ error: 'Error fetching profile' }, { status: 500 })
    }

    // If user has a company_id, fetch all companies they have access to
    // For now, this means their primary company, but this can be extended
    if (profile.company_id) {
      const { data: companies, error: companiesError } = await supabase
        .from('companies')
        .select('*')
        .eq('id', profile.company_id)

      if (companiesError) {
        return NextResponse.json({ error: 'Error fetching companies' }, { status: 500 })
      }

      return NextResponse.json(companies || [])
    }

    // Return empty array if no company associated
    return NextResponse.json([])

  } catch (error) {
    const context = createRequestContext(request)
    logger.error('Failed to fetch companies', error, context)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'No authorization header' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const supabase = createClient(supabaseUrl!, supabaseAnonKey!, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    })

    // Vérifier l'utilisateur
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const body = await request.json()
    const { name, industry, city, country } = body
    if (!name || !industry || !city || !country) {
      return NextResponse.json({ error: 'Champs manquants' }, { status: 400 })
    }

    // Créer la compagnie
    const { data, error } = await supabase
      .from('companies')
      .insert([{ name, industry, city, country }])
      .select('id')
      .single()

    if (error) {
      return NextResponse.json({ error: "Erreur lors de la création de l'entreprise" }, { status: 500 })
    }

    // Optionnel : mettre à jour le profil de l'utilisateur avec la nouvelle company_id
    await supabase
      .from('profiles')
      .update({ company_id: data.id })
      .eq('id', user.id)

    return NextResponse.json({ id: data.id })
  } catch (error) {
    const context = createRequestContext(request)
    logger.error('Failed to create company', error, context)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
} 