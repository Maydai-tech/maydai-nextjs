import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { calculateScore } from '../../../../usecases/[id]/utils/score-calculator'
import { UseCaseScore } from '../../../../usecases/[id]/types/usecase'
import { logger, createRequestContext } from '@/lib/secure-logger'

async function saveScore(supabase: any, scoreData: UseCaseScore) {
  try {
    // Vérifier s'il existe déjà un score pour ce usecase
    const { data: existingScore, error: fetchError } = await supabase
      .from('usecase_scores')
      .select('id, version')
      .eq('usecase_id', scoreData.usecase_id)
      .order('version', { ascending: false })
      .limit(1)
      .single()

    if (fetchError && fetchError.code !== 'PGRST116') {
      logger.warn('Could not fetch existing score, table may not exist')
      return { ...scoreData, id: 'temp-' + Date.now(), version: 1 }
    }

    // Déterminer la version
    const version = existingScore ? existingScore.version + 1 : 1

    // Insérer le nouveau score
    const { data, error } = await supabase
      .from('usecase_scores')
      .insert({
        ...scoreData,
        version
      })
      .select()
      .single()

    if (error) {
      logger.warn('Could not save score to database')
      return { ...scoreData, id: 'temp-' + Date.now(), version }
    }
    
    return data
  } catch (error) {
    logger.warn('Error in saveScore function')
    return { ...scoreData, id: 'temp-' + Date.now(), version: 1 }
  }
}

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

    // Récupérer les réponses
    const { data: responses, error: responsesError } = await supabase
      .from('usecase_responses')
      .select('question_code, single_value, multiple_codes, multiple_labels, conditional_main, conditional_keys, conditional_values')
      .eq('usecase_id', usecaseId)

    if (responsesError) {
      return NextResponse.json({ error: 'Error fetching responses' }, { status: 500 })
    }

    // Calculer le score
    const scoreData = calculateScore(usecaseId, responses || [])

    // Sauvegarder le score calculé
    const savedScore = await saveScore(supabase, scoreData)

    // S'assurer que les category_scores sont présents (rétrocompatibilité)
    if (!savedScore.category_scores || savedScore.category_scores.length === 0) {
      savedScore.category_scores = scoreData.category_scores
    }

    return NextResponse.json(savedScore)

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