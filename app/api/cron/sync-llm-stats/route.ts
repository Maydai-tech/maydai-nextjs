import { NextRequest, NextResponse } from 'next/server'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

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

function getRequiredEnv(name: string): string {
  const value = process.env[name]?.trim()
  if (!value) {
    throw new Error(`${name} est requis`)
  }
  return value
}

function isAuthorizedCronRequest(request: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET?.trim()
  if (!cronSecret) return false
  return request.headers.get('authorization') === `Bearer ${cronSecret}`
}

export async function GET(request: NextRequest) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const startedAt = new Date().toISOString()
  let supabase: SupabaseClient | null = null

  try {
    const supabaseUrl = getRequiredEnv('NEXT_PUBLIC_SUPABASE_URL')
    const serviceRoleKey = getRequiredEnv('SUPABASE_SERVICE_ROLE_KEY')

    supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })

    getRequiredEnv('LLM_STATS_API_KEY')

    const result = await syncLlmStatsModels(supabase)
    const emailResult = await sendLlmStatsSyncReportEmail(result)

    if (!emailResult.success) {
      console.error('[LLM Stats Sync] Email de rapport non envoyé:', emailResult.error)
    }

    await recordLlmStatsSyncRun(
      supabase,
      buildLlmStatsSyncRunFromResult(result, emailResult.success),
    )

    return NextResponse.json({
      ...result,
      emailSent: emailResult.success,
    }, { status: result.success ? 200 : 207 })
  } catch (error) {
    console.error('[LLM Stats Sync] Cron échoué:', error)
    const finishedAt = new Date().toISOString()

    const failureEmail = await sendLlmStatsSyncFailureEmail(error, {
      startedAt,
      finishedAt,
      route: '/api/cron/sync-llm-stats',
    })

    if (!failureEmail.success) {
      console.error("[LLM Stats Sync] Email d'échec non envoyé:", failureEmail.error)
    }

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
