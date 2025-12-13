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

    // Fetch use cases with evaluated scores (score_final not null)
    const { data: usecases, error: usecasesError } = await supabase
      .from('usecases')
      .select('id, name, score_final, deployment_date')
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
        active_average_score: null,
        active_evaluated_count: 0,
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

    // Calculate average score for active use cases (deployment_date <= today)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const activeUsecases = usecases.filter(uc => {
      if (!uc.deployment_date) return false
      try {
        const deployment = new Date(uc.deployment_date)
        deployment.setHours(0, 0, 0, 0)
        return deployment <= today
      } catch (error) {
        return false
      }
    })

    let activeAverageScore = null
    let activeEvaluatedCount = 0

    if (activeUsecases.length > 0) {
      const activeTotalScore = activeUsecases.reduce((sum, usecase) => sum + (usecase.score_final || 0), 0)
      activeAverageScore = Math.round((activeTotalScore / activeUsecases.length) * 100) / 100
      activeEvaluatedCount = activeUsecases.length
    }

    return NextResponse.json({
      average_score: averageScore,
      evaluated_count: usecases.length,
      total_count: totalCount || 0,
      active_average_score: activeAverageScore,
      active_evaluated_count: activeEvaluatedCount,
      message: `Moyenne calculée sur ${usecases.length} cas d'usage évalués`
    })

  } catch (error) {
    console.error('Error in company average score API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}