import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { logger, createRequestContext } from '@/lib/secure-logger'
import { canCreateCompany } from '@/lib/collaborators'

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
    
    // Get companies the user has direct access to via user_companies
    const { data: userCompanies, error: userCompaniesError } = await supabase
      .from('user_companies')
      .select('company_id, role')
      .eq('user_id', user.id)

    if (userCompaniesError) {
      return NextResponse.json({ error: 'Error fetching user companies' }, { status: 500 })
    }

    const companyIds = new Set<string>()
    const roleMap = new Map<string, string>()

    // Add companies from user_companies
    if (userCompanies) {
      userCompanies.forEach(uc => {
        companyIds.add(uc.company_id)
        roleMap.set(uc.company_id, uc.role)
      })
    }

    // Check if user has profile-level access
    const { data: profileAccess } = await supabase
      .from('user_profiles')
      .select('inviter_user_id, role')
      .eq('invited_user_id', user.id)

    // If user has profile-level access, get only companies where the inviter is owner
    if (profileAccess && profileAccess.length > 0) {
      for (const access of profileAccess) {
        const { data: inviterCompanies } = await supabase
          .from('user_companies')
          .select('company_id')
          .eq('user_id', access.inviter_user_id)
          .in('role', ['owner', 'company_owner'])

        if (inviterCompanies) {
          inviterCompanies.forEach(ic => {
            companyIds.add(ic.company_id)
            // Profile-level access inherits the role from user_profiles
            if (!roleMap.has(ic.company_id)) {
              roleMap.set(ic.company_id, access.role)
            }
          })
        }
      }
    }

    if (companyIds.size === 0) {
      return NextResponse.json([])
    }

    const companyIdsArray = Array.from(companyIds)

    // Fetch companies using the .in() method
    const { data: companies, error: companiesError } = await supabase
      .from('companies')
      .select('*')
      .in('id', companyIdsArray)

    if (companiesError) {
      console.error('Error fetching companies:', companiesError)
      return NextResponse.json({ error: 'Error fetching companies' }, { status: 500 })
    }

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

    // Check if user can create companies
    // Users can create companies if they:
    // 1. Have profile-level access (are collaborators at account level), OR
    // 2. Have at least one 'owner' role in user_companies
    const canCreate = await canCreateCompany(user.id)

    if (!canCreate) {
      return NextResponse.json({
        error: 'You do not have permission to create new companies.'
      }, { status: 403 })
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

    // Créer une relation user_companies avec le rôle owner
    const { error: userCompanyError } = await supabase
      .from('user_companies')
      .insert([{
        user_id: user.id,
        company_id: data.id,
        role: 'owner',
        added_by: user.id
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