import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedSupabaseClient } from '@/lib/api-auth'
import { completionSecondsFromTimestamps } from '@/lib/evaluation-path-runs-stats'

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; runId: string }> }
) {
  try {
    const { supabase, user } = await getAuthenticatedSupabaseClient(request)
    const { id: useCaseId, runId } = await params

    if (!useCaseId || !UUID_RE.test(useCaseId) || !runId || !UUID_RE.test(runId)) {
      return NextResponse.json({ error: 'Identifiants invalides' }, { status: 400 })
    }

    const body = (await request.json().catch(() => ({}))) as {
      classification_status?: string | null
      risk_level?: string | null
    }

    const { data: run, error: runErr } = await supabase
      .from('evaluation_path_runs')
      .select('id, usecase_id, company_id, started_at, completed_at')
      .eq('id', runId)
      .single()

    if (runErr?.code === 'PGRST116' || !run) {
      return NextResponse.json({ error: 'Run introuvable' }, { status: 404 })
    }

    if (run.usecase_id !== useCaseId) {
      return NextResponse.json({ error: 'Run ne correspond pas au cas d’usage' }, { status: 400 })
    }

    const { data: userCompany, error: ucCoError } = await supabase
      .from('user_companies')
      .select('company_id')
      .eq('user_id', user.id)
      .eq('company_id', run.company_id)
      .single()

    if (ucCoError || !userCompany) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    if (run.completed_at) {
      return NextResponse.json({
        ok: true,
        idempotent: true,
        run_id: run.id,
        completed_at: run.completed_at,
      })
    }

    const completedAt = new Date().toISOString()

    const { data: useCaseSnap } = await supabase
      .from('usecases')
      .select('classification_status, risk_level')
      .eq('id', useCaseId)
      .single()

    const classificationStatus =
      'classification_status' in body
        ? body.classification_status ?? null
        : useCaseSnap?.classification_status ?? null
    const riskLevel =
      'risk_level' in body ? body.risk_level ?? null : useCaseSnap?.risk_level ?? null

    const completionSeconds = completionSecondsFromTimestamps(run.started_at, completedAt)

    const { error: updErr } = await supabase
      .from('evaluation_path_runs')
      .update({
        completed_at: completedAt,
        completion_seconds: completionSeconds,
        classification_status: classificationStatus,
        risk_level: riskLevel,
        updated_at: completedAt,
      })
      .eq('id', runId)
      .is('completed_at', null)

    if (updErr) {
      return NextResponse.json({ error: updErr.message }, { status: 500 })
    }

    return NextResponse.json({
      ok: true,
      run_id: runId,
      completed_at: completedAt,
      completion_seconds: completionSeconds,
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unauthorized'
    const status = msg === 'No authorization header' || msg === 'Invalid token' ? 401 : 500
    return NextResponse.json({ error: msg }, { status })
  }
}
