import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

import { verifyAdminAuth } from '@/lib/admin-auth'
import { exportControlTowerCsv } from '@/lib/bench-llm/control-tower-csv'

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
    const result = await exportControlTowerCsv(createServiceClient())
    return NextResponse.json({
      success: true,
      message: result.updated
        ? 'CSV Tour de contrôle mis à jour sur Google Drive'
        : 'CSV Tour de contrôle créé sur Google Drive',
      fileId: result.fileId,
      rowCount: result.rowCount,
      updated: result.updated,
    })
  } catch (error) {
    console.error('[Admin LLM Control Tower] Export échoué:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur interne du serveur',
      },
      { status: 500 },
    )
  }
}
