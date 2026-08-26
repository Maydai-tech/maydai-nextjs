import type { SupabaseClient } from '@supabase/supabase-js'
import type { EvaluationPathRunMode } from '@/lib/evaluation-path-run-mode'
import { completionSecondsFromTimestamps } from '@/lib/evaluation-path-runs-stats'
import { logger } from '@/lib/secure-logger'

/**
 * Clôture best-effort du run ouvert (même contrat que PATCH evaluation-runs/[runId]).
 * Ne jette pas : le tracking ne doit pas bloquer le parcours métier.
 */
export async function completeOpenEvaluationPathRun(
  supabase: SupabaseClient,
  options: {
    usecaseId: string
    pathMode: EvaluationPathRunMode
    classificationStatus?: string | null
    riskLevel?: string | null
  }
): Promise<void> {
  try {
    const { data: openRun, error: selectErr } = await supabase
      .from('evaluation_path_runs')
      .select('id, started_at, completed_at')
      .eq('usecase_id', options.usecaseId)
      .eq('path_mode', options.pathMode)
      .is('completed_at', null)
      .order('started_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (selectErr || !openRun?.id || openRun.completed_at) return

    const completedAt = new Date().toISOString()
    const completionSeconds = completionSecondsFromTimestamps(openRun.started_at, completedAt)

    const { error: updErr } = await supabase
      .from('evaluation_path_runs')
      .update({
        completed_at: completedAt,
        completion_seconds: completionSeconds,
        classification_status: options.classificationStatus ?? null,
        risk_level: options.riskLevel ?? null,
        updated_at: completedAt,
      })
      .eq('id', openRun.id)
      .is('completed_at', null)

    if (updErr) {
      logger.error('completeOpenEvaluationPathRun: update', undefined, {
        details: updErr.message,
        usecaseId: options.usecaseId,
      })
    }
  } catch (error) {
    logger.error('completeOpenEvaluationPathRun: unexpected', undefined, {
      details: error instanceof Error ? error.message : String(error),
      usecaseId: options.usecaseId,
    })
  }
}
