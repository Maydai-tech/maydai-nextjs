import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getAuthenticatedSupabaseClient } from '@/lib/api-auth'
import { QUESTIONNAIRE_VERSION_V3, normalizeQuestionnaireVersion } from '@/lib/questionnaire-version'
import { errorResponseBody, logEvaluationRunStartError } from './error-format'

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

type PathMode = 'short' | 'long'

type RunTrackingSkipStep = 'open_run_select' | 'service_role_probe' | 'insert_run' | 'unexpected'

function jsonRunTrackingSkipped(step: RunTrackingSkipStep) {
  return NextResponse.json(
    {
      run_id: null,
      reused: false,
      skipped: true,
      reason: 'run_tracking_failed',
      step,
    },
    { status: 200 }
  )
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let useCaseIdForLog = '(unknown)'
  let pathModeForLog = '(unknown)'
  try {
    const { supabase, user } = await getAuthenticatedSupabaseClient(request)
    const { id: useCaseId } = await params
    useCaseIdForLog = useCaseId

    if (!useCaseId || !UUID_RE.test(useCaseId)) {
      return NextResponse.json({ error: 'Invalid use case id' }, { status: 400 })
    }

    const body = (await request.json().catch(() => ({}))) as {
      path_mode?: PathMode
      entry_surface?: string | null
      questionnaire_version?: number
    }

    const pathMode = body.path_mode
    if (pathMode !== 'short' && pathMode !== 'long') {
      return NextResponse.json({ error: 'path_mode requis (short | long)' }, { status: 400 })
    }
    pathModeForLog = pathMode

    const { data: useCase, error: ucError } = await supabase
      .from('usecases')
      .select('id, company_id, questionnaire_version, system_type')
      .eq('id', useCaseId)
      .single()

    if (ucError?.code === 'PGRST116' || !useCase) {
      return NextResponse.json({ error: 'Use case not found' }, { status: 404 })
    }

    const { data: userCompany, error: ucCoError } = await supabase
      .from('user_companies')
      .select('company_id')
      .eq('user_id', user.id)
      .eq('company_id', useCase.company_id)
      .single()

    if (ucCoError || !userCompany) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const versionNorm = normalizeQuestionnaireVersion(useCase.questionnaire_version)
    if (body.questionnaire_version !== undefined) {
      const clientV = normalizeQuestionnaireVersion(body.questionnaire_version)
      if (clientV !== versionNorm) {
        return NextResponse.json(
          { error: 'questionnaire_version ne correspond pas au cas d’usage' },
          { status: 400 }
        )
      }
    }

    if (pathMode === 'short' && versionNorm !== QUESTIONNAIRE_VERSION_V3) {
      return NextResponse.json(
        { error: 'Parcours court uniquement pour questionnaire_version = 3' },
        { status: 400 }
      )
    }

    const entrySurface =
      typeof body.entry_surface === 'string' && body.entry_surface.trim()
        ? body.entry_surface.trim().slice(0, 200)
        : null

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseUrl || !serviceRoleKey) {
      const diagnostic = {
        message:
          'Configuration serveur: NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont requis pour evaluation_path_runs',
        code: 'MISSING_SERVICE_ROLE_CONFIG',
      }
      logEvaluationRunStartError('unexpected', { useCaseId, pathMode }, diagnostic)
      return jsonRunTrackingSkipped('unexpected')
    }

    const supabaseRuns = createClient(supabaseUrl, serviceRoleKey)

    const { data: openRun, error: openErr } = await supabaseRuns
      .from('evaluation_path_runs')
      .select('id, started_at')
      .eq('usecase_id', useCaseId)
      .eq('path_mode', pathMode)
      .is('completed_at', null)
      .order('started_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (openErr) {
      logEvaluationRunStartError('open_run_select', { useCaseId, pathMode }, openErr)
      return jsonRunTrackingSkipped('open_run_select')
    }

    if (openRun?.id) {
      return NextResponse.json({
        run_id: openRun.id,
        reused: true,
      })
    }

    const { data: useCaseServiceProbe, error: srProbeErr } = await supabaseRuns
      .from('usecases')
      .select('id, company_id')
      .eq('id', useCaseId)
      .maybeSingle()

    if (srProbeErr) {
      logEvaluationRunStartError('service_role_probe', { useCaseId, pathMode }, srProbeErr)
      return jsonRunTrackingSkipped('service_role_probe')
    }

    if (!useCaseServiceProbe?.id) {
      const diagnostic = {
        message:
          'SERVICE_ROLE_CANNOT_READ_USECASE: le client service role ne voit aucune ligne usecases pour ce id (mauvais projet / URL, clé, ou exposition schéma).',
        code: 'SERVICE_ROLE_CANNOT_READ_USECASE',
        details: JSON.stringify({ useCaseId }),
      }
      logEvaluationRunStartError('service_role_probe', { useCaseId, pathMode }, diagnostic)
      return jsonRunTrackingSkipped('service_role_probe')
    }

    const insertRow = {
      usecase_id: useCaseId,
      company_id: useCase.company_id,
      questionnaire_version: versionNorm,
      path_mode: pathMode,
      entry_surface: entrySurface,
      system_type: useCase.system_type ?? null,
    }

    const { error: insErr } = await supabaseRuns.from('evaluation_path_runs').insert(insertRow)

    if (insErr) {
      // Toujours tenter la récupération, que le code 23505 soit parsé ou non
      // (supabase-js peut retourner {} sur certaines configs PostgREST)
      const { data: again } = await supabaseRuns
        .from('evaluation_path_runs')
        .select('id')
        .eq('usecase_id', useCaseId)
        .eq('path_mode', pathMode)
        .is('completed_at', null)
        .order('started_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (again?.id) {
        return NextResponse.json({ run_id: again.id, reused: true })
      }
      logEvaluationRunStartError('insert_run', { useCaseId, pathMode }, insErr)
      return jsonRunTrackingSkipped('insert_run')
    }

    const { data: afterInsert, error: readBackErr } = await supabaseRuns
      .from('evaluation_path_runs')
      .select('id')
      .eq('usecase_id', useCaseId)
      .eq('path_mode', pathMode)
      .is('completed_at', null)
      .order('started_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (readBackErr) {
      logEvaluationRunStartError('insert_run', { useCaseId, pathMode }, readBackErr)
      return jsonRunTrackingSkipped('insert_run')
    }

    if (!afterInsert?.id) {
      const diagnostic = {
        message:
          'insert_run: insert sans erreur mais aucune ligne ouverte relue (RLS SELECT, délai, ou ligne déjà complétée)',
        code: 'MISSING_RUN_ID',
        details: JSON.stringify({ after_insert_refetch: true }),
      }
      logEvaluationRunStartError('insert_run', { useCaseId, pathMode }, diagnostic)
      return jsonRunTrackingSkipped('insert_run')
    }

    return NextResponse.json({ run_id: afterInsert.id, reused: false })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e ?? 'Unknown error')
    const is401 = msg === 'No authorization header' || msg === 'Invalid token'
    if (is401) {
      return NextResponse.json({ error: msg }, { status: 401 })
    }
    logEvaluationRunStartError('unexpected', { useCaseId: useCaseIdForLog, pathMode: pathModeForLog }, e)
    return NextResponse.json(errorResponseBody(e, 'unexpected'), { status: 500 })
  }
}
