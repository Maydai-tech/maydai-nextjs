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

    // Fetch progress for use cases from all companies the user has access to
    const { data: progress, error: progressError } = await supabase
      .from('usecase_questionnaire_progress')
      .select(`
        *,
        usecases!inner(
          id,
          name,
          company_id
        )
      `)
      .in('usecases.company_id', companyIds)

    if (progressError) {
      return NextResponse.json({ error: 'Error fetching progress' }, { status: 500 })
    }

    return NextResponse.json(progress || [])

  } catch (error) {
    console.error('Error in questionnaire progress API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 