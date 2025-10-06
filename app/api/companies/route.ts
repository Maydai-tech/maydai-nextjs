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

    if (userCompaniesError) {
      return NextResponse.json({ error: 'Error fetching user companies' }, { status: 500 })
    }

    if (!userCompanies || userCompanies.length === 0) {
      return NextResponse.json([])
    }

    const companyIds = userCompanies.map(uc => uc.company_id)

    // Fetch companies using the .in() method
    const { data: companies, error: companiesError } = await supabase
      .from('companies')
      .select('*')
      .in('id', companyIds)

    if (companiesError) {
      console.error('Error fetching companies:', companiesError)
      return NextResponse.json({ error: 'Error fetching companies' }, { status: 500 })
    }

    // Create a map of companyId -> role
    const roleMap = new Map(userCompanies.map(uc => [uc.company_id, uc.role]))

    // Enrich companies with user role
    const companiesWithRole = companies?.map(company => ({
      ...company,
      role: roleMap.get(company.id)
    })) || []

    return NextResponse.json(companiesWithRole)

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

    // Check if user is only a collaborator (has only 'user' roles, no 'owner' roles)
    const { data: userCompanies, error: checkError } = await supabase
      .from('user_companies')
      .select('role')
      .eq('user_id', user.id)
      .eq('is_active', true)

    if (checkError) {
      return NextResponse.json({ error: 'Error checking user permissions' }, { status: 500 })
    }

    // If user has any companies and ALL of them are as 'user' role (collaborator), deny creation
    if (userCompanies && userCompanies.length > 0) {
      const hasOwnerRole = userCompanies.some(uc => uc.role === 'owner' || uc.role === 'company_owner')
      const hasOnlyUserRole = userCompanies.every(uc => uc.role === 'user')

      if (hasOnlyUserRole && !hasOwnerRole) {
        return NextResponse.json({
          error: 'Collaborators cannot create new companies. Only company owners can create new companies.'
        }, { status: 403 })
      }
    }

    const body = await request.json()
    const { name} = body
    if (!name ) {
      return NextResponse.json({ error: 'Champ name manquant' }, { status: 400 })
    }

    // Créer la compagnie
    const { data, error } = await supabase
      .from('companies')
      .insert([{ name }])
      .select('id')
      .single()

    if (error) {
      return NextResponse.json({ error: "Erreur lors de la création du registre" }, { status: 500 })
    }

    // Créer une relation user_companies avec le rôle company_owner
    const { error: userCompanyError } = await supabase
      .from('user_companies')
      .insert([{
        user_id: user.id,
        company_id: data.id,
        role: 'owner',
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