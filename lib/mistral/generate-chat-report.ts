import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js'
import { calculateAndPersistUseCaseScore, UseCaseScoreError } from '@/lib/usecase-score-service'
import { completeReportAgent } from '@/lib/mistral/complete-report-agent'
import { CONVERSATIONAL_PATH_MODE } from '@/lib/mistral/evaluation-graph-orchestrator'
import { persistChatReport } from '@/lib/mistral/persist-chat-report'
import { ASSISTANT_PATH_RUN_MODE } from '@/lib/evaluation-path-run-mode'
import { completeOpenEvaluationPathRun } from '@/lib/evaluation-path-run-tracking'
import { prepareChatReportContext } from '@/lib/mistral/prepare-chat-report-context'
import { isRiskLevelCode } from '@/lib/risk-level'
import { LEAD_FUNNEL_STAGE, updateLeadFunnelStage } from '@/lib/leads/lead-funnel-service'
import { logger } from '@/lib/secure-logger'
import {
  REPORT_AGENT_MAX_RETRIES,
  REPORT_AGENT_TIMEOUT_MS,
} from '@/lib/mistral/report-timeouts'

export type GenerateChatReportSuccess = {
  ok: true
  usecase_id: string
  usecase_name: string
  processing_time_ms: number
  next_steps_status: 'saved' | 'parse_failed' | 'save_error'
  next_steps_saved: boolean
}

export type GenerateChatReportFailure = {
  ok: false
  status: number
  error: string
  code?: string
  details?: string
}

export type GenerateChatReportResult = GenerateChatReportSuccess | GenerateChatReportFailure

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`Timeout après ${timeoutMs}ms`)), timeoutMs)
  })
  try {
    return await Promise.race([promise, timeout])
  } finally {
    if (timer) clearTimeout(timer)
  }
}

async function completeReportAgentWithRetry(
  messages: Parameters<typeof completeReportAgent>[0]['messages'],
  isUnacceptable: boolean,
  usecaseId: string
): Promise<string> {
  let lastError: Error | null = null

  for (let attempt = 1; attempt <= REPORT_AGENT_MAX_RETRIES; attempt++) {
    try {
      return await withTimeout(
        completeReportAgent({ messages, isUnacceptable }),
        REPORT_AGENT_TIMEOUT_MS
      )
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))
      logger.error('Tentative génération rapport Mistral échouée', undefined, {
        usecaseId,
        attempt,
        details: lastError.message,
      })
      if (attempt < REPORT_AGENT_MAX_RETRIES) {
        await new Promise((resolve) => setTimeout(resolve, Math.min(1000 * 2 ** (attempt - 1), 10_000)))
      }
    }
  }

  throw lastError || new Error('Échec de génération du rapport Mistral')
}

async function markUsecaseCompleted(supabase: SupabaseClient, usecaseId: string): Promise<void> {
  const { error } = await supabase
    .from('usecases')
    .update({
      status: 'completed',
      path_mode: CONVERSATIONAL_PATH_MODE,
      updated_at: new Date().toISOString(),
    })
    .eq('id', usecaseId)

  if (error) {
    throw new Error(`Impossible de clôturer le cas d’usage: ${error.message}`)
  }
}

/**
 * Score (même moteur que ScoreService.calculateUseCaseScore) puis génération Mistral du rapport.
 */
export async function generateChatReport(options: {
  supabase: SupabaseClient
  user: User
  usecaseId: string
}): Promise<GenerateChatReportResult> {
  const { supabase, user, usecaseId } = options

  try {
    await markUsecaseCompleted(supabase, usecaseId)

    const score = await calculateAndPersistUseCaseScore({
      client: supabase,
      usecaseId,
      actorUserId: user.id,
      recordHistory: true,
    })

    if (score.classification_status === 'impossible' || !isRiskLevelCode(score.risk_level)) {
      return {
        ok: false,
        status: 409,
        code: 'CLASSIFICATION_IMPOSSIBLE',
        error:
          'Classification réglementaire impossible : les réponses « Je ne sais pas » sur un pivot critique empêchent de conclure un niveau de risque fiable. Corrigez le questionnaire avant de générer le rapport.',
      }
    }

    const prepared = await prepareChatReportContext(supabase, usecaseId, score.risk_level)
    const startTime = Date.now()
    const reportJson = await completeReportAgentWithRetry(
      [{ role: 'user', content: prepared.userMessage }],
      prepared.isUnacceptable,
      usecaseId
    )
    const processingTimeMs = Date.now() - startTime

    const persisted = await persistChatReport(supabase, {
      usecaseId,
      reportJson,
      authoritativeRiskCode: prepared.authoritativeRiskCode,
      processingTimeMs,
    })

    await completeOpenEvaluationPathRun(supabase, {
      usecaseId,
      pathMode: ASSISTANT_PATH_RUN_MODE,
      classificationStatus: score.classification_status ?? null,
      riskLevel: score.risk_level ?? null,
    })

    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
      if (supabaseUrl && serviceRoleKey) {
        const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)
        await updateLeadFunnelStage(user.id, LEAD_FUNNEL_STAGE.FINISHED, supabaseAdmin)
      }
    } catch (leadFunnelError) {
      logger.error('LeadFunnel FINISHED (non bloquant)', undefined, {
        details: leadFunnelError instanceof Error ? leadFunnelError.message : String(leadFunnelError),
      })
    }

    return {
      ok: true,
      usecase_id: usecaseId,
      usecase_name: prepared.usecaseName,
      processing_time_ms: processingTimeMs,
      next_steps_status: persisted.next_steps_status,
      next_steps_saved: persisted.next_steps_saved,
    }
  } catch (error) {
    if (error instanceof UseCaseScoreError) {
      return {
        ok: false,
        status: error.status,
        error: error.message,
        details: error.details,
        code: 'SCORE_ERROR',
      }
    }

    return {
      ok: false,
      status: 500,
      error: 'Erreur lors de la génération du rapport IA',
      details: error instanceof Error ? error.message : 'Erreur inconnue',
    }
  }
}
