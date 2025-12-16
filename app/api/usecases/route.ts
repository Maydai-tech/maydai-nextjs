import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { recordUseCaseHistory } from '@/lib/usecase-history'
import { getRegistryOwnerPlan } from '@/lib/subscription/user-plan'

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

    // Get user's companies via user_companies table
    const { data: userCompanies, error: userCompaniesError } = await supabase
      .from('user_companies')
      .select('company_id')
      .eq('user_id', user.id)

    if (userCompaniesError) {
      return NextResponse.json({ error: 'Error fetching user companies' }, { status: 500 })
    }

    if (!userCompanies || userCompanies.length === 0) {
      return NextResponse.json([])
    }

    // Get company IDs the user has access to
    const companyIds = userCompanies.map(uc => uc.company_id)

    // Fetch use cases for all companies the user has access to
    const { data: usecases, error: usecasesError } = await supabase
      .from('usecases')
      .select(`
        *,
        companies(name)
      `)
      .in('company_id', companyIds)
      .order('created_at', { ascending: false })

    if (usecasesError) {
      return NextResponse.json({ error: 'Error fetching use cases' }, { status: 500 })
    }

    return NextResponse.json(usecases || [])

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
      primary_model_id,
      ai_category,
      system_type,
      deployment_countries,
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

    // Verify user has access to this company via user_companies
    console.log('Vérification accès company via user_companies pour user:', user.id, 'company:', company_id)
    const { data: userCompany, error: userCompanyError } = await supabase
      .from('user_companies')
      .select('company_id, role')
      .eq('user_id', user.id)
      .eq('company_id', company_id)
      .single()

    console.log('User company check result:', { userCompany, error: userCompanyError })

    if (userCompanyError || !userCompany) {
      console.error('Company not found or access denied')
      return NextResponse.json({ error: 'Company not found or access denied' }, { status: 403 })
    }

    // Vérifier les limites du plan du propriétaire du registre
    const ownerPlan = await getRegistryOwnerPlan(company_id, supabase)
    const maxUseCases = ownerPlan.planInfo.maxUseCasesPerRegistry || 3

    // Compter les use cases existants pour ce registre
    const { count: currentUseCaseCount, error: countError } = await supabase
      .from('usecases')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', company_id)

    if (countError) {
      console.error('Erreur lors du comptage des use cases:', countError)
      return NextResponse.json({ error: 'Error checking use case limit' }, { status: 500 })
    }

    if ((currentUseCaseCount || 0) >= maxUseCases) {
      console.log('Limite de use cases atteinte:', currentUseCaseCount, '/', maxUseCases)
      return NextResponse.json({
        error: 'Limite du plan atteinte',
        limit: maxUseCases,
        current: currentUseCaseCount
      }, { status: 403 })
    }

    // Parse deployment_countries from string to array if needed
    let countriesArray: string[] = []
    if (deployment_countries) {
      if (typeof deployment_countries === 'string') {
        // Split by comma and clean up
        countriesArray = deployment_countries.split(',').map(country => country.trim()).filter(Boolean)
      } else if (Array.isArray(deployment_countries)) {
        countriesArray = deployment_countries
      }
    }

    // Create the use case
    const insertData = {
      name,
      deployment_date: convertDateFormat(deployment_date),
      responsible_service,
      technology_partner,
      llm_model_version,
      primary_model_id,
      ai_category,
      system_type,
      deployment_countries: countriesArray,
      description,
      status: status || 'draft',
      risk_level,
      company_id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      updated_by: user.id
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

    // Enregistrer l'événement de création dans l'historique
    await recordUseCaseHistory(supabase, usecase.id, user.id, 'created')

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