import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Les variables d\'environnement NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY doivent être définies'
  )
}

// Convertir le format DD/MM/YYYY vers YYYY-MM-DD pour PostgreSQL
const convertDateFormat = (dateString: string): string | null => {
  if (!dateString) return null
  
  // Vérifier le format DD/MM/YYYY
  const match = dateString.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (!match) return dateString // Retourner tel quel si déjà au bon format ou autre format
  
  const [, day, month, year] = match
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
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

    // Get user's profile to find company_id
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', user.id)
      .single()

    if (profileError) {
      return NextResponse.json({ error: 'Error fetching profile' }, { status: 500 })
    }

    // If user has a company_id, fetch use cases for that company
    if (profile.company_id) {
      const { data: usecases, error: usecasesError } = await supabase
        .from('usecases')
        .select(`
          *,
          companies(name)
        `)
        .eq('company_id', profile.company_id)
        .order('created_at', { ascending: false })

      if (usecasesError) {
        return NextResponse.json({ error: 'Error fetching use cases' }, { status: 500 })
      }

      return NextResponse.json(usecases || [])
    }

    // Return empty array if no company associated
    return NextResponse.json([])

  } catch (error) {
    console.error('Error in usecases API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  console.log('=== DEBUG API: POST /api/usecases ===')
  
  try {
    const authHeader = request.headers.get('authorization')
    console.log('Auth header présent:', !!authHeader)
    
    if (!authHeader) {
      return NextResponse.json({ error: 'No authorization header' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    console.log('Token extrait (premiers caractères):', token.substring(0, 20) + '...')
    
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
    console.log('User auth result:', { userId: user?.id, error: authError })
    
    if (authError || !user) {
      console.error('Auth error:', authError)
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    // Parse request body
    const body = await request.json()
    console.log('Body reçu:', JSON.stringify(body, null, 2))
    
    const {
      name,
      deployment_date,
      responsible_service,
      technology_partner,
      llm_model_version,
      ai_category,
      system_type,
      description,
      status,
      risk_level,
      company_id
    } = body

    // Validate required fields
    console.log('Validation des champs requis:', {
      name: !!name,
      description: !!description,
      ai_category: !!ai_category,
      responsible_service: !!responsible_service,
      company_id: !!company_id
    })
    
    if (!name || !description || !ai_category || !responsible_service || !company_id) {
      const missingFields = []
      if (!name) missingFields.push('name')
      if (!description) missingFields.push('description')
      if (!ai_category) missingFields.push('ai_category')
      if (!responsible_service) missingFields.push('responsible_service')
      if (!company_id) missingFields.push('company_id')
      
      console.error('Champs manquants:', missingFields)
      
      return NextResponse.json({ 
        error: 'Missing required fields: name, description, ai_category, responsible_service, company_id',
        missing: missingFields 
      }, { status: 400 })
    }

    // Verify user has access to this company
    console.log('Récupération du profil pour user:', user.id)
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', user.id)
      .single()

    console.log('Profile result:', { profile, error: profileError })

    if (profileError) {
      console.error('Profile error:', profileError)
      return NextResponse.json({ error: 'Error fetching profile' }, { status: 500 })
    }

    // Check if user is associated with the company or if it's an admin request
    console.log('Vérification accès company:', {
      userCompanyId: profile.company_id,
      requestedCompanyId: company_id,
      match: profile.company_id === company_id
    })
    
    if (profile.company_id !== company_id) {
      // Additional check: verify the company exists and user has access
      console.log('User company_id ne correspond pas, vérification de l\'existence de la company')
      const { data: company, error: companyError } = await supabase
        .from('companies')
        .select('id')
        .eq('id', company_id)
        .single()

      console.log('Company check result:', { company, error: companyError })

      if (companyError || !company) {
        console.error('Company not found or access denied')
        return NextResponse.json({ error: 'Company not found or access denied' }, { status: 403 })
      }
    }

    // Create the use case
    const insertData = {
      name,
      deployment_date: convertDateFormat(deployment_date),
      responsible_service,
      technology_partner,
      llm_model_version,
      ai_category,
      system_type,
      description,
      status: status || 'draft',
      risk_level,
      company_id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
    
    console.log('Données à insérer dans usecases:', JSON.stringify(insertData, null, 2))
    
    const { data: usecase, error: createError } = await supabase
      .from('usecases')
      .insert([insertData])
      .select()
      .single()

    console.log('Insert result:', { usecase, error: createError })

    if (createError) {
      console.error('=== ERREUR lors de l\'insertion ===')
      console.error('Error details:', JSON.stringify(createError, null, 2))
      console.error('Error message:', createError.message)
      console.error('Error code:', createError.code)
      console.error('Error hint:', createError.hint)
      console.error('Error details:', createError.details)
      return NextResponse.json({ 
        error: 'Error creating use case',
        details: createError.message,
        code: createError.code 
      }, { status: 500 })
    }

    console.log('Use case créé avec succès:', usecase)
    return NextResponse.json(usecase, { status: 201 })

  } catch (error: any) {
    console.error('=== ERREUR GÉNÉRALE dans POST API ===')
    console.error('Error type:', error?.constructor?.name)
    console.error('Error message:', error?.message)
    console.error('Error stack:', error?.stack)
    return NextResponse.json({ 
      error: 'Internal server error',
      message: error?.message 
    }, { status: 500 })
  }
}