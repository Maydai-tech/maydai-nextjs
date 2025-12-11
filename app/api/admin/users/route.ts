import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyAdminAuth } from '@/lib/admin-auth'

export async function GET(request: NextRequest) {
  console.log('=== Admin Users API called ===')
  
  // Vérifier l'authentification admin
  const authResult = await verifyAdminAuth(request)
  if (authResult.error) {
    console.log('Auth verification failed')
    return authResult.error
  }

  console.log('Auth verification successful for user:', authResult.user?.email)

  try {
    // Récupérer les paramètres de la requête
    const searchParams = request.nextUrl.searchParams
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const search = searchParams.get('search') || ''
    const roleFilter = searchParams.get('role') || ''
    const companyFilter = searchParams.get('company') || ''
    
    const offset = (page - 1) * limit

    // Créer le client Supabase admin
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    console.log('Environment check:', {
      hasSupabaseUrl: !!supabaseUrl,
      hasServiceKey: !!supabaseServiceKey,
      supabaseUrl: supabaseUrl?.substring(0, 30) + '...'
    })

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing environment variables')
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    console.log('Fetching users with params:', { page, limit, search, roleFilter, companyFilter })

    // Construire la requête de base
    // Note: user_companies a deux FK vers profiles (user_id et added_by)
    // On spécifie explicitement user_companies_user_id_fkey pour la relation
    let profilesQuery = supabase
      .from('profiles')
      .select(`
        id,
        first_name,
        last_name,
        role,
        company_id,
        created_at,
        updated_at,
        user_companies!user_companies_user_id_fkey (
          company_id,
          role,
          companies (
            id,
            name
          )
        )
      `)
      .range(offset, offset + limit - 1)
      .order('created_at', { ascending: false })

    // Appliquer les filtres
    if (roleFilter) {
      profilesQuery = profilesQuery.eq('role', roleFilter)
    }
    // Note: Le filtre par entreprise doit maintenant se faire après la récupération
    // car il faut filtrer sur user_companies

    // Pour la recherche, on doit faire deux requêtes séparées car on ne peut pas filtrer sur auth.users
    const { data: profiles, error: profilesError } = await profilesQuery

    console.log("profiles: ", profiles)


    if (profilesError) {
      console.error('Error fetching profiles:', JSON.stringify(profilesError, null, 2))
      return NextResponse.json(
        { error: 'Failed to fetch users', details: profilesError.message, code: profilesError.code, hint: profilesError.hint },
        { status: 500 }
      )
    }

    console.log('Profiles found:', profiles?.length || 0)

    if (!profiles || profiles.length === 0) {
      return NextResponse.json({
        users: [],
        pagination: {
          page,
          limit,
          total: 0,
          totalPages: 0
        }
      })
    }

    // Récupérer les emails depuis auth.users pour chaque profil
    const usersWithEmail = await Promise.all(
      profiles.map(async (profile) => {
        try {
          const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(profile.id)
          
          if (authError) {
            console.error(`Error fetching auth user ${profile.id}:`, authError)
          }

          const email = authUser?.user?.email || 'N/A'
          const last_sign_in_at = authUser?.user?.last_sign_in_at || null

          // Récupérer les entreprises depuis user_companies
          const userCompanies = profile.user_companies
            ?.filter((uc: any) => uc.companies)
            ?.map((uc: any) => ({
              id: uc.companies.id,
              name: uc.companies.name,
              role: uc.role
            })) || []

          // Appliquer le filtre de recherche côté serveur
          if (search) {
            const searchLower = search.toLowerCase()
            const emailMatch = email.toLowerCase().includes(searchLower)
            const firstNameMatch = profile.first_name?.toLowerCase().includes(searchLower) || false
            const lastNameMatch = profile.last_name?.toLowerCase().includes(searchLower) || false
            
            if (!emailMatch && !firstNameMatch && !lastNameMatch) {
              return null // Filtrer cet utilisateur
            }
          }

          // Appliquer le filtre par entreprise
          if (companyFilter) {
            const hasCompany = userCompanies.some((uc: any) => uc.id === companyFilter)
            if (!hasCompany) {
              return null // Filtrer cet utilisateur
            }
          }

          return {
            id: profile.id,
            email,
            first_name: profile.first_name,
            last_name: profile.last_name,
            role: profile.role,
            companies: userCompanies,
            created_at: profile.created_at,
            last_sign_in_at,
            updated_at: profile.updated_at
          }
        } catch (error) {
          console.error(`Error processing profile ${profile.id}:`, error)
          // En cas d'erreur, récupérer quand même les entreprises
          const userCompanies = profile.user_companies
            ?.filter((uc: any) => uc.companies)
            ?.map((uc: any) => ({
              id: uc.companies.id,
              name: uc.companies.name,
              role: uc.role
            })) || []
          
          return {
            id: profile.id,
            email: 'Error',
            first_name: profile.first_name,
            last_name: profile.last_name,
            role: profile.role,
            companies: userCompanies,
            created_at: profile.created_at,
            last_sign_in_at: null,
            updated_at: profile.updated_at
          }
        }
      })
    )

    // Filtrer les résultats null (utilisateurs filtrés par la recherche)
    const filteredUsers = usersWithEmail.filter(user => user !== null)

    console.log('Users after email fetch and filtering:', filteredUsers.length)

    // Compter le total pour la pagination (sans filtres de recherche et entreprise car c'est complexe avec user_companies)
    let countQuery = supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })

    if (roleFilter) {
      countQuery = countQuery.eq('role', roleFilter)
    }
    // Note: Le filtre par entreprise n'est pas appliqué ici car il nécessiterait une jointure complexe

    const { count: totalCount, error: countError } = await countQuery

    if (countError) {
      console.error('Error counting profiles:', countError)
    }

    const total = totalCount || 0
    const totalPages = Math.ceil(total / limit)

    console.log('Pagination info:', { total, totalPages, page })

    return NextResponse.json({
      users: filteredUsers,
      pagination: {
        page,
        limit,
        total,
        totalPages
      }
    })

  } catch (error) {
    console.error('Admin users API error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}