import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Les variables d\'environnement NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY doivent être définies'
  )
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
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

    // Check if the user has access to this company via user_companies table
    const { data: userCompany, error: userCompanyError } = await supabase
      .from('user_companies')
      .select('company_id, role')
      .eq('user_id', user.id)
      .eq('company_id', id)
      .eq('is_active', true)
      .single()

    if (userCompanyError || !userCompany) {
      return NextResponse.json({ error: 'Access denied to this company' }, { status: 403 })
    }

    // Fetch progress for this company's use cases
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
      .eq('usecases.company_id', id)

    if (progressError) {
      return NextResponse.json({ error: 'Error fetching progress' }, { status: 500 })
    }

    return NextResponse.json(progress || [])

  } catch (error) {
    console.error('Error in company progress API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 