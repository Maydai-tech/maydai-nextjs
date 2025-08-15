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

    // TEMPORARY: Use hybrid approach - check both user_companies and profiles.company_id
    // This ensures compatibility while RLS policies are being updated
    
    // First, try to get companies via user_companies table
    const { data: userCompanies, error: userCompaniesError } = await supabase
      .from('user_companies')
      .select('company_id, role')
      .eq('user_id', user.id)
      .eq('is_active', true)

    let companyIds: string[] = []
    
    if (userCompanies && userCompanies.length > 0) {
      companyIds = userCompanies.map(uc => uc.company_id)
    } else {
      // Fallback to profiles.company_id for users not yet migrated
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user.id)
        .single()

      if (profile?.company_id) {
        companyIds = [profile.company_id]
      }
    }

    if (companyIds.length === 0) {
      return NextResponse.json([])
    }

    // Fetch companies using the .in() method
    const { data: companies, error: companiesError } = await supabase
      .from('companies')
      .select('*')
      .in('id', companyIds)

    if (companiesError) {
      console.error('Error fetching companies:', companiesError)
      return NextResponse.json({ error: 'Error fetching companies' }, { status: 500 })
    }

    return NextResponse.json(companies || [])

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

    // Créer une relation user_companies avec le rôle company_owner
    const { error: userCompanyError } = await supabase
      .from('user_companies')
      .insert([{
        user_id: user.id,
        company_id: data.id,
        role: 'company_owner',
        is_active: true
      }])

    if (userCompanyError) {
      return NextResponse.json({ error: "Erreur lors de la création de la relation utilisateur-entreprise" }, { status: 500 })
    }

    // Optionnel : mettre à jour le current_company_id dans le profil
    await supabase
      .from('profiles')
      .update({ current_company_id: data.id })
      .eq('id', user.id)

    return NextResponse.json({ id: data.id })
  } catch (error) {
    const context = createRequestContext(request)
    logger.error('Failed to create company', error, context)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
} 