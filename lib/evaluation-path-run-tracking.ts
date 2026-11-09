import type { SupabaseClient } from '@supabase/supabase-js'
import type { EvaluationPathRunMode } from '@/lib/evaluation-path-run-mode'
import { completionSecondsFromTimestamps } from '@/lib/evaluation-path-runs-stats'
import {
  calculateAndPersistAuditIntegrityScore,
  calculateAndPersistEngagementScore,
} from '@/lib/services/governanceScoreService'
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
      console.error('[completeOpenEvaluationPathRun] update', updErr)
      logger.error('completeOpenEvaluationPathRun: update', undefined, {
        details: updErr.message,
        usecaseId: options.usecaseId,
      })
      return
    }

    try {
      await calculateAndPersistAuditIntegrityScore(options.usecaseId)
      const { data: usecaseRow, error: usecaseError } = await supabase
        .from('usecases')
        .select('updated_by')
        .eq('id', options.usecaseId)
        .maybeSingle()
      if (usecaseError) {
        console.error('[completeOpenEvaluationPathRun] updated_by', usecaseError)
      } else if (usecaseRow?.updated_by) {
        await calculateAndPersistEngagementScore(usecaseRow.updated_by)
      }
    } catch (scoreError) {
      console.error('[completeOpenEvaluationPathRun] scores gouvernance', scoreError)
    }
  } catch (error) {
    console.error('[completeOpenEvaluationPathRun] unexpected', error)
    logger.error('completeOpenEvaluationPathRun: unexpected', undefined, {
      details: error instanceof Error ? error.message : String(error),
      usecaseId: options.usecaseId,
    })
  }
}
