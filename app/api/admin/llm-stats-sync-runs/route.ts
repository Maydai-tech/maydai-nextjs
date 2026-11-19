import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

import { verifyAdminAuth } from '@/lib/admin-auth'
import { syncLlmStatsModels } from '@/lib/bench-llm/llm-stats-sync'
import {
  buildLlmStatsSyncRunFromFailure,
  buildLlmStatsSyncRunFromResult,
  recordLlmStatsSyncRun,
} from '@/lib/bench-llm/llm-stats-sync-runs'
import {
  sendLlmStatsSyncFailureEmail,
  sendLlmStatsSyncReportEmail,
} from '@/lib/email/mailjet'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

function getRequiredEnv(name: string): string {
  const value = process.env[name]?.trim()
  if (!value) {
    throw new Error(`${name} est requis`)
  }
  return value
}

function createServiceClient(): SupabaseClient {
  const supabaseUrl = getRequiredEnv('NEXT_PUBLIC_SUPABASE_URL')
  const serviceKey = getRequiredEnv('SUPABASE_SERVICE_ROLE_KEY')

  return createClient(supabaseUrl, serviceKey)
}

function parseLimit(rawLimit: string | null): number {
  const parsed = Number(rawLimit)
  if (!Number.isFinite(parsed) || parsed <= 0) return 30
  return Math.min(Math.floor(parsed), 100)
}

export async function GET(request: NextRequest) {
  const authResult = await verifyAdminAuth(request)
  if (authResult.error) return authResult.error

  let supabase: SupabaseClient
  try {
    supabase = createServiceClient()
  } catch {
    return NextResponse.json({ error: 'Configuration error' }, { status: 500 })
  }

  const limit = parseLimit(request.nextUrl.searchParams.get('limit'))

  const { data, error } = await supabase
    .from('llm_stats_sync_runs')
    .select(
      `
        id,
        started_at,
        finished_at,
        status,
        models_fetched,
        models_created,
        models_updated,
        models_unchanged,
        created_models,
        updated_models,
        errors,
        email_sent,
        failure_email_sent,
        execution_time_ms,
        created_at
      `,
    )
    .order('started_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('[Admin LLM Stats Sync Runs] Erreur récupération historique:', error)
    return NextResponse.json(
      { error: "Impossible de récupérer l'historique du cron LLM Stats" },
      { status: 500 },
    )
  }

  return NextResponse.json({ runs: data || [] })
}

export async function POST(request: NextRequest) {
  const authResult = await verifyAdminAuth(request)
  if (authResult.error) return authResult.error

  const startedAt = new Date().toISOString()
  let supabase: SupabaseClient | null = null

  try {
    supabase = createServiceClient()
    getRequiredEnv('LLM_STATS_API_KEY')

    const result = await syncLlmStatsModels(supabase)
    const emailResult = await sendLlmStatsSyncReportEmail(result)

    if (!emailResult.success) {
      console.error('[Admin LLM Stats Sync Runs] Email de rapport non envoyé:', emailResult.error)
    }

    const historyRecorded = await recordLlmStatsSyncRun(
      supabase,
      buildLlmStatsSyncRunFromResult(result, emailResult.success),
    )

    return NextResponse.json(
      {
        ...result,
        emailSent: emailResult.success,
        historyRecorded,
        triggeredBy: authResult.user?.email || authResult.user?.id || 'admin',
      },
      { status: result.success ? 200 : 207 },
    )
  } catch (error) {
    console.error('[Admin LLM Stats Sync Runs] Exécution manuelle échouée:', error)
    const finishedAt = new Date().toISOString()

    const failureEmail = await sendLlmStatsSyncFailureEmail(error, {
      startedAt,
      finishedAt,
      route: '/api/admin/llm-stats-sync-runs',
    })

    if (!failureEmail.success) {
      console.error("[Admin LLM Stats Sync Runs] Email d'échec non envoyé:", failureEmail.error)
    }

    try {
      if (supabase) {
        await recordLlmStatsSyncRun(
          supabase,
          buildLlmStatsSyncRunFromFailure({
            startedAt,
            finishedAt,
            error,
            failureEmailSent: failureEmail.success,
          }),
        )
      }
    } catch {
      // L'enregistrement d'historique ne doit pas masquer l'erreur principale.
    }

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur interne du serveur',
        failureEmailSent: failureEmail.success,
      },
      { status: 500 },
    )
  }
}
