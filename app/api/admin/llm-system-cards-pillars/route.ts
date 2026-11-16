import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

import { verifyAdminAuth } from '@/lib/admin-auth'
import { rebuildSystemCardPillars } from '@/lib/bench-llm/system-card-pillars-rebuild'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

function getRequiredEnv(name: string): string {
  const value = process.env[name]?.trim()
  if (!value) throw new Error(`${name} est requis`)
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

  let write = false
  let replaceSeededCard = false
  try {
    const body = await request.json().catch(() => ({}))
    write = body?.write === true
    replaceSeededCard = body?.replaceSeededCard === true
  } catch {
    write = false
  }

  try {
    const report = await rebuildSystemCardPillars(createServiceClient(), {
      write,
      replaceSeededCard,
    })
    const mode = report.dryRun ? 'simulation' : 'écriture'
    const message = `${mode} : ${report.parsed} fiche(s) découpée(s), ${report.failed} en échec, ${report.unmapped.length} libellé(s) non reconnu(s).`
    return NextResponse.json({ success: true, message, report })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur interne du serveur'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
