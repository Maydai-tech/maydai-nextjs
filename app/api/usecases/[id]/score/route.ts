import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { calculateScore } from '../../../../usecases/[id]/utils/score-calculator'
import { UseCaseScore } from '../../../../usecases/[id]/types/usecase'
import { logger, createRequestContext } from '@/lib/secure-logger'


export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    console.log('=== STARTING SCORE API CALL ===')
    
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json(
        { error: 'Variables d\'environnement Supabase manquantes' },
        { status: 500 }
      )
    }
    
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'No authorization header' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } }
    })
    
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const { id: usecaseId } = await params

    // Vérifier l'accès au use case
    const { data: usecase, error: usecaseError } = await supabase
      .from('usecases')
      .select('company_id')
      .eq('id', usecaseId)
      .single()

    if (usecaseError) {
      return NextResponse.json({ error: 'Use case not found' }, { status: 404 })
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', user.id)
      .single()

    if (profileError || profile.company_id !== usecase.company_id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Récupérer d'abord le score_final stocké en base
    const { data: usecaseData, error: scoreDataError } = await supabase
      .from('usecases')
      .select('score_final, score_base, score_model, is_eliminated, last_calculation_date')
      .eq('id', usecaseId)
      .single()

    if (scoreDataError) {
      return NextResponse.json({ error: 'Error fetching use case data' }, { status: 500 })
    }

    // Si un score_final existe, le retourner avec les category_scores calculés
    if (usecaseData.score_final !== null && usecaseData.score_final !== undefined) {
      // Récupérer les réponses pour calculer les category_scores
      const { data: responses, error: responsesError } = await supabase
        .from('usecase_responses')
        .select('question_code, single_value, multiple_codes, multiple_labels, conditional_main, conditional_keys, conditional_values')
        .eq('usecase_id', usecaseId)

      if (responsesError) {
        return NextResponse.json({ error: 'Error fetching responses' }, { status: 500 })
      }

      // Calculer le score complet pour obtenir les category_scores
      const fullScoreData = await calculateScore(usecaseId, responses || [])
      
      return NextResponse.json({
        usecase_id: usecaseId,
        score: usecaseData.score_final,
        max_score: 120, // Score maximum avec bonus COMPL-AI
        score_breakdown: fullScoreData.score_breakdown,
        category_scores: fullScoreData.category_scores,
        calculated_at: usecaseData.last_calculation_date || new Date().toISOString(),
        version: 1,
        is_eliminated: usecaseData.is_eliminated || false,
        compl_ai_bonus: usecaseData.score_model || 0,
        compl_ai_score: fullScoreData.compl_ai_score,
        model_info: fullScoreData.model_info
      })
    }

    // Fallback : calculer le score dynamiquement si pas de score_final
    const { data: responses, error: responsesError } = await supabase
      .from('usecase_responses')
      .select('question_code, single_value, multiple_codes, multiple_labels, conditional_main, conditional_keys, conditional_values')
      .eq('usecase_id', usecaseId)

    if (responsesError) {
      return NextResponse.json({ error: 'Error fetching responses' }, { status: 500 })
    }

    // Calculer le score
    const scoreData = await calculateScore(usecaseId, responses || [])

    // Retourner le score calculé
    return NextResponse.json(scoreData)

  } catch (error) {
    const context = createRequestContext(request)
    logger.error('Score API error', error, context)
    
    return NextResponse.json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return GET(request, { params })
} 