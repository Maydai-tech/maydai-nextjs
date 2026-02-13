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

    // Parse request body
    const body = await request.json()

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
    if (!name || !description || !ai_category || !responsible_service || !company_id) {
      const missingFields = []
      if (!name) missingFields.push('name')
      if (!description) missingFields.push('description')
      if (!ai_category) missingFields.push('ai_category')
      if (!responsible_service) missingFields.push('responsible_service')
      if (!company_id) missingFields.push('company_id')

      return NextResponse.json({ 
        error: 'Missing required fields: name, description, ai_category, responsible_service, company_id',
        missing: missingFields 
      }, { status: 400 })
    }

    // Verify user has access to this company via user_companies
    const { data: userCompany, error: userCompanyError } = await supabase
      .from('user_companies')
      .select('company_id, role')
      .eq('user_id', user.id)
      .eq('company_id', company_id)
      .maybeSingle()

    if (userCompanyError) {
      return NextResponse.json({
        error: 'Error checking access permissions',
        code: 'DB_ERROR',
        details: userCompanyError.message
      }, { status: 500 })
    }

    if (!userCompany) {
      return NextResponse.json({
        error: 'Company not found or access denied',
        code: 'ACCESS_DENIED',
        details: 'User not associated with this company'
      }, { status: 403 })
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
      return NextResponse.json({
        error: 'Limite du plan atteinte',
        code: 'PLAN_LIMIT_REACHED',
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

    const { data: usecase, error: createError } = await supabase
      .from('usecases')
      .insert([insertData])
      .select()
      .single()

    if (createError) {
      return NextResponse.json({
        error: 'Error creating use case',
        details: createError.message,
        code: createError.code
      }, { status: 500 })
    }

    // Enregistrer l'événement de création dans l'historique
    await recordUseCaseHistory(supabase, usecase.id, user.id, 'created')

    // Si la company a MaydAI comme registre par défaut, créer la réponse E5.N9.Q7 (Oui + MaydAI)
    const { data: company } = await supabase
      .from('companies')
      .select('maydai_as_registry')
      .eq('id', company_id)
      .single()
    if (company?.maydai_as_registry === true) {
      const timestamp = new Date().toISOString()
      await supabase
        .from('usecase_responses')
        .upsert({
          usecase_id: usecase.id,
          question_code: 'E5.N9.Q7',
          conditional_main: 'E5.N9.Q7.B',
          conditional_keys: ['registry_type', 'system_name'],
          conditional_values: ['Interne', 'MaydAI'],
          single_value: null,
          multiple_codes: null,
          multiple_labels: null,
          answered_by: user.email || user.id,
          answered_at: timestamp,
          updated_at: timestamp
        }, { onConflict: 'usecase_id,question_code' })
    }

    return NextResponse.json(usecase, { status: 201 })

  } catch (error: any) {
    console.error('Error in usecases POST API:', error?.message)
    return NextResponse.json({
      error: 'Internal server error',
      message: error?.message
    }, { status: 500 })
  }
}