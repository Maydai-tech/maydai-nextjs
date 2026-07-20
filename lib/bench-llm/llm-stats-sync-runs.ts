import type { SupabaseClient } from '@supabase/supabase-js'

import type { LlmStatsSyncResult, SyncModelChange } from './llm-stats-sync'

export type LlmStatsSyncRunStatus = 'success' | 'partial' | 'error'

export interface LlmStatsSyncRunInsert {
  started_at: string
  finished_at: string
  status: LlmStatsSyncRunStatus
  models_fetched: number
  models_created: number
  models_updated: number
  models_unchanged: number
  created_models: SyncModelChange[]
  updated_models: SyncModelChange[]
  errors: string[]
  email_sent: boolean
  failure_email_sent: boolean
  execution_time_ms: number | null
}

export function buildLlmStatsSyncRunFromResult(
  result: LlmStatsSyncResult,
  emailSent: boolean,
): LlmStatsSyncRunInsert {
  return {
    started_at: result.startedAt,
    finished_at: result.finishedAt,
    status: result.success ? 'success' : 'partial',
    models_fetched: result.modelsFetched,
    models_created: result.modelsCreated,
    models_updated: result.modelsUpdated,
    models_unchanged: result.modelsUnchanged,
    created_models: result.createdModels,
    updated_models: result.updatedModels,
    errors: result.errors,
    email_sent: emailSent,
    failure_email_sent: false,
    execution_time_ms: result.durationMs,
  }
}

export function buildLlmStatsSyncRunFromFailure(params: {
  startedAt: string
  finishedAt: string
  error: unknown
  failureEmailSent: boolean
}): LlmStatsSyncRunInsert {
  const durationMs = new Date(params.finishedAt).getTime() - new Date(params.startedAt).getTime()

  return {
    started_at: params.startedAt,
    finished_at: params.finishedAt,
    status: 'error',
    models_fetched: 0,
    models_created: 0,
    models_updated: 0,
    models_unchanged: 0,
    created_models: [],
    updated_models: [],
    errors: [params.error instanceof Error ? params.error.message : String(params.error)],
    email_sent: false,
    failure_email_sent: params.failureEmailSent,
    execution_time_ms: Number.isFinite(durationMs) ? Math.max(0, durationMs) : null,
  }
}

export async function recordLlmStatsSyncRun(
  supabase: SupabaseClient,
  row: LlmStatsSyncRunInsert,
): Promise<boolean> {
  try {
    const query = supabase.from('llm_stats_sync_runs') as unknown as {
      insert?: (value: LlmStatsSyncRunInsert) => Promise<{
        error?: unknown
        status?: number
        statusText?: string
      }>
    }
    if (typeof query.insert !== 'function') {
      console.error('[LLM Stats Sync] Historique cron non enregistré: insert indisponible')
      return false
    }

    const result = await query.insert(row)
    if (result.error) {
      console.error('[LLM Stats Sync] Historique cron non enregistré:', {
        error: result.error,
        status: result.status,
        statusText: result.statusText,
      })
      return false
    }

    return true
  } catch (error) {
    console.error('[LLM Stats Sync] Historique cron non enregistré:', error)
    return false
  }
}
