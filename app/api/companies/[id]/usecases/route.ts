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

    // Check access via user_companies (owner or user) + user_profiles hierarchy
    // 1. Check direct access via user_companies
    const { data: userCompany } = await supabase
      .from('user_companies')
      .select('role')
      .eq('company_id', id)
      .eq('user_id', user.id)
      .maybeSingle()

    let hasAccess = !!userCompany

    // 2. If no direct access, check profile-level access
    if (!hasAccess) {
      // Get the owner of this company
      const { data: ownerRecord } = await supabase
        .from('user_companies')
        .select('user_id')
        .eq('company_id', id)
        .eq('role', 'owner')
        .maybeSingle()

      if (ownerRecord) {
        const { data: profileAccess } = await supabase
          .from('user_profiles')
          .select('id')
          .eq('inviter_user_id', ownerRecord.user_id)
          .eq('invited_user_id', user.id)
          .maybeSingle()

        hasAccess = !!profileAccess
      }
    }

    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied to this company' }, { status: 403 })
    }

    // Fetch use cases for this company with model information and scores
    const { data: usecases, error: usecasesError } = await supabase
      .from('usecases')
      .select(`
        *,
        companies(name),
        compl_ai_models(
          id,
          model_name,
          model_provider,
          model_type,
          version
        )
      `)
      .eq('company_id', id)
      .order('created_at', { ascending: false })

    if (usecasesError) {
      return NextResponse.json({ error: 'Error fetching use cases' }, { status: 500 })
    }

    // Debug: Log all use cases to check data
    if (usecases && usecases.length > 0) {
      console.log('🔍 Debug all usecases data:')
      usecases.forEach((uc, index) => {
        console.log(`  ${index + 1}. ${uc.name}:`, {
          id: uc.id,
          status: uc.status,
          risk_level: uc.risk_level,
          score_final: uc.score_final,
          has_compl_ai_models: !!uc.compl_ai_models
        })
      })
    }

    return NextResponse.json(usecases || [])

  } catch (error) {
    console.error('Error in company usecases API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 