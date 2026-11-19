import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminAuth } from '@/lib/admin-auth'
import { getServiceRoleClient } from '@/lib/maydai-calculator'
import {
  buildAdminGovernancePayload,
  handleAdminGovernanceAction,
} from '@/lib/services/governanceAdminService'
import { AdminGovernancePatchBodySchema } from '@/lib/validations/governance-scores'

export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAdminAuth(request)
    if (authResult.error) return authResult.error

    const payload = await buildAdminGovernancePayload(getServiceRoleClient())
    return NextResponse.json(payload)
  } catch (error) {
    console.error('[API /api/admin/governance]', error)
    const message = error instanceof Error ? error.message : 'Erreur DB'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const authResult = await verifyAdminAuth(request)
    if (authResult.error) return authResult.error

    const parsed = AdminGovernancePatchBodySchema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Payload invalide', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const result = await handleAdminGovernanceAction(getServiceRoleClient(), parsed.data)
    return NextResponse.json(result)
  } catch (error) {
    console.error('[API /api/admin/governance]', error)
    const message = error instanceof Error ? error.message : 'Erreur DB'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
