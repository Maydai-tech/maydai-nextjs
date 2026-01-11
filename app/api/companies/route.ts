import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { logger, createRequestContext } from '@/lib/secure-logger'
import { canCreateCompany } from '@/lib/collaborators'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Les variables d\'environnement NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY doivent être définies'
  )
}

// Service role client for admin operations (bypasses RLS)
const getServiceRoleClient = () => {
  if (!supabaseServiceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not defined')
  }
  return createClient(supabaseUrl!, supabaseServiceRoleKey)
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
    const { data: profileAccess, error: profileAccessError } = await supabase
      .from('user_profiles')
      .select('inviter_user_id, role')
      .eq('invited_user_id', user.id)

    if (profileAccessError) {
      console.error('Error fetching profile access:', profileAccessError)
    }

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

    // Get companies from use cases the user has access to
    // Use left join (no !inner) to avoid RLS errors when usecase access was revoked
    const { data: usecaseAccess, error: usecaseAccessError } = await supabase
      .from('user_usecases')
      .select(`
        usecase_id,
        usecases (
          company_id
        )
      `)
      .eq('user_id', user.id)

    if (usecaseAccessError) {
      console.error('Error fetching usecase access:', usecaseAccessError)
      // Don't fail the whole request, just continue without usecase-level access
    }

    if (usecaseAccess) {
      usecaseAccess.forEach(ua => {
        // Skip entries where usecase access was revoked (RLS blocks the join)
        // Supabase returns the joined relation as an object (not array) for single FK relationships
        const usecases = ua.usecases as unknown as { company_id: string } | null
        if (!usecases || !usecases.company_id) return

        const companyId = usecases.company_id
        companyIds.add(companyId)
        // Only set role if not already set by higher-level access
        if (!roleMap.has(companyId)) {
          roleMap.set(companyId, 'user')
        }
      })
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
    const canCreate = await canCreateCompany(user.id, supabase)
    if (!canCreate) {
      return NextResponse.json({
        error: 'You do not have permission to create new companies.'
      }, { status: 403 })
    }

    const body = await request.json()
    const { name, type } = body
    if (!name) {
      return NextResponse.json({ error: 'Champ name manquant' }, { status: 400 })
    }

    // Use service role client for write operations (bypasses RLS)
    // Authentication is already verified above, so this is safe
    const serviceClient = getServiceRoleClient()

    // Build insert data
    const insertData: { name: string; type?: string } = { name }
    if (type) {
      insertData.type = type
    }

    // Créer la compagnie
    const { data, error } = await serviceClient
      .from('companies')
      .insert([insertData])
      .select('id')
      .single()

    if (error) {
      return NextResponse.json({ error: "Erreur lors de la création du registre" }, { status: 500 })
    }

    // Créer une relation user_companies avec le rôle owner
    const { error: userCompanyError } = await serviceClient
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

    // Mettre à jour le current_company_id dans le profil
    await serviceClient
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