import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

import {
  appendMissingModelsToSheet,
  ensureControlTowerSyncHeaders,
  exportControlTowerCsv,
  syncControlTowerDerivedColumns,
} from '@/lib/bench-llm/control-tower-csv'
import { syncControlTowerSystemCardStatuses } from '@/lib/bench-llm/system-cards-import'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

function getRequiredEnv(name: string): string {
  const value = process.env[name]?.trim()
  if (!value) throw new Error(`${name} est requis`)
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

  try {
    const spreadsheetId = getRequiredEnv('GOOGLE_SHEETS_CONTROL_TOWER_ID')
    await ensureControlTowerSyncHeaders(spreadsheetId)

    const addedCount = await appendMissingModelsToSheet(spreadsheetId)
    await syncControlTowerDerivedColumns(spreadsheetId)

    const supabase: SupabaseClient = createClient(
      getRequiredEnv('NEXT_PUBLIC_SUPABASE_URL'),
      getRequiredEnv('SUPABASE_SERVICE_ROLE_KEY'),
    )
    const { errorStatusesSynced } = await syncControlTowerSystemCardStatuses(supabase)
    const result = await exportControlTowerCsv(supabase)

    return NextResponse.json({
      success: true,
      dryRun: false,
      fileId: result.fileId,
      rowCount: result.rowCount,
      updated: result.updated,
      modelsAppended: addedCount,
      errorStatusesSynced,
    })
  } catch (error) {
    console.error('[Cron Sync LLM Control]', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur interne du serveur',
      },
      { status: 500 },
    )
  }
}
