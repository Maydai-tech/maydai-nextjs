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
      ai_category,
      system_type,
      description,
      status,
      risk_level,
      company_id
    } = body

    // Validate required fields
    if (!name || !description || !ai_category || !responsible_service || !company_id) {
      return NextResponse.json({ 
        error: 'Missing required fields: name, description, ai_category, responsible_service, company_id' 
      }, { status: 400 })
    }

    // Verify user has access to this company
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', user.id)
      .single()

    if (profileError) {
      return NextResponse.json({ error: 'Error fetching profile' }, { status: 500 })
    }

    // Check if user is associated with the company or if it's an admin request
    if (profile.company_id !== company_id) {
      // Additional check: verify the company exists and user has access
      const { data: company, error: companyError } = await supabase
        .from('companies')
        .select('id')
        .eq('id', company_id)
        .single()

      if (companyError || !company) {
        return NextResponse.json({ error: 'Company not found or access denied' }, { status: 403 })
      }
    }

    // Create the use case
    const { data: usecase, error: createError } = await supabase
      .from('usecases')
      .insert([{
        name,
        deployment_date,
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
      }])
      .select()
      .single()

    if (createError) {
      console.error('Error creating use case:', createError)
      return NextResponse.json({ error: 'Error creating use case' }, { status: 500 })
    }

    return NextResponse.json(usecase, { status: 201 })

  } catch (error) {
    console.error('Error in usecases POST API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}