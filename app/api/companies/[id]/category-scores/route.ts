import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { calculateScore } from '@/app/usecases/[id]/utils/score-calculator'
import { CategoryScore } from '@/app/usecases/[id]/types/usecase'
import { RISK_CATEGORIES } from '@/app/usecases/[id]/utils/risk-categories'

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
    // Exclude unacceptable cases (score = 0 or is_eliminated = true)
    const { data: usecases, error: usecasesError } = await supabase
      .from('usecases')
      .select('id, name, score_final, is_eliminated')
      .eq('company_id', id)
      .not('score_final', 'is', null)

    if (usecasesError) {
      return NextResponse.json({ error: 'Error fetching use cases' }, { status: 500 })
    }

    // Filter out unacceptable cases (score = 0 or is_eliminated = true)
    const acceptableUsecases = (usecases || []).filter(uc => {
      return uc.score_final !== 0 && uc.is_eliminated !== true
    })

    // If no acceptable use cases, return empty array
    if (!acceptableUsecases || acceptableUsecases.length === 0) {
      return NextResponse.json({
        category_scores: [],
        evaluated_count: 0,
        message: 'Aucun cas d\'usage évalué acceptable pour ce registre'
      })
    }

    // Calculate category scores for each use case
    const allCategoryScores: Record<string, number[]> = {}
    
    // Initialize all categories
    Object.keys(RISK_CATEGORIES).forEach(categoryId => {
      if (categoryId !== 'risk_level' && categoryId !== 'prohibited_practices') {
        allCategoryScores[categoryId] = []
      }
    })

    // For each use case, calculate its category scores
    for (const usecase of acceptableUsecases) {
      try {
        // Fetch responses for this use case
        const { data: responses, error: responsesError } = await supabase
          .from('usecase_responses')
          .select('question_code, single_value, multiple_codes, multiple_labels, conditional_main, conditional_keys, conditional_values')
          .eq('usecase_id', usecase.id)

        if (responsesError) {
          console.error(`Error fetching responses for usecase ${usecase.id}:`, responsesError)
          continue
        }

        // Calculate score to get category_scores
        const scoreData = await calculateScore(usecase.id, responses || [], supabase)

        // Collect percentages for each category
        if (scoreData.category_scores && scoreData.category_scores.length > 0) {
          scoreData.category_scores.forEach((categoryScore: CategoryScore) => {
            const categoryId = categoryScore.category_id
            // Only include categories that are not risk_level or prohibited_practices
            if (categoryId !== 'risk_level' && categoryId !== 'prohibited_practices') {
              if (!allCategoryScores[categoryId]) {
                allCategoryScores[categoryId] = []
              }
              allCategoryScores[categoryId].push(categoryScore.percentage)
            }
          })
        }
      } catch (error) {
        console.error(`Error calculating score for usecase ${usecase.id}:`, error)
        // Continue with other use cases even if one fails
        continue
      }
    }

    // Calculate average percentages for each category
    const aggregatedCategoryScores: CategoryScore[] = []
    
    Object.entries(allCategoryScores).forEach(([categoryId, percentages]) => {
      if (percentages.length > 0) {
        const category = RISK_CATEGORIES[categoryId]
        if (category) {
          // Calculate average percentage
          const averagePercentage = Math.round(
            percentages.reduce((sum, p) => sum + p, 0) / percentages.length
          )

          aggregatedCategoryScores.push({
            category_id: categoryId,
            category_name: category.shortName,
            score: 0, // Not used for display, percentage is the key metric
            max_score: 100, // Percentage is out of 100
            percentage: averagePercentage,
            question_count: 0, // Not meaningful at registry level
            color: category.color,
            icon: category.icon || ''
          })
        }
      }
    })

    // Sort categories in the same order as CategoryScores component
    const categoryOrder = [
      'human_agency',
      'technical_robustness',
      'privacy_data',
      'transparency',
      'diversity_fairness',
      'social_environmental'
    ]

    const sortedCategoryScores = aggregatedCategoryScores.sort((a, b) => {
      const indexA = categoryOrder.indexOf(a.category_id)
      const indexB = categoryOrder.indexOf(b.category_id)
      
      if (indexA === -1) return 1
      if (indexB === -1) return -1
      
      return indexA - indexB
    })

    return NextResponse.json({
      category_scores: sortedCategoryScores,
      evaluated_count: acceptableUsecases.length,
      message: `Scores agrégés calculés sur ${acceptableUsecases.length} cas d'usage évalués`
    })

  } catch (error) {
    console.error('Error in company category scores API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}


