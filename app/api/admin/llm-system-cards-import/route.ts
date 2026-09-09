import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

import { verifyAdminAuth } from '@/lib/admin-auth'
import {
  createDefaultSystemCardsImportDeps,
  importSystemCardsFromControlTower,
} from '@/lib/bench-llm/system-cards-import'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

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
    const result = await importSystemCardsFromControlTower(
      createDefaultSystemCardsImportDeps(createServiceClient()),
    )
    const summary =
      result.processed === 0
        ? 'Aucune ligne prête pour import (Prêt pour import = Oui).'
        : `${result.inserted} fiche(s) importée(s), ${result.skipped.length} ignorée(s) (version plus ancienne), ${result.errors.length} en erreur`
    const errorSummary = result.errors.length > 0 ? result.errors.join(' | ') : undefined
    const status =
      result.errors.length === 0 ? 200 : result.inserted > 0 ? 207 : 500

    console.log('[Admin LLM System Cards Import] Résultat', {
      success: result.success,
      processed: result.processed,
      inserted: result.inserted,
      skipped: result.skipped,
      errors: result.errors,
    })

    return NextResponse.json(
      {
        ...result,
        message: errorSummary ? `${summary}. ${errorSummary}` : summary,
        error: errorSummary,
      },
      { status },
    )
  } catch (error) {
    console.error('[Admin LLM System Cards Import] Échec:', error)
    return NextResponse.json(
      {
        success: false,
        processed: 0,
        inserted: 0,
        skipped: [],
        errors: [error instanceof Error ? error.message : 'Erreur interne du serveur'],
        error: error instanceof Error ? error.message : 'Erreur interne du serveur',
      },
      { status: 500 },
    )
  }
}
