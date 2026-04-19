import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { calculateScore } from '../../../../usecases/[id]/utils/score-calculator'
import { logger, createRequestContext } from '@/lib/secure-logger'
import { normalizeQuestionnaireVersion, QUESTIONNAIRE_VERSION_V3 } from '@/lib/questionnaire-version'


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

    // Check if user has access to this use case via user_companies
    const { data: userCompany, error: userCompanyError } = await supabase
      .from('user_companies')
      .select('company_id')
      .eq('user_id', user.id)
      .eq('company_id', usecase.company_id)
      .single()

    if (userCompanyError || !userCompany) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Récupérer d'abord le score_final stocké en base
    const { data: usecaseData, error: scoreDataError } = await supabase
      .from('usecases')
      .select(
        'score_final, score_base, score_model, is_eliminated, last_calculation_date, questionnaire_version, system_type, short_path_initial_score, short_path_completed_at, path_mode, checklist_gov_enterprise, checklist_gov_usecase'
      )
      .eq('id', usecaseId)
      .single()

    if (scoreDataError) {
      return NextResponse.json({ error: 'Error fetching use case data' }, { status: 500 })
    }

    const qv = normalizeQuestionnaireVersion(usecaseData.questionnaire_version)
    const systemType = (usecaseData as { system_type?: string | null }).system_type ?? null
    const dbPathMode = (usecaseData as { path_mode?: string | null }).path_mode
    const checklistEnt = (usecaseData as { checklist_gov_enterprise?: string[] | null })
      .checklist_gov_enterprise
    const checklistUc = (usecaseData as { checklist_gov_usecase?: string[] | null }).checklist_gov_usecase

    let v3PathForScore: 'long' | 'short' = 'long'
    if (qv === QUESTIONNAIRE_VERSION_V3) {
      if (dbPathMode === 'short') v3PathForScore = 'short'
      else if (dbPathMode === 'long') v3PathForScore = 'long'
      else v3PathForScore = 'long'
    }

    const { data: responses, error: responsesError } = await supabase
      .from('usecase_responses')
      .select('question_code, single_value, multiple_codes, multiple_labels, conditional_main, conditional_keys, conditional_values')
      .eq('usecase_id', usecaseId)

    if (responsesError) {
      return NextResponse.json({ error: 'Error fetching responses' }, { status: 500 })
    }

    // Si un score_final existe, le retourner avec les category_scores calculés (parcours long terminé ou score complet).
    if (usecaseData.score_final !== null && usecaseData.score_final !== undefined) {
      const fullScoreData = await calculateScore(usecaseId, responses || [], supabase, {
        questionnaireVersion: usecaseData.questionnaire_version,
        systemType,
        ...(qv === QUESTIONNAIRE_VERSION_V3
          ? { questionnairePathMode: v3PathForScore }
          : {}),
        checklistGovEnterprise: checklistEnt ?? null,
        checklistGovUsecase: checklistUc ?? null,
      })

      return NextResponse.json({
        usecase_id: usecaseId,
        score: usecaseData.score_final,
        max_score: fullScoreData.max_score,
        score_breakdown: fullScoreData.score_breakdown,
        category_scores: fullScoreData.category_scores,
        calculated_at: usecaseData.last_calculation_date || new Date().toISOString(),
        version: 1,
        is_eliminated: usecaseData.is_eliminated || false,
        compl_ai_bonus: usecaseData.score_model || 0,
        compl_ai_score: fullScoreData.compl_ai_score,
        model_info: fullScoreData.model_info,
        risk_use_case: fullScoreData.risk_use_case,
        questionnaire_version: fullScoreData.questionnaire_version,
        bpgv_variant: fullScoreData.bpgv_variant,
        ors_exit: fullScoreData.ors_exit,
        active_question_codes: fullScoreData.active_question_codes,
        score_scope: 'full' as const,
      })
    }

    // V3 : score initial parcours court persisté (sans score_final long).
    const shortInitial = (usecaseData as { short_path_initial_score?: number | null }).short_path_initial_score
    if (qv === QUESTIONNAIRE_VERSION_V3 && shortInitial != null && shortInitial !== undefined) {
      const shortScoreData = await calculateScore(usecaseId, responses || [], supabase, {
        questionnaireVersion: usecaseData.questionnaire_version,
        systemType,
        questionnairePathMode: 'short',
        checklistGovEnterprise: checklistEnt ?? null,
        checklistGovUsecase: checklistUc ?? null,
      })

      return NextResponse.json({
        ...shortScoreData,
        score: shortInitial,
        calculated_at:
          (usecaseData as { short_path_completed_at?: string | null }).short_path_completed_at ||
          usecaseData.last_calculation_date ||
          new Date().toISOString(),
        score_scope: 'short_initial' as const,
        score_display_hint:
          'Score initial du parcours court (périmètre réduit : qualification et bloc Usage & transparence / ORS, sans E5, Q12 ni E6). Le score complet s’affiche après le parcours long.',
      })
    }

    const scoreData = await calculateScore(usecaseId, responses || [], supabase, {
      questionnaireVersion: usecaseData.questionnaire_version,
      systemType,
      ...(qv === QUESTIONNAIRE_VERSION_V3 ? { questionnairePathMode: v3PathForScore } : {}),
      checklistGovEnterprise: checklistEnt ?? null,
      checklistGovUsecase: checklistUc ?? null,
    })

    return NextResponse.json({
      ...scoreData,
      score_scope: 'full' as const,
    })

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