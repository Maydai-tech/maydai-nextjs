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

    // Fetch use cases with evaluated scores (score_final not null)
    const { data: usecases, error: usecasesError } = await supabase
      .from('usecases')
      .select('id, name, score_final')
      .eq('company_id', id)
      .not('score_final', 'is', null)

    if (usecasesError) {
      return NextResponse.json({ error: 'Error fetching use cases' }, { status: 500 })
    }

    // Calculate average score if there are evaluated use cases
    if (!usecases || usecases.length === 0) {
      return NextResponse.json({
        average_score: null,
        evaluated_count: 0,
        total_count: 0,
        message: 'Aucun cas d\'usage évalué'
      })
    }

    // Get total count of all use cases for this company
    const { count: totalCount, error: countError } = await supabase
      .from('usecases')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', id)

    if (countError) {
      return NextResponse.json({ error: 'Error counting total use cases' }, { status: 500 })
    }

    // Calculate average score
    const totalScore = usecases.reduce((sum, usecase) => sum + (usecase.score_final || 0), 0)
    const averageScore = Math.round((totalScore / usecases.length) * 100) / 100

    return NextResponse.json({
      average_score: averageScore,
      evaluated_count: usecases.length,
      total_count: totalCount || 0,
      message: `Moyenne calculée sur ${usecases.length} cas d'usage évalués`
    })

  } catch (error) {
    console.error('Error in company average score API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}