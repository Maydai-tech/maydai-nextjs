import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { verifyAdminAuth } from '@/lib/admin-auth'
import {
  EcologitsLinkUpdateError,
  matchEcologitsModel,
  unlinkEcologitsModel,
} from '@/lib/ecologits/link-actions'
import { createEcoLogitsServiceClient } from '@/lib/ecologits/sync'
import { EcologitsPutLinkBodySchema } from '@/types/ecologits.zod'

export const dynamic = 'force-dynamic'

const EcoModelIdSchema = z.string().uuid()

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await verifyAdminAuth(request)
  if (auth.error) return auth.error

  const { id } = await context.params
  const ecoId = EcoModelIdSchema.safeParse(id)
  if (!ecoId.success) {
    return NextResponse.json({ error: 'Identifiant EcoLogits invalide.' }, { status: 400 })
  }

  let json: unknown
  try {
    json = await request.json()
  } catch (error) {
    console.error('[EcoLogits Link]', error)
    return NextResponse.json({ error: 'JSON invalide.' }, { status: 400 })
  }
  const parsed = EcologitsPutLinkBodySchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map((issue) => issue.message).join(' ; ') || 'Corps invalide.' },
      { status: 400 },
    )
  }

  try {
    const supabase = createEcoLogitsServiceClient()
    const result = parsed.data.maydai_model_id
      ? await matchEcologitsModel(supabase, {
        ecologitsModelId: ecoId.data,
        maydaiModelId: parsed.data.maydai_model_id,
        conflictMode: 'add',
      })
      : await unlinkEcologitsModel(supabase, ecoId.data)
    return NextResponse.json(result)
  } catch (error) {
    console.error('[EcoLogits Link]', error)
    const status = error instanceof EcologitsLinkUpdateError ? error.status : 500
    const message = error instanceof Error ? error.message : 'Erreur interne du serveur'
    return NextResponse.json({ error: message }, { status })
  }
}
