import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

import { verifyAdminAuth } from '@/lib/admin-auth'
import {
  appendMissingModelsToSheet,
  exportControlTowerCsv,
  writeControlTowerLlmStatusColumn,
} from '@/lib/bench-llm/control-tower-csv'

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
  return createClient(
    getRequiredEnv('NEXT_PUBLIC_SUPABASE_URL'),
    getRequiredEnv('SUPABASE_SERVICE_ROLE_KEY'),
  )
}

export async function POST(request: NextRequest) {
  const authResult = await verifyAdminAuth(request)
  if (authResult.error) return authResult.error

  try {
    const spreadsheetId = process.env.GOOGLE_SHEETS_CONTROL_TOWER_ID?.trim()
    if (!spreadsheetId) {
      throw new Error('GOOGLE_SHEETS_CONTROL_TOWER_ID is not defined')
    }

    const addedCount = await appendMissingModelsToSheet(spreadsheetId)
    console.log(`[Sync LLM Control] ${addedCount} nouveaux modèles ajoutés au Sheet.`)

    await writeControlTowerLlmStatusColumn(spreadsheetId)

    const supabase = createServiceClient()
    const modelsAppended = addedCount
    const result = await exportControlTowerCsv(supabase)
    const baseMessage = result.updated
      ? 'CSV Tour de contrôle mis à jour sur Google Drive'
      : 'CSV Tour de contrôle créé sur Google Drive'
    const appendedLabel =
      modelsAppended > 0
        ? ` (${modelsAppended} modèle${modelsAppended > 1 ? 's' : ''} ajouté${modelsAppended > 1 ? 's' : ''} au Sheet)`
        : ''
    return NextResponse.json({
      success: true,
      message: `${baseMessage}${appendedLabel}`,
      fileId: result.fileId,
      rowCount: result.rowCount,
      updated: result.updated,
      modelsAppended,
    })
  } catch (error) {
    console.error('[API Admin Sync LLM Control]', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur interne du serveur',
      },
      { status: 500 },
    )
  }
}
